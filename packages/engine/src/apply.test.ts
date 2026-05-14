import { describe, expect, test } from "vitest";
import { applyAction } from "./apply";
import { initialState } from "./state";
import type { BoardLayout, GameState } from "./types";

/**
 * Hand-built layouts for predictable tests.
 *
 * 3x3 board with a single mine at (0,0):
 *   M 1 .
 *   1 1 .
 *   . . .
 */
function layout3x3SingleMine(): BoardLayout {
  return {
    rows: 3,
    cols: 3,
    mineCount: 1,
    noGuess: false,
    seed: "manual-3x3-single",
    mines: new Set<number>([0]),
    threeBV: 1,
  };
}

/**
 * 3x3 board with mines at (0,0) and (0,2):
 *   M 2 M
 *   1 2 1
 *   . . .
 */
function layout3x3TwoMines(): BoardLayout {
  return {
    rows: 3,
    cols: 3,
    mineCount: 2,
    noGuess: false,
    seed: "manual-3x3-two",
    mines: new Set<number>([0, 2]),
    threeBV: 2,
  };
}

/**
 * 3x3 board with mines at all four corners — every non-mine cell is a
 * number (no 0-cells, so no flood-fill possible). Useful for tests that
 * want to step through reveals one cell at a time.
 *
 *   M 2 M
 *   2 4 2
 *   M 2 M
 */
function layout3x3CornerMines(): BoardLayout {
  return {
    rows: 3,
    cols: 3,
    mineCount: 4,
    noGuess: false,
    seed: "manual-3x3-corners",
    mines: new Set<number>([0, 2, 6, 8]),
    threeBV: 5,
  };
}

