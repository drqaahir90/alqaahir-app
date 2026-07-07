import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Android/PWA-friendly back-button behaviour.
 *
 * When installed as a standalone PWA, the OS back button fires a `popstate`
 * event. Without any handling, the first press exits the app. To match native
 * app behaviour we:
 *
 *   1. Push a sentinel history entry on load so the first `popstate` navigates
 *      within the app instead of leaving it.
 *   2. If the user is at the home route, prompt for confirmation before allowing
 *      an exit (installed apps only).
 *   3. Prevent accidental swipe-out via `overscroll-behavior` in CSS.
 */
export function useBackButton() {
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    // Only intercept when running as an installed PWA (standalone display mode).
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;
    if (!isStandalone) return;

    // Push a sentinel entry so first back doesn't exit immediately.
    try { window.history.pushState({ __medacad: true }, ""); } catch { /* ignore */ }

    function handler(e: PopStateEvent) {
      // If we're at the root, treat as exit intent.
      if (loc.pathname === "/") {
        const confirmed = window.confirm("Exit MedAcademy?");
        if (!confirmed) {
          // Push another sentinel to stay in the app.
          try { window.history.pushState({ __medacad: true }, ""); } catch { /* ignore */ }
          e.preventDefault?.();
        }
        // If confirmed, we let the exit happen naturally.
        return;
      }
      // Otherwise navigate back within the app.
      nav(-1);
    }

    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [nav, loc.pathname]);
}
