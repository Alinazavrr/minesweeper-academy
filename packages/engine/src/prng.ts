/**
 * Deterministic, integer-only PRNG and seed-hashing utilities.
 *
 * Determinism rules (see PROJECT_PLAN.md §16.5):
 *  - Same seed + same call sequence = byte-identical output in browser and Node.
 *  - No floating-point math anywhere in this module.
 *  - Outputs are uint32; downstream code coerces to ranges via integer math.
 *
 * If the algorithm in this file ever changes, bump the engine major version
 * and keep the prior implementation available for replay validation.
 */

/**
 * Mulberry32 PRNG (Bryc et al.). Returns a function that yields a fresh
 * uint32 (`>>> 0`) on each call. Integer math only.
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/**
 * FNV-1a 32-bit hash. Maps a string to a uint32 in a stable, fast way.
 * Used to turn human-readable seeds ("daily-2026-05-15", a UUID, etc.) into
 * the numeric seed that mulberry32 wants.
 */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Uniform-ish integer in [0, max). `max` must be a positive integer.
 * Uses modulo — the bias for `max << 2^32` (which covers all of our use
 * cases: cell indices on boards up to ~500 cells) is negligible.
 */
export function nextInt(rng: () => number, max: number): number {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error(`nextInt: max must be a positive integer, got ${max}`);
  }
  return rng() % max;
}
