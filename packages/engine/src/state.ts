import type { BoardLayout, Cell, GameState } from "./types";

/**
 * Build the initial GameState for a layout. All cells start unrevealed and
 * unflagged; status is 'idle' (the first action transitions it to 'playing').
 * The cells grid is a fresh allocation each call so callers can safely mutate
 * derivatives without affecting other consumers.
 */
export function initialState(layout: BoardLayout): GameState {
  const { rows, cols, mines } = layout;
  const adjacent = computeAdjacent(rows, cols, mines);

  const cells: Cell[][] = new Array(rows);
  for (let r = 0; r < rows; r++) {
    const row = new Array<Cell>(cols);
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      row[c] = {
        revealed: false,
        flagged: false,
        questioned: false,
        mine: mines.has(idx),
        adjacent: mines.has(idx) ? 0 : adjacent[idx]!,
      };
    }
    cells[r] = row;
  }

  return {
    layout,
    cells,
    status: "idle",
    startedAt: null,
    finishedAt: null,
    flagsPlaced: 0,
    revealsCount: 0,
  };
}

/**
 * Per-cell count of mines in the 8-neighborhood. Mine cells carry their own
 * count too (we just don't surface it via `Cell.adjacent`).
 */
function computeAdjacent(
  rows: number,
  cols: number,
  mines: ReadonlySet<number>,
): Int8Array {
  const adjacent = new Int8Array(rows * cols);
  for (const mineIdx of mines) {
    const r = (mineIdx / cols) | 0;
    const c = mineIdx % cols;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        adjacent[nr * cols + nc]! += 1;
      }
    }
  }
  return adjacent;
}
