import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores";
import type { ReactNode } from "react";

export function ProtectedRoute({ children, adminOnly }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuthStore();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <div className="animate-pulse-soft text-slate-500 dark:text-slate-400">
          {(() => {
            try {
              const l = (localStorage.getItem("medacad.lang") || "en") as "en" | "ar" | "so";
              return { en: "Loading…", ar: "جارٍ التحميل…", so: "Waa la soo raradaa…" }[l];
            } catch { return "Loading…"; }
          })()}
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: loc.pathname }} replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}
