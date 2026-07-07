import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, CardBody, EmptyState, Select } from "@/components/ui";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import { useAuthStore, useUIStore } from "@/stores";
import type { CaseStep, CaseStudy, Difficulty, LocalizedText, MCQOption, QuizResult, Subject } from "@/types";
import { seedSubjects } from "@/data/seed";
import { cn } from "@/utils/cn";
import { playSound } from "@/utils/sound";
import { useLearningSession } from "@/hooks/useLearningSession";
import { computeCaseXp, type XpBreakdown } from "@/services/xp";
import { XpBreakdownCard } from "@/components/XpBreakdown";

// ─── Safe accessors: never throw on missing/corrupt data ───────────

function safeTr(text: LocalizedText | undefined | null, fallback = ""): string {
  if (!text || typeof text !== "object") return fallback;
  return text.en || text.ar || text.so || fallback;
}
function localizedOr(text: LocalizedText | undefined | null, fallback: string): LocalizedText {
  if (text && typeof text === "object") {
    if (text.en || text.ar || text.so) return text;
  }
  return { en: fallback, ar: fallback, so: fallback };
}

/**
 * Normalize any CaseStudy to a shape safe to render.
 * Missing fields are replaced with sensible defaults instead of crashing.
 */
function normalizeCase(c: CaseStudy): CaseStudy {
  const patient = c.patient || { age: 0, sex: "M" as const, presenting: { en: "", ar: "", so: "" } };
  const steps: CaseStep[] = Array.isArray(c.steps) ? c.steps : [];
  const cleanSteps: CaseStep[] = steps.map((raw, i) => {
    const s = raw || ({} as CaseStep);
    const cleaned: CaseStep = {
      id: s.id || `step_${i}`,
      title: localizedOr(s.title, `Step ${i + 1}`),
      content: localizedOr(s.content, ""),
      question: s.question,
      options: Array.isArray(s.options)
        ? s.options
            .filter((o): o is MCQOption => !!o)
            .map((o, oi) => ({
              id: o.id || String.fromCharCode(97 + oi),
              text: localizedOr(o.text, `Option ${String.fromCharCode(65 + oi)}`),
            }))
        : undefined,
      correctOptionId: s.correctOptionId,
      explanation: s.explanation,
    };
    return cleaned;
  });
  return {
    id: c.id || `case_${Date.now()}`,
    title: localizedOr(c.title, ""),
    summary: localizedOr(c.summary, ""),
    patient: {
      age: typeof patient.age === "number" ? patient.age : 0,
      sex: patient.sex === "F" ? "F" : "M",
      presenting: localizedOr(patient.presenting, ""),
    },
    steps: cleanSteps,
    references: Array.isArray(c.references) ? c.references.filter((r) => typeof r === "string") : [],
    subjectId: c.subjectId || "cardio",
    difficulty: (c.difficulty as Difficulty) || "medium",
    imageUrl: c.imageUrl,
    createdAt: typeof c.createdAt === "number" ? c.createdAt : Date.now(),
  };
}

