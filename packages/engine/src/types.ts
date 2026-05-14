/**
 * Public type surface for the Minesweeper engine.
 * See PROJECT_PLAN.md §16.5 for the contract.
 */

/** Input to `generateBoard`. */
export type BoardConfig = {
  rows: number;
  cols: number;
  mineCount: number;
  noGuess: boolean;
  seed: string;
  /** Optional first-click cell. When provided, the generator guarantees the
   *  cell at this position is not a mine. */
  firstClick?: { row: number; col: number };
};

/** Static layout produced by `generateBoard`. Immutable. */
export type BoardLayout = {
  rows: number;
  cols: number;
  mineCount: number;
  noGuess: boolean;
  seed: string;
  /** Cell indices (row * cols + col) that contain mines. */
  mines: ReadonlySet<number>;
  /** Bechtel's Board 3BV — minimum number of clicks to solve. */
  threeBV: number;
};

/** Per-cell dynamic state. */
export type Cell = {
  revealed: boolean;
  flagged: boolean;
  questioned: boolean;
  mine: boolean;
  /** Number of mines in the 8 neighbors. 0 if cell is a mine itself. */
  adjacent: number;
};

export type GameStatus = "idle" | "playing" | "won" | "lost";

/** Full mutable state of a game in progress. Each `applyAction` returns a
 *  fresh state — never mutate in place. */
export type GameState = {
  layout: BoardLayout;
  cells: Cell[][];
  status: GameStatus;
  /** Wall-clock ms of the first action; null until first action. */
  startedAt: number | null;
  /** Wall-clock ms of the action that ended the game; null while playing. */
  finishedAt: number | null;
  flagsPlaced: number;
  revealsCount: number;
};

/** Player-issued action. `t` is the wall-clock ms timestamp at action time
 *  (used for replay and validator timing checks). */
export type Action =
  | { kind: "reveal"; row: number; col: number; t: number }
  | { kind: "flag"; row: number; col: number; t: number }
  | { kind: "question"; row: number; col: number; t: number }
  | { kind: "chord"; row: number; col: number; t: number };

/** Events emitted by `applyAction`. Consumed by the UI for animations and
 *  by the analytics/coach layer for replay annotation. */
export type GameEvent =
  | {
      kind: "revealed";
      row: number;
      col: number;
      adjacent: number;
      /** True when this cell was revealed as part of a flood-fill. */
      flooded: boolean;
    }
  | { kind: "flagged"; row: number; col: number; on: boolean }
  | { kind: "questioned"; row: number; col: number; on: boolean }
  | { kind: "won"; t: number }
  | { kind: "lost"; t: number; mineRow: number; mineCol: number };

/** Per-move annotation produced by `annotateMoves` (CSP-based, MVP). */
export type MoveAnnotation = {
  actionIndex: number;
  /** A logically provable safe cell existed at this state. */
  safeMoveAvailable: boolean;
  /** When `safeMoveAvailable`, the (row, col) of one such cell. */
  safeCell?: { row: number; col: number };
};

/** Output of `reviewGame` — Phase 3 (probability-aware). Stub type included
 *  here so the schema doesn't shift later. */
export type ReviewResult = {
  annotations: MoveAnnotation[];
  /** When set, the action index where win probability dropped the most. */
  turningPointActionIndex?: number;
};
