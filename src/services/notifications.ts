/**
 * Notification preferences + browser Notification/Push API wrapper.
 *
 * - Categories: announcement, personal, reminder, achievement.
 * - Per-category enable/disable, plus a master toggle.
 * - Works in-page (Notification API) always; will also work when the app is
 *   closed IF a service worker is active and a push subscription exists.
 * - Storage: all preferences persist in localStorage — zero Firestore writes.
 */

export type NotifCategory = "announcement" | "personal" | "reminder" | "achievement";

export interface NotifPrefs {
  enabled: boolean;
  categories: Record<NotifCategory, boolean>;
}

const KEY = "medacad.notif.prefs";

const DEFAULT: NotifPrefs = {
  enabled: false,
  categories: { announcement: true, personal: true, reminder: true, achievement: true },
};

export function getPrefs(): NotifPrefs {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<NotifPrefs>;
    return {
      enabled: !!parsed.enabled,
      categories: { ...DEFAULT.categories, ...(parsed.categories || {}) },
    };
  } catch { return DEFAULT; }
}

export function setPrefs(p: NotifPrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function currentPermission(): NotificationPermission {
  if (!isSupported()) return "denied";
  return Notification.permission;
}

/** Ask the user for permission and return the resolved state. */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  try {
    const p = await Notification.requestPermission();
    return p;
  } catch { return "denied"; }
}

interface ShowOpts {
  title: string;
  body?: string;
  category?: NotifCategory;
  tag?: string;
  icon?: string;
  image?: string;
  data?: Record<string, unknown>;
  url?: string; // opened on click
}

/**
 * Show a notification. Uses ServiceWorkerRegistration if available (so it
 * survives app-in-background); otherwise falls back to the in-page API.
 */
export async function showNotification(opts: ShowOpts): Promise<boolean> {
  if (!isSupported() || Notification.permission !== "granted") return false;
  const prefs = getPrefs();
  if (!prefs.enabled) return false;
  const cat = opts.category || "announcement";
  if (!prefs.categories[cat]) return false;

  const payload = {
    body: opts.body,
    tag: opts.tag,
    icon: opts.icon,
    data: { url: opts.url, category: cat, ...(opts.data || {}) },
    badge: opts.icon,
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && "showNotification" in reg) {
        await reg.showNotification(opts.title, payload);
        return true;
      }
    }
  } catch { /* fall through to in-page */ }

  try {
    const n = new Notification(opts.title, payload);
    if (opts.url) {
      n.onclick = () => { window.focus(); window.location.hash = opts.url!.replace(/^#/, ""); n.close(); };
    }
    return true;
  } catch { return false; }
}

/**
 * Schedule a local reminder notification.
 * Note: browser tabs must remain open for setTimeout to fire — for closed-app
 * scheduling you would need the Notification Triggers API (not universal yet).
 * We use setTimeout as a best-effort fallback that works everywhere in-page.
 */
const reminderTimers = new Map<string, number>();

export function scheduleReminder(id: string, when: number, opts: ShowOpts): void {
  cancelReminder(id);
  const delay = Math.max(0, when - Date.now());
  const timer = window.setTimeout(() => {
    void showNotification({ ...opts, category: "reminder" });
    reminderTimers.delete(id);
  }, delay);
  reminderTimers.set(id, timer);
}
export function cancelReminder(id: string) {
  const t = reminderTimers.get(id);
  if (t) { window.clearTimeout(t); reminderTimers.delete(id); }
}

export const notifCategories: { id: NotifCategory; icon: string }[] = [
  { id: "announcement", icon: "📢" },
  { id: "personal",     icon: "✉️" },
  { id: "reminder",     icon: "⏰" },
  { id: "achievement",  icon: "🏆" },
];
