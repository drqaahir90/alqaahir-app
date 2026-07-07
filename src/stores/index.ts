import { create } from "zustand";
import type { AppUser } from "@/types";
import { authService } from "@/services/auth";

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  init: () => () => void;
  setUser: (u: AppUser | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  init: () => {
    return authService.onChange((u) => {
      // Track current uid in localStorage so notify.ts can decide when to
      // raise a real OS notification.
      try {
        if (u) localStorage.setItem("medacad.currentUid", u.uid);
        else localStorage.removeItem("medacad.currentUid");
      } catch { /* ignore */ }
      set({ user: u, loading: false });
    });
  },
  setUser: (u) => {
    try {
      if (u) localStorage.setItem("medacad.currentUid", u.uid);
      else localStorage.removeItem("medacad.currentUid");
    } catch { /* ignore */ }
    set({ user: u, loading: false });
  },
  logout: async () => {
    await authService.logout();
    try { localStorage.removeItem("medacad.currentUid"); } catch { /* ignore */ }
    set({ user: null });
  },
}));

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebar: (v: boolean) => void;
  toast: { id: number; msg: string; kind: "info" | "success" | "error" } | null;
  showToast: (msg: string, kind?: "info" | "success" | "error") => void;
}

let toastId = 0;
export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (v) => set({ sidebarOpen: v }),
  toast: null,
  showToast: (msg, kind = "info") => {
    const id = ++toastId;
    set({ toast: { id, msg, kind } });
    setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : {})), 2600);
  },
}));
