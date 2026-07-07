import { useMemo } from "react";
import { Card, CardBody } from "@/components/ui";
import { useI18n } from "@/i18n";
import type { QuizResult } from "@/types";

/**
 * Aggregates the user's quiz history into weekly / monthly / all-time
 * metrics + a per-type breakdown. Pure client-side computation — no
 * Firestore reads beyond what the parent page already made.
 */
export function LearningStats({ results }: { results: QuizResult[] }) {
  const { t } = useI18n();
  const now = Date.now();
  const week = 7 * 86400000;
  const month = 30 * 86400000;

  const buckets = useMemo(() => {
    const summarize = (rs: QuizResult[]) => {
      const total = rs.reduce((s, r) => s + r.total, 0);
      const correct = rs.reduce((s, r) => s + r.score, 0);
      return {
        quizzes: rs.length,
        total,
        correct,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
      };
    };
    return {
      week: summarize(results.filter((r) => now - r.createdAt < week)),
      month: summarize(results.filter((r) => now - r.createdAt < month)),
      all: summarize(results),
    };
     
  }, [results]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of results) map[r.type] = (map[r.type] || 0) + 1;
    return map;
     
  }, [results]);

  const byDifficulty = useMemo(() => {
    const map: Record<string, { total: number; correct: number; count: number }> = {};
    for (const r of results) {
      const d = r.difficulty || "unknown";
      const a = map[d] ||= { total: 0, correct: 0, count: 0 };
      a.total += r.total; a.correct += r.score; a.count += 1;
    }
    return map;
     
  }, [results]);

  return (
    <Card>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
        📊 {t("profile.stats.title")}
      </div>
      <CardBody className="space-y-4">
        {/* Weekly / monthly / all-time */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatCell label={t("profile.stats.thisWeek")}  b={buckets.week}  />
          <StatCell label={t("profile.stats.thisMonth")} b={buckets.month} />
          <StatCell label={t("profile.stats.total")}     b={buckets.all}   />
        </div>

        {/* By type */}
        <div>
          <div className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-1">
            {t("profile.stats.byType")}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byType).length === 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400">{t("common.emptyState")}</div>
            )}
            {Object.entries(byType).map(([k, v]) => (
              <span key={k} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
                {k.toUpperCase()} · <strong>{v}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* By difficulty */}
        <div>
          <div className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-1">
            {t("profile.stats.byDifficulty")}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byDifficulty).length === 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400">{t("common.emptyState")}</div>
            )}
            {Object.entries(byDifficulty).map(([d, v]) => (
              <span key={d} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
                {d} · <strong>{v.count}</strong> · {v.total ? Math.round(v.correct / v.total * 100) : 0}%
              </span>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function StatCell({ label, b }: { label: string; b: { quizzes: number; accuracy: number } }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
      <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 tracking-wide">{label}</div>
      <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{b.quizzes}</div>
      <div className="text-xs text-teal-600 dark:text-teal-400">{b.accuracy}%</div>
    </div>
  );
}
