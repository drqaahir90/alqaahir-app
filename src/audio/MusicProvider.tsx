import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { musicStore, type StoredTrack } from "@/utils/idb";

/**
 * Professional user-driven music player.
 *
 * - Users upload their own audio files (MP3/WAV/OGG/M4A/AAC/FLAC).
 * - Tracks are persisted in IndexedDB, so playlists survive reloads
 *   with ZERO Firebase Storage or Firestore usage.
 * - Uses a single global HTMLAudioElement so playback continues across
 *   page navigations.
 * - Integrates with the browser Media Session API so hardware/notification
 *   controls (Android/Chrome/iOS) work when supported.
 */

const STORAGE_ENABLED = "medacad.music.enabled";
const STORAGE_TRACK = "medacad.music.currentId";
const STORAGE_VOL = "medacad.music.vol";
const STORAGE_ORDER = "medacad.music.order";
const STORAGE_REPEAT = "medacad.music.repeat";
const STORAGE_SHUFFLE = "medacad.music.shuffle";

export type RepeatMode = "off" | "all" | "one";

export interface TrackMeta {
  id: string;
  name: string;
  size: number;
  addedAt: number;
}

interface Ctx {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  tracks: TrackMeta[];
  currentId: string | null;
  playing: boolean;
  loading: boolean;
  progress: number; // 0..1
  duration: number; // seconds
  position: number; // seconds
  volume: number;   // 0..1
  shuffle: boolean;
  repeat: RepeatMode;

