/**
 * Unified data service — optimized for Firebase Spark (Free) plan.
 *
 * Firestore quota-saving strategies:
 *   • Every `list`/`get`/`orderedList` result is cached in localStorage with
 *     a per-collection TTL (default 60s). This dramatically reduces read
 *     count during quick navigation.
 *   • Writes (`set`/`add`/`update`/`remove`) invalidate the collection cache.
 *   • Subscriptions are shared: multiple components on the same page use a
 *     single Firestore listener instead of N.
 *   • Every mutation call clears cache locally so the next read is fresh.
 *   • In demo/offline mode, everything is served from localStorage — zero
 *     network usage.
 */
import { db, isFirebaseConfigured } from "@/config/firebase";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy,
} from "firebase/firestore";
import {
  seedMCQs, seedCases, seedOPD, seedArticles, seedSubjects,
  seedNotifications, defaultSettings,
} from "@/data/seed";
import type { SiteSettings } from "@/types";

export type CollName =
  | "users" | "mcqs" | "caseStudies" | "opdCases" | "quizResults"
  | "leaderboards" | "educationArticles" | "notifications"
  | "supportTickets" | "auditLogs" | "siteSettings" | "subjects" | "statistics"
  | "chatThreads" | "chatMessages"
  | "friendRequests" | "friendships" | "challenges"
  | "aboutBlocks" | "aboutSettings";

const LS_PREFIX = "medacad.db.";
const CACHE_PREFIX = "medacad.cache.";

/** TTL for cached reads (ms). Static/rarely-changed collections cache longer. */
const CACHE_TTL: Partial<Record<CollName, number>> = {
  mcqs:              15 * 60 * 1000, // 15 min
  caseStudies:       15 * 60 * 1000,
  opdCases:          15 * 60 * 1000,
  educationArticles: 10 * 60 * 1000,
  subjects:          60 * 60 * 1000, // 1 h
  siteSettings:      10 * 60 * 1000,
  auditLogs:              60 * 1000, // 60 s
  users:              5 * 60 * 1000,
  quizResults:        5 * 60 * 1000,
  chatThreads:        0,             // realtime — no cache
  chatMessages:       0,
  notifications:      0,
};

const DEFAULT_TTL = 60 * 1000;
function ttlFor(coll: CollName): number { return CACHE_TTL[coll] ?? DEFAULT_TTL; }

type Doc = { id: string; [k: string]: unknown };

/**
 * Prepare an object for Firestore write:
 *   - Removes the `id` field (Firestore stores it in the document path, not the body).
 *   - Removes any keys whose value is exactly `undefined` — Firestore SDK v10+
 *     otherwise throws `Unsupported field value: undefined`.
 *
 * Runs shallowly by design; nested `undefined`s inside arrays/objects are
 * handled by Firestore itself when `ignoreUndefinedProperties: true` is set.
 */
function stripInvalid<T extends object>(data: T): Record<string, unknown> {
  const raw = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(raw)) {
    if (k === "id") continue;
    const v = raw[k];
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

// ──────── Read cache ────────
interface CacheEntry { at: number; data: Doc[]; }
const memCache = new Map<string, CacheEntry>();

function cacheKey(coll: CollName): string { return CACHE_PREFIX + coll; }

function readCache(coll: CollName): Doc[] | null {
  const ttl = ttlFor(coll);
  if (!ttl) return null;
  // Memory first
  const mem = memCache.get(coll);
  if (mem && Date.now() - mem.at < ttl) return mem.data;
  // localStorage
  try {
    const raw = localStorage.getItem(cacheKey(coll));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.at >= ttl) return null;
    memCache.set(coll, parsed);
    return parsed.data;
  } catch { return null; }
}
function writeCache(coll: CollName, data: Doc[]) {
  if (!ttlFor(coll)) return;
  const entry: CacheEntry = { at: Date.now(), data };
  memCache.set(coll, entry);
  try { localStorage.setItem(cacheKey(coll), JSON.stringify(entry)); }
  catch { /* quota exceeded — safe to skip */ }
}
function invalidateCache(coll: CollName) {
  memCache.delete(coll);
  try { localStorage.removeItem(cacheKey(coll)); } catch { /* empty */ }
}