describe("applyAction: reveal", () => {
  test("transitions status from idle to playing on first reveal", () => {
    // Use corners layout so the reveal doesn't accidentally cascade to a win.
    const state = initialState(layout3x3CornerMines());
    const { state: next } = applyAction(state, {
      kind: "reveal",
      row: 0,
      col: 1,
      t: 1000,
    });
    expect(next.status).toBe("playing");
  });

  test("sets startedAt to action.t on first action", () => {
    const state = initialState(layout3x3SingleMine());
    const { state: next } = applyAction(state, {
      kind: "reveal",
      row: 2,
      col: 2,
      t: 1234,
    });
    expect(next.startedAt).toBe(1234);
  });

  test("does not overwrite startedAt on subsequent actions", () => {
    let s = initialState(layout3x3TwoMines());
    s = applyAction(s, { kind: "reveal", row: 2, col: 0, t: 100 }).state;
    s = applyAction(s, { kind: "reveal", row: 2, col: 1, t: 200 }).state;
    expect(s.startedAt).toBe(100);
  });

  test("revealing a non-mine numeric cell marks only that cell", () => {
    const state = initialState(layout3x3SingleMine());
    const { state: next } = applyAction(state, {
      kind: "reveal",
      row: 0,
      col: 1,
      t: 1,
    });
    expect(next.cells[0]![1]!.revealed).toBe(true);
    // None of the other cells should be revealed.
    let revealed = 0;
    for (const row of next.cells) {
      for (const cell of row) {
        if (cell.revealed) revealed++;
      }
    }
    expect(revealed).toBe(1);
  });

  test("revealing a 0-cell triggers a flood-fill cascade", () => {
    const state = initialState(layout3x3SingleMine());
    const { state: next } = applyAction(state, {
      kind: "reveal",
      row: 2,
      col: 2,
      t: 1,
    });
    // Mine at (0,0). Bottom-right cell is a 0-cell. The flood should reveal
    // all non-mine cells in the connected component (everything except 0,0).
    expect(next.cells[2]![2]!.revealed).toBe(true);
    expect(next.cells[2]![1]!.revealed).toBe(true);
    expect(next.cells[2]![0]!.revealed).toBe(true);
    expect(next.cells[1]![2]!.revealed).toBe(true);
    expect(next.cells[1]![1]!.revealed).toBe(true);
    expect(next.cells[1]![0]!.revealed).toBe(true);
    expect(next.cells[0]![2]!.revealed).toBe(true);
    expect(next.cells[0]![1]!.revealed).toBe(true);
    expect(next.cells[0]![0]!.revealed).toBe(false); // mine, not revealed
  });

  test("revealing a mine transitions status to 'lost' and sets finishedAt", () => {
    const state = initialState(layout3x3SingleMine());
    const { state: next } = applyAction(state, {
      kind: "reveal",
      row: 0,
      col: 0,
      t: 500,
    });
    expect(next.status).toBe("lost");
    expect(next.finishedAt).toBe(500);
    expect(next.cells[0]![0]!.revealed).toBe(true);
  });

  test("emits a 'lost' event with the mine coordinates", () => {
    const state = initialState(layout3x3SingleMine());
    const { events } = applyAction(state, {
      kind: "reveal",
      row: 0,
      col: 0,
      t: 1,
    });
    const lostEvents = events.filter((e) => e.kind === "lost");
    expect(lostEvents).toHaveLength(1);
    expect(lostEvents[0]).toMatchObject({ kind: "lost", mineRow: 0, mineCol: 0 });
  });

  test("emits one 'revealed' event per newly-revealed cell during a cascade", () => {
    const state = initialState(layout3x3SingleMine());
    const { events } = applyAction(state, {
      kind: "reveal",
      row: 2,
      col: 2,
      t: 1,
    });
    const revealedEvents = events.filter((e) => e.kind === "revealed");
    // 8 non-mine cells revealed.
    expect(revealedEvents).toHaveLength(8);
    // The triggering click is marked flooded=false; the others are flooded=true.
    const seed = revealedEvents.find(
      (e) => e.kind === "revealed" && e.row === 2 && e.col === 2,
    );
    expect(seed).toMatchObject({ kind: "revealed", flooded: false });
    const flood = revealedEvents.filter(
      (e) => e.kind === "revealed" && !(e.row === 2 && e.col === 2),
    );
    for (const e of flood) {
      expect(e).toMatchObject({ flooded: true });
    }
  });

  test("revealing the last non-mine cell triggers a win", () => {
    // Corners layout: 5 non-mines, all numeric (no cascades).
    const state = initialState(layout3x3CornerMines());
    let s: GameState = state;
    const safeCells: Array<[number, number]> = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
    ];
    let t = 1;
    for (let i = 0; i < safeCells.length - 1; i++) {
      const [r, c] = safeCells[i]!;
      s = applyAction(s, { kind: "reveal", row: r, col: c, t: t++ }).state;
      expect(s.status).toBe("playing");
    }
    const [lr, lc] = safeCells[safeCells.length - 1]!;
    const final = applyAction(s, { kind: "reveal", row: lr, col: lc, t: 999 });
    expect(final.state.status).toBe("won");
    expect(final.state.finishedAt).toBe(999);
    expect(final.events.some((e) => e.kind === "won")).toBe(true);
  });

  test("revealing an already-revealed cell is a no-op", () => {
    const state = initialState(layout3x3SingleMine());
    const after1 = applyAction(state, {
      kind: "reveal",
      row: 0,
      col: 1,
      t: 1,
    });
    const after2 = applyAction(after1.state, {
      kind: "reveal",
      row: 0,
      col: 1,
      t: 2,
    });
    expect(after2.events).toHaveLength(0);
    expect(after2.state.revealsCount).toBe(after1.state.revealsCount);
  });

  test("revealing a flagged cell is a no-op", () => {
    const state = initialState(layout3x3SingleMine());
    // Manually flag (0,1) by reaching into the state — we test flag action
    // behavior separately; here we only care that reveal honors the flag.
    const manuallyFlagged: GameState = {
      ...state,
      cells: state.cells.map((row) => row.map((c) => ({ ...c }))),
      flagsPlaced: 1,
    };
    manuallyFlagged.cells[0]![1]!.flagged = true;
    const { state: next, events } = applyAction(manuallyFlagged, {
      kind: "reveal",
      row: 0,
      col: 1,
      t: 1,
    });
    expect(next.cells[0]![1]!.revealed).toBe(false);
    expect(events).toHaveLength(0);
  });

  test("revealing out-of-bounds throws", () => {
    const state = initialState(layout3x3SingleMine());
    expect(() =>
      applyAction(state, { kind: "reveal", row: -1, col: 0, t: 1 }),
    ).toThrow();
    expect(() =>
      applyAction(state, { kind: "reveal", row: 0, col: 3, t: 1 }),
    ).toThrow();
  });

  test("does not mutate the input state", () => {
    const state = initialState(layout3x3SingleMine());
    const snapshot = JSON.stringify({
      status: state.status,
      revealsCount: state.revealsCount,
      cell00: state.cells[0]![0],
      cell22: state.cells[2]![2],
    });
    applyAction(state, { kind: "reveal", row: 2, col: 2, t: 1 });
    const after = JSON.stringify({
      status: state.status,
      revealsCount: state.revealsCount,
      cell00: state.cells[0]![0],
      cell22: state.cells[2]![2],
    });
    expect(after).toBe(snapshot);
  });

  test("revealsCount tracks the number of cells revealed", () => {
    const state = initialState(layout3x3SingleMine());
    const { state: next } = applyAction(state, {
      kind: "reveal",
      row: 2,
      col: 2,
      t: 1,
    });
    expect(next.revealsCount).toBe(8); // 8 cells revealed via flood-fill
  });

  test("once the game is over, further actions are no-ops", () => {
    const state = initialState(layout3x3SingleMine());
    const after = applyAction(state, {
      kind: "reveal",
      row: 0,
      col: 0,
      t: 1,
    }).state;
    expect(after.status).toBe("lost");
    const further = applyAction(after, {
      kind: "reveal",
      row: 2,
      col: 2,
      t: 2,
    });
    expect(further.state).toBe(after);
    expect(further.events).toHaveLength(0);
  });
});
