import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardBody, EmptyState } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import { useAuthStore } from "@/stores";
import { cn } from "@/utils/cn";
import type { Notification, NotificationPriority } from "@/types";

/**
 * Archive state lives entirely on the client (localStorage) so we never
 * mutate the shared notification document. Each user has their own archive list.
 */
const archiveKey = (uid: string) => `medacad.notif.archive:${uid}`;
function loadArchive(uid: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(archiveKey(uid)) || "[]")); }
  catch { return new Set(); }
}
function saveArchive(uid: string, set: Set<string>) {
  try { localStorage.setItem(archiveKey(uid), JSON.stringify(Array.from(set))); }
  catch { /* quota — ignore */ }
}

type NotifFilter = "all" | "unread" | "archived" | "priority";

const PRIORITY_STYLES: Record<NotificationPriority, { tone: "gray" | "blue" | "amber" | "red"; bar: string; icon: string }> = {
  low:     { tone: "gray",  bar: "bg-slate-400",     icon: "•" },
  normal:  { tone: "blue",  bar: "bg-sky-500",       icon: "ℹ️" },
  high:    { tone: "amber", bar: "bg-amber-500",     icon: "⚠️" },
  urgent:  { tone: "red",   bar: "bg-rose-600 animate-pulse-soft", icon: "🚨" },
};

function iconForKind(kind?: string): string {
  switch (kind) {
    case "friend_request":   return "👋";
    case "friend_accept":    return "🤝";
    case "challenge_invite": return "⚡";
    case "challenge_result": return "🏆";
    case "message":          return "💬";
    case "achievement":      return "🎉";
    case "personal":         return "✉️";
    case "reminder":         return "⏰";
    default:                 return "📢";
  }
}

export default function NotificationsPage() {
  const { t, tr } = useI18n();
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<NotifFilter>("all");
  const [archived, setArchived] = useState<Set<string>>(() =>
    user ? loadArchive(user.uid) : new Set()
  );

  useEffect(() => {
    if (user) setArchived(loadArchive(user.uid));
  }, [user]);

  function toggleArchive(id: string) {
    if (!user) return;
    const next = new Set(archived);
    if (next.has(id)) next.delete(id); else next.add(id);
    setArchived(next);
    saveArchive(user.uid, next);
  }

  function openLink(n: Notification) {
    if (!n.link) return;
    const path = n.link.replace(/^#/, "");
    nav(path);
  }

  useEffect(() => {
    return dbService.subscribe<Notification>("notifications", (docs) => {
      if (!user) return;
      const filtered = docs
        .filter((n) =>
          n.audience === "broadcast" ||
          n.userId === user.uid ||
          (n.userIds || []).includes(user.uid),
        )
        .sort((a, b) => b.createdAt - a.createdAt);
      setItems(filtered);
    });
  }, [user]);

  function isRead(n: Notification): boolean {
    if (!user) return true;
    if (n.audience === "personal") return !!n.read;
    return (n.readBy || []).includes(user.uid);
  }

  async function markRead(n: Notification) {
    if (!user) return;
    if (n.audience === "personal") {
      await dbService.update<Notification>("notifications", n.id, { read: true });
    } else {
      const readBy = Array.from(new Set([...(n.readBy || []), user.uid]));
      await dbService.update<Notification>("notifications", n.id, { readBy });
    }
  }
  async function markAll() {
    if (!user) return;
    await Promise.all(items.filter((n) => !isRead(n)).map((n) => markRead(n)));
  }

  const unread = items.filter((n) => !isRead(n)).length;

  const visible = useMemo(() => {
    return items.filter((n) => {
      const isArch = archived.has(n.id);
      if (filter === "archived") return isArch;
      if (isArch) return false;
      if (filter === "unread") return !isRead(n);
      if (filter === "priority") return n.priority === "high" || n.priority === "urgent";
      return true;
    });
     
  }, [items, filter, archived]);

  const filters: { id: NotifFilter; label: string; count: number }[] = [
    { id: "all",       label: t("notif.filter.all"),      count: items.filter((n) => !archived.has(n.id)).length },
    { id: "unread",    label: t("notif.filter.unread"),   count: unread },
    { id: "priority",  label: t("notif.filter.priority"), count: items.filter((n) => (n.priority === "high" || n.priority === "urgent") && !archived.has(n.id)).length },
    { id: "archived",  label: t("notif.filter.archived"), count: archived.size },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">🔔 {t("notif.title")}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{unread} {t("notif.unread")} · {items.length} {t("notif.total")}</p>
        </div>
        {unread > 0 && <Button variant="outline" size="sm" onClick={markAll}>{t("notif.markAllRead")}</Button>}
      </header>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition",
              filter === f.id
                ? "border-teal-500 text-teal-700 dark:text-teal-300"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            {f.label} {f.count > 0 && <Badge tone="teal" className="ms-1">{f.count}</Badge>}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <EmptyState
            title={filter === "archived" ? t("notif.emptyArchive") : t("common.emptyState")}
            icon="🔕"
          />
        ) : visible.map((n) => {
            const read = isRead(n);
            const p = PRIORITY_STYLES[n.priority || "normal"];
            return (
              <Card key={n.id} className={cn("overflow-hidden", read && "opacity-70")}>
                <div className="flex">
                  <div className={cn("w-1.5 shrink-0", p.bar)} />
                  <div className="flex-1 min-w-0">
                    <CardBody>
                      <div className="flex items-start gap-3">
                        <div className="text-2xl shrink-0">{iconForKind(n.kind) !== "📢" ? iconForKind(n.kind) : p.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{tr(n.title)}</span>
                            <Badge tone={n.audience === "broadcast" ? "blue" : n.audience === "group" ? "violet" : "teal"}>
                              {n.audience === "broadcast" ? t("notif.broadcast") : n.audience === "group" ? t("notif.group") : t("notif.personal")}
                            </Badge>
                            <Badge tone={p.tone}>{t(`notif.priority.${n.priority || "normal"}`)}</Badge>
                            {!read && <span className="h-2 w-2 rounded-full bg-teal-500 inline-block" />}
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 whitespace-pre-wrap">{tr(n.body)}</p>
                          {n.imageUrl && (
                            <a href={n.imageUrl} target="_blank" rel="noreferrer">
                              <img src={n.imageUrl} alt="notification" className="mt-2 rounded-xl max-h-64 object-cover" />
                            </a>
                          )}
                          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(n.createdAt).toLocaleString()}</span>
                            <div className="flex items-center gap-2">
                              {n.link && (
                                <button onClick={() => { markRead(n); openLink(n); }}
                                  className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-medium">
                                  {t("common.viewAll")} →
                                </button>
                              )}
                              {!read && <button onClick={() => markRead(n)} className="text-xs text-teal-700 dark:text-teal-400 hover:underline">{t("notif.markRead")}</button>}
                              <button onClick={() => toggleArchive(n.id)}
                                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                title={archived.has(n.id) ? t("notif.unarchive") : t("notif.archive")}>
                                {archived.has(n.id) ? "↩" : "📥"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
