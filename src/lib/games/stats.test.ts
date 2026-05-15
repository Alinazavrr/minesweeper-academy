import { describe, it, expect } from "vitest";
import {
  ENGINE_VERSION,
  applyAction,
  generateBoard,
  initialState,
  type BoardLayout,
  type Cell,
  type GameState,
} from "@minesweeper/engine";
import { buildSaveGamePayload } from "./stats";

/** Play a 2x2 / 1-mine board to a win by revealing every non-mine cell. */
function playWonMinimal(at: number): { layout: BoardLayout; state: GameState } {
  const layout = generateBoard({
    rows: 2,
    cols: 2,
    mineCount: 1,
    noGuess: false,
    seed: "won-min",
    firstClick: { row: 0, col: 0 },
  });
  let state: GameState = initialState(layout);
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      if (state.status === "won") break;
      if (layout.mines.has(r * layout.cols + c)) continue;
      if (state.cells[r]![c]!.revealed) continue;
      state = applyAction(state, { kind: "reveal", row: r, col: c, t: at })
        .state;
    }
  }
  return { layout, state };
}

/** Reveal the (only) mine on a 2x2 / 1-mine board to produce a loss. */
function playLostMinimal(at: number): { layout: BoardLayout; state: GameState } {
  const layout = generateBoard({
    rows: 2,
    cols: 2,
    mineCount: 1,
    noGuess: false,
    seed: "lost-min",
    firstClick: { row: 0, col: 0 },
  });
  const mineIdx = [...layout.mines][0]!;
  const mineRow = Math.floor(mineIdx / layout.cols);
  const mineCol = mineIdx % layout.cols;
  const s0 = initialState(layout);
  const { state } = applyAction(s0, {
    kind: "reveal",
    row: mineRow,
    col: mineCol,
    t: at,
  });
  return { layout, state };
}

/**
 * Build a synthetic terminal state with the cell flags we choose. Used to
 * test flags_correct counting without playing a real sequence.
 */
function synthWonWithFlags(
  flagPositions: ReadonlyArray<{ row: number; col: number }>,
  startedAt: number,
  finishedAt: number,
): { layout: BoardLayout; state: GameState } {
  const layout = generateBoard({
    rows: 3,
    cols: 3,
    mineCount: 2,
    noGuess: false,
    seed: "synth-3x3",
  });
  const s0 = initialState(layout);
  // Deep-clone the cells so we don't mutate s0.
  const cells: Cell[][] = s0.cells.map((row) => row.map((c) => ({ ...c })));
  let flagsPlaced = 0;
  for (const { row, col } of flagPositions) {
    cells[row]![col]!.flagged = true;
    flagsPlaced++;
  }
  const state: GameState = {
    ...s0,
    cells,
    status: "won",
    startedAt,
    finishedAt,
    flagsPlaced,
    revealsCount: layout.rows * layout.cols - layout.mineCount,
  };
  return { layout, state };
}

