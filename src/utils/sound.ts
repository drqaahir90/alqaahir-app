/**
 * Professional sound engine — Web Audio API synthesis.
 * Zero external assets. Multi-oscillator, envelope-shaped tones with subtle
 * filter/detune for a warmer, more musical feel than raw sine beeps.
 */

const STORAGE_KEY = "medacad.sound";
const VOLUME_KEY = "medacad.sound.vol";

export type SoundEvent =
  | "correct" | "wrong" | "levelComplete" | "achievement"
  | "notification" | "reward" | "streak" | "xp"
  | "caseComplete" | "opdComplete" | "mcqComplete"
  | "click" | "message" | "warning";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx && ctx.state !== "closed") return ctx;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor: any = window.AudioContext || (window as Win).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch { return null; }
}

export function resumeAudio() {
  const ac = getAudioContext();
  if (ac && ac.state === "suspended") void ac.resume();
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "1";
}
export function setSoundEnabled(v: boolean) {
  localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
}
export function getSfxVolume(): number {
  const v = Number(localStorage.getItem(VOLUME_KEY));
  return isFinite(v) && v >= 0 && v <= 1 ? v : 0.35;
}
export function setSfxVolume(v: number) {
  localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, v))));
}

interface Note {
  f: number;        // frequency
  d: number;        // duration seconds
  type?: OscillatorType;
  vol?: number;     // 0..1 (relative)
  delay?: number;   // additive seconds
  detune?: number;
}

interface Voice { notes: Note[]; type?: OscillatorType; detune?: number; }

/** Play one voice (a musical line) using additive synthesis with a soft envelope. */
function playVoice(v: Voice, startAt: number, master: GainNode, ac: AudioContext) {
  let cursor = startAt;
  for (const n of v.notes) {
    const t0 = cursor + (n.delay || 0);
    const dur = n.d;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = n.type || v.type || "sine";
    osc.frequency.setValueAtTime(n.f, t0);
    if ((n.detune ?? v.detune) !== undefined) osc.detune.setValueAtTime((n.detune ?? v.detune) as number, t0);
    // Soft attack / exp release envelope
    const peak = (n.vol ?? 0.5);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
    cursor = t0 + dur * 0.72;
  }
}

/** Play a chord/melody built from multiple voices. */
function playPattern(voices: Voice[], vol = 1) {
  const ac = getAudioContext();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const master = ac.createGain();
  master.gain.value = getSfxVolume() * vol;
  // Gentle low-pass to soften harshness
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 4200;
  master.connect(filter).connect(ac.destination);
  const t0 = ac.currentTime;
  for (const v of voices) playVoice(v, t0, master, ac);
}

// Musical notes (Hz, A4=440)
const N = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1568,
};

