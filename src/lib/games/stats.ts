import {
  ENGINE_VERSION,
  serializeReplay,
  type Action,
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
  /** Base64-encoded replay blob; null when capture wasn't available. */
  replay_blob_b64: string | null;
};

export type BuildSaveGameInput = {
  difficulty: GameDifficulty;
  layout: BoardLayout;
  state: GameState;
  hintsUsed: number;
  /** Empty/omitted when capture wasn't running (legacy paths, tests). */
  actionLog?: ReadonlyArray<Action>;
};

/**
 * Browser-safe base64 encode of a Uint8Array. Keeps replay-encoding logic
 * in one place so tests and runtime stay aligned.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  // Chunk to avoid the apply() argument-count limit on very large blobs.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + CHUNK, bytes.length))),
    );
  }
  return typeof btoa !== "undefined"
    ? btoa(binary)
    : Buffer.from(bytes).toString("base64");
}

export function tryEncodeReplay(actions: ReadonlyArray<Action>): string | null {
  if (actions.length === 0) return null;
  try {
    const bytes = serializeReplay(actions);
    return bytesToBase64(bytes);
  } catch {
    // Replay capture is best-effort — never block the save on it.
    return null;
  }
}

export function buildSaveGamePayload(input: BuildSaveGameInput): SaveGamePayload {
  const { difficulty, layout, state, hintsUsed, actionLog = [] } = input;
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
    replay_blob_b64: tryEncodeReplay(actionLog),
  };
}
