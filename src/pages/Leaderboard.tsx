import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Card, Badge } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import type { AppUser, LeaderboardEntry, QuizResult } from "@/types";
import { useAuthStore } from "@/stores";
import { playSound } from "@/utils/sound";
import { rankForXp } from "@/services/xp";
import { cn } from "@/utils/cn";

type LbRange = "daily" | "weekly" | "monthly" | "allTime";
const RANGE_MS: Record<LbRange, number> = {
  daily:    24 * 3600_000,
  weekly:   7  * 24 * 3600_000,
  monthly:  30 * 24 * 3600_000,
  allTime:  Number.POSITIVE_INFINITY,
};

export default function LeaderboardPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);

  const [range, setRange] = useState<LbRange>("allTime");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);

  // Realtime subscriptions — leaderboard updates instantly as XP changes
  useEffect(() => {
    void dbService.init();
    const unsubU = dbService.subscribe<AppUser>("users", (docs) => setUsers(docs));
    const unsubR = dbService.subscribe<QuizResult>("quizResults", (docs) => setResults(docs));
    return () => { unsubU(); unsubR(); };
  }, []);

  useEffect(() => {
    const cutoff = Date.now() - RANGE_MS[range];
    const scoped = range === "allTime" ? results : results.filter((r) => r.createdAt >= cutoff);
    const acc: Record<string, { total: number; correct: number; count: number; xp: number }> = {};
    for (const r of scoped) {
      const a = acc[r.userId] ||= { total: 0, correct: 0, count: 0, xp: 0 };
      a.total += r.total; a.correct += r.score; a.count += 1;
      // Approximate per-period XP from correct answers (10 per correct)
      a.xp += r.score * 10;
    }
    const list: LeaderboardEntry[] = users.map((u) => {
      const a = acc[u.uid];
      // All-time uses the authoritative user.xp; scoped ranges use the derived period XP.
      const xp = range === "allTime" ? (u.xp || 0) : (a?.xp || 0);
      return {
        userId: u.uid, username: u.username, photoURL: u.photoURL,
        xp,
        quizzes: a?.count || 0,
        accuracy: a?.total ? Math.round((a.correct / a.total) * 100) : 0,
        streak: u.streak || 0,
        country: u.country,
        featured: u.featured,
        isDemo: u.isDemo,
      };
    })
    // Hide users with zero activity in the selected period (except all-time)
    .filter((e) => range === "allTime" || e.xp > 0 || e.featured);
    const sorted = list.sort((a, b) =>
      (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.xp - a.xp);
    setRows(sorted);
    if (me && sorted.slice(0, 3).some((e) => e.userId === me.uid)) {
      setTimeout(() => playSound("reward"), 400);
    }
  }, [users, results, range, me]);

  const myRow = useMemo(() => rows.find((r) => r.userId === me?.uid), [rows, me]);
  const myRank = useMemo(() => {
    if (!me) return null;
    const idx = rows.findIndex((r) => r.userId === me.uid);
    return idx < 0 ? null : idx + 1;
  }, [rows, me]);
  const myTier = useMemo(() => me ? rankForXp(me.xp || 0) : null, [me]);

  return (
    <div className="space-y-5 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">🏆 {t("leaderboard.title")}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t("leaderboard.competeInfo")}</p>
      </header>

      {/* Range tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {(["daily", "weekly", "monthly", "allTime"] as const).map((r) => (
          <button key={r} onClick={() => setRange(r)}
            className={cn(
              "px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition",
              range === r
                ? "border-teal-500 text-teal-700 dark:text-teal-300"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}>
            {t(`leaderboard.${r}`)}
          </button>
        ))}
      </div>

      {/* My rank card */}
      {me && myTier && (
        <Card className="border-teal-500/40">
          <div className="p-4 flex items-center gap-3 flex-wrap">
            <div className="text-3xl">{myTier.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("xp.currentRank")}
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100">
                {myTier.tier} · <span className="text-teal-600 dark:text-teal-400">{me.xp || 0} XP</span>
              </div>
            </div>
            <div className="text-end">
              <div className="text-xs uppercase text-slate-500 dark:text-slate-400">
                {t("leaderboard.rank")}
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100">
                {myRank ? `#${myRank}` : "—"}{myRow ? ` · ${myRow.xp} XP` : ""}
              </div>
            </div>
          </div>
          {myTier.nextTier && (
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>{t("xp.nextRank")}: {myTier.nextTier.emoji} {myTier.nextTier.tier}</span>
                <span>{Math.max(0, myTier.nextTier.minXp - (me.xp || 0))} {t("xp.needed")}</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
                  style={{
                    width: `${Math.min(100, Math.max(0,
                      ((me.xp || 0) - myTier.minXp) /
                      Math.max(1, myTier.nextTier.minXp - myTier.minXp) * 100
                    ))}%`,
                  }} />
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 0, 2].map((rank, i) => {
          const e = rows[rank]; if (!e) return <div key={i} />;
          const heights = [180, 220, 160];
          const colors = ["from-slate-300 to-slate-400", "from-amber-400 to-yellow-500", "from-orange-400 to-orange-500"];
          const medals = ["🥈", "🥇", "🥉"];
          return (
            <div key={e.userId} className="flex flex-col items-center">
              <Avatar name={e.username} src={e.photoURL} size={56} className="mb-1 ring-4 ring-white dark:ring-slate-900" />
              <div className="text-sm font-semibold truncate max-w-full text-slate-900 dark:text-slate-100">{e.username}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{e.xp} XP</div>
              <div className={`w-full mt-2 rounded-t-2xl bg-gradient-to-b ${colors[i]} text-white grid place-items-center pt-3`} style={{ height: heights[i] }}>
                <div className="text-3xl">{medals[i]}</div>
                <div className="text-2xl font-bold">#{rank + 1}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-start">{t("leaderboard.rank")}</th>
                <th className="px-4 py-3 text-start">{t("leaderboard.user")}</th>
                <th className="px-4 py-3">{t("leaderboard.xp")}</th>
                <th className="px-4 py-3">{t("leaderboard.quizzes")}</th>
                <th className="px-4 py-3">{t("leaderboard.accuracy")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">{t("common.emptyState")}</td></tr>}
              {rows.map((e, i) => {
                const isMe = me?.uid === e.userId;
                return (
                  <tr key={e.userId} className={isMe ? "bg-teal-50 dark:bg-teal-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td className="px-4 py-3">
                      <button className="flex items-center gap-2 flex-wrap text-start hover:text-teal-600 dark:hover:text-teal-400"
                        onClick={() => nav(`/u/${e.userId}`)}>
                        <Avatar name={e.username} src={e.photoURL} size={32} />
                        <span className="text-slate-900 dark:text-slate-100">{e.username}</span>
                        {isMe && <Badge tone="teal">{t("leaderboard.you")}</Badge>}
                        {e.featured && <Badge tone="amber">★</Badge>}
                        {e.isDemo && <Badge tone="violet">{t("admin.demo.badge")}</Badge>}
                        {e.country && <span className="text-xs text-slate-500 dark:text-slate-400">📍 {e.country}</span>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-teal-700 dark:text-teal-400">{e.xp}</td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{e.quizzes}</td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                      {e.accuracy}% {e.streak && e.streak > 0 ? <span className="ms-1">· 🔥 {e.streak}</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