// ──────── LocalStorage backend (demo mode) ────────
function lsRead(coll: CollName): Doc[] {
  try { const raw = localStorage.getItem(LS_PREFIX + coll); return raw ? JSON.parse(raw) as Doc[] : []; }
  catch { return []; }
}
function lsWrite(coll: CollName, docs: Doc[]) {
  localStorage.setItem(LS_PREFIX + coll, JSON.stringify(docs));
  emitChange(coll);
}

// ──────── Subscriptions ────────
type Listener = () => void;
const listeners: Record<string, Set<Listener>> = {};
function emitChange(coll: CollName) {
  listeners[coll]?.forEach((cb) => cb());
}
function subscribeLocal(coll: CollName, cb: Listener): () => void {
  if (!listeners[coll]) listeners[coll] = new Set();
  listeners[coll].add(cb);
  return () => listeners[coll]?.delete(cb);
}

// Shared Firestore subscription per collection (fan-out to N listeners)
interface SharedSub {
  unsub: () => void;
  cbs: Set<(docs: Doc[]) => void>;
  last?: Doc[];
}
const sharedSubs = new Map<CollName, SharedSub>();

function attachShared(coll: CollName): SharedSub {
  const existing = sharedSubs.get(coll);
  if (existing) return existing;
  const cbs = new Set<(docs: Doc[]) => void>();
  const q = query(collection(db!, coll));
  const unsub = onSnapshot(q, (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Doc[];
    entry.last = docs;
    writeCache(coll, docs);
    cbs.forEach((c) => c(docs));
  });
  const entry: SharedSub = { unsub, cbs };
  sharedSubs.set(coll, entry);
  return entry;
}

// ──────── Seed defaults (demo) ────────
function ensureSeed() {
  if (!localStorage.getItem(LS_PREFIX + "_seeded_v1")) {
    lsWrite("mcqs", seedMCQs as unknown as Doc[]);
    lsWrite("caseStudies", seedCases as unknown as Doc[]);
    lsWrite("opdCases", seedOPD as unknown as Doc[]);
    lsWrite("educationArticles", seedArticles as unknown as Doc[]);
    lsWrite("subjects", seedSubjects as unknown as Doc[]);
    lsWrite("notifications", seedNotifications as unknown as Doc[]);
    lsWrite("siteSettings", [{ id: "main", ...defaultSettings }]);
    localStorage.setItem(LS_PREFIX + "_seeded_v1", "1");
  }
}

