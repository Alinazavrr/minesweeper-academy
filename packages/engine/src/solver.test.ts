import { describe, expect, test } from "vitest";
import { applyAction } from "./apply";
import { generateBoard } from "./generate";
import { initialState } from "./state";
import { annotateMoves, findSafeCell } from "./solver";
import type { Action, BoardLayout } from "./types";

/**
 * Construct a BoardLayout directly from a mine-index list. Used by the
 * solver tests because we need precise control over the position rather
 * than what a seeded `generateBoard` happens to produce.
 */
function makeLayout(rows: number, cols: number, mineIdx: number[]): BoardLayout {
  return {
    rows,
    cols,
    mineCount: mineIdx.length,
    noGuess: false,
    seed: "fixture",
    mines: new Set(mineIdx),
    threeBV: 0,
  };
}

describe("findSafeCell", () => {
  test("returns null on an idle game (no information yet)", () => {
    const layout = makeLayout(3, 3, [8]);
    expect(findSafeCell(initialState(layout))).toBeNull();
  });

  test("returns null on a won game", () => {
    // 3x3 with single mine at (2,2); revealing (0,0) cascades to win.
    const layout = makeLayout(3, 3, [8]);
    const next = applyAction(initialState(layout), {
      kind: "reveal",
      row: 0,
      col: 0,
      t: 1,
    }).state;
    expect(next.status).toBe("won");
    expect(findSafeCell(next)).toBeNull();
  });

  test("returns null on a lost game", () => {
    const layout = makeLayout(3, 3, [0]);
    const next = applyAction(initialState(layout), {
      kind: "reveal",
      row: 0,
      col: 0,
      t: 1,
    }).state;
    expect(next.status).toBe("lost");
    expect(findSafeCell(next)).toBeNull();
  });

  test("returns null when a lone '1' has many unknown neighbors and no flags", () => {
    // 3x3, mine at (2,2). Reveal (1,1) (a numeric '1' that does not flood).
    // No flags placed: no single-constraint or subset deduction is possible.
    const layout = makeLayout(3, 3, [8]);
    const state = applyAction(initialState(layout), {
      kind: "reveal",
      row: 1,
      col: 1,
      t: 1,
    }).state;
    expect(state.status).toBe("playing");
    expect(state.cells[1]![1]!.adjacent).toBe(1);
    expect(findSafeCell(state)).toBeNull();
  });

  test("deduces safe cells when a flagged mine fully satisfies a number cell", () => {
    // 3x3, mine at (2,2). Reveal (1,1) -> '1'. Flag (2,2).
    // (1,1) now has its 1 mine accounted for by the flag => all other
    // unrevealed neighbors are provably safe.
    const layout = makeLayout(3, 3, [8]);
    let state = initialState(layout);
    state = applyAction(state, { kind: "reveal", row: 1, col: 1, t: 1 }).state;
    state = applyAction(state, { kind: "flag", row: 2, col: 2, t: 2 }).state;

    const result = findSafeCell(state);
    expect(result).not.toBeNull();
    const cell = state.cells[result!.row]![result!.col]!;
    expect(cell.revealed).toBe(false);
    expect(cell.flagged).toBe(false);
    expect(cell.mine).toBe(false);
  });

  test("never returns a revealed cell", () => {
    const layout = makeLayout(3, 3, [8]);
    let state = initialState(layout);
    state = applyAction(state, { kind: "reveal", row: 1, col: 1, t: 1 }).state;
    state = applyAction(state, { kind: "flag", row: 2, col: 2, t: 2 }).state;
    const result = findSafeCell(state);
    expect(result).not.toBeNull();
    expect(state.cells[result!.row]![result!.col]!.revealed).toBe(false);
  });

  test("never returns a flagged cell", () => {
    const layout = makeLayout(3, 3, [8]);
    let state = initialState(layout);
    state = applyAction(state, { kind: "reveal", row: 1, col: 1, t: 1 }).state;
    state = applyAction(state, { kind: "flag", row: 2, col: 2, t: 2 }).state;
    const result = findSafeCell(state);
    expect(result).not.toBeNull();
    expect(state.cells[result!.row]![result!.col]!.flagged).toBe(false);
  });

  test("solves via subset rule (mine row exposed by '1' on the side)", () => {
    // 4x4, mines along the top: (0,0), (0,1), (0,2). (0,3) is the only safe
    // cell in row 0. Revealing (3,3) cascades and exposes the four row-1
    // numeric cells (2, 3, 2, 1). With single-constraint propagation alone:
    //   (1,0)='2' has unknowns {(0,0),(0,1)} -> both mines.
    //   (1,1)='3' has unknowns {(0,0),(0,1),(0,2)} -> all three mines.
    // Now (1,2)='2' has unknowns {(0,1),(0,2),(0,3)}; two of them are
    // deduced mines, leaving (0,3) as the safe remainder.
    const layout = makeLayout(4, 4, [0, 1, 2]);
    const state = applyAction(initialState(layout), {
      kind: "reveal",
      row: 3,
      col: 3,
      t: 1,
    }).state;
    expect(state.status).toBe("playing");

    const result = findSafeCell(state);
    expect(result).toEqual({ row: 0, col: 3 });
  });

  test("integration: on a generated board, any returned cell is genuinely safe", () => {
    const layout = generateBoard({
      rows: 9,
      cols: 9,
      mineCount: 10,
      noGuess: false,
      seed: "solver-integration",
      firstClick: { row: 4, col: 4 },
    });
    const state = applyAction(initialState(layout), {
      kind: "reveal",
      row: 4,
      col: 4,
      t: 1,
    }).state;
    const result = findSafeCell(state);
    if (result) {
      const cell = state.cells[result.row]![result.col]!;
      expect(cell.revealed).toBe(false);
      expect(cell.flagged).toBe(false);
      expect(cell.mine).toBe(false);
    }
    // null is also acceptable: not every position has a deducible safe cell
    // using local CSP rules.
  });
});

