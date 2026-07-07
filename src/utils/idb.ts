/**
 * Minimal IndexedDB helper — used to persist user-uploaded music files
 * across sessions without hitting Firebase Storage.
 *
 * Provides `put`, `get`, `list`, `delete`, and `clear` on a single object store.
 */

const DB_NAME = "medacad.idb";
const DB_VERSION = 2;                // bumped for new `sessions` store (backward-compat)
const MUSIC_STORE = "music";
const SESSIONS_STORE = "sessions";   // resumable quiz / case / OPD progress

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MUSIC_STORE)) {
        db.createObjectStore(MUSIC_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// ─── Learning session persistence (MCQ / Case / OPD resume) ───
export interface StoredSession<TState = unknown> {
  id: string;             // unique key, e.g. `mcq:{uid}` or `opd:{uid}:{caseId}`
  kind: "mcq" | "case" | "opd";
  userId: string;
  state: TState;          // arbitrary JSON — normalized per feature
  updatedAt: number;
}

export const sessionStore = {
  async put<T>(session: StoredSession<T>): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, "readwrite");
      tx.objectStore(SESSIONS_STORE).put(session);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async get<T>(id: string): Promise<StoredSession<T> | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, "readonly");
      const req = tx.objectStore(SESSIONS_STORE).get(id);
      req.onsuccess = () => resolve(req.result as StoredSession<T> | undefined);
      req.onerror = () => reject(req.error);
    });
  },
  async delete(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, "readwrite");
      tx.objectStore(SESSIONS_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async list(kind?: "mcq" | "case" | "opd"): Promise<StoredSession[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, "readonly");
      const req = tx.objectStore(SESSIONS_STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result || []) as StoredSession[];
        resolve(kind ? all.filter((s) => s.kind === kind) : all);
      };
      req.onerror = () => reject(req.error);
    });
  },
};

export interface StoredTrack {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  addedAt: number;
}

export const musicStore = {
  async put(track: StoredTrack): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MUSIC_STORE, "readwrite");
      tx.objectStore(MUSIC_STORE).put(track);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async get(id: string): Promise<StoredTrack | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MUSIC_STORE, "readonly");
      const req = tx.objectStore(MUSIC_STORE).get(id);
      req.onsuccess = () => resolve(req.result as StoredTrack | undefined);
      req.onerror = () => reject(req.error);
    });
  },
  async list(): Promise<StoredTrack[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MUSIC_STORE, "readonly");
      const req = tx.objectStore(MUSIC_STORE).getAll();
      req.onsuccess = () => resolve((req.result || []) as StoredTrack[]);
      req.onerror = () => reject(req.error);
    });
  },
  async delete(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MUSIC_STORE, "readwrite");
      tx.objectStore(MUSIC_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async clear(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MUSIC_STORE, "readwrite");
      tx.objectStore(MUSIC_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
