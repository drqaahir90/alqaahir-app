import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Card, CardBody, EmptyState, Select } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import { useAuthStore, useUIStore } from "@/stores";
import { seedSubjects } from "@/data/seed";
import type { Difficulty, MCQ, QuizResult, Subject } from "@/types";
import { cn } from "@/utils/cn";
import { playSound } from "@/utils/sound";
import { pickN } from "@/utils/shuffle";
import { useLearningSession } from "@/hooks/useLearningSession";
import { computeMcqXp, type XpBreakdown } from "@/services/xp";
import { XpBreakdownCard } from "@/components/XpBreakdown";

export default function MCQPage() {
  const { t, tr } = useI18n();
  const [params] = useSearchParams();
  const [items, setItems] = useState<MCQ[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>(seedSubjects);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">((params.get("difficulty") as Difficulty) || "all");
  const [subject, setSubject] = useState<string>(params.get("subject") || "all");
  const [count, setCount] = useState(10);
  const [quiz, setQuiz] = useState<MCQ[] | null>(null);

  useEffect(() => {
    (async () => {
      await dbService.init();
      setItems(await dbService.list("mcqs"));
      const subs = await dbService.list<Subject>("subjects"); if (subs.length) setSubjects(subs);
    })();
  }, []);

  const filtered = useMemo(() => items.filter((m) =>
    (difficulty === "all" || m.difficulty === difficulty) &&
    (subject === "all" || m.subjectId === subject)
  ), [items, difficulty, subject]);

  function startQuiz() {
    // Fisher-Yates shuffle → uniform random permutation (was biased O(n log n))
    const arr = pickN(filtered, count);
    if (arr.length) setQuiz(arr);
  }

  if (quiz) return <QuizRunner questions={quiz} onExit={() => setQuiz(null)} subjects={subjects} />;

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">❓ {t("mcq.title")}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{items.length} · {filtered.length} {t("common.filter")}</p>
        </div>
      </header>

      <Card>
        <CardBody className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Select label={t("common.difficulty")} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")}>
            <option value="all">{t("common.all")}</option>
            <option value="easy">{t("common.easy")}</option>
            <option value="medium">{t("common.medium")}</option>
            <option value="hard">{t("common.hard")}</option>
          </Select>
          <Select label={t("common.subject")} value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="all">{t("common.all")}</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{tr(s.name)}</option>)}
          </Select>
          <Select label="# Questions" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
          <div className="flex items-end">
            <Button size="lg" className="w-full" disabled={!filtered.length} onClick={startQuiz}>▶ {t("mcq.start")}</Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <EmptyState title={t("common.emptyState")} icon="📭" />
        ) : filtered.slice(0, 20).map((m) => (
          <Card key={m.id}>
            <CardBody>
              <div className="flex items-start gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge tone={m.difficulty === "easy" ? "green" : m.difficulty === "medium" ? "amber" : "red"}>{t(`common.${m.difficulty}`)}</Badge>
                    <Badge tone="blue">{tr(subjects.find((s) => s.id === m.subjectId)?.name)}</Badge>
                    {m.timerSeconds && <Badge tone="gray">⏱ {m.timerSeconds}s</Badge>}
                  </div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{tr(m.question)}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─────────── Quiz runner ───────────
interface MCQSessionState {
  questionIds: string[];
  idx: number;
  selected: Record<string, string>;
  submitted: Record<string, boolean>;
  startAt: number;
}

function QuizRunner({ questions, onExit, subjects }: { questions: MCQ[]; onExit: () => void; subjects: Subject[] }) {
  const { t, tr } = useI18n();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const sessionId = user ? `mcq:${user.uid}` : "mcq:anon";

  // Auto-save + resume via IndexedDB
  const { resumed, scheduleSave, clear: clearSession } = useLearningSession<MCQSessionState>({
    id: sessionId, kind: "mcq", userId: user?.uid || "anon",
  });

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [remaining, setRemaining] = useState<number>(questions[0].timerSeconds || 45);
  const [done, setDone] = useState(false);
  const [startAt, setStartAt] = useState(Date.now());
  const [xpBreakdown, setXpBreakdown] = useState<XpBreakdown | null>(null);
  const [previousXp] = useState<number>(user?.xp || 0);

  // One-time hydration: only if the resumed session matches the current question set.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !resumed) return;
    const sameSet = resumed.questionIds.length === questions.length &&
      resumed.questionIds.every((id, i) => questions[i]?.id === id);
    if (sameSet) {
      setIdx(Math.min(resumed.idx, questions.length - 1));
      setSelected(resumed.selected || {});
      setSubmitted(resumed.submitted || {});
      setStartAt(resumed.startAt || Date.now());
    }
    hydratedRef.current = true;
  }, [resumed, questions]);

  // Persist progress on any state change (debounced)
  useEffect(() => {
    scheduleSave({
      questionIds: questions.map((q) => q.id),
      idx, selected, submitted, startAt,
    });
  }, [idx, selected, submitted, startAt, questions, scheduleSave]);

  const q = questions[idx];

  useEffect(() => {
    if (done || submitted[q.id]) return;
    setRemaining(q.timerSeconds || 45);
    const iv = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(iv); handleSubmit(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
     
  }, [idx]);

  function handleSubmit() {
    setSubmitted((s) => ({ ...s, [q.id]: true }));
    const sel = selected[q.id];
    playSound(sel === q.correctOptionId ? "correct" : "wrong");
  }
  function pick(oid: string) {
    if (submitted[q.id]) return;
    setSelected((s) => ({ ...s, [q.id]: oid }));
  }
  async function finish() {
    setDone(true);
    await clearSession();       // remove persisted resume state
    const score = questions.reduce((n, qq) => n + (selected[qq.id] === qq.correctOptionId ? 1 : 0), 0);
    const perfect = score === questions.length;
    const durationSec = Math.round((Date.now() - startAt) / 1000);
    playSound(perfect ? "achievement" : "levelComplete");
    if (user) {
      // Detect if all questions share a difficulty; otherwise "mixed".
      const dSet = new Set(questions.map((q) => q.difficulty));
      const difficulty = dSet.size === 1 ? [...dSet][0] : "mixed";
      const avgTimer = questions.reduce((s, q) => s + (q.timerSeconds || 45), 0) / questions.length;
      const bd = computeMcqXp({
        correctCount: score, totalCount: questions.length,
        difficulty, durationSec, averageTimerSec: avgTimer,
        streakDays: user.streak || 0,
      });
      setXpBreakdown(bd);
      const result: Omit<QuizResult, "id"> = {
        userId: user.uid, username: user.username, type: "mcq",
        refIds: questions.map((x) => x.id), score, total: questions.length,
        durationSec, createdAt: Date.now(),
      };
      await dbService.add("quizResults", result);
      await dbService.update("users", user.uid, { xp: (user.xp || 0) + bd.total });
      showToast(`+${bd.total} XP`, "success");
      playSound("xp");
    }
  }

  const score = questions.reduce((n, qq) => n + (selected[qq.id] === qq.correctOptionId ? 1 : 0), 0);

  if (done) {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto space-y-4">
        <Card>
          <CardBody className="text-center py-10">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("mcq.completed")}</h2>
            <div className="mt-2 text-slate-600 dark:text-slate-400">
              {t("common.score")}: <span className="font-bold text-teal-700 dark:text-teal-400">{score}/{questions.length}</span> · {Math.round((score / questions.length) * 100)}%
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <Button onClick={onExit} variant="outline">{t("common.close")}</Button>
              <Button onClick={() => { setIdx(0); setDone(false); setSelected({}); setSubmitted({}); }}>{t("common.retry")}</Button>
            </div>
          </CardBody>
        </Card>
        {xpBreakdown && <XpBreakdownCard breakdown={xpBreakdown} previousXp={previousXp} />}
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mt-4">{t("mcq.reviewAnswers")}</h3>
        {questions.map((qq, i) => {
          const isRight = selected[qq.id] === qq.correctOptionId;
          return (
            <Card key={qq.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{i + 1}. {tr(qq.question)}</div>
                  <Badge tone={isRight ? "green" : "red"}>{isRight ? t("common.correct") : t("common.incorrect")}</Badge>
                </div>
                <div className="text-sm space-y-1 mb-2">
                  {qq.options.map((o) => (
                    <div key={o.id} className={cn(
                      "px-3 py-2 rounded-lg border text-sm",
                      o.id === qq.correctOptionId ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200" :
                      o.id === selected[qq.id] ? "border-rose-400 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200" :
                      "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    )}>{tr(o.text)}</div>
                  ))}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <strong>{t("common.explanation")}:</strong> {tr(qq.explanation)}
                  {qq.reference && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">📖 {qq.reference}</div>}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    );
  }

  const isSubmitted = submitted[q.id];
  const sel = selected[q.id];

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-600 dark:text-slate-400">{t("mcq.questionOf", { n: idx + 1, total: questions.length })}</div>
        <div className="flex items-center gap-2">
          <Badge tone={remaining <= 10 ? "red" : "teal"}>⏱ {remaining}s</Badge>
          <Button size="sm" variant="ghost" onClick={onExit}>{t("common.close")}</Button>
        </div>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-teal-500 transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
      </div>
      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge tone={q.difficulty === "easy" ? "green" : q.difficulty === "medium" ? "amber" : "red"}>{t(`common.${q.difficulty}`)}</Badge>
            <Badge tone="blue">{tr(subjects.find((s) => s.id === q.subjectId)?.name)}</Badge>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{tr(q.question)}</h2>
          <div className="space-y-2">
            {q.options.map((o) => {
              const isSel = sel === o.id;
              const isCorrect = o.id === q.correctOptionId;
              return (
                <button key={o.id} onClick={() => pick(o.id)} disabled={isSubmitted}
                  className={cn("w-full text-start px-4 py-3 rounded-xl border-2 transition-all",
                    !isSubmitted && !isSel && "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/40 dark:hover:bg-teal-900/20",
                    !isSubmitted && isSel && "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-slate-900 dark:text-teal-100",
                    isSubmitted && isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100",
                    isSubmitted && !isCorrect && isSel && "border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-900 dark:text-rose-100",
                    isSubmitted && !isCorrect && !isSel && "border-slate-200 dark:border-slate-800 opacity-60 text-slate-600 dark:text-slate-400",
                  )}>
                  <div className="flex items-start gap-3">
                    <span className={cn("h-6 w-6 rounded-full border-2 grid place-items-center text-xs font-bold shrink-0 mt-0.5",
                      isSel && !isSubmitted ? "border-teal-500 bg-teal-500 text-white" :
                      isSubmitted && isCorrect ? "border-emerald-500 bg-emerald-500 text-white" :
                      isSubmitted && isSel && !isCorrect ? "border-rose-500 bg-rose-500 text-white" :
                      "border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                    )}>{o.id.toUpperCase()}</span>
                    <span className="flex-1 whitespace-normal break-words">{tr(o.text)}</span>
                    {isSubmitted && isCorrect && <span className="text-emerald-600 dark:text-emerald-400 shrink-0">✓</span>}
                    {isSubmitted && !isCorrect && isSel && <span className="text-rose-600 dark:text-rose-400 shrink-0">✕</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {isSubmitted && (
            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm">
              <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{t("common.explanation")}</div>
              <div className="text-slate-700 dark:text-slate-300">{tr(q.explanation)}</div>
              {q.reference && <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">📖 {q.reference}</div>}
            </div>
          )}
          <div className="mt-5 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>← {t("common.previous")}</Button>
            {!isSubmitted ? (
              <Button onClick={handleSubmit} disabled={!sel}>{t("mcq.submit")}</Button>
            ) : idx + 1 < questions.length ? (
              <Button onClick={() => setIdx((i) => i + 1)}>{t("common.next")} →</Button>
            ) : (
              <Button variant="success" onClick={finish}>{t("common.finish")}</Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
