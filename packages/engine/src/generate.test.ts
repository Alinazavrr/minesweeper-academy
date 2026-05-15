import { describe, expect, test } from "vitest";
import { generateBoard, layoutFromMines, validateBoard } from "./generate";
import type { BoardConfig } from "./types";

const beginner: BoardConfig = {
  rows: 9,
  cols: 9,
  mineCount: 10,
  noGuess: false,
  seed: "test-beginner",
};

const expert: BoardConfig = {
  rows: 16,
  cols: 30,
  mineCount: 99,
  noGuess: false,
  seed: "test-expert",
};

describe("generateBoard", () => {
  test("returns a layout with the requested dimensions", () => {
    const layout = generateBoard(beginner);
    expect(layout.rows).toBe(9);
    expect(layout.cols).toBe(9);
    expect(layout.mineCount).toBe(10);
    expect(layout.noGuess).toBe(false);
    expect(layout.seed).toBe("test-beginner");
  });

  test("places exactly mineCount mines", () => {
    const layout = generateBoard(beginner);
    expect(layout.mines.size).toBe(10);
  });

  test("all mine indices are within board bounds", () => {
    const layout = generateBoard(expert);
    const max = layout.rows * layout.cols;
    for (const idx of layout.mines) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(max);
      expect(Number.isInteger(idx)).toBe(true);
    }
  });

  test("is deterministic: same config produces identical layout", () => {
    const a = generateBoard(beginner);
    const b = generateBoard(beginner);
    expect([...a.mines].sort()).toEqual([...b.mines].sort());
    expect(a.threeBV).toBe(b.threeBV);
  });

  test("different seeds produce different mine placements", () => {
    const a = generateBoard({ ...beginner, seed: "seed-A" });
    const b = generateBoard({ ...beginner, seed: "seed-B" });
    expect([...a.mines].sort()).not.toEqual([...b.mines].sort());
  });

  test("first-click cell is never a mine when firstClick is provided", () => {
    // Try many seeds; the firstClick cell must never be in the mines set.
    for (let s = 0; s < 100; s++) {
      const layout = generateBoard({
        ...beginner,
        seed: `fc-seed-${s}`,
        firstClick: { row: 4, col: 4 },
      });
      const fcIndex = 4 * 9 + 4;
      expect(layout.mines.has(fcIndex)).toBe(false);
    }
  });

  test("first-click safety preserves mineCount", () => {
    const layout = generateBoard({
      ...expert,
      firstClick: { row: 0, col: 0 },
    });
    expect(layout.mines.size).toBe(99);
  });

  test("threeBV is a positive integer for non-trivial boards", () => {
    const layout = generateBoard(beginner);
    expect(Number.isInteger(layout.threeBV)).toBe(true);
    expect(layout.threeBV).toBeGreaterThan(0);
  });

  test("threeBV = 1 when there are no mines (whole board is one opening)", () => {
    const layout = generateBoard({
      rows: 4,
      cols: 4,
      mineCount: 0,
      noGuess: false,
      seed: "empty",
    });
    expect(layout.mines.size).toBe(0);
    expect(layout.threeBV).toBe(1);
  });

  test("rejects mineCount >= rows*cols", () => {
    expect(() =>
      generateBoard({
        rows: 3,
        cols: 3,
        mineCount: 9,
        noGuess: false,
        seed: "bad",
      }),
    ).toThrow();
    expect(() =>
      generateBoard({
        rows: 3,
        cols: 3,
        mineCount: 10,
        noGuess: false,
        seed: "bad2",
      }),
    ).toThrow();
  });

  test("rejects non-positive dimensions", () => {
    expect(() =>
      generateBoard({
        rows: 0,
        cols: 9,
        mineCount: 1,
        noGuess: false,
        seed: "bad",
      }),
    ).toThrow();
    expect(() =>
      generateBoard({
        rows: 9,
        cols: -1,
        mineCount: 1,
        noGuess: false,
        seed: "bad",
      }),
    ).toThrow();
  });

  test("rejects firstClick outside board bounds", () => {
    expect(() =>
      generateBoard({ ...beginner, firstClick: { row: -1, col: 0 } }),
    ).toThrow();
    expect(() =>
      generateBoard({ ...beginner, firstClick: { row: 9, col: 0 } }),
    ).toThrow();
  });
});

describe("validateBoard", () => {
  test("accepts a freshly generated layout", () => {
    const layout = generateBoard(beginner);
    expect(validateBoard(layout)).toBe(true);
  });

  test("rejects layout with mismatched mine count", () => {
    const layout = generateBoard(beginner);
    const broken = {
      ...layout,
      mineCount: 11,
    };
    expect(validateBoard(broken)).toBe(false);
  });

  test("rejects layout with a mine index out of bounds", () => {
    const layout = generateBoard(beginner);
    const broken = {
      ...layout,
      mines: new Set([...layout.mines, 9999]),
    };
    expect(validateBoard(broken)).toBe(false);
  });

  test("rejects layout with negative dimensions", () => {
    const layout = generateBoard(beginner);
    expect(validateBoard({ ...layout, rows: -1 })).toBe(false);
    expect(validateBoard({ ...layout, cols: 0 })).toBe(false);
  });
});

describe("layoutFromMines", () => {
  test("builds a layout from explicit mines", () => {
    const layout = layoutFromMines({
      rows: 3,
      cols: 3,
      mines: [0, 4],
      seed: "lesson:test",
    });
    expect(layout.rows).toBe(3);
    expect(layout.cols).toBe(3);
    expect(layout.mineCount).toBe(2);
    expect(layout.seed).toBe("lesson:test");
    expect([...layout.mines].sort()).toEqual([0, 4]);
    expect(layout.threeBV).toBeGreaterThan(0);
    expect(validateBoard(layout)).toBe(true);
  });

  test("dedupes repeated mine indices", () => {
    const layout = layoutFromMines({
      rows: 2,
      cols: 2,
      mines: [0, 0, 3],
      seed: "lesson:dedupe",
    });
    expect(layout.mineCount).toBe(2);
  });

  test("rejects out-of-range mine indices", () => {
    expect(() =>
      layoutFromMines({ rows: 2, cols: 2, mines: [4], seed: "x" }),
    ).toThrow(/out of range/);
  });

  test("rejects boards with no safe cells", () => {
    expect(() =>
      layoutFromMines({ rows: 2, cols: 2, mines: [0, 1, 2, 3], seed: "x" }),
    ).toThrow(/no safe cells/);
  });
});
