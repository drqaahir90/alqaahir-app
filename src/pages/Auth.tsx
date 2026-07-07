import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input } from "@/components/ui";
import { useI18n } from "@/i18n";
import { authService } from "@/services/auth";
import { useAuthStore, useUIStore } from "@/stores";
import { isFirebaseConfigured } from "@/config/firebase";

export default function AuthPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const showToast = useUIStore((s) => s.showToast);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const u = mode === "login"
        ? await authService.login(email, password)
        : await authService.register(email, password, username, whatsapp);
      setUser(u);
      // In Firebase mode, warn the user about email verification (owner exempt).
      if (isFirebaseConfigured && mode === "register" && u.email !== "dr.qaahir90@gmail.com") {
        showToast(t("auth.verificationSent"), "success");
      } else {
        showToast(mode === "login" ? t("auth.welcomeBack") : t("auth.accountCreated"), "success");
      }
      nav(u.role === "admin" ? "/admin" : "/", { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("common.authFailed");
      setErr(msg);
    } finally { setLoading(false); }
  }

  async function doResetPassword() {
    if (!email.trim()) { setErr(t("auth.email") + " ?"); return; }
    if (!isFirebaseConfigured) { setErr(t("auth.demoAccountsOnly")); return; }
    try {
      await authService.resetPassword(email);
      showToast(t("auth.checkInbox"), "success");
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("common.authFailed"));
    }
  }

  function fillDemo() {
    // Prefill Dr. Qaahir's owner credentials for one-tap sign-in.
    setEmail("dr.qaahir90@gmail.com");
    setPassword("Kingsadam36");
    setUsername("Dr. Qaahir");
    setWhatsapp("+62 851-2432-7946");
    setMode("login");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 dark:bg-slate-950">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 dark:from-teal-800 dark:via-emerald-800 dark:to-teal-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-12 w-12 rounded-2xl bg-white text-teal-700 grid place-items-center font-extrabold text-2xl shadow">Q</span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">{t("appName")}</div>
              <div className="text-xs uppercase tracking-widest text-teal-100">{t("appNameLong")}</div>
            </div>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-3">{t("tagline")}</h1>
          <p className="text-lg text-teal-100 max-w-md">{t("taglineFull")}</p>
          <p className="mt-3 text-teal-100/90 max-w-md text-sm">{t("auth.subtitle")}</p>
        </div>
        <div className="relative grid grid-cols-3 gap-3 mt-10">
          {[
            { icon: "❓", n: "1,000+", l: t("home.stats.mcqs") },
            { icon: "📋", n: "150+", l: t("home.stats.cases") },
            { icon: "🩺", n: "80+", l: t("home.stats.opd") },
          ].map((s) => (
            <div key={s.l} className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
              <div className="text-2xl">{s.icon}</div>
              <div className="text-xl font-bold mt-2">{s.n}</div>
              <div className="text-xs text-teal-100">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="relative text-sm text-teal-100">
          🌍 English · العربية · Soomaali
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center gap-2">
              <span className="h-10 w-10 rounded-xl bg-teal-600 text-white grid place-items-center font-extrabold text-lg">Q</span>
              <div className="text-start">
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{t("appName")}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("appNameLong")}</div>
              </div>
            </div>
          </div>
          <Card>
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                {mode === "login" ? t("auth.signIn") : t("auth.signUp")}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("tagline")}</p>

              {!isFirebaseConfigured && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                  <span>⚠️</span>
                  <div>
                    {t("auth.demoMode")}{" "}
                    <button type="button" onClick={fillDemo} className="underline font-medium">{t("auth.demoAdmin")}</button>
                  </div>
                </div>
              )}

              <form onSubmit={submit} className="space-y-3">
                <Input label={t("auth.email")} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.emailPlaceholder")} autoComplete="email" />
                {mode === "register" && (
                  <>
                    <Input label={t("auth.username")} required value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("auth.usernamePlaceholder")} autoComplete="username" />
                    <Input label={t("auth.whatsapp")} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+252 61 …" />
                  </>
                )}
                <Input label={t("auth.password")} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.passwordPlaceholder")} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} />
                {mode === "login" && isFirebaseConfigured && (
                  <div className="text-end">
                    <button type="button" onClick={doResetPassword}
                      className="text-xs text-teal-700 dark:text-teal-400 hover:underline">
                      🔑 {t("auth.forgotPassword")}
                    </button>
                  </div>
                )}
                {err && <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/50 rounded-lg px-3 py-2">{err}</div>}
                <Button type="submit" loading={loading} size="lg" className="w-full">
                  {mode === "login" ? t("auth.signIn") : t("auth.signUp")}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <button className="text-sm text-teal-700 dark:text-teal-400 hover:underline font-medium" onClick={() => setMode(mode === "login" ? "register" : "login")}>
                  {mode === "login" ? t("auth.needAccount") : t("auth.haveAccount")}
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
