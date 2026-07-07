import { useCallback, useEffect, useRef, useState } from "react";
import { sessionStore, type StoredSession } from "@/utils/idb";

/**
 * Persist a learning session's state to IndexedDB with debounced auto-save.
 *
 * The stored payload is fully arbitrary JSON — each caller defines its own
 * `TState` shape. Writes are debounced (default 400 ms) so rapid keystroke-
 * level updates don't hammer IndexedDB.
 *
 *   const {
 *     ready,       // true once initial load attempted
 *     resumed,     // the previously-stored state (if any) — hydrate from this
 *     save,        // save immediately
 *     clear,       // delete the session (call on complete)
 *     scheduleSave // debounced save
 *   } = useLearningSession<MyState>({ id: `mcq:${uid}`, kind: "mcq", userId: uid });
 */
export function useLearningSession<TState>(opts: {
  id: string;
  kind: StoredSession["kind"];
  userId: string;
  debounceMs?: number;
}) {
  const { id, kind, userId, debounceMs = 400 } = opts;
  const [ready, setReady] = useState(false);
  const [resumed, setResumed] = useState<TState | null>(null);
  const timerRef = useRef<number | null>(null);
  const latestRef = useRef<TState | null>(null);

  // Load once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rec = await sessionStore.get<TState>(id);
        if (!cancelled) setResumed(rec?.state ?? null);
      } catch { /* IndexedDB unavailable — treat as no session */ }
      finally { if (!cancelled) setReady(true); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const save = useCallback(async (state: TState) => {
    latestRef.current = state;
    try {
      await sessionStore.put<TState>({ id, kind, userId, state, updatedAt: Date.now() });
    } catch { /* quota / unavailable — silently ignore */ }
  }, [id, kind, userId]);

  const scheduleSave = useCallback((state: TState) => {
    latestRef.current = state;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (latestRef.current !== null) void save(latestRef.current);
      timerRef.current = null;
    }, debounceMs);
  }, [save, debounceMs]);

  const clear = useCallback(async () => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    latestRef.current = null;
    try { await sessionStore.delete(id); } catch { /* ignore */ }
  }, [id]);

  // Flush pending save on unmount
  useEffect(() => () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      if (latestRef.current !== null) void save(latestRef.current);
    }
  }, [save]);

  return { ready, resumed, save, scheduleSave, clear };
}
