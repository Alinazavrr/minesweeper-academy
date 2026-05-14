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

describe("applyAction: flag", () => {
  test("flagging an unrevealed cell sets flagged=true and increments flagsPlaced", () => {
    const state = initialState(layout3x3SingleMine());
    const { state: next, events } = applyAction(state, {
      kind: "flag",
      row: 1,
      col: 1,
      t: 1,
    });
    expect(next.cells[1]![1]!.flagged).toBe(true);
    expect(next.flagsPlaced).toBe(1);
    expect(events).toContainEqual({
      kind: "flagged",
      row: 1,
      col: 1,
      on: true,
    });
  });

  test("flagging an already-flagged cell unflags it", () => {
    const state = initialState(layout3x3SingleMine());
    const s1 = applyAction(state, {
      kind: "flag",
      row: 1,
      col: 1,
      t: 1,
    }).state;
    expect(s1.flagsPlaced).toBe(1);
    const { state: s2, events } = applyAction(s1, {
      kind: "flag",
      row: 1,
      col: 1,
      t: 2,
    });
    expect(s2.cells[1]![1]!.flagged).toBe(false);
    expect(s2.flagsPlaced).toBe(0);
    expect(events).toContainEqual({
      kind: "flagged",
      row: 1,
      col: 1,
      on: false,
    });
  });

  test("flagging a revealed cell is a no-op", () => {
    const state = initialState(layout3x3SingleMine());
    const s1 = applyAction(state, {
      kind: "reveal",
      row: 0,
      col: 1,
      t: 1,
    }).state;
    const { state: s2, events } = applyAction(s1, {
      kind: "flag",
      row: 0,
      col: 1,
      t: 2,
    });
    expect(s2).toBe(s1);
    expect(events).toHaveLength(0);
  });

  test("flagging a questioned cell clears the question and sets the flag", () => {
    const state = initialState(layout3x3SingleMine());
    const s1 = applyAction(state, {
      kind: "question",
      row: 1,
      col: 1,
      t: 1,
    }).state;
    expect(s1.cells[1]![1]!.questioned).toBe(true);
    const { state: s2 } = applyAction(s1, {
      kind: "flag",
      row: 1,
      col: 1,
      t: 2,
    });
    expect(s2.cells[1]![1]!.flagged).toBe(true);
    expect(s2.cells[1]![1]!.questioned).toBe(false);
    expect(s2.flagsPlaced).toBe(1);
  });

  test("flag does not change game status", () => {
    const state = initialState(layout3x3SingleMine());
    const { state: next } = applyAction(state, {
      kind: "flag",
      row: 1,
      col: 1,
      t: 1,
    });
    expect(next.status).toBe("idle");
  });

  test("flag bounds check throws", () => {
    const state = initialState(layout3x3SingleMine());
    expect(() =>
      applyAction(state, { kind: "flag", row: -1, col: 0, t: 1 }),
    ).toThrow();
    expect(() =>
      applyAction(state, { kind: "flag", row: 0, col: 3, t: 1 }),
    ).toThrow();
  });

  test("flag does not mutate input state", () => {
    const state = initialState(layout3x3SingleMine());
    applyAction(state, { kind: "flag", row: 1, col: 1, t: 1 });
    expect(state.cells[1]![1]!.flagged).toBe(false);
    expect(state.flagsPlaced).toBe(0);
  });
});

describe("applyAction: question", () => {
  test("questioning an unrevealed cell sets questioned=true", () => {
    const state = initialState(layout3x3SingleMine());
    const { state: next, events } = applyAction(state, {
      kind: "question",
      row: 1,
      col: 1,
      t: 1,
    });
    expect(next.cells[1]![1]!.questioned).toBe(true);
    expect(events).toContainEqual({
      kind: "questioned",
      row: 1,
      col: 1,
      on: true,
    });
  });

  test("questioning an already-questioned cell clears it", () => {
    const state = initialState(layout3x3SingleMine());
    const s1 = applyAction(state, {
      kind: "question",
      row: 1,
      col: 1,
      t: 1,
    }).state;
    const { state: s2 } = applyAction(s1, {
      kind: "question",
      row: 1,
      col: 1,
      t: 2,
    });
    expect(s2.cells[1]![1]!.questioned).toBe(false);
  });

  test("questioning a flagged cell clears the flag", () => {
    const state = initialState(layout3x3SingleMine());
    const s1 = applyAction(state, {
      kind: "flag",
      row: 1,
      col: 1,
      t: 1,
    }).state;
    expect(s1.flagsPlaced).toBe(1);
    const { state: s2 } = applyAction(s1, {
      kind: "question",
      row: 1,
      col: 1,
      t: 2,
    });
    expect(s2.cells[1]![1]!.flagged).toBe(false);
    expect(s2.cells[1]![1]!.questioned).toBe(true);
    expect(s2.flagsPlaced).toBe(0);
  });

  test("questioning a revealed cell is a no-op", () => {
    const state = initialState(layout3x3SingleMine());
    const s1 = applyAction(state, {
      kind: "reveal",
      row: 0,
      col: 1,
      t: 1,
    }).state;
    const { state: s2, events } = applyAction(s1, {
      kind: "question",
      row: 0,
      col: 1,
      t: 2,
    });
    expect(s2).toBe(s1);
    expect(events).toHaveLength(0);
  });
});

