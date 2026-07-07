/**
 * Fisher-Yates (Knuth) shuffle.
 *
 * Provides a truly uniform random permutation in O(n) time. Replaces the
 * biased `arr.sort(() => Math.random() - 0.5)` pattern which:
 *   • is O(n log n)
 *   • is not uniform (some permutations are more likely than others)
 *   • depends on undefined behaviour of the browser's sort implementation
 *
 * The function is **pure** — it returns a new array and never mutates its input.
 *
 * @example
 *   shuffle([1, 2, 3, 4, 5])            // → e.g. [3, 5, 1, 4, 2]
 *   shuffle([1, 2, 3], (): number => 0) // deterministic (for tests)
 */
export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A seeded, deterministic pseudo-random number generator (Mulberry32).
 * Useful when you need reproducible ordering (e.g. matching two players'
 * challenge question sets, or unit tests).
 */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle + take the first `n` elements. */
export function pickN<T>(arr: readonly T[], n: number, rng?: () => number): T[] {
  return shuffle(arr, rng).slice(0, Math.max(0, Math.min(n, arr.length)));
}
