import { hashSeed, mulberry32, nextInt } from "./prng";
import type { BoardConfig, BoardLayout } from "./types";

/**
 * Generate a (non-no-guess) board layout.
 *
 * Determinism: identical config produces an identical layout, byte-for-byte.
 * First-click safety: when `firstClick` is provided, the chosen cell is
 * guaranteed not to contain a mine.
 *
 * No-guess generation is Phase 2 (board-pool worker) and ships as a
 * separate function — this one is for Quick Play.
 */
export function generateBoard(config: BoardConfig): BoardLayout {
  validateConfig(config);
  const { rows, cols, mineCount, noGuess, seed, firstClick } = config;
  const total = rows * cols;
  const excludeIdx =
    firstClick !== undefined ? firstClick.row * cols + firstClick.col : -1;

  // Mix the firstClick into the seed so different first-click cells yield
  // different layouts for the same player-facing seed string.
  const baseSeed = hashSeed(seed);
  const fcSalt = excludeIdx >= 0 ? excludeIdx + 1 : 0;
  const rng = mulberry32((baseSeed + fcSalt) >>> 0);

  // Rejection sampling — fine for Minesweeper densities (≤25%).
  const mines = new Set<number>();
  while (mines.size < mineCount) {
    const pick = nextInt(rng, total);
    if (pick !== excludeIdx && !mines.has(pick)) {
      mines.add(pick);
    }
  }

  const threeBV = computeThreeBV(rows, cols, mines);

  return { rows, cols, mineCount, noGuess, seed, mines, threeBV };
}

/**
 * Build a BoardLayout from explicit mine indices — no PRNG.
 *
 * Used by Academy lessons (and any other surface that wants a hand-authored
 * deterministic board) so we don't have to cherry-pick seeds. The output is
 * shape-identical to `generateBoard` so callers can pass it straight through
 * to `initialState` / `applyAction`.
 *
 * `seed` is preserved as metadata only — it isn't used to derive anything.
 * Pass a stable string (e.g. `lesson:1-2-1-pattern`) so the resulting layout
 * is identifiable in logs and serialized game records.
 */
export function layoutFromMines(input: {
  rows: number;
  cols: number;
  mines: ReadonlyArray<number>;
  seed: string;
  noGuess?: boolean;
}): BoardLayout {
  const { rows, cols, mines, seed, noGuess = false } = input;
  if (!Number.isInteger(rows) || rows <= 0) {
    throw new Error(`layoutFromMines: rows must be positive integer, got ${rows}`);
  }
  if (!Number.isInteger(cols) || cols <= 0) {
    throw new Error(`layoutFromMines: cols must be positive integer, got ${cols}`);
  }
  const total = rows * cols;
  const mineSet = new Set<number>();
  for (const idx of mines) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= total) {
      throw new Error(
        `layoutFromMines: mine index ${idx} out of range for ${rows}x${cols}`,
      );
    }
    mineSet.add(idx);
  }
  if (mineSet.size >= total) {
    throw new Error(
      `layoutFromMines: ${mineSet.size} mines leaves no safe cells on a ${rows}x${cols} board`,
    );
  }
  const threeBV = computeThreeBV(rows, cols, mineSet);
  return {
    rows,
    cols,
    mineCount: mineSet.size,
    noGuess,
    seed,
    mines: mineSet,
    threeBV,
  };
}

/**
 * Validate a layout's internal consistency. Cheap — O(rows*cols) at worst.
 * The matchmaker / validator calls this before trusting any layout payload.
 */
export function validateBoard(layout: BoardLayout): boolean {
  const { rows, cols, mineCount, mines } = layout;
  if (!Number.isInteger(rows) || rows <= 0) return false;
  if (!Number.isInteger(cols) || cols <= 0) return false;
  if (!Number.isInteger(mineCount) || mineCount < 0) return false;
  const total = rows * cols;
  if (mineCount >= total) return false;
  if (mines.size !== mineCount) return false;
  for (const idx of mines) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= total) return false;
  }
  return true;
}

function validateConfig(config: BoardConfig): void {
  const { rows, cols, mineCount, firstClick } = config;
  if (!Number.isInteger(rows) || rows <= 0) {
    throw new Error(`generateBoard: rows must be a positive integer, got ${rows}`);
  }
  if (!Number.isInteger(cols) || cols <= 0) {
    throw new Error(`generateBoard: cols must be a positive integer, got ${cols}`);
  }
  if (!Number.isInteger(mineCount) || mineCount < 0) {
    throw new Error(
      `generateBoard: mineCount must be a non-negative integer, got ${mineCount}`,
    );
  }
  const total = rows * cols;
  // mineCount must leave at least one safe cell (and one extra if firstClick).
  const reserved = firstClick !== undefined ? 1 : 0;
  if (mineCount > total - 1 - reserved) {
    throw new Error(
      `generateBoard: mineCount=${mineCount} leaves no safe cells on a ${rows}x${cols} board`,
    );
  }
  if (firstClick !== undefined) {
    const { row, col } = firstClick;
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      row >= rows ||
      col < 0 ||
      col >= cols
    ) {
      throw new Error(
        `generateBoard: firstClick (${row}, ${col}) is outside the ${rows}x${cols} board`,
      );
    }
  }
}

/**
 * 3BV (Bechtel's Board 3BV) — the minimum number of left-clicks needed to
 * win a game on this layout, ignoring flags.
 *
 *   3BV = openings + isolated_numbers
 *
 *   - "Opening": a connected component of cells with adjacent==0 plus its
 *     numeric border. One click anywhere in the opening reveals the whole
 *     thing.
 *   - "Isolated number": a non-mine cell that is neither a 0-cell nor
 *     adjacent to any 0-cell. Must be clicked individually.
 *
 * For a mine-free board, 3BV = 1 (everything is one opening).
 */
function computeThreeBV(
  rows: number,
  cols: number,
  mines: ReadonlySet<number>,
): number {
  if (rows <= 0 || cols <= 0) return 0;
  const total = rows * cols;

  // Adjacent counts for non-mine cells.
  const adjacent = new Int8Array(total);
  for (const mineIdx of mines) {
    const r = (mineIdx / cols) | 0;
    const c = mineIdx % cols;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        const nIdx = nr * cols + nc;
        if (!mines.has(nIdx)) {
          adjacent[nIdx]! += 1;
        }
      }
    }
  }

  // Flood-fill openings starting from each unvisited 0-cell. Mark every cell
  // visited (the 0-cells and their numeric borders) so the isolated-number
  // pass below ignores them.
  const visited = new Uint8Array(total);
  let openings = 0;
  for (let i = 0; i < total; i++) {
    if (mines.has(i) || visited[i] || adjacent[i] !== 0) continue;
    openings++;
    const queue: number[] = [i];
    visited[i] = 1;
    while (queue.length > 0) {
      const idx = queue.shift()!;
      const r = (idx / cols) | 0;
      const c = idx % cols;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          const nIdx = nr * cols + nc;
          if (mines.has(nIdx) || visited[nIdx]) continue;
          visited[nIdx] = 1;
          // Only enqueue if it's also a 0-cell — numeric borders are mark-only.
          if (adjacent[nIdx] === 0) queue.push(nIdx);
        }
      }
    }
  }

  let isolated = 0;
  for (let i = 0; i < total; i++) {
    if (!mines.has(i) && !visited[i]) isolated++;
  }

  return openings + isolated;
}