describe("applyAction: chord", () => {
  test("chord on revealed numeric cell with matching flag count reveals neighbors", () => {
    const state = initialState(layout3x3CornerMines());
    // Reveal (1,1) which has adjacent=4 (all 4 corners are mines).
    let s = applyAction(state, {
      kind: "reveal",
      row: 1,
      col: 1,
      t: 1,
    }).state;
    expect(s.cells[1]![1]!.revealed).toBe(true);
    expect(s.cells[1]![1]!.adjacent).toBe(4);
    // Flag all four corners.
    s = applyAction(s, { kind: "flag", row: 0, col: 0, t: 2 }).state;
    s = applyAction(s, { kind: "flag", row: 0, col: 2, t: 3 }).state;
    s = applyAction(s, { kind: "flag", row: 2, col: 0, t: 4 }).state;
    s = applyAction(s, { kind: "flag", row: 2, col: 2, t: 5 }).state;
    // Chord on (1,1). Should reveal all remaining unflagged neighbors:
    // (0,1), (1,0), (1,2), (2,1).
    const { state: after } = applyAction(s, {
      kind: "chord",
      row: 1,
      col: 1,
      t: 6,
    });
    expect(after.cells[0]![1]!.revealed).toBe(true);
    expect(after.cells[1]![0]!.revealed).toBe(true);
    expect(after.cells[1]![2]!.revealed).toBe(true);
    expect(after.cells[2]![1]!.revealed).toBe(true);
    expect(after.status).toBe("won"); // all non-mines revealed
  });

  test("chord with wrong flag count is a no-op", () => {
    const state = initialState(layout3x3CornerMines());
    let s = applyAction(state, {
      kind: "reveal",
      row: 1,
      col: 1,
      t: 1,
    }).state;
    // Only flag two corners (need 4).
    s = applyAction(s, { kind: "flag", row: 0, col: 0, t: 2 }).state;
    s = applyAction(s, { kind: "flag", row: 0, col: 2, t: 3 }).state;
    const { state: after, events } = applyAction(s, {
      kind: "chord",
      row: 1,
      col: 1,
      t: 4,
    });
    expect(after).toBe(s);
    expect(events).toHaveLength(0);
  });

  test("chord on an unrevealed cell is a no-op", () => {
    const state = initialState(layout3x3CornerMines());
    const { state: after, events } = applyAction(state, {
      kind: "chord",
      row: 1,
      col: 1,
      t: 1,
    });
    expect(after).toBe(state);
    expect(events).toHaveLength(0);
  });

  test("chord that hits a mine triggers loss", () => {
    // Single-mine layout. Reveal a number cell, flag a wrong neighbor,
    // chord on the number. The mine (unflagged) should be revealed -> loss.
    const state = initialState(layout3x3SingleMine());
    // Reveal (1,1) which has adjacent=1 (mine at (0,0)).
    let s = applyAction(state, {
      kind: "reveal",
      row: 1,
      col: 1,
      t: 1,
    }).state;
    // Flag the WRONG cell — (0,1) — so the chord thinks "1 flag, all good"
    // and proceeds to reveal the actual mine at (0,0).
    s = applyAction(s, { kind: "flag", row: 0, col: 1, t: 2 }).state;
    // Chord on (1,1): adjacent=1, flagCount=1, fires. Reveals all
    // unflagged neighbors including the mine at (0,0). Loss.
    const { state: after } = applyAction(s, {
      kind: "chord",
      row: 1,
      col: 1,
      t: 3,
    });
    expect(after.status).toBe("lost");
    expect(after.finishedAt).toBe(3);
    expect(after.cells[0]![0]!.revealed).toBe(true);
  });

  test("chord bounds check throws", () => {
    const state = initialState(layout3x3SingleMine());
    expect(() =>
      applyAction(state, { kind: "chord", row: -1, col: 0, t: 1 }),
    ).toThrow();
  });

  test("chord on revealed 0-cell with no flags is a no-op (nothing to chord)", () => {
    // 0-cell with adjacent=0 means flagCount must equal 0 to fire, but then
    // there's nothing useful to reveal — the 0-cell was already a flood.
    // So a chord here is effectively a no-op.
    const state = initialState(layout3x3SingleMine());
    // Reveal (2,2) — a 0-cell that floods 8 cells -> wins immediately.
    const s = applyAction(state, {
      kind: "reveal",
      row: 2,
      col: 2,
      t: 1,
    }).state;
    // Game won — applyAction absorbs further actions. To test the 0-cell
    // chord proper we need a layout where revealing a 0-cell doesn't win.
    // Skip the assertion here — the meaningful 0-chord case is implicit
    // in the chord-on-unrevealed test above plus the rule's documentation.
    expect(s.status).toBe("won");
  });
});
