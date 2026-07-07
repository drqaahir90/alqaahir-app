import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { useI18n } from "@/i18n";
import { sessionStore, type StoredSession } from "@/utils/idb";

/**
 * Displays any in-progress learning sessions (MCQ, Case Study, OPD) that
 * the user has saved to IndexedDB. Clicking "Resume" navigates back to
 * the relevant module where the runner auto-hydrates from IndexedDB.
 */
export function ContinueLearning({ userId }: { userId: string }) {
  const { t } = useI18n();
  const nav = useNavigate();
  const [sessions, setSessions] = useState<StoredSession[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const all = await sessionStore.list();
        setSessions(all.filter((s) => s.userId === userId));
      } catch { setSessions([]); }
    })();
  }, [userId]);

  if (sessions.length === 0) {
    return (
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
          ▶ {t("profile.continueLearning")}
        </div>
        <CardBody>
          <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            {t("profile.continue.none")}
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
        ▶ {t("profile.continueLearning")}
      </div>
      <CardBody className="space-y-2">
        {sessions.map((s) => {
          const label = t(`profile.continue.${s.kind}` as "profile.continue.mcq");
          const to = s.kind === "mcq" ? "/mcq" : s.kind === "case" ? "/cases" : "/opd";
          return (
            <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="text-2xl">{s.kind === "mcq" ? "❓" : s.kind === "case" ? "📋" : "🩺"}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(s.updatedAt).toLocaleString()}
                </div>
              </div>
              <Badge tone="teal">In progress</Badge>
              <Button size="sm" onClick={() => nav(to)}>{t("profile.continue.resume")} →</Button>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
