import { useMemo } from "react";
import { Card, CardBody } from "@/components/ui";
import { useI18n } from "@/i18n";
import { cn } from "@/utils/cn";
import type { AppUser, QuizResult } from "@/types";
import type { TranslationKey } from "@/i18n/translations";

interface Achievement {
  id: string;
  icon: string;
  labelKey: TranslationKey;
  unlocked: boolean;
}

/**
 * Computes achievement state purely from the user's local profile + quiz
 * history. Never writes anywhere — achievements are read-only tokens.
 */
export function Achievements({ user, results }: { user: AppUser; results: QuizResult[] }) {
  const { t } = useI18n();

  const list = useMemo<Achievement[]>(() => {
    const anyMcq  = results.some((r) => r.type === "mcq");
    const anyCase = results.some((r) => r.type === "case");
    const anyOpd  = results.some((r) => r.type === "opd");
    const perfect = results.some((r) => r.total > 0 && r.score === r.total);
    const streak  = user.streak || 0;
    const xp      = user.xp || 0;
    const friends = (user.friends || []).length;
    return [
      { id: "firstQuiz", icon: "🎓", labelKey: "profile.ach.firstQuiz", unlocked: anyMcq },
      { id: "firstCase", icon: "📋", labelKey: "profile.ach.firstCase", unlocked: anyCase },
      { id: "firstOpd",  icon: "🩺", labelKey: "profile.ach.firstOpd",  unlocked: anyOpd  },
      { id: "perfect",   icon: "💯", labelKey: "profile.ach.perfect",   unlocked: perfect },
      { id: "streak7",   icon: "🔥", labelKey: "profile.ach.streak7",   unlocked: streak >= 7 },
      { id: "streak30",  icon: "🏆", labelKey: "profile.ach.streak30",  unlocked: streak >= 30 },
      { id: "xp100",     icon: "⚡", labelKey: "profile.ach.xp100",     unlocked: xp >= 100 },
      { id: "xp1000",    icon: "🌟", labelKey: "profile.ach.xp1000",    unlocked: xp >= 1000 },
      { id: "social",    icon: "🤝", labelKey: "profile.ach.social",    unlocked: friends >= 1 },
    ];
  }, [user, results]);

  const unlockedCount = list.filter((a) => a.unlocked).length;

  return (
    <Card>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
        <span>🏆 {t("profile.achievements")}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">
          {unlockedCount} / {list.length}
        </span>
      </div>
      <CardBody>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {list.map((a) => (
            <div key={a.id}
              className={cn(
                "flex flex-col items-center text-center p-2 rounded-xl border-2 transition",
                a.unlocked
                  ? "border-teal-500/40 bg-teal-50 dark:bg-teal-900/20"
                  : "border-slate-200 dark:border-slate-800 opacity-40 grayscale"
              )}
              title={a.unlocked ? t("profile.ach.unlocked") : t("profile.ach.locked")}
            >
              <div className="text-3xl">{a.icon}</div>
              <div className="text-[10px] text-slate-700 dark:text-slate-300 mt-1 leading-tight">
                {t(a.labelKey)}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
