import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MusicProvider } from "@/audio/MusicProvider";
import { useAuthStore } from "@/stores";
import { dbService } from "@/services/db";
import { setupPWA, updateBrandingAssets } from "@/pwa";
import { ensureProtectedAdminDoc } from "@/services/auth";

// Code splitting
const Home = lazy(() => import("@/pages/Home"));
const AuthPage = lazy(() => import("@/pages/Auth"));
const MCQ = lazy(() => import("@/pages/MCQ"));
const Cases = lazy(() => import("@/pages/Cases"));
const OPD = lazy(() => import("@/pages/OPD"));
const Education = lazy(() => import("@/pages/Education"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Support = lazy(() => import("@/pages/Support"));
const Profile = lazy(() => import("@/pages/Profile"));
const Search = lazy(() => import("@/pages/Search"));
const Admin = lazy(() => import("@/pages/Admin"));
const Friends = lazy(() => import("@/pages/Friends"));
const UserProfile = lazy(() => import("@/pages/UserProfile"));
const FriendChat = lazy(() => import("@/pages/FriendChat"));
const About = lazy(() => import("@/pages/About"));

function LoadingScreen() {
  const label = (() => {
    try {
      const l = (localStorage.getItem("medacad.lang") || "en") as "en" | "ar" | "so";
      return { en: "Loading…", ar: "جارٍ التحميل…", so: "Waa la soo raradaa…" }[l];
    } catch { return "Loading…"; }
  })();
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 animate-pulse-soft">
        <span className="inline-block h-4 w-4 rounded-full bg-teal-500 animate-pulse" />
        {label}
      </div>
    </div>
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);

  // Initial setup: db, auth, PWA, branding.
  useEffect(() => {
    void dbService.init().then(() => ensureProtectedAdminDoc());
    void setupPWA({ name: "QCAP · Qaahir Clinical Academy", shortName: "QCAP", themeColor: "#0d9488" });

    // Load branding from settings (if admin has customized)
    (async () => {
      try {
        const s = await dbService.getSettings();
        if (s.branding) updateBrandingAssets({ favicon: s.branding.favicon, appIcon: s.branding.appIcon, themeColor: s.brandColor });
        if (s.brandColor) document.documentElement.style.setProperty("--brand", s.brandColor);
      } catch { /* ignore */ }
    })();

    const unsub = init();
    return () => unsub();
  }, [init]);

  return (
    <MusicProvider>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route element={<Layout />}>
              <Route index element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="mcq" element={<ProtectedRoute><MCQ /></ProtectedRoute>} />
              <Route path="cases" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
              <Route path="opd" element={<ProtectedRoute><OPD /></ProtectedRoute>} />
              <Route path="education" element={<ProtectedRoute><Education /></ProtectedRoute>} />
              <Route path="leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
              <Route path="friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
              <Route path="friends/chat/:uid" element={<ProtectedRoute><FriendChat /></ProtectedRoute>} />
              <Route path="u/:uid" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="about" element={<ProtectedRoute><About /></ProtectedRoute>} />
              <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
              <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
              <Route path="admin/*" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
              {/* Alias for consistency with docs/marketing */}
              <Route path="admin-dashboard" element={<Navigate to="/admin" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
        {/* Music player lives in the top bar as <MusicButton /> — see Layout.tsx */}
      </ErrorBoundary>
    </MusicProvider>
  );
}
