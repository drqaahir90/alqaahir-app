import { useEffect, useRef, useState } from "react";
import { formatTime, useMusic, type RepeatMode } from "@/audio/MusicProvider";
import { useI18n } from "@/i18n";
import { cn } from "@/utils/cn";

/**
 * Fixed music button that lives in the top bar. One tap opens a modal
 * player with the user's playlist. Replaces the previous floating,
 * draggable mini-player.
 *
 * - Never blocks page content (dropdown is anchored, closes on outside click).
 * - Uses the shared MusicProvider so playback continues across all pages.
 * - Fully accessible + keyboard-dismissible via Escape.
 */
export function MusicButton() {
  const m = useMusic();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [showList, setShowList] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = m.tracks.find((tr) => tr.id === m.currentId);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        title={t("music.tooltip")}
        aria-label={t("music.tooltip")}
        aria-expanded={open}
      >
        <span className="text-lg">🎵</span>
        {m.playing && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-teal-500 animate-pulse" aria-hidden />
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-80 max-w-[92vw] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-3 animate-fade-in">
          {/* Master enable/disable */}
          {!m.enabled ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">🎵</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">{t("music.disabled")}</div>
              <button
                onClick={() => { m.setEnabled(true); }}
                className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl"
              >
                {t("music.enabled")}
              </button>
            </div>
          ) : (
            <>
              {/* Now playing */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-2xl">🎵</span>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{t("music.nowPlaying")}</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {current ? current.name.replace(/\.[^.]+$/, "") : t("music.noTracks")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seek bar */}
              {current && (
                <div className="mb-2">
                  <input
                    type="range" min={0} max={1000} step={1}
                    value={Math.round(m.progress * 1000)}
                    onChange={(e) => m.seek(Number(e.target.value) / 1000)}
                    className="w-full accent-teal-600" aria-label="Seek"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span>{formatTime(m.position)}</span>
                    <span>{formatTime(m.duration)}</span>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => m.setShuffle(!m.shuffle)}
                  className={cn("p-2 rounded-lg", m.shuffle
                    ? "text-teal-600 bg-teal-50 dark:bg-teal-900/30"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}
                  aria-label={t("music.shuffle")}>🔀</button>
                <button onClick={() => m.prev()} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  aria-label={t("music.previous")}>⏮</button>
                <button onClick={m.toggle} disabled={m.tracks.length === 0}
                  className="h-11 w-11 rounded-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white grid place-items-center shadow"
                  aria-label={m.playing ? t("music.pause") : t("music.play")}>
                  {m.loading ? "⏳" : m.playing ? "⏸" : "▶"}
                </button>
                <button onClick={() => m.next()} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  aria-label={t("music.next")}>⏭</button>
                <button onClick={() => m.setRepeat(nextRepeat(m.repeat))}
                  className={cn("p-2 rounded-lg", m.repeat !== "off"
                    ? "text-teal-600 bg-teal-50 dark:bg-teal-900/30"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}
                  aria-label={t("music.repeat")}>
                  {m.repeat === "one" ? "🔂" : "🔁"}
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">🔉</span>
                <input type="range" min={0} max={100} value={Math.round(m.volume * 100)}
                  onChange={(e) => m.setVolume(Number(e.target.value) / 100)}
                  className="flex-1 accent-teal-600" aria-label={t("music.volume")} />
                <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-end">{Math.round(m.volume * 100)}</span>
              </div>

              {/* Add / list toggle */}
              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >➕ {t("music.addFiles")}</button>
                <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden"
                  onChange={(e) => { void m.addFiles(e.target.files || new FileList()); if (fileRef.current) fileRef.current.value = ""; }} />
                <button
                  onClick={() => setShowList((v) => !v)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >{showList ? "▲" : "▼"} {t("music.playlist")} ({m.tracks.length})</button>
              </div>

              {showList && (
                <div className="mt-2 max-h-56 overflow-y-auto border-t border-slate-100 dark:border-slate-800 pt-2">
                  {m.tracks.length === 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-3">{t("music.emptyPrompt")}</div>
                  )}
                  {m.tracks.map((tr) => (
                    <div key={tr.id} className={cn("flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm",
                      tr.id === m.currentId ? "bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200" : "hover:bg-slate-50 dark:hover:bg-slate-800")}>
                      <button onClick={() => m.select(tr.id)} className="flex-1 min-w-0 text-start truncate">
                        {tr.id === m.currentId && m.playing ? "▶ " : ""}{tr.name.replace(/\.[^.]+$/, "")}
                      </button>
                      <button onClick={() => m.removeTrack(tr.id)}
                        className="text-rose-500 hover:text-rose-700 text-xs"
                        aria-label={t("common.delete")}>🗑</button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => m.setEnabled(false)}
                className="mt-2 w-full text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 py-1"
              >{t("music.turnOff")}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function nextRepeat(r: RepeatMode): RepeatMode {
  return r === "off" ? "all" : r === "all" ? "one" : "off";
}
