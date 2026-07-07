import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore, useUIStore } from "@/stores";
import { LANGS, useI18n } from "@/i18n";
import { useTheme, type ThemeMode } from "@/theme";
import { isSoundEnabled, setSoundEnabled, playSound } from "@/utils/sound";
import { cn } from "@/utils/cn";
import { useEffect, useRef, useState } from "react";
import { isFirebaseConfigured } from "@/config/firebase";
import { Avatar, ToastHost } from "./ui";
import { dbService } from "@/services/db";
import { authService } from "@/services/auth";
import { useBackButton } from "@/hooks/useBackButton";
import { showNotification } from "@/services/notifications";
import { BrandLogo } from "./BrandLogo";
import { MusicButton } from "./MusicButton";
import type { Notification } from "@/types";

type NavItem = { to: string; label: string; icon: string; admin?: boolean };

function useNavItems(): NavItem[] {
  const { t } = useI18n();
  return [
    { to: "/", label: t("nav.home"), icon: "🏠" },
    { to: "/mcq", label: t("nav.mcq"), icon: "❓" },
    { to: "/cases", label: t("nav.cases"), icon: "📋" },
    { to: "/opd", label: t("nav.opd"), icon: "🩺" },
    { to: "/education", label: t("nav.education"), icon: "📚" },
    { to: "/leaderboard", label: t("nav.leaderboard"), icon: "🏆" },
    { to: "/friends", label: t("nav.friends"), icon: "🤝" },
    { to: "/search", label: t("nav.search"), icon: "🔍" },
    { to: "/notifications", label: t("nav.notifications"), icon: "🔔" },
    { to: "/support", label: t("nav.support"), icon: "💬" },
    { to: "/about", label: t("nav.about"), icon: "ℹ️" },
    { to: "/profile", label: t("nav.profile"), icon: "👤" },
    { to: "/admin", label: t("nav.admin"), icon: "🛡️", admin: true },
  ];
}

