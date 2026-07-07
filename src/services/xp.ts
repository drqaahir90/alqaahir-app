/**
 * Explainable XP calculator.
 *
 * Every earned XP point is broken down into a labelled reason so the user
 * can see exactly *why* they were awarded points. Used by the MCQ / Case /
 * OPD / Challenge runners.
 *
 * Design principles:
 *   • Pure functions — no side effects, no Firestore calls
 *   • Deterministic — same input → same output
 *   • i18n friendly — reasons are TranslationKey strings resolved by the UI
 */
import type { Difficulty } from "@/types";
import type { TranslationKey } from "@/i18n/translations";

export interface XpReason {
  key: TranslationKey;         // localized label
  points: number;              // XP awarded for this reason (may be negative for penalties)
  meta?: Record<string, string | number>;
}

export interface XpBreakdown {
  total: number;
  reasons: XpReason[];
}

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy:   1.0,
  medium: 1.5,
  hard:   2.0,
};

/** Base points per correct MCQ answer (pre-multiplier). */
const BASE_MCQ = 10;
/** Perfect-score bonus (awarded once at the end of the quiz). */
const PERFECT_BONUS = 20;
/** Extra points if the user answered every question with more than 5 s left. */
const SPEED_BONUS = 10;

// ─────────── MCQ Quiz ───────────

export interface McqXpInput {
  correctCount: number;
  totalCount: number;
  difficulty: Difficulty | "mixed";
  durationSec: number;
  averageTimerSec: number;    // for the speed bonus threshold
  streakDays: number;
}

export function computeMcqXp(input: McqXpInput): XpBreakdown {
  const reasons: XpReason[] = [];
  const perfect = input.correctCount === input.totalCount && input.totalCount > 0;

  // Correct answers
  const base = input.correctCount * BASE_MCQ;
  if (base > 0) reasons.push({
    key: "xp.reason.correctAnswers",
    points: base,
    meta: { count: input.correctCount, per: BASE_MCQ },
  });

  // Difficulty multiplier bonus (extra points on top of base)
  if (input.difficulty !== "mixed") {
    const mult = DIFFICULTY_MULTIPLIER[input.difficulty];
    const extra = Math.round(base * (mult - 1));
    if (extra > 0) reasons.push({
      key: "xp.reason.difficulty",
      points: extra,
      meta: { difficulty: input.difficulty, mult },
    });
  }

  // Perfect-score bonus
  if (perfect) reasons.push({
    key: "xp.reason.perfect",
    points: PERFECT_BONUS,
  });

  // Speed bonus: finished with average of ≥50% timer remaining
  if (perfect && input.averageTimerSec > 0 &&
      input.durationSec < input.totalCount * input.averageTimerSec * 0.5) {
    reasons.push({ key: "xp.reason.speed", points: SPEED_BONUS });
  }

  // Streak bonus
  if (input.streakDays >= 7) {
    reasons.push({
      key: "xp.reason.streak",
      points: 5,
      meta: { days: input.streakDays },
    });
  }

  return { total: sum(reasons), reasons };
}

// ─────────── Case Study ───────────

export interface CaseXpInput {
  correctCount: number;
  totalCount: number;
  difficulty: Difficulty;
  streakDays: number;
}

export function computeCaseXp(input: CaseXpInput): XpBreakdown {
  const reasons: XpReason[] = [];
  const perfect = input.totalCount > 0 && input.correctCount === input.totalCount;

  const base = Math.max(1, input.correctCount) * 15;
  reasons.push({
    key: "xp.reason.caseComplete",
    points: base,
    meta: { count: input.correctCount, per: 15 },
  });

  const mult = DIFFICULTY_MULTIPLIER[input.difficulty];
  const extra = Math.round(base * (mult - 1));
  if (extra > 0) reasons.push({
    key: "xp.reason.difficulty", points: extra, meta: { difficulty: input.difficulty, mult },
  });

  if (perfect) reasons.push({ key: "xp.reason.perfect", points: PERFECT_BONUS });
  if (input.streakDays >= 7) reasons.push({ key: "xp.reason.streak", points: 5, meta: { days: input.streakDays } });

  return { total: sum(reasons), reasons };
}