describe("buildSaveGamePayload", () => {
  it("packs metadata for a won game", () => {
    const { layout, state } = playWonMinimal(1000);
    const payload = buildSaveGamePayload({
      difficulty: "beginner",
      layout,
      state,
      hintsUsed: 0,
    });
    expect(payload.difficulty).toBe("beginner");
    expect(payload.rows).toBe(2);
    expect(payload.cols).toBe(2);
    expect(payload.mine_count).toBe(1);
    expect(payload.seed).toBe(layout.seed);
    expect(payload.no_guess).toBe(false);
    expect(payload.result).toBe("win");
    expect(payload.flags_placed).toBe(0);
    expect(payload.flags_correct).toBe(0);
    expect(payload.hints_used).toBe(0);
    expect(payload.three_bv).toBe(layout.threeBV);
    expect(payload.engine_version).toBe(ENGINE_VERSION);
    expect(payload.source_mode).toBe("quick_play");
    expect(payload.daily_date).toBeNull();
    expect(payload.arena_match_id).toBeNull();
    expect(payload.mistakes).toBe(0);
  });

  it("reports result='loss' when the game ended on a mine", () => {
    const { layout, state } = playLostMinimal(500);
    const payload = buildSaveGamePayload({
      difficulty: "beginner",
      layout,
      state,
      hintsUsed: 0,
    });
    expect(payload.result).toBe("loss");
  });

  it("derives time_ms from finishedAt - startedAt", () => {
    const { layout, state } = synthWonWithFlags([], 2_000, 7_500);
    const payload = buildSaveGamePayload({
      difficulty: "intermediate",
      layout,
      state,
      hintsUsed: 0,
    });
    expect(payload.time_ms).toBe(5_500);
  });

  it("clamps time_ms to 0 when finishedAt < startedAt (clock skew)", () => {
    const { layout, state } = synthWonWithFlags([], 10_000, 9_000);
    const payload = buildSaveGamePayload({
      difficulty: "expert",
      layout,
      state,
      hintsUsed: 0,
    });
    expect(payload.time_ms).toBe(0);
  });

  it("computes three_bvs as threeBV per elapsed second", () => {
    const { layout, state } = synthWonWithFlags([], 1_000, 11_000);
    const payload = buildSaveGamePayload({
      difficulty: "beginner",
      layout,
      state,
      hintsUsed: 0,
    });
    // elapsed = 10s; three_bvs = threeBV / 10
    expect(payload.three_bvs).toBeCloseTo(layout.threeBV / 10, 5);
  });

  it("returns three_bvs = 0 when time_ms is 0", () => {
    const { layout, state } = synthWonWithFlags([], 1_000, 1_000);
    const payload = buildSaveGamePayload({
      difficulty: "beginner",
      layout,
      state,
      hintsUsed: 0,
    });
    expect(payload.three_bvs).toBe(0);
  });

  it("counts only mine-flagged cells as flags_correct", () => {
    // Layout has 2 mines. We'll flag both mines + one non-mine cell.
    const tmpLayout = generateBoard({
      rows: 3,
      cols: 3,
      mineCount: 2,
      noGuess: false,
      seed: "synth-3x3",
    });
    const minePositions = [...tmpLayout.mines].map((idx) => ({
      row: Math.floor(idx / tmpLayout.cols),
      col: idx % tmpLayout.cols,
    }));
    // Pick a non-mine cell to also flag.
    const nonMine = (() => {
      for (let r = 0; r < tmpLayout.rows; r++) {
        for (let c = 0; c < tmpLayout.cols; c++) {
          if (!tmpLayout.mines.has(r * tmpLayout.cols + c)) {
            return { row: r, col: c };
          }
        }
      }
      throw new Error("no non-mine cell found");
    })();

    const { layout, state } = synthWonWithFlags(
      [...minePositions, nonMine],
      0,
      1_000,
    );
    const payload = buildSaveGamePayload({
      difficulty: "beginner",
      layout,
      state,
      hintsUsed: 0,
    });
    expect(payload.flags_placed).toBe(3);
    expect(payload.flags_correct).toBe(2);
  });

  it("stamps finished_at as an ISO string of state.finishedAt", () => {
    const { layout, state } = synthWonWithFlags([], 1_000, 1_700_000_000_000);
    const payload = buildSaveGamePayload({
      difficulty: "beginner",
      layout,
      state,
      hintsUsed: 0,
    });
    expect(payload.finished_at).toBe(new Date(1_700_000_000_000).toISOString());
  });

  it("carries hints_used through", () => {
    const { layout, state } = synthWonWithFlags([], 0, 1_000);
    const payload = buildSaveGamePayload({
      difficulty: "beginner",
      layout,
      state,
      hintsUsed: 4,
    });
    expect(payload.hints_used).toBe(4);
  });

  it("throws when the state is not terminal", () => {
    const layout = generateBoard({
      rows: 2,
      cols: 2,
      mineCount: 1,
      noGuess: false,
      seed: "idle",
    });
    const s0 = initialState(layout);
    expect(() =>
      buildSaveGamePayload({
        difficulty: "beginner",
        layout,
        state: s0,
        hintsUsed: 0,
      }),
    ).toThrow();
  });
});