export const dbService = {
  isRemote: isFirebaseConfigured,

  async init() {
    if (!isFirebaseConfigured) ensureSeed();
  },

  /** Clear ALL cached reads (useful after a logout / global refresh). */
  clearCache() {
    memCache.clear();
    // Only clear cache keys, not seed data / user prefs
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
      }
    } catch { /* empty */ }
  },

  async list<T = Doc>(coll: CollName): Promise<T[]> {
    if (isFirebaseConfigured && db) {
      // Serve from cache to save reads
      const cached = readCache(coll);
      if (cached) return cached as unknown as T[];
      const snap = await getDocs(collection(db, coll));
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Doc[];
      writeCache(coll, docs);
      return docs as unknown as T[];
    }
    ensureSeed();
    return lsRead(coll) as unknown as T[];
  },

  async get<T = Doc>(coll: CollName, id: string): Promise<T | null> {
    if (isFirebaseConfigured && db) {
      // Try cache first
      const cached = readCache(coll);
      if (cached) {
        const found = cached.find((d) => d.id === id);
        if (found) return found as unknown as T;
      }
      const snap = await getDoc(doc(db, coll, id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as T;
    }
    const docs = lsRead(coll);
    return (docs.find((d) => d.id === id) as unknown as T) || null;
  },

  async set<T extends object>(coll: CollName, id: string, data: T) {
    if (isFirebaseConfigured && db) {
      // Strip the `id` field (never written into the document body — it's the
      // path segment). Also defensively strip any `undefined` values in case
      // the Firestore instance wasn't initialized with `ignoreUndefinedProperties`.
      const rest = stripInvalid(data);
      try {
        await setDoc(doc(db, coll, id), rest, { merge: true });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[dbService.set] Firestore write failed for ${coll}/${id}:`, err, "payload:", rest);
        throw err;
      }
      invalidateCache(coll);
      return;
    }
    const docs = lsRead(coll);
    const idx = docs.findIndex((d) => d.id === id);
    const merged = { ...(data as Record<string, unknown>), id };
    if (idx >= 0) docs[idx] = { ...docs[idx], ...merged };
    else docs.push(merged as Doc);
    lsWrite(coll, docs);
  },

  async add<T extends object>(coll: CollName, data: T): Promise<string> {
    if (isFirebaseConfigured && db) {
      const rest = stripInvalid(data);
      let r;
      try {
        r = await addDoc(collection(db, coll), rest);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[dbService.add] Firestore write failed for ${coll}:`, err, "payload:", rest);
        throw err;
      }
      invalidateCache(coll);
      return r.id;
    }
    const id = `${coll}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const docs = lsRead(coll);
    docs.push({ id, ...(data as Record<string, unknown>) });
    lsWrite(coll, docs);
    return id;
  },

  async update<T extends object>(coll: CollName, id: string, patch: Partial<T>) {
    if (isFirebaseConfigured && db) {
      const rest = stripInvalid(patch);
      try {
        await updateDoc(doc(db, coll, id), rest);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[dbService.update] Firestore write failed for ${coll}/${id}:`, err, "patch:", rest);
        throw err;
      }
      invalidateCache(coll);
      return;
    }
    const docs = lsRead(coll);
    const idx = docs.findIndex((d) => d.id === id);
    if (idx >= 0) {
      docs[idx] = { ...docs[idx], ...(patch as Record<string, unknown>) };
      lsWrite(coll, docs);
    }
  },

  async remove(coll: CollName, id: string) {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, coll, id));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[dbService.remove] Firestore delete failed for ${coll}/${id}:`, err);
        throw err;
      }
      invalidateCache(coll);
      return;
    }
    const docs = lsRead(coll).filter((d) => d.id !== id);
    lsWrite(coll, docs);
  },

  /**
   * Subscribe to realtime changes. Uses a single shared Firestore snapshot
   * listener per collection to minimize concurrent read costs.
   */
  subscribe<T = Doc>(coll: CollName, cb: (docs: T[]) => void): () => void {
    if (isFirebaseConfigured && db) {
      const shared = attachShared(coll);
      const wrapped = (docs: Doc[]) => cb(docs as unknown as T[]);
      shared.cbs.add(wrapped);
      // Immediately provide last known snapshot if available
      if (shared.last) wrapped(shared.last);
      else {
        const cached = readCache(coll);
        if (cached) wrapped(cached);
      }
      return () => {
        shared.cbs.delete(wrapped);
        // Detach the underlying listener only when the last subscriber leaves.
        if (shared.cbs.size === 0) {
          shared.unsub();
          sharedSubs.delete(coll);
        }
      };
    }
    ensureSeed();
    const emit = () => cb(lsRead(coll) as unknown as T[]);
    emit();
    return subscribeLocal(coll, emit);
  },

  async getSettings(): Promise<SiteSettings> {
    const s = await this.get<SiteSettings & { id: string }>("siteSettings", "main");
    if (s) return s;
    return defaultSettings;
  },

  async saveSettings(s: SiteSettings) {
    await this.set("siteSettings", "main", { id: "main", ...s });
  },

  async orderedList<T = Doc>(coll: CollName, field = "createdAt", direction: "asc" | "desc" = "desc"): Promise<T[]> {
    if (isFirebaseConfigured && db) {
      // Use cached list + sort in-memory to save reads
      const cached = readCache(coll);
      if (cached) {
        const sorted = [...cached].sort((a, b) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const av = (a as any)[field] ?? 0, bv = (b as any)[field] ?? 0;
          return direction === "desc" ? bv - av : av - bv;
        });
        return sorted as unknown as T[];
      }
      const q = query(collection(db, coll), orderBy(field, direction));
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Doc[];
      writeCache(coll, docs);
      return docs as unknown as T[];
    }
    const docs = await this.list<Doc>(coll);
    const sorted = [...docs].sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const av = (a as any)[field] ?? 0, bv = (b as any)[field] ?? 0;
      return direction === "desc" ? bv - av : av - bv;
    });
    return sorted as unknown as T[];
  },
};