export default function Layout() {
  const { t, lang, setLang, dir } = useI18n();
  const user = useAuthStore((s) => s.user);
  const { sidebarOpen, toggleSidebar, setSidebar } = useUIStore();
  const nav = useNavigate();
  const items = useNavItems();
  const [unread, setUnread] = useState(0);

  // Android/PWA back-button handling
  useBackButton();

  const prevUnreadRef = useRef(0);
  const knownIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const unsub = dbService.subscribe<Notification>("notifications", (docs) => {
      const list = docs.filter((n) => n.audience === "broadcast" || n.userId === user.uid || (n.userIds || []).includes(user.uid));
      const readBy = (n: Notification) => (n.readBy || []).includes(user.uid) || n.read;
      const count = list.filter((n) => !readBy(n)).length;
      const prev = prevUnreadRef.current;
      if (count > prev && prev !== 0) playSound("notification");
      // Fire OS notifications for genuinely new ones (after first subscription snapshot)
      if (knownIdsRef.current.size > 0) {
        for (const n of list) {
          if (!knownIdsRef.current.has(n.id) && !readBy(n)) {
            const cat = n.audience === "personal" ? "personal" : "announcement";
            const title = (n.title[lang] || n.title.en || "Notification");
            const body = (n.body[lang] || n.body.en || "");
            void showNotification({
              title, body, category: cat, tag: n.id, url: "#/notifications",
            });
          }
        }
      }
      list.forEach((n) => knownIdsRef.current.add(n.id));
      prevUnreadRef.current = count;
      setUnread(count);
    });
    return () => unsub();
     
  }, [user, lang]);

  const visible = items.filter((i) => !i.admin || user?.role === "admin");

  return (
    <div className="min-h-screen flex flex-col" dir={dir}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur border-b border-slate-200 dark:border-slate-800 pt-safe">
        <div className="flex items-center justify-between h-14 px-3 sm:px-5 gap-3">
          <div className="flex items-center gap-2">
            <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Menu">
              <span className="text-xl">☰</span>
            </button>
            <button onClick={() => nav("/")} className="flex items-center gap-2" aria-label={t("appName")}>
              <BrandLogo size={32} />
            </button>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <SoundToggle />
            <select value={lang} onChange={(e) => setLang(e.target.value as typeof lang)} className="text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1.5 border-0 focus:ring-2 focus:ring-teal-500/30 outline-none">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
            {user ? (
              <>
                <button onClick={() => nav("/notifications")} className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t("nav.notifications")}>
                  <span className="text-lg">🔔</span>
                  {unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] rounded-full h-4 min-w-4 px-1 grid place-items-center font-bold">{unread > 9 ? "9+" : unread}</span>}
                </button>
                {/* Music player button (replaces the previous logout icon) */}
                <MusicButton />
                <button onClick={() => nav("/profile")} className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-2 py-1">
                  <Avatar name={user.username} src={user.photoURL} size={28} />
                  <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-200">{user.username}</span>
                </button>
              </>
            ) : (
              <button onClick={() => nav("/auth")} className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg font-medium">
                {t("nav.login")}
              </button>
            )}
          </div>
        </div>
        {!isFirebaseConfigured && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border-t border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs px-4 py-1.5 text-center">
            ⚠️ {t("firebase.demoBanner")}
          </div>
        )}
        {isFirebaseConfigured && user && !authService.isEmailVerified() && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border-t border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs px-4 py-1.5 text-center flex items-center justify-center gap-2 flex-wrap">
            <span>✉️ {t("auth.pleaseVerify")}</span>
            <button
              onClick={async () => {
                const ok = await authService.resendVerification();
                if (ok) alert(t("auth.verificationSent"));
              }}
              className="underline font-medium hover:no-underline"
            >
              {t("auth.resendVerification")}
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col w-60 border-e border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur">
          <nav className="p-3 space-y-1">
            {visible.map((i) => <SideLink key={i.to} to={i.to} label={i.label} icon={i.icon} />)}
          </nav>
        </aside>

        {/* Sidebar (mobile drawer) */}
        {sidebarOpen && (
          <>
            <div className="lg:hidden fixed inset-0 bg-slate-900/50 z-40" onClick={() => setSidebar(false)} />
            <aside className="lg:hidden fixed top-0 bottom-0 start-0 w-64 bg-white dark:bg-slate-900 z-50 shadow-xl animate-slide-up pt-safe">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <BrandLogo size={28} />
                <button onClick={() => setSidebar(false)} className="text-2xl leading-none text-slate-500 dark:text-slate-400" aria-label={t("common.close")}>×</button>
              </div>
              <nav className="p-3 space-y-1 flex flex-col h-full">
                {visible.map((i) => <SideLink key={i.to} to={i.to} label={i.label} icon={i.icon} onClick={() => setSidebar(false)} />)}
                {/* Logout intentionally kept only inside Profile → Logout */}
              </nav>
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-6">
          <div className="max-w-6xl mx-auto p-3 sm:p-5">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom nav (mobile) — 6 core items: Home / MCQ / Cases / OPD / Friends / Profile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-safe z-30">
        <div className="grid grid-cols-6">
          {(() => {
            const preferred = ["/", "/mcq", "/cases", "/opd", "/friends", "/profile"];
            const map = new Map(items.map((i) => [i.to, i]));
            return preferred.map((to) => map.get(to)).filter(Boolean) as typeof items;
          })().map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === "/"} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 py-2 text-[10px]", isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-400")}>
              <span className="text-lg">{i.icon}</span>
              <span className="truncate max-w-full px-0.5">{i.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <ToastHost />
    </div>
  );
}

function SideLink({ to, label, icon, onClick }: { to: string; label: string; icon: string; onClick?: () => void }) {
  return (
    <NavLink to={to} end={to === "/"} onClick={onClick} className={({ isActive }) => cn(
      "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition",
      isActive ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100",
    )}>
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

// ─────────── Theme toggle (dropdown) ───────────
function ThemeToggle() {
  const { t } = useI18n();
  const { mode, setMode, resolved } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const modes: { id: ThemeMode; label: string; icon: string }[] = [
    { id: "light",  label: t("theme.light"),  icon: "☀️" },
    { id: "dark",   label: t("theme.dark"),   icon: "🌙" },
    { id: "system", label: t("theme.system"), icon: "💻" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Theme"
        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-lg"
      >
        {resolved === "dark" ? "🌙" : "☀️"}
      </button>
      {open && (
        <div className="absolute end-0 mt-1 w-40 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1 z-50 animate-fade-in">
          <div className="px-2 py-1 text-[10px] uppercase text-slate-500 dark:text-slate-400">{t("theme.appearance")}</div>
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setOpen(false); }}
              className={cn("w-full text-start flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                mode === m.id ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <span>{m.icon}</span> <span>{m.label}</span>
              {mode === m.id && <span className="ms-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────── Sound toggle ───────────
function SoundToggle() {
  const [on, setOn] = useState<boolean>(() => isSoundEnabled());
  return (
    <button
      onClick={() => { const nv = !on; setSoundEnabled(nv); setOn(nv); if (nv) playSound("click"); }}
      aria-label="Sound"
      title={on ? "Sound on" : "Sound off"}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-lg hidden sm:block"
    >
      {on ? "🔊" : "🔇"}
    </button>
  );
}