const patterns: Record<SoundEvent, () => void> = {
  // Bright ascending triad — pleasant "correct"
  correct: () => playPattern([
    { type: "triangle", notes: [{ f: N.E5, d: 0.12, vol: 0.55 }, { f: N.G5, d: 0.14, vol: 0.55, delay: 0.02 }, { f: N.C6, d: 0.28, vol: 0.6, delay: 0.02 }] },
    { type: "sine",     notes: [{ f: N.E4, d: 0.4,  vol: 0.25 }] },
  ]),
  // Descending minor 2nd — "wrong" but not harsh
  wrong: () => playPattern([
    { type: "sawtooth", detune: -8, notes: [{ f: 220, d: 0.16, vol: 0.32 }, { f: 175, d: 0.22, vol: 0.32, delay: 0.02 }] },
    { type: "sine",                  notes: [{ f: 110, d: 0.35, vol: 0.15 }] },
  ], 0.8),
  // 4-note fanfare
  levelComplete: () => playPattern([
    { type: "triangle", notes: [
      { f: N.C5, d: 0.14, vol: 0.55 },
      { f: N.E5, d: 0.14, vol: 0.55, delay: 0.01 },
      { f: N.G5, d: 0.16, vol: 0.6,  delay: 0.01 },
      { f: N.C6, d: 0.34, vol: 0.7,  delay: 0.02 },
    ]},
    { type: "sine", notes: [{ f: N.C4, d: 0.85, vol: 0.2 }] },
  ]),
  achievement: () => playPattern([
    { type: "triangle", notes: [
      { f: N.G5, d: 0.11, vol: 0.55 },
      { f: N.C6, d: 0.11, vol: 0.55, delay: 0.01 },
      { f: N.E6, d: 0.14, vol: 0.6,  delay: 0.01 },
      { f: N.G6, d: 0.28, vol: 0.65, delay: 0.02 },
    ]},
    { type: "sine", notes: [{ f: N.C5, d: 0.7, vol: 0.22 }] },
  ]),
  mcqComplete: () => playPattern([
    { type: "triangle", notes: [
      { f: N.C5, d: 0.14, vol: 0.5 },
      { f: N.G5, d: 0.14, vol: 0.55, delay: 0.01 },
      { f: N.E5, d: 0.14, vol: 0.5,  delay: 0.01 },
      { f: N.C6, d: 0.28, vol: 0.6,  delay: 0.02 },
    ]},
  ]),
  caseComplete: () => playPattern([
    { type: "triangle", notes: [
      { f: N.C5, d: 0.12, vol: 0.5 },
      { f: N.E5, d: 0.12, vol: 0.5,  delay: 0.01 },
      { f: N.G5, d: 0.12, vol: 0.55, delay: 0.01 },
      { f: N.C6, d: 0.16, vol: 0.6,  delay: 0.02 },
      { f: N.E6, d: 0.28, vol: 0.65, delay: 0.02 },
    ]},
    { type: "sine", notes: [{ f: 196, d: 0.7, vol: 0.2 }] },
  ]),
  opdComplete: () => playPattern([
    { type: "triangle", notes: [
      { f: N.A4, d: 0.13, vol: 0.5 },
      { f: N.C5, d: 0.13, vol: 0.55, delay: 0.01 },
      { f: N.E5, d: 0.13, vol: 0.55, delay: 0.01 },
      { f: N.A5, d: 0.3,  vol: 0.65, delay: 0.02 },
    ]},
    { type: "sine", notes: [{ f: 220, d: 0.7, vol: 0.22 }] },
  ]),
  notification: () => playPattern([
    { type: "sine",     notes: [{ f: N.A5, d: 0.09, vol: 0.55 }, { f: N.D6, d: 0.12, vol: 0.6, delay: 0.02 }] },
    { type: "triangle", notes: [{ f: N.A4, d: 0.3,  vol: 0.15 }] },
  ]),
  reward: () => playPattern([
    { type: "triangle", notes: [
      { f: N.D5, d: 0.08, vol: 0.5 },
      { f: N.F5, d: 0.08, vol: 0.5,  delay: 0.005 },
      { f: N.A5, d: 0.1,  vol: 0.55, delay: 0.005 },
      { f: N.D6, d: 0.22, vol: 0.65, delay: 0.02 },
    ]},
  ]),
  streak: () => playPattern([
    { type: "square", detune: -5, notes: [
      { f: N.G4, d: 0.06, vol: 0.3 },
      { f: N.B4, d: 0.06, vol: 0.3, delay: 0.005 },
      { f: N.D5, d: 0.06, vol: 0.32, delay: 0.005 },
      { f: N.G5, d: 0.16, vol: 0.4,  delay: 0.02 },
    ]},
  ], 0.7),
  xp: () => playPattern([
    { type: "triangle", notes: [{ f: N.B5, d: 0.06, vol: 0.45 }, { f: N.E6, d: 0.11, vol: 0.55, delay: 0.01 }] },
  ]),
  click: () => playPattern([
    { type: "sine", notes: [{ f: 1500, d: 0.03, vol: 0.15 }] },
  ], 0.5),
  message: () => playPattern([
    { type: "sine", notes: [{ f: N.C6, d: 0.05, vol: 0.45 }, { f: N.E6, d: 0.07, vol: 0.5, delay: 0.01 }] },
  ]),
  warning: () => playPattern([
    { type: "square", notes: [{ f: 660, d: 0.12, vol: 0.35 }, { f: 660, d: 0.12, vol: 0.35, delay: 0.06 }] },
  ]),
};

export function playSound(event: SoundEvent) {
  if (!isSoundEnabled()) return;
  try { patterns[event](); } catch { /* silent */ }
}
