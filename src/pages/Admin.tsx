import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { Avatar, Badge, Button, Card, CardBody, EmptyState, Input, Modal, Select, Stat, Textarea } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dbService, type CollName } from "@/services/db";
import { isProtectedAdmin } from "@/services/auth";
import { storageService } from "@/services/storage";
import { useAuthStore, useUIStore } from "@/stores";
import type {
  AboutBlock, AboutBlockType, AboutSettings,
  AppUser, AuditLog, BrandingAssets, CaseStudy, EducationArticle, EducationStatus, MCQ,
  ModerationAction, Notification, NotificationPriority, OPDCase, QuizResult, SiteSettings, UserStatus,
} from "@/types";
import { cn } from "@/utils/cn";
import { seedSubjects } from "@/data/seed";

export default function Admin() {
  const { t } = useI18n();
  const items = [
    { to: "/admin", label: t("admin.overview"), icon: "📊", end: true },
    { to: "/admin/users", label: t("admin.users"), icon: "👥" },
    { to: "/admin/mcqs", label: t("admin.mcqManager"), icon: "❓" },
    { to: "/admin/cases", label: t("admin.caseManager"), icon: "📋" },
    { to: "/admin/opd", label: t("admin.opdManager"), icon: "🩺" },
    { to: "/admin/education", label: t("admin.eduCms"), icon: "📚" },
    { to: "/admin/leaderboard", label: t("admin.leaderboardManager"), icon: "🏆" },
    { to: "/admin/streaks", label: t("admin.streakManager"), icon: "🔥" },
    { to: "/admin/demo", label: t("admin.demoUsers"), icon: "🧪" },
    { to: "/admin/reports", label: t("admin.reports"), icon: "📈" },
    { to: "/admin/import", label: t("admin.bulkImport"), icon: "⬆️" },
    { to: "/admin/notifications", label: t("nav.notifications"), icon: "📢" },
    { to: "/admin/chats", label: t("admin.chatMgr"), icon: "💬" },
    { to: "/admin/branding", label: t("admin.branding"), icon: "🎨" },
    { to: "/admin/about", label: t("admin.aboutMgr"), icon: "ℹ️" },
    { to: "/admin/audit", label: t("admin.audit"), icon: "📜" },
    { to: "/admin/settings", label: t("admin.settings"), icon: "⚙️" },
    { to: "/admin/review", label: t("admin.reviewChecklist"), icon: "✅" },
  ];
  return (
    <div className="animate-fade-in">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">🛡️ {t("admin.title")}</h1>
      </header>
      <div className="grid lg:grid-cols-[220px_1fr] gap-4">
        <nav className="lg:sticky lg:top-20 self-start bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap",
              isActive ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
            )}>
              <span>{i.icon}</span><span>{i.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="mcqs" element={<MCQManager />} />
            <Route path="cases" element={<CaseManager />} />
            <Route path="opd" element={<OPDManager />} />
            <Route path="education" element={<EducationManager />} />
            <Route path="leaderboard" element={<LeaderboardManager />} />
            <Route path="streaks" element={<StreakManager />} />
            <Route path="demo" element={<DemoUsersManager />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="import" element={<AdminImport />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="branding" element={<BrandingManager />} />
            <Route path="chats" element={<ChatManager />} />
            <Route path="about" element={<AboutUsManager />} />
            <Route path="audit" element={<AdminAudit />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="review" element={<AdminReviewChecklist />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

// ═════════════════ Overview (clickable dashboard) ═════════════════
function AdminOverview() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [counts, setCounts] = useState({ users: 0, mcqs: 0, cases: 0, opd: 0, articles: 0, chats: 0, results: 0, notifications: 0 });
  useEffect(() => {
    (async () => {
      setCounts({
        users: (await dbService.list("users")).length,
        mcqs: (await dbService.list("mcqs")).length,
        cases: (await dbService.list("caseStudies")).length,
        opd: (await dbService.list("opdCases")).length,
        articles: (await dbService.list("educationArticles")).length,
        chats: (await dbService.list("chatThreads")).length,
        results: (await dbService.list("quizResults")).length,
        notifications: (await dbService.list("notifications")).length,
      });
    })();
  }, []);
  const cards: Array<{ label: string; value: number; icon: string; tone: "teal" | "blue" | "violet" | "red" | "amber" | "green" | "gray"; to: string }> = [
    { label: t("admin.users"), value: counts.users, icon: "👥", tone: "teal",   to: "/admin/users" },
    { label: t("admin.mcqManager"), value: counts.mcqs, icon: "❓", tone: "blue",   to: "/admin/mcqs" },
    { label: t("admin.caseManager"), value: counts.cases, icon: "📋", tone: "violet", to: "/admin/cases" },
    { label: t("admin.opdManager"), value: counts.opd, icon: "🩺", tone: "red",    to: "/admin/opd" },
    { label: t("admin.eduCms"), value: counts.articles, icon: "📚", tone: "amber",  to: "/admin/education" },
    { label: t("admin.leaderboardManager"), value: counts.results, icon: "🏆", tone: "amber",  to: "/admin/leaderboard" },
    { label: t("admin.streakManager"), value: 0, icon: "🔥", tone: "red",    to: "/admin/streaks" },
    { label: t("admin.chat"), value: counts.chats, icon: "💬", tone: "green",  to: "/admin/notifications" },
    { label: t("nav.notifications"), value: counts.notifications, icon: "📢", tone: "blue",  to: "/admin/notifications" },
    { label: t("admin.reports"), value: counts.results, icon: "📈", tone: "gray",   to: "/admin/reports" },
    { label: t("admin.branding"), value: 0, icon: "🎨", tone: "violet", to: "/admin/branding" },
    { label: t("admin.settings"), value: 0, icon: "⚙️", tone: "gray",   to: "/admin/settings" },
    { label: t("admin.reviewChecklist"), value: 0, icon: "✅", tone: "green", to: "/admin/review" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <button key={c.to} onClick={() => nav(c.to)}
          className="text-start hover:scale-[1.02] active:scale-[0.98] transition-transform">
          <Stat label={c.label} value={c.value || "→"} icon={<span>{c.icon}</span>} tone={c.tone} />
        </button>
      ))}
    </div>
  );
}

// ═════════════════ Advanced User Management ═════════════════
function AdminUsers() {
  const { t } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [detail, setDetail] = useState<AppUser | null>(null);
  const [modOpen, setModOpen] = useState<{ user: AppUser; type: ModerationAction["type"] } | null>(null);

  async function load() { setUsers(await dbService.list<AppUser>("users")); }
  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    if (statusFilter !== "all" && (u.status || "active") !== statusFilter) return false;
    if (!q) return true;
    return u.username.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase());
  });

  async function setRole(u: AppUser, role: "admin" | "user") {
    if (isProtectedAdmin(u) && role !== "admin") {
      showToast(t("admin.users.protectedNoDemote"), "error");
      return;
    }
    await dbService.update<AppUser>("users", u.uid, { role });
    await audit(me?.uid, `user.${role === "admin" ? "promote" : "demote"}`, u.uid);
    showToast(t("common.roleUpdated"), "success"); load();
  }

  async function applyModeration(u: AppUser, type: ModerationAction["type"], reason: string, expiresAt?: number) {
    // Never allow the super-admin to be sanctioned/deleted.
    if (isProtectedAdmin(u) && type !== "reactivate") {
      showToast(t("admin.users.protectedNoMod"), "error");
      return;
    }
    const action: ModerationAction = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type, reason, by: me?.uid || "system", byName: me?.username, at: Date.now(), expiresAt,
    };
    let patch: Partial<AppUser> = { moderation: [...(u.moderation || []), action] };
    switch (type) {
      case "warn":       patch = { ...patch, status: "warned", warnings: (u.warnings || 0) + 1 }; break;
      case "suspend":    patch = { ...patch, status: "suspended" }; break;
      case "temp_ban":   patch = { ...patch, status: "banned", banUntil: expiresAt }; break;
      case "perm_ban":   patch = { ...patch, status: "banned", banUntil: undefined }; break;
      case "disable":    patch = { ...patch, status: "disabled" }; break;
      case "reactivate": patch = { ...patch, status: "active", banUntil: undefined }; break;
      case "delete":     patch = { ...patch, status: "deleted" }; break;
    }
    await dbService.update<AppUser>("users", u.uid, patch);
    await audit(me?.uid, `user.${type}`, u.uid, { reason, expiresAt });
    showToast(`Applied ${type.replace("_", " ")}`, "success");
    load();
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-[1fr_auto] gap-2">
        <Input placeholder={t("admin.searchPh")} value={q} onChange={(e) => setQ(e.target.value)} />
        <Select label="" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as UserStatus | "all")}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="warned">Warned</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
          <option value="disabled">Disabled</option>
          <option value="deleted">Deleted</option>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => exportUsersCsv(filtered)}>
          ⬇ {t("admin.users.exportCsv")}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-3 text-start">{t("admin.users.fullName")}</th>
                <th className="px-3 py-3 text-start">{t("admin.users.uid")}</th>
                <th className="px-3 py-3 text-start">{t("admin.users.email")}</th>
                <th className="px-3 py-3 text-start">{t("admin.users.phone")}</th>
                <th className="px-3 py-3 text-start">{t("admin.users.country")}</th>
                <th className="px-3 py-3 text-start">{t("admin.users.registeredAt")}</th>
                <th className="px-3 py-3 text-start">{t("common.status")}</th>
                <th className="px-3 py-3 text-start">{t("profile.role")}</th>
                <th className="px-3 py-3">{t("admin.users.lastSeen")}</th>
                <th className="px-3 py-3">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-300">
              {filtered.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-slate-500 dark:text-slate-400">{t("common.emptyState")}</td></tr>}
              {filtered.map((u) => {
                const s = u.status || "active";
                return (
                  <tr key={u.uid} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2">
                      <button className="flex items-center gap-2 text-start" onClick={() => setDetail(u)}>
                        <Avatar name={u.username} src={u.photoURL} size={32} />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[10rem]">{u.username}</div>
                          {u.isDemo && <Badge tone="violet">{t("admin.demo.badge")}</Badge>}
                          {isProtectedAdmin(u) && <Badge tone="amber">👑</Badge>}
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={async () => {
                          try { await navigator.clipboard.writeText(u.uid); showToast(t("admin.users.copied"), "success"); }
                          catch { showToast(u.uid, "info"); }
                        }}
                        title={t("admin.users.copyUid")}
                        className="font-mono text-[10px] text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-400 truncate max-w-[8rem] block"
                      >{u.uid}</button>
                    </td>
                    <td className="px-3 py-2 text-xs truncate max-w-[12rem]">{u.email || "—"}</td>
                    <td className="px-3 py-2 text-xs truncate max-w-[9rem]">{u.whatsapp || "—"}</td>
                    <td className="px-3 py-2 text-xs">{u.country || "—"}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <Badge tone={s === "active" ? "green" : s === "warned" ? "amber" : s === "banned" || s === "suspended" ? "red" : "gray"}>{s}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={u.role === "admin" ? "violet" : "gray"}>{u.role}</Badge>
                    </td>
                    <td className="px-3 py-2 text-center text-xs whitespace-nowrap">{u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {isProtectedAdmin(u) ? (
                          <Badge tone="amber">🔒</Badge>
                        ) : u.role === "admin"
                          ? <Button size="sm" variant="outline" onClick={() => setRole(u, "user")}>{t("admin.users.demote")}</Button>
                          : <Button size="sm" onClick={() => setRole(u, "admin")}>{t("admin.users.promote")}</Button>}
                        <Button size="sm" variant="ghost" onClick={() => setDetail(u)}>⚙</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? detail.username : ""} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={detail.username} src={detail.photoURL} size={64} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {detail.username}
                  {isProtectedAdmin(detail) && <Badge tone="amber">👑</Badge>}
                  {detail.isDemo && <Badge tone="violet">{t("admin.demo.badge")}</Badge>}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">📧 {detail.email}</div>
                <button
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(detail.uid); showToast(t("admin.users.copied"), "success"); }
                    catch { showToast(detail.uid, "info"); }
                  }}
                  title={t("admin.users.copyUid")}
                  className="text-[10px] font-mono text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-400 truncate max-w-full block text-start"
                >🆔 {detail.uid}</button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">{t("admin.users.phone")}</div>
                <div className="text-slate-800 dark:text-slate-100 truncate">{detail.whatsapp || "—"}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">{t("admin.users.country")}</div>
                <div className="text-slate-800 dark:text-slate-100">{detail.country || "—"}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">{t("admin.users.registeredAt")}</div>
                <div className="text-slate-800 dark:text-slate-100">{new Date(detail.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">{t("common.language")}</div>
                <div className="text-slate-800 dark:text-slate-100">{detail.language || "—"}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">{t("admin.users.lastSeen")}</div>
                <div className="text-slate-800 dark:text-slate-100">{detail.lastActiveAt ? new Date(detail.lastActiveAt).toLocaleString() : "—"}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">{t("profile.role")}</div>
                <div className="text-slate-800 dark:text-slate-100 capitalize">{detail.role}</div>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-2 text-center">
              <MiniCell label="XP" value={detail.xp || 0} />
              <MiniCell label="Warnings" value={detail.warnings || 0} />
              <MiniCell label="Status" value={detail.status || "active"} />
            </div>

            <div>
              <div className="font-semibold text-sm mb-2 text-slate-800 dark:text-slate-100">Moderation actions</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setModOpen({ user: detail, type: "warn" })}>⚠️ Warn</Button>
                <Button size="sm" variant="outline" onClick={() => setModOpen({ user: detail, type: "suspend" })}>⏸ Suspend</Button>
                <Button size="sm" variant="outline" onClick={() => setModOpen({ user: detail, type: "temp_ban" })}>⏳ Temp ban</Button>
                <Button size="sm" variant="danger" onClick={() => setModOpen({ user: detail, type: "perm_ban" })}>⛔ Perm ban</Button>
                <Button size="sm" variant="outline" onClick={() => setModOpen({ user: detail, type: "disable" })}>🚫 Disable login</Button>
                <Button size="sm" variant="success" onClick={() => setModOpen({ user: detail, type: "reactivate" })}>✅ Reactivate</Button>
                <Button size="sm" variant="danger" onClick={() => setModOpen({ user: detail, type: "delete" })}>🗑 Delete account</Button>
              </div>
            </div>

            <div>
              <div className="font-semibold text-sm mb-2 text-slate-800 dark:text-slate-100">Moderation history</div>
              {!detail.moderation?.length ? <div className="text-xs text-slate-500 dark:text-slate-400">{t("admin.users.noModActions")}</div> : (
                <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                  {detail.moderation.slice().reverse().map((m) => (
                    <li key={m.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <span className="font-semibold uppercase text-teal-700 dark:text-teal-400 me-2">{m.type}</span>
                      <span className="text-slate-700 dark:text-slate-300">{m.reason}</span>
                      <span className="text-slate-500 dark:text-slate-400 block">
                        by {m.byName || m.by} · {new Date(m.at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="font-semibold text-sm mb-2 text-slate-800 dark:text-slate-100">Login history</div>
              {!detail.loginHistory?.length ? <div className="text-xs text-slate-500 dark:text-slate-400">{t("admin.users.noHistory")}</div> : (
                <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {detail.loginHistory.slice().reverse().slice(0, 20).map((r, i) => (
                    <li key={i} className="text-slate-600 dark:text-slate-400">
                      {new Date(r.at).toLocaleString()} {r.ip ? `· ${r.ip}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ModerationDialog
        open={!!modOpen}
        action={modOpen?.type || null}
        onCancel={() => setModOpen(null)}
        onConfirm={(reason, expiresAt) => {
          if (modOpen) {
            applyModeration(modOpen.user, modOpen.type, reason, expiresAt);
            setModOpen(null); setDetail(null);
          }
        }}
      />
    </div>
  );
}

function MiniCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2">
      <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function ModerationDialog({
  open, action, onCancel, onConfirm,
}: { open: boolean; action: ModerationAction["type"] | null; onCancel: () => void; onConfirm: (reason: string, expiresAt?: number) => void }) {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  useEffect(() => { if (!open) { setReason(""); setDays(7); } }, [open]);
  if (!action) return null;
  const isTemp = action === "temp_ban";
  return (
    <Modal open={open} onClose={onCancel} title={`Confirm: ${action.replace("_", " ")}`} size="sm">
      <div className="space-y-3">
        <Textarea label="Reason (required)" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        {isTemp && (
          <Input label="Duration (days)" type="number" value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value)))} />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button
            variant={action === "delete" || action === "perm_ban" ? "danger" : "primary"}
            onClick={() => onConfirm(reason.trim() || "(no reason provided)", isTemp ? Date.now() + days * 86400000 : undefined)}
            disabled={!reason.trim()}
          >
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ═════════════════ Generic Content Manager (used by MCQ/Case/OPD) ═════════════════
interface ManagerConfig<T> {
  title: string;
  icon: string;
  coll: CollName;
  getTitle: (x: T) => string;
  getSubtitle?: (x: T) => string;
  getBadges?: (x: T) => { tone: "gray" | "green" | "amber" | "red" | "blue" | "violet" | "teal"; label: string }[];
  emptyTemplate: () => T;
}

function ContentManager<T extends { id: string; createdAt?: number; status?: string }>({ config }: { config: ManagerConfig<T> }) {
  const { t } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const me = useAuthStore((s) => s.user);
  const [items, setItems] = useState<T[]>([]);
  const [q, setQ] = useState("");
  const [editOpen, setEditOpen] = useState<T | null>(null);
  const [previewOpen, setPreviewOpen] = useState<T | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() { setItems(await dbService.list<T>(config.coll)); }
  useEffect(() => { load(); }, [config.coll]);

  const filtered = useMemo(() => items.filter((x) => {
    if (!q.trim()) return true;
    return JSON.stringify(x).toLowerCase().includes(q.toLowerCase());
  }), [items, q]);

  function toggleSelect(id: string) {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((x) => x.id)));
  }
  function clearSelection() { setSelected(new Set()); }

  const supportsStatus = config.coll === "educationArticles";
  const selectedItems = filtered.filter((x) => selected.has(x.id));

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(t("admin.bulk.confirmDelete"))) return;
    for (const id of selected) {
      await dbService.remove(config.coll, id);
    }
    await audit(me?.uid, `${config.coll}.bulkDelete`, undefined, { count: selected.size });
    showToast(t("admin.bulk.done"), "success");
    clearSelection(); load();
  }
  async function bulkPublish(publish: boolean) {
    if (selected.size === 0) return;
    for (const x of selectedItems) {
      await dbService.update<{ status: string; updatedAt: number }>(
        config.coll, x.id,
        { status: publish ? "published" : "draft", updatedAt: Date.now() },
      );
    }
    await audit(me?.uid, `${config.coll}.bulk${publish ? "Publish" : "Unpublish"}`, undefined, { count: selected.size });
    showToast(t("admin.bulk.done"), "success");
    clearSelection(); load();
  }
  async function bulkArchive() {
    if (selected.size === 0) return;
    for (const x of selectedItems) {
      await dbService.update<{ status: string; updatedAt: number }>(
        config.coll, x.id,
        { status: "archived", updatedAt: Date.now() },
      );
    }
    await audit(me?.uid, `${config.coll}.bulkArchive`, undefined, { count: selected.size });
    showToast(t("admin.bulk.done"), "success");
    clearSelection(); load();
  }
  function bulkExport() {
    if (selected.size === 0) return;
    const payload = selectedItems;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `qcap-${config.coll}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function openEdit(x: T | null) {
    const target = x ?? { ...config.emptyTemplate(), id: `${config.coll}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() } as T;
    setEditOpen(target);
    setText(JSON.stringify(target, null, 2));
    setErr("");
  }

  async function save() {
    try {
      const parsed = JSON.parse(text) as T;
      if (!parsed.id) throw new Error("`id` is required.");
      await dbService.set(config.coll, parsed.id, parsed as T & { id: string });
      await audit(me?.uid, `${config.coll}.edit`, parsed.id);
      showToast(t("common.saved"), "success"); setEditOpen(null); load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Invalid JSON"); }
  }

  async function del(x: T) {
    if (!confirm(`Delete "${config.getTitle(x)}"?`)) return;
    await dbService.remove(config.coll, x.id);
    await audit(me?.uid, `${config.coll}.delete`, x.id);
    showToast("Deleted", "success"); load();
  }

  async function duplicate(x: T) {
    const clone: T = { ...x, id: `${config.coll}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
    await dbService.set(config.coll, clone.id, clone as T & { id: string });
    await audit(me?.uid, `${config.coll}.duplicate`, clone.id);
    showToast("Duplicated", "success"); load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>{config.icon}</span>{config.title}
          <Badge tone="gray">{items.length}</Badge>
        </h2>
        <Button onClick={() => openEdit(null)}>＋ New</Button>
      </div>
      <Input placeholder={t("admin.searchPh")} value={q} onChange={(e) => setQ(e.target.value)} />

      {/* Bulk action bar */}
      <div className="flex items-center gap-2 flex-wrap px-1">
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
          <input type="checkbox"
            checked={filtered.length > 0 && selected.size === filtered.length}
            onChange={toggleAll}
            aria-label={t("admin.bulk.selectAll")} />
          {t("admin.bulk.selectAll")}
        </label>
        {selected.size > 0 && (
          <>
            <Badge tone="teal">{t("admin.bulk.selected").replace("{n}", String(selected.size))}</Badge>
            <Button size="sm" variant="ghost" onClick={clearSelection}>{t("admin.bulk.clear")}</Button>
            <Button size="sm" variant="outline" onClick={bulkExport}>⬇ {t("admin.bulk.exportJson")}</Button>
            {supportsStatus && (
              <>
                <Button size="sm" variant="success" onClick={() => bulkPublish(true)}>✓ {t("admin.bulk.publish")}</Button>
                <Button size="sm" variant="outline" onClick={() => bulkPublish(false)}>{t("admin.bulk.unpublish")}</Button>
                <Button size="sm" variant="outline" onClick={bulkArchive}>📦 {t("admin.bulk.archive")}</Button>
              </>
            )}
            <Button size="sm" variant="danger" onClick={bulkDelete}>🗑 {t("admin.bulk.delete")}</Button>
          </>
        )}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <EmptyState title={t("common.emptyState")} icon={config.icon} />}
        {filtered.map((x) => (
          <Card key={x.id} className={selected.has(x.id) ? "border-teal-500/50 bg-teal-50/30 dark:bg-teal-900/10" : ""}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={selected.has(x.id)}
                    onChange={() => toggleSelect(x.id)}
                    className="mt-1"
                    aria-label={x.id}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {config.getBadges?.(x).map((b, i) => <Badge key={i} tone={b.tone}>{b.label}</Badge>)}
                    </div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{config.getTitle(x)}</div>
                    {config.getSubtitle && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{config.getSubtitle(x)}</div>}
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{x.id}</div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost"   onClick={() => setPreviewOpen(x)} title={t("admin.import.preview")}>👁</Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(x)}       title={t("common.edit")}>✎</Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate(x)}      title={t("admin.duplicate")}>⧉</Button>
                  <Button size="sm" variant="danger"  onClick={() => del(x)}            title={t("common.delete")}>🗑</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Edit modal */}
      <Modal open={!!editOpen} onClose={() => setEditOpen(null)} title={t("admin.editContent")} size="xl">
        <div className="space-y-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Edit the JSON below. All fields are preserved. The schema is unchanged — only optional fields can be added.
          </div>
          <Textarea rows={20} value={text} onChange={(e) => setText(e.target.value)} error={err} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Preview modal — renders pretty JSON */}
      <Modal open={!!previewOpen} onClose={() => setPreviewOpen(null)} title={previewOpen ? config.getTitle(previewOpen) : "Preview"} size="xl">
        {previewOpen && (
          <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-lg overflow-auto max-h-[70vh] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
{JSON.stringify(previewOpen, null, 2)}
          </pre>
        )}
      </Modal>
    </div>
  );
}

// ─── Concrete managers ───
function MCQManager() {
  const { tr } = useI18n();
  return <ContentManager<MCQ> config={{
    title: "MCQ Manager", icon: "❓", coll: "mcqs",
    getTitle: (x) => tr(x.question) || x.id,
    getSubtitle: (x) => `Options: ${x.options.map((o) => tr(o.text)).join(" | ").slice(0, 90)}`,
    getBadges: (x) => [
      { tone: x.difficulty === "easy" ? "green" : x.difficulty === "medium" ? "amber" : "red", label: x.difficulty },
      { tone: "blue", label: x.subjectId },
    ],
    emptyTemplate: (): MCQ => ({
      id: "", createdAt: Date.now(), question: { en: "", ar: "", so: "" },
      options: [
        { id: "a", text: { en: "", ar: "", so: "" } },
        { id: "b", text: { en: "", ar: "", so: "" } },
        { id: "c", text: { en: "", ar: "", so: "" } },
        { id: "d", text: { en: "", ar: "", so: "" } },
      ],
      correctOptionId: "a", explanation: { en: "", ar: "", so: "" }, difficulty: "easy", subjectId: "cardio",
    }),
  }} />;
}
function CaseManager() {
  const { tr } = useI18n();
  return <ContentManager<CaseStudy> config={{
    title: "Case Study Manager", icon: "📋", coll: "caseStudies",
    getTitle: (x) => tr(x.title) || x.id,
    getSubtitle: (x) => tr(x.summary),
    getBadges: (x) => [
      { tone: x.difficulty === "easy" ? "green" : x.difficulty === "medium" ? "amber" : "red", label: x.difficulty },
      { tone: "blue", label: x.subjectId },
      { tone: "gray", label: `${x.steps?.length || 0} steps` },
    ],
    emptyTemplate: (): CaseStudy => ({
      id: "", createdAt: Date.now(),
      title: { en: "", ar: "", so: "" }, summary: { en: "", ar: "", so: "" },
      patient: { age: 30, sex: "M", presenting: { en: "", ar: "", so: "" } },
      steps: [], references: [], subjectId: "cardio", difficulty: "medium",
    }),
  }} />;
}
function OPDManager() {
  const { tr } = useI18n();
  return <ContentManager<OPDCase> config={{
    title: "OPD Manager", icon: "🩺", coll: "opdCases",
    getTitle: (x) => tr(x.title) || tr(x.chiefComplaint) || x.id,
    getSubtitle: (x) => tr(x.chiefComplaint),
    getBadges: (x) => [
      { tone: x.difficulty === "easy" ? "green" : x.difficulty === "medium" ? "amber" : "red", label: x.difficulty },
      { tone: "blue", label: x.subjectId },
    ],
    emptyTemplate: (): OPDCase => ({
      id: "", createdAt: Date.now(),
      title: { en: "", ar: "", so: "" },
      chiefComplaint: { en: "", ar: "", so: "" }, history: { en: "", ar: "", so: "" },
      vitals: { hr: 80, bp: "120/80", rr: 16, temp: 37, spo2: 98 },
      examFindings: { en: "", ar: "", so: "" }, correctDiagnosis: { en: "", ar: "", so: "" },
      correctManagement: { en: "", ar: "", so: "" }, differentials: [],
      subjectId: "cardio", difficulty: "medium",
    }),
  }} />;
}

// ═════════════════ Education CMS ═════════════════
function EducationManager() {
  const { t, tr } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const me = useAuthStore((s) => s.user);
  const [items, setItems] = useState<EducationArticle[]>([]);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("all"); const [status, setStatus] = useState<"all" | EducationStatus>("all");
  const [edit, setEdit] = useState<EducationArticle | null>(null);
  const [preview, setPreview] = useState<EducationArticle | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    const list = await dbService.list<EducationArticle>("educationArticles");
    setItems(list.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)));
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter((a) => {
    if (cat !== "all" && a.category !== cat) return false;
    if (status !== "all" && (a.status || "published") !== status) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return tr(a.title).toLowerCase().includes(s) || tr(a.body).toLowerCase().includes(s);
  });

  function openNew() {
    setEdit({
      id: `art_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: { en: "", ar: "", so: "" }, body: { en: "", ar: "", so: "" },
      category: "cardio", status: "draft", featured: false,
      author: me?.username, createdAt: Date.now(), updatedAt: Date.now(),
      summary: { en: "", ar: "", so: "" }, references: [],
    });
  }
  async function save(a: EducationArticle) {
    await dbService.set("educationArticles", a.id, { ...a, updatedAt: Date.now() });
    await audit(me?.uid, "article.save", a.id, { status: a.status });
    showToast(t("common.saved"), "success"); setEdit(null); load();
  }
  async function del(a: EducationArticle) {
    if (!confirm(`Delete "${tr(a.title)}"?`)) return;
    await dbService.remove("educationArticles", a.id);
    await audit(me?.uid, "article.delete", a.id);
    showToast("Deleted", "success"); load();
  }
  async function duplicate(a: EducationArticle) {
    const clone: EducationArticle = { ...a, id: `art_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, status: "draft", featured: false, createdAt: Date.now(), updatedAt: Date.now() };
    await dbService.set("educationArticles", clone.id, clone);
    showToast("Duplicated", "success"); load();
  }
  async function togglePublish(a: EducationArticle) {
    const next: EducationStatus = a.status === "published" ? "draft" : "published";
    await dbService.update<EducationArticle>("educationArticles", a.id, { status: next, updatedAt: Date.now() });
    await audit(me?.uid, `article.${next}`, a.id);
    showToast(next === "published" ? "Published" : "Unpublished", "success"); load();
  }
  async function toggleFeatured(a: EducationArticle) {
    await dbService.update<EducationArticle>("educationArticles", a.id, { featured: !a.featured, updatedAt: Date.now() });
    load();
  }
  async function pickCover(files: FileList | null) {
    if (!files || !files[0] || !edit) return;
    setUploading(true);
    try {
      const url = await storageService.upload(`education/${edit.id}/${Date.now()}_${files[0].name}`, files[0], { compress: true, maxSize: 1200 });
      setEdit({ ...edit, imageUrl: url });
    } catch { showToast(t("common.uploadFailed"), "error"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">📚 Health Education CMS <Badge tone="gray">{items.length}</Badge></h2>
        <Button onClick={openNew}>＋ New article</Button>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        <Input placeholder={t("admin.searchPh")} value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {seedSubjects.map((s) => <option key={s.id} value={s.id}>{tr(s.name)}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as EducationStatus | "all")}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <EmptyState title={t("common.emptyState")} icon="📚" />}
        {filtered.map((a) => {
          const st = a.status || "published";
          return (
            <Card key={a.id}>
              <CardBody>
                <div className="flex items-start gap-3">
                  {a.imageUrl && <img src={a.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <Badge tone={st === "published" ? "green" : st === "draft" ? "amber" : "gray"}>{st}</Badge>
                      {a.featured && <Badge tone="violet">★ Featured</Badge>}
                      <Badge tone="blue">{a.category}</Badge>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{tr(a.title) || "(untitled)"}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{tr(a.summary) || tr(a.body)}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-1 flex-wrap justify-end">
                  <Button size="sm" variant="ghost"   onClick={() => setPreview(a)}   title={t("admin.import.preview")}>👁</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleFeatured(a)} title={t("admin.article.featured")}>{a.featured ? "★" : "☆"}</Button>
                  <Button size="sm" variant={st === "published" ? "outline" : "success"} onClick={() => togglePublish(a)}>
                    {st === "published" ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEdit(a)}>✎ Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate(a)}>⧉</Button>
                  <Button size="sm" variant="danger"  onClick={() => del(a)}>🗑</Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Editor */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t("admin.editContent") : t("admin.newArticle")} size="xl">
        {edit && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-3 gap-2">
              <Input label="Title (EN)" value={edit.title.en} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, en: e.target.value } })} />
              <Input label="Title (AR)" value={edit.title.ar} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, ar: e.target.value } })} />
              <Input label="Title (SO)" value={edit.title.so} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, so: e.target.value } })} />
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <Textarea label="Summary (EN)" rows={2} value={edit.summary?.en || ""} onChange={(e) => setEdit({ ...edit, summary: { ...(edit.summary || { en: "", ar: "", so: "" }), en: e.target.value } })} />
              <Textarea label="Summary (AR)" rows={2} value={edit.summary?.ar || ""} onChange={(e) => setEdit({ ...edit, summary: { ...(edit.summary || { en: "", ar: "", so: "" }), ar: e.target.value } })} />
              <Textarea label="Summary (SO)" rows={2} value={edit.summary?.so || ""} onChange={(e) => setEdit({ ...edit, summary: { ...(edit.summary || { en: "", ar: "", so: "" }), so: e.target.value } })} />
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <Textarea label="Body (EN)" rows={8} value={edit.body.en} onChange={(e) => setEdit({ ...edit, body: { ...edit.body, en: e.target.value } })} />
              <Textarea label="Body (AR)" rows={8} value={edit.body.ar} onChange={(e) => setEdit({ ...edit, body: { ...edit.body, ar: e.target.value } })} />
              <Textarea label="Body (SO)" rows={8} value={edit.body.so} onChange={(e) => setEdit({ ...edit, body: { ...edit.body, so: e.target.value } })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <Select label="Category" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                {seedSubjects.map((s) => <option key={s.id} value={s.id}>{tr(s.name)}</option>)}
              </Select>
              <Select label="Status" value={edit.status || "draft"} onChange={(e) => setEdit({ ...edit, status: e.target.value as EducationStatus })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
            <Input label="References (comma-separated)" value={(edit.references || []).join(", ")} onChange={(e) => setEdit({ ...edit, references: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cover image</label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "⏳" : "📎"} Upload</Button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickCover(e.target.files)} />
                {edit.imageUrl && (<><img src={edit.imageUrl} alt="" className="h-12 rounded-lg" /><Button size="sm" variant="ghost" onClick={() => setEdit({ ...edit, imageUrl: undefined })}>×</Button></>)}
              </div>
            </div>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm">
              <input type="checkbox" checked={!!edit.featured} onChange={(e) => setEdit({ ...edit, featured: e.target.checked })} />
              Featured
            </label>
            <div className="flex justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={() => setPreview(edit)}>👁 Preview</Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
                <Button variant="success" onClick={() => save({ ...edit, status: "published" })}>Publish</Button>
                <Button onClick={() => save({ ...edit, status: edit.status || "draft" })}>Save draft</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={t("admin.import.preview")} size="lg">
        {preview && (
          <div className="space-y-3">
            {preview.imageUrl && <img src={preview.imageUrl} alt="" className="rounded-xl w-full max-h-64 object-cover" />}
            <div className="flex gap-2 items-center flex-wrap">
              <Badge tone={preview.status === "published" ? "green" : "amber"}>{preview.status || "draft"}</Badge>
              {preview.featured && <Badge tone="violet">★ Featured</Badge>}
              <Badge tone="blue">{preview.category}</Badge>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tr(preview.title)}</h2>
            {preview.summary && <p className="text-slate-600 dark:text-slate-400 italic">{tr(preview.summary)}</p>}
            <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{tr(preview.body)}</p>
            {preview.references && preview.references.length > 0 && (
              <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc ps-5 pt-3 border-t border-slate-200 dark:border-slate-800">
                {preview.references.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═════════════════ Bulk import (preserved) ═════════════════
type ImportKind = "mcqs" | "caseStudies" | "opdCases" | "educationArticles";
function AdminImport() {
  const { t } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const me = useAuthStore((s) => s.user);
  const [kind, setKind] = useState<ImportKind>("mcqs");
  const [raw, setRaw] = useState("");
  const [validated, setValidated] = useState<{ valid: Record<string, unknown>[]; duplicates: string[]; errors: string[] } | null>(null);
  const [lastCommittedIds, setLastCommittedIds] = useState<string[] | null>(null);

  const templates: Record<ImportKind, string> = useMemo(() => ({
    mcqs: JSON.stringify([{ id: "mcq_x", question: { en: "…", ar: "…", so: "…" }, options: [{ id: "a", text: { en: "A", ar: "أ", so: "A" } }], correctOptionId: "a", explanation: { en: "…", ar: "…", so: "…" }, difficulty: "easy", subjectId: "cardio", createdAt: Date.now() }], null, 2),
    caseStudies: JSON.stringify([{ id: "case_x", title: { en: "", ar: "", so: "" }, summary: { en: "", ar: "", so: "" }, patient: { age: 40, sex: "M", presenting: { en: "", ar: "", so: "" } }, steps: [], references: [], subjectId: "cardio", difficulty: "medium", createdAt: Date.now() }], null, 2),
    opdCases: JSON.stringify([{ id: "opd_x", title: { en: "", ar: "", so: "" }, chiefComplaint: { en: "", ar: "", so: "" }, history: { en: "", ar: "", so: "" }, vitals: { hr: 80, bp: "120/80", rr: 16, temp: 37, spo2: 98 }, examFindings: { en: "", ar: "", so: "" }, correctDiagnosis: { en: "", ar: "", so: "" }, correctManagement: { en: "", ar: "", so: "" }, differentials: [], subjectId: "resp", difficulty: "easy", createdAt: Date.now() }], null, 2),
    educationArticles: JSON.stringify([{ id: "art_x", title: { en: "", ar: "", so: "" }, body: { en: "", ar: "", so: "" }, category: "cardio", status: "published", createdAt: Date.now() }], null, 2),
  }), []);

  function parse(text: string): Record<string, unknown>[] {
    text = text.trim(); if (!text) return [];
    if (text.startsWith("[") || text.startsWith("{")) { const p = JSON.parse(text); return Array.isArray(p) ? p : [p]; }
    if (kind !== "mcqs") throw new Error("CSV only supported for mcqs. Use JSON otherwise.");
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(",").map((s) => s.trim());
    return lines.slice(1).map((line) => {
      const cols = line.split(",").map((s) => s.trim());
      const row: Record<string, string> = {}; headers.forEach((h, i) => (row[h] = cols[i] || ""));
      return {
        id: row.id || `mcq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        question: { en: row.questionEn || "", ar: row.questionAr || row.questionEn || "", so: row.questionSo || row.questionEn || "" },
        options: [
          { id: "a", text: { en: row.optA || "", ar: row.optA || "", so: row.optA || "" } },
          { id: "b", text: { en: row.optB || "", ar: row.optB || "", so: row.optB || "" } },
          { id: "c", text: { en: row.optC || "", ar: row.optC || "", so: row.optC || "" } },
          { id: "d", text: { en: row.optD || "", ar: row.optD || "", so: row.optD || "" } },
        ],
        correctOptionId: row.correctOptionId || "a",
        explanation: { en: row.explanationEn || "", ar: row.explanationAr || row.explanationEn || "", so: row.explanationSo || row.explanationEn || "" },
        difficulty: (row.difficulty as "easy" | "medium" | "hard") || "easy",
        subjectId: row.subjectId || "cardio", createdAt: Date.now(),
      };
    });
  }

  function validate(x: Record<string, unknown>, k: ImportKind): string | null {
    if (!x.id || typeof x.id !== "string") return t("common.missingId");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const y = x as any;
    const lt = (v: unknown) => v && typeof v === "object" && (v as { en?: string }).en;
    if (k === "mcqs") { if (!lt(y.question)) return "question.en required"; if (!Array.isArray(y.options) || y.options.length < 2) return "options[] required"; if (!y.correctOptionId) return "correctOptionId required"; if (!y.subjectId) return "subjectId required"; }
    if (k === "caseStudies") { if (!lt(y.title)) return "title.en required"; if (!Array.isArray(y.steps)) return "steps[] required"; }
    if (k === "opdCases") { if (!lt(y.chiefComplaint)) return "chiefComplaint.en required"; if (!y.vitals) return "vitals required"; }
    if (k === "educationArticles") { if (!lt(y.title)) return "title.en required"; if (!lt(y.body)) return "body.en required"; }
    return null;
  }

  async function doValidate() {
    try {
      const arr = parse(raw);
      const existing = await dbService.list(kind as CollName);
      const existingIds = new Set(existing.map((e) => (e as { id: string }).id));
      const errors: string[] = []; const duplicates: string[] = []; const valid: Record<string, unknown>[] = [];
      arr.forEach((x, i) => {
        const err = validate(x, kind);
        if (err) errors.push(`Row ${i + 1}: ${err}`);
        else if (existingIds.has((x as { id: string }).id)) duplicates.push((x as { id: string }).id);
        else valid.push(x);
      });
      setValidated({ valid, duplicates, errors });
    } catch (e) { showToast(e instanceof Error ? e.message : t("common.parseError"), "error"); }
  }
  async function commit() {
    if (!validated) return;
    const ids: string[] = [];
    for (const x of validated.valid) { const id = (x as { id: string }).id; await dbService.set(kind as CollName, id, x as { id: string }); ids.push(id); }
    await audit(me?.uid, `import.${kind}`, undefined, { count: ids.length });
    setLastCommittedIds(ids); setValidated(null); setRaw("");
    showToast(`Imported ${ids.length}`, "success");
  }
  async function rollback() {
    if (!lastCommittedIds) return;
    for (const id of lastCommittedIds) await dbService.remove(kind as CollName, id);
    showToast(`Rolled back ${lastCommittedIds.length}`, "success"); setLastCommittedIds(null);
  }

  return (
    <div className="space-y-3">
      <Card><CardBody className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label={t("admin.import.selectType")} value={kind} onChange={(e) => { setKind(e.target.value as ImportKind); setValidated(null); }}>
            <option value="mcqs">MCQs</option><option value="caseStudies">Case Studies</option>
            <option value="opdCases">OPD Cases</option><option value="educationArticles">Articles</option>
          </Select>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={() => setRaw(templates[kind])}>Template</Button>
            <input type="file" accept=".json,.csv,.txt" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setRaw(await f.text()); }} className="text-xs" />
          </div>
        </div>
        <Textarea label={t("admin.import.pasteJson")} rows={12} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="[{...}]" />
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={doValidate} disabled={!raw.trim()}>{t("admin.import.validate")}</Button>
          <Button variant="success" onClick={commit} disabled={!validated || validated.valid.length === 0}>{t("admin.import.commit")} ({validated?.valid.length || 0})</Button>
          {lastCommittedIds && <Button variant="danger" onClick={rollback}>{t("admin.import.rollback")} ({lastCommittedIds.length})</Button>}
        </div>
      </CardBody></Card>
      {validated && (
        <Card><CardBody className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{validated.valid.length}</div><div className="text-xs text-slate-500 dark:text-slate-400">{t("admin.import.ready")}</div></div>
            <div><div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{validated.duplicates.length}</div><div className="text-xs text-slate-500 dark:text-slate-400">{t("admin.import.duplicates")}</div></div>
            <div><div className="text-2xl font-bold text-rose-700 dark:text-rose-400">{validated.errors.length}</div><div className="text-xs text-slate-500 dark:text-slate-400">{t("admin.import.errors")}</div></div>
          </div>
          {validated.errors.length > 0 && <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 p-2 rounded-lg space-y-1">{validated.errors.map((e, i) => <div key={i}>• {e}</div>)}</div>}
          {validated.duplicates.length > 0 && <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg">Skipping duplicates: {validated.duplicates.join(", ")}</div>}
        </CardBody></Card>
      )}
    </div>
  );
}

// ═════════════════ Notifications (preserved) ═════════════════
type Audience = "broadcast" | "personal" | "group";
function AdminNotifications() {
  const { t, tr } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const me = useAuthStore((s) => s.user);
  const nav = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<Audience>("broadcast");
  const [priority, setPriority] = useState<NotificationPriority>("normal");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [en, setEn] = useState(""); const [ar, setAr] = useState(""); const [so, setSo] = useState("");
  const [bodyEn, setBodyEn] = useState(""); const [bodyAr, setBodyAr] = useState(""); const [bodySo, setBodySo] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => dbService.subscribe<Notification>("notifications", (docs) => setItems(docs.sort((a, b) => b.createdAt - a.createdAt))), []);
  useEffect(() => { (async () => setUsers(await dbService.list<AppUser>("users")))(); }, [open]);

  function reset() { setAudience("broadcast"); setPriority("normal"); setSelectedUserIds([]); setEn(""); setAr(""); setSo(""); setBodyEn(""); setBodyAr(""); setBodySo(""); setImageUrl(""); setUserSearch(""); }
  async function onPickImage(files: FileList | null) {
    if (!files || !files[0]) return; setUploading(true);
    try { setImageUrl(await storageService.uploadNotificationImage(files[0])); }
    catch { showToast(t("common.uploadFailed"), "error"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  async function send() {
    if (!en.trim() || !bodyEn.trim()) { showToast("EN required", "error"); return; }
    const base = { title: { en, ar: ar || en, so: so || en }, body: { en: bodyEn, ar: bodyAr || bodyEn, so: bodySo || bodyEn }, imageUrl: imageUrl || undefined, priority, createdAt: Date.now(), senderId: me?.uid };
    if (audience === "broadcast") await dbService.add<Omit<Notification, "id">>("notifications", { ...base, audience: "broadcast", readBy: [] });
    else if (audience === "group") { if (!selectedUserIds.length) { showToast(t("common.selectUsers"), "error"); return; } await dbService.add<Omit<Notification, "id">>("notifications", { ...base, audience: "group", userIds: selectedUserIds, readBy: [] }); }
    else { if (!selectedUserIds.length) { showToast(t("common.selectUsers"), "error"); return; } for (const uid of selectedUserIds) await dbService.add<Omit<Notification, "id">>("notifications", { ...base, audience: "personal", userId: uid }); }
    await audit(me?.uid, "notification.send", undefined, { audience, priority, targets: selectedUserIds.length });
    showToast("Sent", "success"); setOpen(false); reset();
  }
  async function del(id: string) { await dbService.remove("notifications", id); showToast(t("common.saved"), "success"); }
  function toggleUser(uid: string) { setSelectedUserIds((s) => s.includes(uid) ? s.filter((x) => x !== uid) : (audience === "personal" ? [uid] : [...s, uid])); }
  const visibleUsers = users.filter((u) => !userSearch || u.username.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-slate-500 dark:text-slate-400">{items.length} notifications</div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => nav("/notifications")}>View feed</Button><Button onClick={() => setOpen(true)}>+ Send</Button></div>
      </div>
      <div className="space-y-2">
        {items.map((n) => (
          <Card key={n.id}><CardBody className="flex items-start gap-3 justify-between">
            <div className="min-w-0">
              <div className="flex gap-2 items-center flex-wrap">
                <Badge tone={n.audience === "broadcast" ? "blue" : n.audience === "group" ? "violet" : "teal"}>{n.audience}</Badge>
                <Badge tone={n.priority === "urgent" ? "red" : n.priority === "high" ? "amber" : "gray"}>{n.priority || "normal"}</Badge>
                <span className="font-medium text-slate-900 dark:text-slate-100">{tr(n.title)}</span>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">{tr(n.body)}</div>
              {n.imageUrl && <img src={n.imageUrl} alt="" className="mt-2 rounded-lg h-16" />}
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
            <Button size="sm" variant="danger" onClick={() => del(n.id)}>Delete</Button>
          </CardBody></Card>
        ))}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); reset(); }} title={t("notif.send")} size="xl">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="Audience" value={audience} onChange={(e) => { setAudience(e.target.value as Audience); setSelectedUserIds([]); }}>
              <option value="broadcast">📢 Broadcast (all)</option><option value="personal">👤 Personal (1 user)</option><option value="group">👥 Group (multiple)</option>
            </Select>
            <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as NotificationPriority)}>
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </Select>
          </div>
          {audience !== "broadcast" && (
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{t("notif.selectUsers")} ({selectedUserIds.length})</label>
              <Input placeholder={t("admin.searchPh")} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
              <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {visibleUsers.map((u) => {
                  const on = selectedUserIds.includes(u.uid);
                  return (
                    <button key={u.uid} onClick={() => toggleUser(u.uid)} className={cn("w-full flex items-center gap-2 p-2 text-start", on ? "bg-teal-50 dark:bg-teal-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
                      <input type="checkbox" checked={on} readOnly /><Avatar name={u.username} src={u.photoURL} size={24} />
                      <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{u.username}</div><div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div></div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-2">
            <Input label="Title (EN)" value={en} onChange={(e) => setEn(e.target.value)} />
            <Input label="Title (AR)" value={ar} onChange={(e) => setAr(e.target.value)} />
            <Input label="Title (SO)" value={so} onChange={(e) => setSo(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            <Textarea label="Body (EN)" rows={3} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} />
            <Textarea label="Body (AR)" rows={3} value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} />
            <Textarea label="Body (SO)" rows={3} value={bodySo} onChange={(e) => setBodySo(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Image (optional)</label>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "⏳" : "📎"} Upload</Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files)} />
              {imageUrl && (<><img src={imageUrl} alt="" className="h-12 rounded-lg" /><Button size="sm" variant="ghost" onClick={() => setImageUrl("")}>×</Button></>)}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
            <Button onClick={send}>Send</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═════════════════ Branding Manager (upload OR URL) ═════════════════
function BrandingManager() {
  const { t } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const me = useAuthStore((s) => s.user);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [assets, setAssets] = useState<BrandingAssets>({});
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = await dbService.getSettings();
      setSettings(s);
      setAssets(s.branding || {});
    })();
  }, []);

  async function fetchFromUrl(key: keyof BrandingAssets, url: string) {
    if (!url.trim()) { setAssets((a) => ({ ...a, [key]: undefined })); return; }
    setLoading(key);
    try {
      let raw = url.trim();
      if (raw.includes("github.com") && raw.includes("/blob/")) {
        raw = raw.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
      }
      const r = await fetch(raw, { mode: "cors" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const isImg = blob.type.startsWith("image/") || /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(raw);
      if (!isImg && blob.type !== "image/svg+xml") throw new Error("Not an image");
      const dataUrl = await blobToDataUrl(blob);
      setAssets((a) => ({ ...a, [key]: dataUrl }));
    } catch (e) { showToast(`${t("admin.branding.fetchFail")}: ${e instanceof Error ? e.message : "error"}`, "error"); }
    finally { setLoading(null); }
  }

  async function uploadFile(key: keyof BrandingAssets, file: File | null) {
    if (!file) return;
    setLoading(key);
    try {
      const dataUrl = await blobToDataUrl(file);
      setAssets((a) => ({ ...a, [key]: dataUrl }));
    } catch { showToast(t("admin.branding.fetchFail"), "error"); }
    finally { setLoading(null); }
  }

  async function apply() {
    if (!settings) return;
    const next: SiteSettings = { ...settings, branding: { ...assets } };
    await dbService.saveSettings(next);
    await audit(me?.uid, "branding.update");
    if (assets.favicon) applyFavicon(assets.favicon);
    if (assets.appIcon) applyAppleTouchIcon(assets.appIcon);
    showToast(t("admin.branding.applied"), "success");
  }

  const fields: { key: keyof BrandingAssets; label: string }[] = [
    { key: "mainLogo",   label: t("admin.branding.mainLogo") },
    { key: "darkLogo",   label: t("admin.branding.darkLogo") },
    { key: "lightLogo",  label: t("admin.branding.lightLogo") },
    { key: "appIcon",    label: t("admin.branding.appIcon") },
    { key: "favicon",    label: t("admin.branding.favicon") },
    { key: "svgLogo",    label: t("admin.branding.svgLogo") },
  ];

  return (
    <div className="space-y-3">
      <Card><CardBody className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">🎨 {t("admin.branding.title")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("admin.branding.intro")}</p>
      </CardBody></Card>

      {fields.map((f) => (
        <Card key={f.key}>
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-800 dark:text-slate-100">{f.label}</div>
              {assets[f.key] && <Badge tone="green">✓ {t("admin.branding.preview")}</Badge>}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t("admin.branding.uploadOrUrl")}</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-sm">
                📎 {t("admin.branding.uploadFile")}
                <input type="file" accept="image/*,.svg,.ico" className="hidden"
                  onChange={(e) => uploadFile(f.key, e.target.files?.[0] || null)} />
              </label>
              <input
                type="url"
                placeholder="https://raw.githubusercontent.com/.../logo.png"
                defaultValue={typeof assets[f.key] === "string" && !assets[f.key]!.startsWith("data:") ? assets[f.key] : ""}
                onBlur={(e) => fetchFromUrl(f.key, e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 outline-none focus:border-teal-500 text-sm"
              />
              <Button size="sm" variant="ghost" onClick={() => setAssets((a) => ({ ...a, [f.key]: undefined }))}>{t("admin.branding.clear")}</Button>
              {loading === f.key && <span className="text-xs text-slate-500 self-center">{t("admin.branding.loading")}</span>}
            </div>
            {assets[f.key] && (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 grid place-items-center">
                <img src={assets[f.key]} alt={f.label} className="max-h-32 max-w-full" />
              </div>
            )}
          </CardBody>
        </Card>
      ))}
      <div className="flex justify-end sticky bottom-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 pt-3 -mx-2 px-2 pb-2">
        <Button variant="success" size="lg" onClick={apply}>{t("admin.branding.apply")}</Button>
      </div>
    </div>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
}

function applyFavicon(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
  link.href = url;
}
function applyAppleTouchIcon(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!link) { link = document.createElement("link"); link.rel = "apple-touch-icon"; document.head.appendChild(link); }
  link.href = url;
}

// ═════════════════ Leaderboard Manager ═════════════════
function LeaderboardManager() {
  const { t } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [q, setQ] = useState("");
  const [demoOnly, setDemoOnly] = useState<"all" | "real" | "demo">("all");

  async function load() {
    setUsers(await dbService.list<AppUser>("users"));
    setResults(await dbService.list<QuizResult>("quizResults"));
  }
  useEffect(() => { load(); }, []);

  const entries = useMemo(() => {
    const acc: Record<string, { total: number; correct: number; count: number }> = {};
    for (const r of results) {
      const a = acc[r.userId] ||= { total: 0, correct: 0, count: 0 };
      a.total += r.total; a.correct += r.score; a.count += 1;
    }
    return users
      .filter((u) => demoOnly === "all" || (demoOnly === "demo" ? u.isDemo : !u.isDemo))
      .filter((u) => !q || u.username.toLowerCase().includes(q.toLowerCase()))
      .map((u) => ({
        u,
        xp: u.xp || 0,
        quizzes: acc[u.uid]?.count || 0,
        accuracy: acc[u.uid]?.total ? Math.round((acc[u.uid].correct / acc[u.uid].total) * 100) : 0,
      }))
      .sort((a, b) => (b.u.featured ? 1 : 0) - (a.u.featured ? 1 : 0) || b.xp - a.xp);
  }, [users, results, q, demoOnly]);

  async function togglePin(u: AppUser) {
    await dbService.update<AppUser>("users", u.uid, { featured: !u.featured });
    await audit(me?.uid, u.featured ? "leaderboard.unpin" : "leaderboard.pin", u.uid);
    load();
  }

  async function resetAll() {
    if (!confirm(t("admin.lb.resetConfirm"))) return;
    // Reset XP + streak for all users; delete quiz results.
    for (const u of users) {
      await dbService.update<AppUser>("users", u.uid, { xp: 0, streak: 0 });
    }
    for (const r of results) {
      await dbService.remove("quizResults", r.id);
    }
    await audit(me?.uid, "leaderboard.reset");
    showToast(t("common.saved"), "success");
    load();
  }

  async function recalc() {
    // Recompute XP from quiz results (10 XP per correct answer).
    const map: Record<string, number> = {};
    for (const r of results) map[r.userId] = (map[r.userId] || 0) + r.score * 10;
    for (const u of users) {
      const newXp = map[u.uid] || 0;
      if (newXp !== (u.xp || 0)) {
        await dbService.update<AppUser>("users", u.uid, { xp: newXp });
      }
    }
    await audit(me?.uid, "leaderboard.recalc");
    showToast(t("admin.lb.recalcDone"), "success");
    load();
  }

  function exportCSV() {
    const rows = [["rank", "username", "email", "country", "xp", "quizzes", "accuracy", "streak", "featured", "isDemo"]];
    entries.forEach((e, i) => rows.push([
      String(i + 1), e.u.username, e.u.email, e.u.country || "",
      String(e.xp), String(e.quizzes), String(e.accuracy),
      String(e.u.streak || 0), e.u.featured ? "yes" : "", e.u.isDemo ? "yes" : "",
    ]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leaderboard.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">🏆 {t("admin.lb.title")} <Badge tone="gray">{entries.length}</Badge></h2>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={recalc}>♻ {t("admin.lb.recalc")}</Button>
          <Button size="sm" variant="outline" onClick={exportCSV}>⬇ {t("admin.lb.export")}</Button>
          <Button size="sm" variant="danger" onClick={resetAll}>🗑 {t("admin.lb.reset")}</Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <Input placeholder={t("admin.searchPh")} value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={demoOnly} onChange={(e) => setDemoOnly(e.target.value as "all" | "real" | "demo")}>
          <option value="all">{t("common.all")}</option>
          <option value="real">{t("common.realUsers")}</option>
          <option value="demo">{t("common.demoUsers")}</option>
        </Select>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-start">#</th>
                <th className="px-3 py-2 text-start">{t("leaderboard.user")}</th>
                <th className="px-3 py-2 text-start">{t("leaderboard.country")}</th>
                <th className="px-3 py-2">{t("leaderboard.xp")}</th>
                <th className="px-3 py-2">{t("leaderboard.quizzes")}</th>
                <th className="px-3 py-2">{t("leaderboard.accuracy")}</th>
                <th className="px-3 py-2">{t("leaderboard.streak")}</th>
                <th className="px-3 py-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-300">
              {entries.map((e, i) => (
                <tr key={e.u.uid} className={cn("border-t border-slate-100 dark:border-slate-800",
                  e.u.featured && "bg-amber-50/60 dark:bg-amber-900/20")}>
                  <td className="px-3 py-2 font-bold">
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={e.u.username} src={e.u.photoURL} size={26} />
                      <span className="text-slate-900 dark:text-slate-100">{e.u.username}</span>
                      {e.u.isDemo && <Badge tone="violet">{t("admin.demo.badge")}</Badge>}
                      {e.u.featured && <Badge tone="amber">★</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">{e.u.country || "—"}</td>
                  <td className="px-3 py-2 text-center font-semibold">{e.xp}</td>
                  <td className="px-3 py-2 text-center">{e.quizzes}</td>
                  <td className="px-3 py-2 text-center">{e.accuracy}%</td>
                  <td className="px-3 py-2 text-center">🔥 {e.u.streak || 0}</td>
                  <td className="px-3 py-2 text-center">
                    <Button size="sm" variant={e.u.featured ? "outline" : "ghost"} onClick={() => togglePin(e.u)}>
                      {e.u.featured ? "★ " + t("admin.lb.unpin") : "☆ " + t("admin.lb.pin")}
                    </Button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={8} className="text-center py-6 text-slate-500 dark:text-slate-400">{t("common.emptyState")}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═════════════════ Streak Manager ═════════════════
function StreakManager() {
  const { t } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    setUsers(await dbService.list<AppUser>("users"));
    setSettings(await dbService.getSettings());
  }
  useEffect(() => { load(); }, []);

  const streaks = users.map((u) => u.streak || 0);
  const active = users.filter((u) => (u.streak || 0) > 0).length;
  const longest = streaks.length ? Math.max(...streaks) : 0;
  const average = streaks.length ? Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length) : 0;
  const now = Date.now();
  const inactive = users.filter((u) => (u.lastActiveAt || u.createdAt) < now - 7 * 86400000);

  async function resetOne(u: AppUser) {
    await dbService.update<AppUser>("users", u.uid, { streak: 0 });
    await audit(me?.uid, "streak.reset", u.uid);
    load();
  }
  async function restoreOne(u: AppUser) {
    await dbService.update<AppUser>("users", u.uid, { streak: (u.streak || 0) + 1, streakUpdatedAt: Date.now() });
    load();
  }
  async function awardBonus(u: AppUser) {
    const bonus = settings?.streak?.bonusXp || 5;
    await dbService.update<AppUser>("users", u.uid, { xp: (u.xp || 0) + bonus });
    await audit(me?.uid, "streak.bonus", u.uid, { bonus });
    showToast(`+${bonus} XP → ${u.username}`, "success");
    load();
  }
  async function resetAll() {
    if (!confirm(t("admin.lb.resetConfirm"))) return;
    for (const u of users) await dbService.update<AppUser>("users", u.uid, { streak: 0 });
    await audit(me?.uid, "streak.resetAll");
    load();
  }
  async function saveRules(rules: import("@/types").StreakRules) {
    if (!settings) return;
    await dbService.saveSettings({ ...settings, streak: rules });
    setSettings({ ...settings, streak: rules });
    showToast(t("common.saved"), "success");
  }

  const filtered = users.filter((u) => !q || u.username.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">🔥 {t("admin.streak.title")}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={t("admin.streak.activeUsers")} value={active}   icon={<span>🔥</span>} tone="red" />
        <Stat label={t("admin.streak.longest")}     value={longest}   icon={<span>🏆</span>} tone="amber" />
        <Stat label={t("admin.streak.average")}     value={average}   icon={<span>📊</span>} tone="blue" />
        <Stat label={t("admin.streak.inactive")}    value={inactive.length} icon={<span>💤</span>} tone="gray" />
      </div>

      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold">{t("admin.streak.rules")}</div>
        <CardBody className="grid sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={settings?.streak?.enabled ?? true}
              onChange={(e) => saveRules({ ...(settings?.streak || {}), enabled: e.target.checked })} />
            {t("admin.streak.enabled")}
          </label>
          <Input label={t("admin.streak.bonusXp")} type="number" value={settings?.streak?.bonusXp ?? 5}
            onChange={(e) => saveRules({ ...(settings?.streak || {}), bonusXp: Math.max(0, Number(e.target.value)) })} />
          <Input label={t("admin.streak.inactivityDays")} type="number" value={settings?.streak?.inactivityDays ?? 2}
            onChange={(e) => saveRules({ ...(settings?.streak || {}), inactivityDays: Math.max(1, Number(e.target.value)) })} />
        </CardBody>
      </Card>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Input placeholder={t("admin.searchPh")} value={q} onChange={(e) => setQ(e.target.value)} />
        <Button size="sm" variant="danger" onClick={resetAll}>🗑 {t("admin.streak.resetAll")}</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-start">{t("leaderboard.user")}</th>
                <th className="px-3 py-2">{t("leaderboard.streak")}</th>
                <th className="px-3 py-2">{t("admin.users.joined")}</th>
                <th className="px-3 py-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-300">
              {filtered.slice(0, 100).map((u) => (
                <tr key={u.uid} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.username} src={u.photoURL} size={26} />
                      <span className="text-slate-900 dark:text-slate-100">{u.username}</span>
                      {u.isDemo && <Badge tone="violet">{t("admin.demo.badge")}</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center font-bold">🔥 {u.streak || 0}</td>
                  <td className="px-3 py-2 text-center text-xs">
                    {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex gap-1 justify-center flex-wrap">
                      <Button size="sm" variant="ghost" onClick={() => restoreOne(u)}>+1</Button>
                      <Button size="sm" variant="outline" onClick={() => awardBonus(u)}>🎁</Button>
                      <Button size="sm" variant="ghost" onClick={() => resetOne(u)}>🗑</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═════════════════ Demo Users Manager ═════════════════
function DemoUsersManager() {
  const { t } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);

  async function load() {
    const list = await dbService.list<AppUser>("users");
    setUsers(list.filter((u) => u.isDemo));
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const seed: any = await import("@/data/seed");
      const templates = seed.demoUserTemplates as Array<{ name: string; country: string; countryLabel: string; emoji: string }>;
      const now = Date.now();
      const created: string[] = [];
      for (let i = 0; i < count; i++) {
        const tpl = templates[i % templates.length];
        const uid = `demo_${now}_${i}_${Math.random().toString(36).slice(2, 6)}`;
        const xp = Math.floor(200 + Math.random() * 3800);
        const streak = Math.floor(Math.random() * 30);
        const quizzes = Math.floor(5 + Math.random() * 60);
        const correct = Math.floor(quizzes * (0.5 + Math.random() * 0.45));
        const user: AppUser = {
          uid, email: `${uid}@qcap.demo`,
          username: tpl.name,
          role: "user",
          createdAt: now - Math.random() * 90 * 86400000,
          xp, streak, isDemo: true,
          country: tpl.country,
          language: "en",
          lastActiveAt: now - Math.random() * 5 * 86400000,
          status: "active",
          photoURL: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(tpl.name)}`,
        };
        await dbService.set("users", uid, user);
        // Also generate a few quiz results so leaderboard has data.
        for (let q = 0; q < Math.min(quizzes, 5); q++) {
          await dbService.add("quizResults", {
            userId: uid, username: tpl.name, type: "mcq",
            refIds: [], score: Math.floor(correct / Math.min(quizzes, 5)),
            total: Math.floor(quizzes / Math.min(quizzes, 5)),
            durationSec: Math.floor(30 + Math.random() * 300),
            createdAt: now - Math.random() * 30 * 86400000,
          });
        }
        created.push(uid);
      }
      await audit(me?.uid, "demo.generate", undefined, { count: created.length });
      showToast(t("admin.demo.generated").replace("{n}", String(created.length)), "success");
    } finally { setBusy(false); load(); }
  }

  async function removeAll() {
    if (!confirm(t("admin.demo.removeAllConfirm"))) return;
    setBusy(true);
    try {
      for (const u of users) await dbService.remove("users", u.uid);
      // Also purge their quiz results
      const allR = await dbService.list<QuizResult>("quizResults");
      for (const r of allR) if (users.find((u) => u.uid === r.userId)) await dbService.remove("quizResults", r.id);
      await audit(me?.uid, "demo.removeAll", undefined, { count: users.length });
      showToast(t("common.saved"), "success");
    } finally { setBusy(false); load(); }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">🧪 {t("admin.demo.title")}</h2>
      <Card><CardBody className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">{t("admin.demo.intro")}</p>
        <div className="flex items-end gap-2 flex-wrap">
          <Input label={t("admin.demo.howMany")} type="number" value={count} onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value))))} />
          <Button onClick={generate} loading={busy}>➕ {t("admin.demo.generate")}</Button>
          {users.length > 0 && (
            <Button variant="danger" onClick={removeAll} loading={busy}>🗑 {t("admin.demo.removeAll")}</Button>
          )}
        </div>
      </CardBody></Card>

      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold">
          {t("admin.demo.current")} <Badge tone="gray">{users.length}</Badge>
        </div>
        <CardBody>
          {users.length === 0 ? <EmptyState title={t("common.emptyState")} icon="🧪" /> :
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {users.map((u) => (
                <div key={u.uid} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <Avatar name={u.username} src={u.photoURL} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {u.username} <Badge tone="violet">{t("admin.demo.badge")}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      📍 {u.country} · ⚡ {u.xp || 0} XP · 🔥 {u.streak || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>}
        </CardBody>
      </Card>
    </div>
  );
}

// ═════════════════ Reports ═════════════════
function ReportsPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  useEffect(() => {
    (async () => {
      setUsers(await dbService.list<AppUser>("users"));
      setResults(await dbService.list<QuizResult>("quizResults"));
    })();
  }, []);
  const realResults = results; // Include demo — admin can filter mentally
  const byDiff: Record<string, { count: number; correct: number; total: number }> = {};
  const byType: Record<string, number> = {};
  for (const r of realResults) {
    const d = r.difficulty || "unknown";
    (byDiff[d] ||= { count: 0, correct: 0, total: 0 });
    byDiff[d].count += 1;
    byDiff[d].correct += r.score;
    byDiff[d].total += r.total;
    byType[r.type] = (byType[r.type] || 0) + 1;
  }

  function exportAll() {
    const blob = new Blob([JSON.stringify({ users, results }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "qcap-report.json"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">📈 {t("admin.reports.title")}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">{t("admin.reports.intro")}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={t("admin.users")} value={users.length} icon={<span>👥</span>} tone="teal" />
        <Stat label={t("leaderboard.quizzes")} value={realResults.length} icon={<span>📝</span>} tone="blue" />
        <Stat label={t("common.correctCount")} value={realResults.reduce((s, r) => s + r.score, 0)} icon={<span>✓</span>} tone="green" />
        <Stat label={t("common.answered")} value={realResults.reduce((s, r) => s + r.total, 0)} icon={<span>📊</span>} tone="violet" />
      </div>
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold">{t("admin.reports.byDifficulty")}</div>
        <CardBody>
          {Object.entries(byDiff).length === 0 ? <div className="text-sm text-slate-500 dark:text-slate-400">{t("common.emptyState")}</div> :
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr><th className="text-start py-1">{t("common.level")}</th><th>#</th><th>{t("leaderboard.accuracy")}</th></tr>
              </thead>
              <tbody className="text-slate-700 dark:text-slate-300">
                {Object.entries(byDiff).map(([d, v]) => (
                  <tr key={d} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1">{d}</td>
                    <td className="text-center">{v.count}</td>
                    <td className="text-center">{v.total ? Math.round(v.correct / v.total * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>}
        </CardBody>
      </Card>
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold">{t("admin.reports.byType")}</div>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            {Object.entries(byType).map(([k, v]) => (
              <div key={k} className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400">{k}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{v}</div>
              </div>
            ))}
            {Object.keys(byType).length === 0 && <div className="text-sm text-slate-500">{t("common.emptyState")}</div>}
          </div>
        </CardBody>
      </Card>
      <div className="flex justify-end">
        <Button variant="outline" onClick={exportAll}>⬇ {t("admin.reports.exportAll")}</Button>
      </div>
    </div>
  );
}

// ═════════════════ Audit log ═════════════════
function AdminAudit() {
  const { t } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const [items, setItems] = useState<AuditLog[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() { setItems(await dbService.orderedList("auditLogs")); }
  useEffect(() => { load(); }, []);

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(t("admin.audit.deleteConfirm"))) return;
    for (const id of selected) await dbService.remove("auditLogs", id);
    showToast(t("admin.audit.deleted"), "success");
    setSelected(new Set());
    load();
  }
  async function clearAll() {
    if (items.length === 0) return;
    if (!confirm(t("admin.audit.clearAllConfirm"))) return;
    for (const it of items) await dbService.remove("auditLogs", it.id);
    showToast(t("admin.audit.deleted"), "success");
    setSelected(new Set());
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">📜 {t("admin.audit")} <Badge tone="gray">{items.length}</Badge></h2>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <Button size="sm" variant="danger" onClick={deleteSelected}>
              🗑 {t("admin.audit.deleteSelected")} ({selected.size})
            </Button>
          )}
          {items.length > 0 && (
            <Button size="sm" variant="outline" onClick={clearAll}>
              {t("admin.audit.clearAll")}
            </Button>
          )}
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-3 text-start">
                  <input type="checkbox" checked={items.length > 0 && selected.size === items.length}
                    onChange={toggleAll} aria-label={t("admin.audit.selectAll")} />
                </th>
                <th className="px-4 py-3 text-start">{t("common.date")}</th>
                <th className="px-4 py-3 text-start">{t("admin.audit.actor")}</th>
                <th className="px-4 py-3 text-start">{t("admin.audit.action")}</th>
                <th className="px-4 py-3 text-start">{t("admin.audit.target")}</th>
                <th className="px-4 py-3">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-300">
              {items.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">{t("common.emptyState")}</td></tr>}
              {items.map((l) => (
                <tr key={l.id} className={cn("border-t border-slate-100 dark:border-slate-800",
                  selected.has(l.id) && "bg-teal-50/50 dark:bg-teal-900/20")}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs">{l.actorId || "system"}</td>
                  <td className="px-4 py-2"><Badge tone="teal">{l.action}</Badge></td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{l.target || "—"}</td>
                  <td className="px-4 py-2 text-center">
                    <Button size="sm" variant="ghost"
                      onClick={async () => {
                        if (!confirm(t("admin.audit.deleteConfirm"))) return;
                        await dbService.remove("auditLogs", l.id);
                        load();
                      }}>🗑</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═════════════════ Settings ═════════════════
function AdminSettings() {
  const { t } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const [s, setS] = useState<SiteSettings | null>(null);
  useEffect(() => { (async () => setS(await dbService.getSettings()))(); }, []);
  async function save() { if (!s) return; await dbService.saveSettings(s); showToast(t("common.saved"), "success"); }
  if (!s) return null;
  return (
    <Card><CardBody className="space-y-3">
      <Input label={t("admin.settings.siteName")} value={s.siteName} onChange={(e) => setS({ ...s, siteName: e.target.value })} />
      <Input label={t("admin.settings.supportEmail")} value={s.supportEmail} onChange={(e) => setS({ ...s, supportEmail: e.target.value })} />
      <Input label="Brand color (hex)" value={s.brandColor || "#0d9488"} onChange={(e) => setS({ ...s, brandColor: e.target.value })} />
      <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><input type="checkbox" checked={s.allowRegistration} onChange={(e) => setS({ ...s, allowRegistration: e.target.checked })} /> {t("admin.settings.allowReg")}</label>
      <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><input type="checkbox" checked={s.maintenance} onChange={(e) => setS({ ...s, maintenance: e.target.checked })} /> {t("admin.settings.maintenance")}</label>
      <div className="flex justify-end"><Button onClick={save}>{t("common.save")}</Button></div>
    </CardBody></Card>
  );
}

// ═════════════════ Chat Manager (admin moderation) ═════════════════
function ChatManager() {
  const { t, tr } = useI18n();
  const [threads, setThreads] = useState<Array<import("@/types").ChatThread>>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<import("@/types").ChatMessage>>([]);
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsub = dbService.subscribe<import("@/types").ChatThread>("chatThreads", (docs) => {
      setThreads(docs.sort((a, b) => (b.lastMessageAt || b.createdAt) - (a.lastMessageAt || a.createdAt)));
    });
    (async () => {
      const all = await dbService.list<import("@/types").ChatMessage>("chatMessages");
      const c: Record<string, number> = {};
      for (const m of all) c[m.threadId] = (c[m.threadId] || 0) + 1;
      setMsgCounts(c);
    })();
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!openId) return;
    const unsub = dbService.subscribe<import("@/types").ChatMessage>("chatMessages", (docs) =>
      setMessages(docs.filter((m) => m.threadId === openId).sort((a, b) => a.createdAt - b.createdAt))
    );
    return () => unsub();
  }, [openId]);

  async function toggleStatus(th: import("@/types").ChatThread) {
    const next = th.status === "closed" ? "open" : "closed";
    await dbService.update("chatThreads", th.id, { status: next });
  }
  async function del(th: import("@/types").ChatThread) {
    if (!confirm(t("common.confirm") + "?")) return;
    // Remove the thread and its messages
    const all = await dbService.list<import("@/types").ChatMessage>("chatMessages");
    for (const m of all) if (m.threadId === th.id) await dbService.remove("chatMessages", m.id);
    await dbService.remove("chatThreads", th.id);
  }

  const active = threads.find((th) => th.id === openId) || null;
  const peer = active?.participants?.find((p) => p.uid !== active?.userId) || null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">💬 {t("admin.chatMgr.title")} <Badge tone="gray">{threads.length}</Badge></h2>

      <div className="grid lg:grid-cols-[320px_1fr] gap-3">
        <Card className="overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
            {t("admin.chatMgr.threads")}
          </div>
          <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {threads.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">{t("admin.chatMgr.noThreads")}</div>
            )}
            {threads.map((th) => (
              <button key={th.id} onClick={() => setOpenId(th.id)}
                className={cn("w-full text-start p-3 transition",
                  openId === th.id ? "bg-teal-50 dark:bg-teal-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge tone={th.kind === "friend" ? "violet" : "blue"}>
                    {th.kind === "friend" ? t("admin.chatMgr.friend") : t("admin.chatMgr.support")}
                  </Badge>
                  <Badge tone={th.status === "closed" ? "gray" : "green"}>{th.status}</Badge>
                </div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{th.subject || th.username}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {th.lastMessage || "—"} · {msgCounts[th.id] || 0} {t("admin.chatMgr.messagesCount")}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          {!active ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">{t("chat.selectThread")}</div>
          ) : (
            <>
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{active.subject || active.username}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {active.participants ? active.participants.map((p) => p.name).join(" ↔ ") : active.username}
                    {peer ? ` · ${peer.name}` : ""}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(active)}>
                    {active.status === "closed" ? t("admin.chatMgr.reopen") : t("admin.chatMgr.close")}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => del(active)}>{t("common.delete")}</Button>
                </div>
              </div>
              <div className="p-3 max-h-[55vh] overflow-y-auto space-y-2 bg-slate-50/40 dark:bg-slate-950/40">
                {messages.length === 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">{t("common.emptyState")}</div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Avatar name={m.senderName} src={m.senderPhoto} size={20} />
                      <span className="font-semibold">{m.senderName}</span>
                      <span>·</span>
                      <span>{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-sm mt-1 whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100">
                      {m.deletedForAll ? <em className="text-slate-400">🗑</em> : m.text}
                    </div>
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="text-xs text-slate-500 mt-1">📎 {m.attachments.length}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
      {/* Suppress unused-var warning for tr in linter */}
      {void tr}
    </div>
  );
}

// ═════════════════ Final Review Checklist ═════════════════
const REVIEW_KEY = "medacad.admin.review";

interface ReviewItem { id: string; group: string; icon: string; labelKey: TKey; descKey: TKey; to?: string; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TKey = any;

function AdminReviewChecklist() {
  const { t } = useI18n();
  const nav = useNavigate();
  const items: ReviewItem[] = [
    { id: "auth",         group: "core",       icon: "🔐", labelKey: "admin.review.i.auth",         descKey: "admin.review.d.auth",         to: "/auth" },
    { id: "userMgmt",     group: "admin",      icon: "👥", labelKey: "admin.review.i.userMgmt",     descKey: "admin.review.d.userMgmt",     to: "/admin/users" },
    { id: "mcqs",         group: "learning",   icon: "❓", labelKey: "admin.review.i.mcqs",         descKey: "admin.review.d.mcqs",         to: "/admin/mcqs" },
    { id: "cases",        group: "learning",   icon: "📋", labelKey: "admin.review.i.cases",        descKey: "admin.review.d.cases",        to: "/admin/cases" },
    { id: "opd",          group: "learning",   icon: "🩺", labelKey: "admin.review.i.opd",          descKey: "admin.review.d.opd",          to: "/admin/opd" },
    { id: "education",    group: "learning",   icon: "📚", labelKey: "admin.review.i.education",    descKey: "admin.review.d.education",    to: "/admin/education" },
    { id: "friends",      group: "community",  icon: "🤝", labelKey: "admin.review.i.friends",      descKey: "admin.review.d.friends",      to: "/friends" },
    { id: "chat",         group: "community",  icon: "💬", labelKey: "admin.review.i.chat",         descKey: "admin.review.d.chat",         to: "/admin/chats" },
    { id: "notifications",group: "community",  icon: "🔔", labelKey: "admin.review.i.notifications",descKey: "admin.review.d.notifications",to: "/admin/notifications" },
    { id: "leaderboard",  group: "community",  icon: "🏆", labelKey: "admin.review.i.leaderboard",  descKey: "admin.review.d.leaderboard",  to: "/admin/leaderboard" },
    { id: "streak",       group: "community",  icon: "🔥", labelKey: "admin.review.i.streak",       descKey: "admin.review.d.streak",       to: "/admin/streaks" },
    { id: "demoUsers",    group: "admin",      icon: "🧪", labelKey: "admin.review.i.demoUsers",    descKey: "admin.review.d.demoUsers",    to: "/admin/demo" },
    { id: "reports",      group: "admin",      icon: "📈", labelKey: "admin.review.i.reports",      descKey: "admin.review.d.reports",      to: "/admin/reports" },
    { id: "localization", group: "system",     icon: "🌍", labelKey: "admin.review.i.localization", descKey: "admin.review.d.localization" },
    { id: "theme",        group: "system",     icon: "🎨", labelKey: "admin.review.i.theme",        descKey: "admin.review.d.theme" },
    { id: "audio",        group: "system",     icon: "🎵", labelKey: "admin.review.i.audio",        descKey: "admin.review.d.audio" },
    { id: "branding",     group: "system",     icon: "🖼️", labelKey: "admin.review.i.branding",     descKey: "admin.review.d.branding",     to: "/admin/branding" },
    { id: "settings",     group: "system",     icon: "⚙️", labelKey: "admin.review.i.settings",     descKey: "admin.review.d.settings",     to: "/admin/settings" },
    { id: "firebase",     group: "deployment", icon: "🔥", labelKey: "admin.review.i.firebase",     descKey: "admin.review.d.firebase" },
    { id: "pwa",          group: "deployment", icon: "📱", labelKey: "admin.review.i.pwa",          descKey: "admin.review.d.pwa" },
    { id: "mobile",       group: "deployment", icon: "📲", labelKey: "admin.review.i.mobile",       descKey: "admin.review.d.mobile" },
    { id: "production",   group: "deployment", icon: "🚀", labelKey: "admin.review.i.production",   descKey: "admin.review.d.production" },
  ];

  const [checked, setChecked] = useState<Set<string>>(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem(REVIEW_KEY) || "[]")); }
    catch { return new Set(); }
  });
  useEffect(() => {
    try { localStorage.setItem(REVIEW_KEY, JSON.stringify(Array.from(checked))); }
    catch { /* empty */ }
  }, [checked]);

  const done = checked.size;
  const total = items.length;
  const pct = Math.round((done / total) * 100);
  const complete = done === total;

  function toggle(id: string) {
    setChecked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function reset() { setChecked(new Set()); }
  function exportReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      completed: complete,
      progress: `${done}/${total}`,
      items: items.map((i) => ({ id: i.id, verified: checked.has(i.id) })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "qcap-review-report.json"; a.click();
    URL.revokeObjectURL(url);
  }

  const groups = ["core", "admin", "learning", "community", "system", "deployment"] as const;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">✅ {t("admin.review.title")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("admin.review.intro")}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t("admin.review.readOnly")}</p>
      </div>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t("admin.review.progress").replace("{done}", String(done)).replace("{total}", String(total))}
            </div>
            {complete && <Badge tone="green">🚀 {t("admin.review.readyForProd")}</Badge>}
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className={cn("h-full transition-all",
              complete ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-teal-500 to-sky-500"
            )} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={exportReport}>⬇ {t("admin.review.exportReport")}</Button>
            <Button size="sm" variant="ghost" onClick={reset}>{t("admin.review.reset")}</Button>
          </div>
        </CardBody>
      </Card>

      {groups.map((g) => {
        const list = items.filter((i) => i.group === g);
        if (list.length === 0) return null;
        return (
          <div key={g}>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
              {t(`admin.review.g.${g}` as TKey)}
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {list.map((i) => {
                const isChecked = checked.has(i.id);
                return (
                  <Card key={i.id} className={cn("transition", isChecked && "border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-900/10")}>
                    <CardBody className="flex items-start gap-3">
                      <button onClick={() => toggle(i.id)}
                        className={cn("mt-0.5 h-6 w-6 rounded-md border-2 grid place-items-center shrink-0 transition",
                          isChecked
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 dark:border-slate-600")}
                        aria-label={t("admin.review.mark")}
                      >{isChecked ? "✓" : ""}</button>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                          <span>{i.icon}</span>{t(i.labelKey)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t(i.descKey)}</div>
                        {i.to && (
                          <button onClick={() => nav(i.to!)}
                            className="text-xs text-teal-700 dark:text-teal-400 hover:underline mt-1">
                            {t("admin.review.go")}
                          </button>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {complete && (
        <Card className="!border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/20">
          <CardBody className="text-center py-6">
            <div className="text-4xl mb-2">🎉</div>
            <div className="font-bold text-emerald-800 dark:text-emerald-200">{t("admin.review.complete")}</div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ═════════════════ About Us Manager ═════════════════
function AboutUsManager() {
  const { t, tr } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const me = useAuthStore((s) => s.user);
  const nav = useNavigate();
  const [blocks, setBlocks] = useState<AboutBlock[]>([]);
  const [settings, setSettings] = useState<AboutSettings>({});
  const [edit, setEdit] = useState<AboutBlock | null>(null);

  async function load() {
    const list = await dbService.list<AboutBlock>("aboutBlocks");
    setBlocks(list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    const s = await dbService.get<AboutSettings & { id: string }>("aboutSettings", "main");
    if (s) setSettings(s);
  }
  useEffect(() => { load(); }, []);

  const blockTypes: AboutBlockType[] = ["hero", "section", "mission", "vision", "contact", "social"];

  function empty(type: AboutBlockType): AboutBlock {
    return {
      id: `ab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      title: { en: "", ar: "", so: "" },
      body: { en: "", ar: "", so: "" },
      order: blocks.length,
      published: true,
      createdAt: Date.now(),
    };
  }

  async function saveBlock(b: AboutBlock) {
    await dbService.set("aboutBlocks", b.id, { ...b, updatedAt: Date.now() });
    await audit(me?.uid, "about.block.save", b.id);
    showToast(t("common.saved"), "success");
    setEdit(null); load();
  }
  async function delBlock(b: AboutBlock) {
    if (!confirm(t("common.confirm") + "?")) return;
    await dbService.remove("aboutBlocks", b.id);
    await audit(me?.uid, "about.block.delete", b.id);
    load();
  }
  async function togglePublished(b: AboutBlock) {
    await dbService.update<AboutBlock>("aboutBlocks", b.id, { published: !b.published, updatedAt: Date.now() });
    load();
  }
  async function move(b: AboutBlock, dir: -1 | 1) {
    const idx = blocks.findIndex((x) => x.id === b.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= blocks.length) return;
    const swap = blocks[swapIdx];
    await dbService.update<AboutBlock>("aboutBlocks", b.id,   { order: swap.order ?? swapIdx });
    await dbService.update<AboutBlock>("aboutBlocks", swap.id, { order: b.order   ?? idx });
    load();
  }
  async function saveSettings() {
    await dbService.set("aboutSettings", "main", { id: "main", ...settings, updatedAt: Date.now() });
    await audit(me?.uid, "about.settings.save");
    showToast(t("common.saved"), "success");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">ℹ️ {t("admin.aboutMgr.title")}</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => nav("/about")}>👁 {t("admin.aboutMgr.preview")}</Button>
        </div>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{t("admin.aboutMgr.intro")}</p>

      {/* Organization settings */}
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold">
          🏢 {t("admin.aboutMgr.orgSettings")}
        </div>
        <CardBody className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 grid sm:grid-cols-3 gap-2">
            <Input label={`${t("admin.aboutMgr.orgName")} (EN)`}
              value={settings.orgName?.en || ""}
              onChange={(e) => setSettings({ ...settings, orgName: { ...(settings.orgName || { en: "", ar: "", so: "" }), en: e.target.value } })} />
            <Input label={`${t("admin.aboutMgr.orgName")} (AR)`}
              value={settings.orgName?.ar || ""}
              onChange={(e) => setSettings({ ...settings, orgName: { ...(settings.orgName || { en: "", ar: "", so: "" }), ar: e.target.value } })} />
            <Input label={`${t("admin.aboutMgr.orgName")} (SO)`}
              value={settings.orgName?.so || ""}
              onChange={(e) => setSettings({ ...settings, orgName: { ...(settings.orgName || { en: "", ar: "", so: "" }), so: e.target.value } })} />
          </div>
          <Input label={t("admin.aboutMgr.orgLogo")} value={settings.orgLogo || ""}
            onChange={(e) => setSettings({ ...settings, orgLogo: e.target.value })} />
          <Input label={t("admin.aboutMgr.contactEmail")} value={settings.contactEmail || ""}
            onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} />
          <Input label={t("admin.aboutMgr.contactPhone")} value={settings.contactPhone || ""}
            onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })} />
          <Input label={t("admin.aboutMgr.contactWebsite")} value={settings.contactWebsite || ""}
            onChange={(e) => setSettings({ ...settings, contactWebsite: e.target.value })} />
          <Input label={`${t("admin.aboutMgr.contactAddress")} (EN)`} value={settings.contactAddress?.en || ""}
            onChange={(e) => setSettings({ ...settings, contactAddress: { ...(settings.contactAddress || { en: "", ar: "", so: "" }), en: e.target.value } })} />
          <Input label={`${t("admin.aboutMgr.contactAddress")} (AR)`} value={settings.contactAddress?.ar || ""}
            onChange={(e) => setSettings({ ...settings, contactAddress: { ...(settings.contactAddress || { en: "", ar: "", so: "" }), ar: e.target.value } })} />
          <Input label={`${t("admin.aboutMgr.contactAddress")} (SO)`} value={settings.contactAddress?.so || ""}
            onChange={(e) => setSettings({ ...settings, contactAddress: { ...(settings.contactAddress || { en: "", ar: "", so: "" }), so: e.target.value } })} />
          <Input label={t("admin.aboutMgr.socialFacebook")} value={settings.facebook || ""}
            onChange={(e) => setSettings({ ...settings, facebook: e.target.value })} />
          <Input label={t("admin.aboutMgr.socialTwitter")} value={settings.twitter || ""}
            onChange={(e) => setSettings({ ...settings, twitter: e.target.value })} />
          <Input label={t("admin.aboutMgr.socialInstagram")} value={settings.instagram || ""}
            onChange={(e) => setSettings({ ...settings, instagram: e.target.value })} />
          <Input label={t("admin.aboutMgr.socialLinkedin")} value={settings.linkedin || ""}
            onChange={(e) => setSettings({ ...settings, linkedin: e.target.value })} />
          <Input label={t("admin.aboutMgr.socialYoutube")} value={settings.youtube || ""}
            onChange={(e) => setSettings({ ...settings, youtube: e.target.value })} />
          <Input label={t("admin.aboutMgr.socialWhatsapp")} value={settings.whatsapp || ""}
            onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} />
          <div className="sm:col-span-2 flex justify-end">
            <Button onClick={saveSettings}>{t("common.save")}</Button>
          </div>
        </CardBody>
      </Card>

      {/* Blocks */}
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="font-semibold">📚 {t("admin.aboutMgr.blocks")} <Badge tone="gray">{blocks.length}</Badge></div>
          <div className="flex gap-1 flex-wrap">
            {blockTypes.map((tp) => (
              <Button key={tp} size="sm" variant="outline" onClick={() => setEdit(empty(tp))}>
                + {t(`admin.aboutMgr.type.${tp}` as unknown as import("@/i18n/translations").TranslationKey)}
              </Button>
            ))}
          </div>
        </div>
        <CardBody className="space-y-2">
          {blocks.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">{t("admin.aboutMgr.noBlocks")}</div>}
          {blocks.map((b, idx) => (
            <div key={b.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center gap-3">
              {b.imageUrl && <img src={b.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-0.5">
                  <Badge tone="blue">{t(`admin.aboutMgr.type.${b.type}` as unknown as import("@/i18n/translations").TranslationKey)}</Badge>
                  <Badge tone={b.published !== false ? "green" : "gray"}>
                    {b.published !== false ? t("admin.aboutMgr.published") : t("admin.aboutMgr.unpublished")}
                  </Badge>
                  <Badge tone="gray">#{idx + 1}</Badge>
                </div>
                <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{tr(b.title) || `(${b.type})`}</div>
                {b.body && <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{tr(b.body)}</div>}
              </div>
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="ghost" onClick={() => move(b, -1)} disabled={idx === 0} title={t("admin.aboutMgr.moveUp")}>↑</Button>
                <Button size="sm" variant="ghost" onClick={() => move(b, 1)} disabled={idx === blocks.length - 1} title={t("admin.aboutMgr.moveDown")}>↓</Button>
                <Button size="sm" variant={b.published !== false ? "outline" : "success"} onClick={() => togglePublished(b)}>
                  {b.published !== false ? t("admin.article.unpublish") : t("admin.article.publish")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEdit(b)}>✎</Button>
                <Button size="sm" variant="danger" onClick={() => delBlock(b)}>🗑</Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Editor modal */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={t("admin.aboutMgr.editBlock")} size="xl">
        {edit && <AboutBlockEditor block={edit} onSave={saveBlock} onCancel={() => setEdit(null)} />}
      </Modal>
    </div>
  );
}

function AboutBlockEditor({ block, onSave, onCancel }: { block: AboutBlock; onSave: (b: AboutBlock) => Promise<void>; onCancel: () => void }) {
  const { t } = useI18n();
  const [b, setB] = useState<AboutBlock>(block);
  const set = <K extends keyof AboutBlock>(k: K, v: AboutBlock[K]) => setB({ ...b, [k]: v });
  const setLoc = (k: "title" | "body" | "contactAddress", lang: "en" | "ar" | "so", v: string) => {
    const cur = (b[k] as import("@/types").LocalizedText | undefined) || { en: "", ar: "", so: "" };
    setB({ ...b, [k]: { ...cur, [lang]: v } });
  };
  return (
    <div className="space-y-3">
      <Select label={t("admin.aboutMgr.blockType")} value={b.type} onChange={(e) => set("type", e.target.value as AboutBlockType)}>
        <option value="hero">{t("admin.aboutMgr.type.hero")}</option>
        <option value="section">{t("admin.aboutMgr.type.section")}</option>
        <option value="mission">{t("admin.aboutMgr.type.mission")}</option>
        <option value="vision">{t("admin.aboutMgr.type.vision")}</option>
        <option value="contact">{t("admin.aboutMgr.type.contact")}</option>
        <option value="social">{t("admin.aboutMgr.type.social")}</option>
      </Select>

      {b.type !== "social" && (
        <div className="grid sm:grid-cols-3 gap-2">
          <Input label={`${t("admin.aboutMgr.blockTitle")} (EN)`} value={b.title?.en || ""} onChange={(e) => setLoc("title", "en", e.target.value)} />
          <Input label={`${t("admin.aboutMgr.blockTitle")} (AR)`} value={b.title?.ar || ""} onChange={(e) => setLoc("title", "ar", e.target.value)} />
          <Input label={`${t("admin.aboutMgr.blockTitle")} (SO)`} value={b.title?.so || ""} onChange={(e) => setLoc("title", "so", e.target.value)} />
        </div>
      )}

      {(b.type === "hero" || b.type === "section" || b.type === "mission" || b.type === "vision") && (
        <>
          <div className="grid sm:grid-cols-3 gap-2">
            <Textarea label={`${t("admin.aboutMgr.blockBody")} (EN)`} rows={5} value={b.body?.en || ""} onChange={(e) => setLoc("body", "en", e.target.value)} />
            <Textarea label={`${t("admin.aboutMgr.blockBody")} (AR)`} rows={5} value={b.body?.ar || ""} onChange={(e) => setLoc("body", "ar", e.target.value)} />
            <Textarea label={`${t("admin.aboutMgr.blockBody")} (SO)`} rows={5} value={b.body?.so || ""} onChange={(e) => setLoc("body", "so", e.target.value)} />
          </div>
          <Input label={t("admin.aboutMgr.blockImage")} value={b.imageUrl || ""} onChange={(e) => set("imageUrl", e.target.value)} />
        </>
      )}

      {b.type === "contact" && (
        <div className="grid sm:grid-cols-2 gap-2">
          <Input label={t("admin.aboutMgr.contactEmail")} value={b.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} />
          <Input label={t("admin.aboutMgr.contactPhone")} value={b.contactPhone || ""} onChange={(e) => set("contactPhone", e.target.value)} />
          <Input label={t("admin.aboutMgr.contactWebsite")} value={b.contactWebsite || ""} onChange={(e) => set("contactWebsite", e.target.value)} />
          <Input label={`${t("admin.aboutMgr.contactAddress")} (EN)`} value={b.contactAddress?.en || ""} onChange={(e) => setLoc("contactAddress", "en", e.target.value)} />
          <Input label={`${t("admin.aboutMgr.contactAddress")} (AR)`} value={b.contactAddress?.ar || ""} onChange={(e) => setLoc("contactAddress", "ar", e.target.value)} />
          <Input label={`${t("admin.aboutMgr.contactAddress")} (SO)`} value={b.contactAddress?.so || ""} onChange={(e) => setLoc("contactAddress", "so", e.target.value)} />
        </div>
      )}

      {b.type === "social" && (
        <div className="grid sm:grid-cols-2 gap-2">
          <Input label={t("admin.aboutMgr.socialFacebook")} value={b.facebook || ""} onChange={(e) => set("facebook", e.target.value)} />
          <Input label={t("admin.aboutMgr.socialTwitter")} value={b.twitter || ""} onChange={(e) => set("twitter", e.target.value)} />
          <Input label={t("admin.aboutMgr.socialInstagram")} value={b.instagram || ""} onChange={(e) => set("instagram", e.target.value)} />
          <Input label={t("admin.aboutMgr.socialLinkedin")} value={b.linkedin || ""} onChange={(e) => set("linkedin", e.target.value)} />
          <Input label={t("admin.aboutMgr.socialYoutube")} value={b.youtube || ""} onChange={(e) => set("youtube", e.target.value)} />
          <Input label={t("admin.aboutMgr.socialWhatsapp")} value={b.whatsapp || ""} onChange={(e) => set("whatsapp", e.target.value)} />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={b.published !== false} onChange={(e) => set("published", e.target.checked)} />
        {t("admin.aboutMgr.published")}
      </label>
      <Input label={t("admin.aboutMgr.blockOrder")} type="number" value={b.order ?? 0}
        onChange={(e) => set("order", Number(e.target.value))} />

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button onClick={() => onSave(b)}>{t("common.save")}</Button>
      </div>
    </div>
  );
}

// helper
async function audit(actorId: string | undefined, action: string, target?: string, meta?: Record<string, unknown>) {
  await dbService.add<Omit<AuditLog, "id">>("auditLogs", { actorId: actorId || "system", action, target, meta, createdAt: Date.now() });
}

/** Export a user list to CSV (UID + full user profile fields). */
function exportUsersCsv(users: AppUser[]) {
  const header = ["uid", "username", "email", "whatsapp", "country", "role", "status", "xp", "streak", "language", "registeredAt", "lastActiveAt", "isDemo"];
  const rows = users.map((u) => [
    u.uid, u.username, u.email || "", u.whatsapp || "", u.country || "",
    u.role, u.status || "active", String(u.xp || 0), String(u.streak || 0),
    u.language || "", new Date(u.createdAt).toISOString(),
    u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : "",
    u.isDemo ? "yes" : "",
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `qcap-users-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