// ─────────── OPD Simulator ───────────

export interface OpdXpInput {
  dxCorrect: boolean;
  mgmtCorrect: boolean;
  difficulty: Difficulty;
  streakDays: number;
}

export function computeOpdXp(input: OpdXpInput): XpBreakdown {
  const reasons: XpReason[] = [];
  const both = input.dxCorrect && input.mgmtCorrect;

  if (input.dxCorrect)   reasons.push({ key: "xp.reason.opdDiagnosis",  points: 15 });
  if (input.mgmtCorrect) reasons.push({ key: "xp.reason.opdManagement", points: 15 });

  const base = (input.dxCorrect ? 15 : 0) + (input.mgmtCorrect ? 15 : 0);
  const mult = DIFFICULTY_MULTIPLIER[input.difficulty];
  const extra = Math.round(base * (mult - 1));
  if (extra > 0) reasons.push({
    key: "xp.reason.difficulty", points: extra, meta: { difficulty: input.difficulty, mult },
  });

  if (both) reasons.push({ key: "xp.reason.opdPerfect", points: 15 });
  if (input.streakDays >= 7) reasons.push({ key: "xp.reason.streak", points: 5, meta: { days: input.streakDays } });

  // At minimum, an attempt earns 5 XP
  if (sum(reasons) === 0) reasons.push({ key: "xp.reason.attempt", points: 5 });

  return { total: sum(reasons), reasons };
}

// ─────────── Challenge ───────────

export interface ChallengeXpInput {
  score: number;
  total: number;
  won: boolean;
  tied: boolean;
  difficulty: Difficulty | "mixed";
}

export function computeChallengeXp(input: ChallengeXpInput): XpBreakdown {
  const reasons: XpReason[] = [];
  const perfect = input.total > 0 && input.score === input.total;

  const base = input.score * 10;
  if (base > 0) reasons.push({
    key: "xp.reason.correctAnswers", points: base, meta: { count: input.score, per: 10 },
  });

  if (input.won) reasons.push({ key: "xp.reason.challengeWin", points: 30 });
  else if (input.tied) reasons.push({ key: "xp.reason.challengeTie", points: 15 });
  else reasons.push({ key: "xp.reason.challengeParticipate", points: 5 });

  if (perfect) reasons.push({ key: "xp.reason.perfect", points: PERFECT_BONUS });

  return { total: sum(reasons), reasons };
}

// ─────────── Rank system ───────────

export interface Rank {
  tier: string;         // "Novice" | "Bronze" | ...
  color: "gray" | "amber" | "teal" | "blue" | "violet" | "red";
  emoji: string;
  minXp: number;
  nextTier?: Rank;
}

const RANKS: Omit<Rank, "nextTier">[] = [
  { tier: "Novice",       color: "gray",   emoji: "🩺", minXp: 0     },
  { tier: "Bronze",       color: "amber",  emoji: "🥉", minXp: 100   },
  { tier: "Silver",       color: "gray",   emoji: "🥈", minXp: 500   },
  { tier: "Gold",         color: "amber",  emoji: "🥇", minXp: 1500  },
  { tier: "Platinum",     color: "teal",   emoji: "💎", minXp: 5000  },
  { tier: "Diamond",      color: "blue",   emoji: "🔷", minXp: 15000 },
  { tier: "Consultant",   color: "violet", emoji: "🏆", minXp: 50000 },
];

/** Returns the rank for a given XP total plus the next rank (undefined at top). */
export function rankForXp(xp: number): Rank {
  const sorted = [...RANKS].sort((a, b) => b.minXp - a.minXp);
  const current = sorted.find((r) => xp >= r.minXp) || sorted[sorted.length - 1];
  const idx = RANKS.findIndex((r) => r.tier === current.tier);
  const next = RANKS[idx + 1];
  return { ...current, nextTier: next };
}

/** XP required to reach the next rank (0 if already at top). */
export function xpToNextRank(xp: number): number {
  const r = rankForXp(xp);
  if (!r.nextTier) return 0;
  return Math.max(0, r.nextTier.minXp - xp);
}

/** Sum helper. */
function sum(reasons: XpReason[]): number {
  return reasons.reduce((s, r) => s + r.points, 0);
}
