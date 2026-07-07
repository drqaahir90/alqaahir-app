import { useEffect } from "react";
import { Avatar, Badge, Button, Card, CardBody } from "@/components/ui";
import { useI18n } from "@/i18n";
import { XpBreakdownCard } from "@/components/XpBreakdown";
import { playSound } from "@/utils/sound";
import { cn } from "@/utils/cn";
import type { AppUser, Challenge, MCQ } from "@/types";
import type { XpBreakdown } from "@/services/xp";

/**
 * Professional Challenge Result screen — shows both players' scores,
 * a trophy/defeat animation, match statistics, mistakes review, weak
 * topics, XP breakdown, and Retry / Continue actions.
 *
 * Renders whether the current viewer won, lost, or tied.
 */
export function ChallengeResult({
  challenge, me, mcqs, xpBreakdown, previousXp,
  onRetry, onContinue, onReplay,
}: {
  challenge: Challenge;
  me: AppUser;
  mcqs: MCQ[];                     // question set (used to review mistakes)
  xpBreakdown: XpBreakdown | null;
  previousXp: number;
  onRetry: () => void;
  onContinue: () => void;
  onReplay: () => void;
}) {
  const { t, tr } = useI18n();
  const opponentId = challenge.fromId === me.uid ? challenge.toId : challenge.fromId;
  const opponentName = challenge.fromId === me.uid ? challenge.toName : challenge.fromName;
  const opponentPhoto = challenge.fromId === me.uid ? challenge.toPhoto : challenge.fromPhoto;
  const myRes = challenge.results?.[me.uid];
  const opRes = challenge.results?.[opponentId];
  const won = challenge.winnerId === me.uid;
  const tied = !challenge.winnerId && challenge.status === "completed";

  // Compute mistakes (MCQ-typed challenges only for now)
  const mistakes = mcqs.filter((q) => {
    const chosen = myRes?.answers?.[q.id];
    return chosen && chosen !== q.correctOptionId;
  });

  const weakTopics = (() => {
    const counts: Record<string, number> = {};
    for (const m of mistakes) counts[m.subjectId] = (counts[m.subjectId] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  })();

  const myAccuracy = myRes ? Math.round((myRes.score / Math.max(1, myRes.total)) * 100) : 0;
  const opAccuracy = opRes ? Math.round((opRes.score / Math.max(1, opRes.total)) * 100) : 0;

  useEffect(() => {
    playSound(won ? "achievement" : tied ? "levelComplete" : "wrong");
     
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      {/* Verdict banner */}
      <Card className={cn("overflow-hidden",
        won  ? "border-emerald-500/60 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30" :
        tied ? "border-slate-400/60 bg-slate-50 dark:bg-slate-900/40" :
               "border-rose-400/60 bg-rose-50/60 dark:bg-rose-900/20"
      )}>
        <CardBody className="text-center py-6">
          <div className="text-6xl mb-2 animate-slide-up">
            {won ? "🏆" : tied ? "🤝" : "🥈"}
          </div>
          <div className={cn("text-2xl font-extrabold",
            won  ? "text-emerald-700 dark:text-emerald-300" :
            tied ? "text-slate-700 dark:text-slate-200" :
                   "text-rose-700 dark:text-rose-300"
          )}>
            {won ? t("challenge.victory") : tied ? t("challenge.tie2") : t("challenge.defeat")}
          </div>
          {won && <div className="text-4xl mt-2 animate-pulse-soft">✨🎉✨</div>}
        </CardBody>
      </Card>

      {/* Match statistics — side by side */}
      <Card>
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
          📊 {t("challenge.matchStats")}
        </div>
        <CardBody className="grid grid-cols-2 gap-3">
          <PlayerCard name={me.username} photo={me.photoURL} you={true} res={myRes} accuracy={myAccuracy} winner={won} />
          <PlayerCard name={opponentName} photo={opponentPhoto} you={false} res={opRes} accuracy={opAccuracy} winner={challenge.winnerId === opponentId} />
        </CardBody>
      </Card>

      {/* Mistakes review */}
      {mistakes.length > 0 && (
        <Card>
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
            ❌ {t("challenge.mistakes")}
          </div>
          <CardBody className="space-y-2">
            {mistakes.map((q) => {
              const chosen = myRes?.answers?.[q.id];
              const chosenOpt = q.options.find((o) => o.id === chosen);
              const correctOpt = q.options.find((o) => o.id === q.correctOptionId);
              return (
                <div key={q.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">{tr(q.question)}</div>
                  {chosenOpt && (
                    <div className="text-xs text-rose-700 dark:text-rose-300">
                      ✕ <span className="opacity-70">{t("opd.yourAnswer")}:</span> {tr(chosenOpt.text)}
                    </div>
                  )}
                  {correctOpt && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-300">
                      ✓ <span className="opacity-70">{t("opd.correctAnswer")}:</span> {tr(correctOpt.text)}
                    </div>
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <Card>
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
            🎯 {t("challenge.weakTopics")}
          </div>
          <CardBody className="flex flex-wrap gap-2">
            {weakTopics.map(([subj, n]) => (
              <Badge key={subj} tone="amber">
                {subj} · {n} {n === 1 ? "mistake" : "mistakes"}
              </Badge>
            ))}
          </CardBody>
        </Card>
      )}

      {/* XP breakdown */}
      {xpBreakdown && <XpBreakdownCard breakdown={xpBreakdown} previousXp={previousXp} />}

      {/* Actions */}
      <div className="flex gap-2 justify-end flex-wrap">
        <Button variant="outline" onClick={onContinue}>{t("challenge.continueLearning")}</Button>
        <Button variant="outline" onClick={onReplay}>🔁 {t("challenge.replay")}</Button>
        <Button onClick={onRetry}>{t("challenge.retry")}</Button>
      </div>
    </div>
  );
}

function PlayerCard({
  name, photo, you, res, accuracy, winner,
}: {
  name: string; photo?: string; you: boolean;
  res?: import("@/types").ChallengeResult;
  accuracy: number; winner: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("p-3 rounded-xl border-2",
      winner ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Avatar name={name} src={photo} size={32} />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{name}</div>
          {you && <Badge tone="teal">{t("leaderboard.you")}</Badge>}
        </div>
        {winner && <span className="ms-auto text-xl">🏆</span>}
      </div>
      <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{res?.score ?? 0}/{res?.total ?? 0}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {t("challenge.accuracy")}: <strong>{accuracy}%</strong> · {t("challenge.completionTime")}: <strong>{res?.durationSec || 0}s</strong>
      </div>
    </div>
  );
}
