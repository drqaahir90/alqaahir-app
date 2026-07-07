import { Card, CardBody } from "@/components/ui";
import { useI18n } from "@/i18n";
import { rankForXp, xpToNextRank, type XpBreakdown as XpBreakdownData } from "@/services/xp";
import { cn } from "@/utils/cn";

/**
 * Explains every XP point awarded to the user, with rank progress.
 *
 * Used at the end of every learning session (MCQ / Case / OPD / Challenge).
 */
export function XpBreakdownCard({
  breakdown, previousXp, className,
}: { breakdown: XpBreakdownData; previousXp: number; className?: string }) {
  const { t } = useI18n();
  const newXp = previousXp + breakdown.total;
  const prevRank = rankForXp(previousXp);
  const newRank = rankForXp(newXp);
  const leveledUp = prevRank.tier !== newRank.tier;
  const toNext = xpToNextRank(newXp);
  const nextTierMin = newRank.nextTier?.minXp ?? newXp;
  const rangeLen = Math.max(1, nextTierMin - newRank.minXp);
  const rangeProgress = Math.max(0, Math.min(1, (newXp - newRank.minXp) / rangeLen));

  return (
    <Card className={cn("border-teal-500/40 bg-gradient-to-br from-teal-50/60 to-emerald-50/60 dark:from-teal-900/20 dark:to-emerald-900/20", className)}>
      <CardBody className="space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-teal-700 dark:text-teal-400 font-semibold">
              ⚡ {t("xp.gained")}
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              +{breakdown.total}
            </div>
          </div>
          {leveledUp && (
            <div className="text-end animate-fade-in">
              <div className="text-xs uppercase text-amber-600 dark:text-amber-400 font-bold">
                {t("xp.rankUp")}
              </div>
              <div className="text-lg font-bold flex items-center gap-1">
                <span>{newRank.emoji}</span>
                <span className="text-slate-900 dark:text-slate-100">{newRank.tier}</span>
              </div>
            </div>
          )}
        </div>

        {/* Breakdown list */}
        {breakdown.reasons.length > 0 && (
          <div>
            <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 mb-1">
              {t("xp.breakdown")}
            </div>
            <ul className="space-y-1">
              {breakdown.reasons.map((r, i) => (
                <li key={i} className="flex items-center justify-between text-sm bg-white/60 dark:bg-slate-900/40 rounded-lg px-2 py-1">
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    {t(r.key, r.meta as Record<string, string | number>)}
                  </span>
                  <span className={cn("font-semibold shrink-0 ms-2",
                    r.points >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {r.points >= 0 ? "+" : ""}{r.points}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rank progress */}
        <div className="pt-2 border-t border-teal-200/50 dark:border-teal-800/50">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-300">
              {newRank.emoji} <strong>{newRank.tier}</strong>
              <span className="text-slate-400 dark:text-slate-500 ms-1">({newXp} XP)</span>
            </span>
            {newRank.nextTier && (
              <span className="text-slate-500 dark:text-slate-400">
                {toNext} → {newRank.nextTier.emoji} {newRank.nextTier.tier}
              </span>
            )}
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
              style={{ width: `${Math.round(rangeProgress * 100)}%` }} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
