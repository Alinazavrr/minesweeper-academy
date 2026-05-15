/**
 * @minesweeper/engine — pure Minesweeper engine package.
 *
 * Public API per PROJECT_PLAN.md §16.5. No DOM, no React, no Node-only
 * APIs. Deterministic given a seed.
 */

export const ENGINE_VERSION = "0.1.0";

export { generateBoard, layoutFromMines, validateBoard } from "./generate";
export { initialState } from "./state";
export { applyAction } from "./apply";
export { findSafeCell, annotateMoves } from "./solver";
export { serializeReplay, deserializeReplay } from "./replay";

export type {
  BoardConfig,
  BoardLayout,
  Cell,
  GameState,
  GameStatus,
  Action,
  GameEvent,
  MoveAnnotation,
  ReviewResult,
} from "./types";
