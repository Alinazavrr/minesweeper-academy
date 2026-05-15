import {
  ENGINE_VERSION,
  type BoardLayout,
  type GameState,
} from "@minesweeper/engine";

export type GameDifficulty = "beginner" | "intermediate" | "expert" | "custom";
export type GameSourceMode =
  | "quick_play"
  | "daily"
  | "arena"
  | "practice"
  | "lesson_practice";

/**
 * Sanitized payload ready to insert into public.games. user_id is attached
 * by the server action — never trust the client to supply it.
 */
export type SaveGamePayload = {
  difficulty: GameDifficulty;
  rows: number;
  cols: number;
  mine_count: number;
  seed: string;
  no_guess: boolean;
  result: "win" | "loss";
  time_ms: number;
  mistakes: number;
  flags_placed: number;
  flags_correct: number;
  hints_used: number;
  three_bv: number;
  three_bvs: number;
  engine_version: string;
  source_mode: GameSourceMode;
  daily_date: string | null;
  arena_match_id: string | null;
  finished_at: string;
};

export type BuildSaveGameInput = {
  difficulty: GameDifficulty;
  layout: BoardLayout;
  state: GameState;
  hintsUsed: number;
};

export function buildSaveGamePayload(input: BuildSaveGameInput): SaveGamePayload {
  const { difficulty, layout, state, hintsUsed } = input;
  if (state.status !== "won" && state.status !== "lost") {
    throw new Error(
      `buildSaveGamePayload: state must be terminal (won/lost), got ${state.status}`,
    );
  }
  if (state.startedAt === null || state.finishedAt === null) {
    throw new Error(
      "buildSaveGamePayload: terminal state must have startedAt and finishedAt",
    );
  }

  const time_ms = Math.max(0, state.finishedAt - state.startedAt);
  const three_bvs = time_ms === 0 ? 0 : layout.threeBV / (time_ms / 1000);

  let flags_correct = 0;
  for (let r = 0; r < layout.rows; r++) {
    const row = state.cells[r]!;
    for (let c = 0; c < layout.cols; c++) {
      const cell = row[c]!;
      if (cell.flagged && cell.mine) flags_correct++;
    }
  }

  return {
    difficulty,
    rows: layout.rows,
    cols: layout.cols,
    mine_count: layout.mineCount,
    seed: layout.seed,
    no_guess: layout.noGuess,
    result: state.status === "won" ? "win" : "loss",
    time_ms,
    mistakes: 0,
    flags_placed: state.flagsPlaced,
    flags_correct,
    hints_used: Math.max(0, hintsUsed | 0),
    three_bv: layout.threeBV,
    three_bvs,
    engine_version: ENGINE_VERSION,
    source_mode: "quick_play",
    daily_date: null,
    arena_match_id: null,
    finished_at: new Date(state.finishedAt).toISOString(),
  };
}
