import { describe, expect, test } from "vitest";
import { hashSeed, mulberry32, nextInt } from "./prng";

describe("mulberry32", () => {
  test("returns a uint32 in [0, 2^32)", () => {
    const rng = mulberry32(42);
    const v = rng();
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(2 ** 32);
  });

  test("same seed produces the same sequence", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  test("different seeds produce different first values", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  test("locks in cross-runtime values for seed=42 (regression test)", () => {
    // These values are computed by the reference Mulberry32 algorithm
    // (Bryc et al.) applied to seed=42, reading the uint32 result before
    // any float conversion. If this test fails, the PRNG changed — DO NOT
    // update the values; instead, bump the engine major version and keep
    // the prior implementation available for replay validation.
    const rng = mulberry32(42);
    const values = [rng(), rng(), rng(), rng(), rng()];
    expect(values).toEqual([
      2581720956, 1925393290, 3661312704, 2876485805, 750819978,
    ]);
  });
});

describe("hashSeed", () => {
  test("returns a uint32", () => {
    const h = hashSeed("hello");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });

  test("same string hashes to the same value", () => {
    expect(hashSeed("hello")).toBe(hashSeed("hello"));
  });

  test("different strings hash to different values", () => {
    expect(hashSeed("hello")).not.toBe(hashSeed("world"));
    expect(hashSeed("daily-2026-05-15")).not.toBe(hashSeed("daily-2026-05-16"));
  });

  test("empty string hashes deterministically", () => {
    expect(hashSeed("")).toBe(hashSeed(""));
  });

  test("locks in cross-runtime hashes (regression test)", () => {
    // FNV-1a 32-bit hash. Don't change without bumping engine major.
    expect(hashSeed("hello")).toBe(1335831723);
    expect(hashSeed("minesweeper")).toBe(3702844885);
  });
});

describe("nextInt", () => {
  test("returns an int in [0, max)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      const v = nextInt(rng, 10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  test("uses every value in the range over enough samples (uniform-ish)", () => {
    const rng = mulberry32(7);
    const counts = new Array(8).fill(0);
    for (let i = 0; i < 8000; i++) {
      counts[nextInt(rng, 8)]++;
    }
    // Each bucket should be hit; over 8000 samples no bucket should be wildly
    // off (rough sanity, not a chi-squared test). 8000/8 = 1000 expected.
    for (const c of counts) {
      expect(c).toBeGreaterThan(800);
      expect(c).toBeLessThan(1200);
    }
  });

  test("max=1 always returns 0", () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 50; i++) {
      expect(nextInt(rng, 1)).toBe(0);
    }
  });

  test("same seed produces same nextInt sequence", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = [nextInt(a, 100), nextInt(a, 100), nextInt(a, 100)];
    const seqB = [nextInt(b, 100), nextInt(b, 100), nextInt(b, 100)];
    expect(seqA).toEqual(seqB);
  });
});