describe("annotateMoves", () => {
  test("returns an empty array for an empty action list", () => {
    const layout = makeLayout(3, 3, [8]);
    expect(annotateMoves(layout, [])).toEqual([]);
  });

  test("records safeMoveAvailable per action index", () => {
    // 3x3, mine at (2,2).
    //   action 0: reveal (1,1) from idle -> safeMoveAvailable=false (idle).
    //   action 1: flag (2,2) from a single '1' with no flags ->
    //             safeMoveAvailable=false (no deduction possible yet).
    //   action 2: reveal (0,0) after the flag satisfies the '1' ->
    //             safeMoveAvailable=true.
    const layout = makeLayout(3, 3, [8]);
    const actions: Action[] = [
      { kind: "reveal", row: 1, col: 1, t: 1 },
      { kind: "flag", row: 2, col: 2, t: 2 },
      { kind: "reveal", row: 0, col: 0, t: 3 },
    ];
    const annotations = annotateMoves(layout, actions);

    expect(annotations).toHaveLength(3);
    expect(annotations[0]).toMatchObject({
      actionIndex: 0,
      safeMoveAvailable: false,
    });
    expect(annotations[1]).toMatchObject({
      actionIndex: 1,
      safeMoveAvailable: false,
    });
    expect(annotations[2]).toMatchObject({
      actionIndex: 2,
      safeMoveAvailable: true,
    });
    expect(annotations[2]!.safeCell).toBeDefined();
  });

  test("annotates actions after game end with safeMoveAvailable=false", () => {
    // Lose on the first reveal; the second reveal is absorbed by the
    // terminal state. annotateMoves still emits one entry per action.
    const layout = makeLayout(3, 3, [0]);
    const actions: Action[] = [
      { kind: "reveal", row: 0, col: 0, t: 1 },
      { kind: "reveal", row: 2, col: 2, t: 2 },
    ];
    const annotations = annotateMoves(layout, actions);
    expect(annotations).toHaveLength(2);
    expect(annotations[0]!.safeMoveAvailable).toBe(false);
    expect(annotations[1]!.safeMoveAvailable).toBe(false);
  });
});