  addFiles: (files: FileList | File[]) => Promise<void>;
  removeTrack: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  select: (id: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => void;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seek: (fraction: number) => void;
  setVolume: (v: number) => void;
  setShuffle: (v: boolean) => void;
  setRepeat: (r: RepeatMode) => void;
}

const CtxT = createContext<Ctx | null>(null);

function readBool(key: string, dflt = false): boolean {
  if (typeof window === "undefined") return dflt;
  const v = localStorage.getItem(key);
  return v === null ? dflt : v === "1";
}
function readNum(key: string, dflt: number): number {
  const v = Number(localStorage.getItem(key));
  return isFinite(v) ? v : dflt;
}
function readStr(key: string, dflt: string): string {
  return localStorage.getItem(key) || dflt;
}

/** Format seconds as mm:ss */
export function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => readBool(STORAGE_ENABLED, false));
  const [tracks, setTracks] = useState<TrackMeta[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(() => localStorage.getItem(STORAGE_TRACK));
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [volume, setVolumeState] = useState<number>(() => readNum(STORAGE_VOL, 0.7));
  const [shuffle, setShuffleState] = useState<boolean>(() => readBool(STORAGE_SHUFFLE));
  const [repeat, setRepeatState] = useState<RepeatMode>(() => (readStr(STORAGE_REPEAT, "off") as RepeatMode));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  // ── Lazy audio element (single instance for cross-page continuity) ──
  const getAudio = useCallback((): HTMLAudioElement => {
    if (audioRef.current) return audioRef.current;
    const a = new Audio();
    a.preload = "metadata";
    a.volume = volume;
    // Try to keep audio out of page playback rate silliness
    a.crossOrigin = "anonymous";
    audioRef.current = a;
    return a;
  }, [volume]);

  // ── Load track list from IndexedDB on mount ──
  useEffect(() => {
    (async () => {
      try {
        const stored = await musicStore.list();
        // Restore user's saved order if present
        let order: string[] = [];
        try { order = JSON.parse(localStorage.getItem(STORAGE_ORDER) || "[]"); } catch { /* empty */ }
        const sorted = stored.slice().sort((a, b) => {
          const ai = order.indexOf(a.id); const bi = order.indexOf(b.id);
          if (ai < 0 && bi < 0) return b.addedAt - a.addedAt;
          if (ai < 0) return 1; if (bi < 0) return -1;
          return ai - bi;
        });
        setTracks(sorted.map((s) => ({ id: s.id, name: s.name, size: s.size, addedAt: s.addedAt })));
      } catch { /* IndexedDB may be unavailable — ignore */ }
    })();
  }, []);

  // Persist state
  useEffect(() => { localStorage.setItem(STORAGE_ENABLED, enabled ? "1" : "0"); }, [enabled]);
  useEffect(() => { if (currentId) localStorage.setItem(STORAGE_TRACK, currentId); }, [currentId]);
  useEffect(() => { localStorage.setItem(STORAGE_VOL, String(volume)); if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { localStorage.setItem(STORAGE_SHUFFLE, shuffle ? "1" : "0"); }, [shuffle]);
  useEffect(() => { localStorage.setItem(STORAGE_REPEAT, repeat); }, [repeat]);
  useEffect(() => { localStorage.setItem(STORAGE_ORDER, JSON.stringify(tracks.map((t) => t.id))); }, [tracks]);

  // ── Load a track blob into the audio element ──
  const loadTrack = useCallback(async (id: string, autoplay = true) => {
    const rec = await musicStore.get(id);
    if (!rec) return;
    const audio = getAudio();
    // Revoke previous URL to free memory
    if (currentUrlRef.current) { try { URL.revokeObjectURL(currentUrlRef.current); } catch { /* empty */ } }
    const url = URL.createObjectURL(rec.blob);
    currentUrlRef.current = url;
    audio.src = url;
    setLoading(true);
    setDuration(0);
    setPosition(0);
    setCurrentId(id);
    if (autoplay) {
      try { await audio.play(); } catch { /* user gesture may be needed */ }
    }
  }, [getAudio]);

  // ── Audio event wiring ──
  useEffect(() => {
    const audio = getAudio();
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onLoaded = () => { setDuration(audio.duration || 0); setLoading(false); };
    const onTime = () => setPosition(audio.currentTime || 0);
    const onEnded = () => {
      if (repeat === "one" && currentId) { audio.currentTime = 0; void audio.play(); return; }
      void goNext();
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
     
  }, [currentId, repeat, tracks, shuffle]);

  // ── Media Session API (Android media/notification controls) ──
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const current = tracks.find((t) => t.id === currentId);
    if (current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const MM: any = (window as any).MediaMetadata;
      if (MM) {
        navigator.mediaSession.metadata = new MM({
          title: current.name.replace(/\.[^.]+$/, ""),
          artist: "MedAcademy Player",
          album: "My Music",
        });
      }
    }
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    try {
      navigator.mediaSession.setActionHandler("play", () => { void doPlay(); });
      navigator.mediaSession.setActionHandler("pause", () => { doPause(); });
      navigator.mediaSession.setActionHandler("nexttrack", () => { void goNext(); });
      navigator.mediaSession.setActionHandler("previoustrack", () => { void goPrev(); });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (audioRef.current && details.seekTime !== undefined) audioRef.current.currentTime = details.seekTime;
      });
    } catch { /* not all handlers supported everywhere */ }
     
  }, [currentId, playing, tracks]);

  // ── Playback controls ──
  const doPlay = useCallback(async () => {
    const audio = getAudio();
    if (!audio.src && currentId) await loadTrack(currentId, true);
    else if (!audio.src && tracks[0]) await loadTrack(tracks[0].id, true);
    else { try { await audio.play(); } catch { /* empty */ } }
  }, [getAudio, currentId, tracks, loadTrack]);

  const doPause = useCallback(() => { audioRef.current?.pause(); }, []);
  const doToggle = useCallback(() => { if (playing) doPause(); else void doPlay(); }, [playing, doPlay, doPause]);

  const goNext = useCallback(async () => {
    if (!tracks.length) return;
    const idx = tracks.findIndex((t) => t.id === currentId);
    let nextIdx: number;
    if (shuffle) {
      if (tracks.length === 1) nextIdx = 0;
      else { do { nextIdx = Math.floor(Math.random() * tracks.length); } while (nextIdx === idx); }
    } else {
      nextIdx = idx + 1;
      if (nextIdx >= tracks.length) {
        if (repeat === "all") nextIdx = 0;
        else { doPause(); return; }
      }
    }
    await loadTrack(tracks[nextIdx].id, true);
  }, [tracks, currentId, shuffle, repeat, loadTrack, doPause]);

  const goPrev = useCallback(async () => {
    if (!tracks.length) return;
    const audio = getAudio();
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    const idx = tracks.findIndex((t) => t.id === currentId);
    const prevIdx = idx <= 0 ? tracks.length - 1 : idx - 1;
    await loadTrack(tracks[prevIdx].id, true);
  }, [tracks, currentId, loadTrack, getAudio]);

  const seek = useCallback((fraction: number) => {
    const audio = getAudio();
    if (!audio.duration || !isFinite(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.duration * fraction));
  }, [getAudio]);

  // ── Track management ──
  const addFiles = useCallback(async (input: FileList | File[]) => {
    const files = Array.from(input);
    const added: TrackMeta[] = [];
    for (const f of files) {
      if (!f.type.startsWith("audio/")) continue;
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const rec: StoredTrack = { id, name: f.name, type: f.type, size: f.size, blob: f, addedAt: Date.now() };
      try {
        await musicStore.put(rec);
        added.push({ id, name: f.name, size: f.size, addedAt: rec.addedAt });
      } catch { /* quota exceeded etc. */ }
    }
    if (added.length) {
      setTracks((prev) => [...prev, ...added]);
      // Auto-select first if none selected
      if (!currentId && added[0]) {
        setCurrentId(added[0].id);
      }
    }
  }, [currentId]);

  const removeTrack = useCallback(async (id: string) => {
    await musicStore.delete(id);
    setTracks((prev) => prev.filter((t) => t.id !== id));
    if (currentId === id) {
      doPause();
      setCurrentId(null);
      if (audioRef.current) { audioRef.current.src = ""; }
    }
  }, [currentId, doPause]);

  const clearAll = useCallback(async () => {
    await musicStore.clear();
    doPause();
    if (audioRef.current) audioRef.current.src = "";
    setTracks([]); setCurrentId(null);
  }, [doPause]);

  const select = useCallback(async (id: string) => {
    await loadTrack(id, true);
  }, [loadTrack]);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    if (!v) doPause();
  }, [doPause]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  // Cleanup blob URLs on unmount
  useEffect(() => () => { if (currentUrlRef.current) { try { URL.revokeObjectURL(currentUrlRef.current); } catch { /* empty */ } } }, []);

  const progress = duration > 0 ? position / duration : 0;

  const value = useMemo<Ctx>(() => ({
    enabled, setEnabled,
    tracks, currentId, playing, loading, progress, duration, position, volume,
    shuffle, repeat,
    addFiles, removeTrack, clearAll, select,
    play: doPlay, pause: doPause, toggle: doToggle,
    next: goNext, prev: goPrev, seek, setVolume,
    setShuffle: setShuffleState, setRepeat: setRepeatState,
  }), [
    enabled, tracks, currentId, playing, loading, progress, duration, position, volume,
    shuffle, repeat, addFiles, removeTrack, clearAll, select,
    doPlay, doPause, doToggle, goNext, goPrev, seek, setVolume, setEnabled,
  ]);

  return <CtxT.Provider value={value}>{children}</CtxT.Provider>;
}

export function useMusic() {
  const c = useContext(CtxT);
  if (!c) throw new Error("useMusic must be inside MusicProvider");
  return c;
}