export default function CasesPage() {
  const { t, tr } = useI18n();
  const [items, setItems] = useState<CaseStudy[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>(seedSubjects);
  const [active, setActive] = useState<CaseStudy | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [subject, setSubject] = useState("all");

  useEffect(() => {
    (async () => {
      await dbService.init();
      const raw = await dbService.list<CaseStudy>("caseStudies");
      // Never crash the list on a bad record.
      const clean = raw.map((c) => {
        try { return normalizeCase(c); }
        catch { return null; }
      }).filter(Boolean) as CaseStudy[];
      setItems(clean);
      const subs = await dbService.list<Subject>("subjects"); if (subs.length) setSubjects(subs);
    })();
  }, []);

  const filtered = useMemo(() => items.filter((c) =>
    (difficulty === "all" || c.difficulty === difficulty) &&
    (subject === "all" || c.subjectId === subject)
  ), [items, difficulty, subject]);

  if (active) {
    // Extra safety: wrap runner in error boundary.
    return (
      <ErrorBoundary label={safeTr(active.title, t("cases.untitled"))}>
        <CaseRunner c={active} subjects={subjects} onExit={() => setActive(null)} />
      </ErrorBoundary>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">📋 {t("cases.title")}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{filtered.length} / {items.length}</p>
      </header>
      <Card>
        <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        </CardBody>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.length === 0 ? (
          <div className="md:col-span-2"><EmptyState title={t("common.emptyState")} icon="📋" /></div>
        ) : filtered.map((c) => (
          <Card key={c.id} className="hover:shadow-md transition">
            <CardBody>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={c.difficulty === "easy" ? "green" : c.difficulty === "medium" ? "amber" : "red"}>{t(`common.${c.difficulty}`)}</Badge>
                  <Badge tone="blue">{tr(subjects.find((s) => s.id === c.subjectId)?.name) || c.subjectId}</Badge>
                </div>
                <Badge tone="gray">{c.steps.length} {t("cases.step")}</Badge>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{tr(c.title)}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{tr(c.summary)}</p>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                👤 {c.patient.age || "?"} {c.patient.sex === "M" ? "M" : "F"} — {tr(c.patient.presenting)}
              </div>
              <div className="mt-3">
                <Button size="sm" onClick={() => setActive(c)}>▶ {t("cases.start")}</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface CaseSessionState {
  caseId: string;
  step: number;
  answers: Record<string, string>;
  submitted: Record<string, boolean>;
}

function CaseRunner({ c, onExit, subjects }: { c: CaseStudy; onExit: () => void; subjects: Subject[] }) {
  const { t, tr } = useI18n();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const sessionId = `case:${user?.uid || "anon"}:${c.id}`;
  const { resumed, scheduleSave, clear: clearSession } = useLearningSession<CaseSessionState>({
    id: sessionId, kind: "case", userId: user?.uid || "anon",
  });

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [xpBreakdown, setXpBreakdown] = useState<XpBreakdown | null>(null);
  const [previousXp] = useState<number>(user?.xp || 0);

  // Hydrate once
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !resumed || resumed.caseId !== c.id) return;
    setStep(Math.min(resumed.step, Math.max(0, c.steps.length - 1)));
    setAnswers(resumed.answers || {});
    setSubmitted(resumed.submitted || {});
    hydratedRef.current = true;
  }, [resumed, c.id, c.steps.length]);

  // Persist
  useEffect(() => {
    scheduleSave({ caseId: c.id, step, answers, submitted });
  }, [c.id, step, answers, submitted, scheduleSave]);

  // Guard against empty steps
  if (!Array.isArray(c.steps) || c.steps.length === 0) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Card><CardBody className="text-center py-10">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t("cases.noSteps")}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("cases.chooseAnother")}</p>
          <div className="mt-4"><Button onClick={onExit}>{t("common.close")}</Button></div>
        </CardBody></Card>
      </div>
    );
  }

  const boundedStep = Math.max(0, Math.min(step, c.steps.length - 1));
  const s = c.steps[boundedStep];

  async function complete() {
    setDone(true);
    await clearSession();
    playSound("caseComplete");
    if (user) {
      const withQ = c.steps.filter((x) => x && x.correctOptionId);
      const score = withQ.reduce((n, x) => n + (answers[x.id] === x.correctOptionId ? 1 : 0), 0);
      const bd = computeCaseXp({
        correctCount: score, totalCount: withQ.length,
        difficulty: c.difficulty, streakDays: user.streak || 0,
      });
      setXpBreakdown(bd);
      await dbService.add<Omit<QuizResult, "id">>("quizResults", {
        userId: user.uid, username: user.username, type: "case",
        refIds: [c.id], score, total: withQ.length || 1, durationSec: 0, createdAt: Date.now(),
        subjectId: c.subjectId, difficulty: c.difficulty,
      });
      await dbService.update("users", user.uid, { xp: (user.xp || 0) + bd.total });
      showToast(`+${bd.total} XP`, "success");
    }
  }

  if (done) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Card>
          <CardBody className="text-center py-10">
            <div className="text-5xl mb-3">🏆</div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("cases.completeMsg")}</h2>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={onExit}>{t("common.close")}</Button>
              <Button onClick={() => { setStep(0); setDone(false); setAnswers({}); setSubmitted({}); }}>{t("common.retry")}</Button>
            </div>
            {c.references.length > 0 && (
              <div className="mt-6 text-start text-sm">
                <div className="font-semibold mb-1 text-slate-800 dark:text-slate-200">{t("cases.references")}</div>
                <ul className="text-slate-600 dark:text-slate-400 list-disc ps-5">
                  {c.references.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
        {xpBreakdown && <XpBreakdownCard breakdown={xpBreakdown} previousXp={previousXp} className="mt-4" />}
      </div>
    );
  }

  const isSubmitted = submitted[s.id];
  const sel = answers[s.id];
  const hasQuestion = !!(s.question && s.options && s.options.length > 0);

  function handleSubmit() {
    if (!sel || !s.correctOptionId) return;
    setSubmitted((sm) => ({ ...sm, [s.id]: true }));
    playSound(sel === s.correctOptionId ? "correct" : "wrong");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">{tr(subjects.find((x) => x.id === c.subjectId)?.name) || c.subjectId}</div>
          <h1 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate">{tr(c.title)}</h1>
        </div>
        <Button size="sm" variant="ghost" onClick={onExit}>{t("common.close")}</Button>
      </div>

      <Card>
        <CardBody>
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            👤 {t("cases.patient")}: {c.patient.age || "?"}y {c.patient.sex} — {tr(c.patient.presenting)}
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-teal-500 transition-all" style={{ width: `${((boundedStep + 1) / c.steps.length) * 100}%` }} />
          </div>
          <div className="text-xs uppercase tracking-wide text-teal-700 dark:text-teal-400 font-semibold mb-1">
            {t("cases.step")} {boundedStep + 1} / {c.steps.length}
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{tr(s.title)}</h3>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{tr(s.content)}</p>

          {hasQuestion && (
            <div className="mt-5">
              <div className="font-medium mb-3 text-slate-900 dark:text-slate-100">{tr(s.question)}</div>
              <div className="space-y-2">
                {s.options!.map((o) => {
                  const isSel = sel === o.id;
                  const isCorrect = o.id === s.correctOptionId;
                  const optionText = tr(o.text) || o.id.toUpperCase();
                  return (
                    <button
                      key={o.id}
                      onClick={() => { if (!isSubmitted) setAnswers((a) => ({ ...a, [s.id]: o.id })); }}
                      disabled={isSubmitted}
                      className={cn(
                        "w-full text-start px-4 py-3 rounded-xl border-2 transition-all block",
                        !isSubmitted && !isSel && "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/40 dark:hover:bg-teal-900/20",
                        !isSubmitted && isSel && "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-slate-900 dark:text-teal-100",
                        isSubmitted && isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100",
                        isSubmitted && !isCorrect && isSel && "border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-900 dark:text-rose-100",
                        isSubmitted && !isCorrect && !isSel && "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-70",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn(
                          "h-6 w-6 rounded-full border-2 grid place-items-center text-xs font-bold shrink-0 mt-0.5",
                          isSel && !isSubmitted ? "border-teal-500 bg-teal-500 text-white" :
                          isSubmitted && isCorrect ? "border-emerald-500 bg-emerald-500 text-white" :
                          isSubmitted && isSel && !isCorrect ? "border-rose-500 bg-rose-500 text-white" :
                          "border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                        )}>{o.id.toUpperCase()}</span>
                        <span className="flex-1 text-sm sm:text-base whitespace-normal break-words">{optionText}</span>
                        {isSubmitted && isCorrect && <span className="text-emerald-600 dark:text-emerald-400 shrink-0">✓</span>}
                        {isSubmitted && !isCorrect && isSel && <span className="text-rose-600 dark:text-rose-400 shrink-0">✕</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {isSubmitted && s.explanation && (
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{t("common.explanation")}</div>
                  <div className="text-slate-700 dark:text-slate-300">{tr(s.explanation)}</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between">
            <Button variant="ghost" disabled={boundedStep === 0} onClick={() => setStep((n) => Math.max(0, n - 1))}>← {t("common.previous")}</Button>
            {hasQuestion && s.correctOptionId && !isSubmitted ? (
              <Button disabled={!sel} onClick={handleSubmit}>{t("mcq.submit")}</Button>
            ) : boundedStep + 1 < c.steps.length ? (
              <Button onClick={() => setStep((n) => n + 1)}>{t("common.next")} →</Button>
            ) : (
              <Button variant="success" onClick={complete}>{t("common.finish")}</Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
