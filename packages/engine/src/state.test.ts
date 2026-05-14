import { describe, expect, test } from "vitest";
import { generateBoard } from "./generate";
import { initialState } from "./state";

const beginnerConfig = {
  rows: 9,
  cols: 9,
  mineCount: 10,
  noGuess: false,
  seed: "test-state",
};

describe("initialState", () => {
  test("produces a GameState with matching layout reference", () => {
    const layout = generateBoard(beginnerConfig);
    const state = initialState(layout);
    expect(state.layout).toBe(layout);
  });

  test("cells grid matches layout dimensions", () => {
    const layout = generateBoard(beginnerConfig);
    const state = initialState(layout);
    expect(state.cells.length).toBe(9);
    for (const row of state.cells) {
      expect(row.length).toBe(9);
    }
  });

  test("starts in 'idle' status with null timestamps", () => {
    const layout = generateBoard(beginnerConfig);
    const state = initialState(layout);
    expect(state.status).toBe("idle");
    expect(state.startedAt).toBeNull();
    expect(state.finishedAt).toBeNull();
    expect(state.flagsPlaced).toBe(0);
    expect(state.revealsCount).toBe(0);
  });

  test("all cells start unrevealed, unflagged, unquestioned", () => {
    const layout = generateBoard(beginnerConfig);
    const state = initialState(layout);
    for (const row of state.cells) {
      for (const cell of row) {
        expect(cell.revealed).toBe(false);
        expect(cell.flagged).toBe(false);
        expect(cell.questioned).toBe(false);
      }
    }
  });

  test("cell.mine reflects layout.mines", () => {
    const layout = generateBoard(beginnerConfig);
    const state = initialState(layout);
    let mineCount = 0;
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const cell = state.cells[r]![c]!;
        const idx = r * layout.cols + c;
        expect(cell.mine).toBe(layout.mines.has(idx));
        if (cell.mine) mineCount++;
      }
    }
    expect(mineCount).toBe(layout.mineCount);
  });

  test("adjacent count is mines-in-8-neighborhood (or 0 for mine cells)", () => {
    const layout = generateBoard(beginnerConfig);
    const state = initialState(layout);
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const cell = state.cells[r]![c]!;
        if (cell.mine) {
          expect(cell.adjacent).toBe(0);
          continue;
        }
        let expected = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= layout.rows || nc < 0 || nc >= layout.cols) {
              continue;
            }
            const nIdx = nr * layout.cols + nc;
            if (layout.mines.has(nIdx)) expected++;
          }
        }
        expect(cell.adjacent).toBe(expected);
      }
    }
  });

  test("returns a fresh state object each call (no shared mutable cell grid)", () => {
    const layout = generateBoard(beginnerConfig);
    const a = initialState(layout);
    const b = initialState(layout);
    expect(a).not.toBe(b);
    expect(a.cells).not.toBe(b.cells);
    expect(a.cells[0]).not.toBe(b.cells[0]);
  });

  test("works on a hand-built layout with mines at known positions", () => {
    // 3x3 board with mines at (0,0) and (2,2).
    const layout = {
      rows: 3,
      cols: 3,
      mineCount: 2,
      noGuess: false,
      seed: "manual",
      mines: new Set<number>([0, 8]),
      threeBV: 0, // not relevant for this test
    };
    const state = initialState(layout);
    expect(state.cells[0]![0]!.mine).toBe(true);
    expect(state.cells[2]![2]!.mine).toBe(true);
    expect(state.cells[1]![1]!.adjacent).toBe(2);
    expect(state.cells[0]![1]!.adjacent).toBe(1);
    expect(state.cells[2]![1]!.adjacent).toBe(1);
  });
});
