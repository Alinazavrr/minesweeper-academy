import { applyAction } from "./apply";
import { initialState } from "./state";
import type { Action, BoardLayout, GameState, MoveAnnotation } from "./types";

/**
 * Pure-logic Minesweeper CSP solver — MVP scope per PROJECT_PLAN.md §16.5.
 *
 * `findSafeCell` returns one provably-safe (unrevealed, unflagged) cell, or
 * null if no logical deduction is possible from the current GameState.
 *
 * The solver uses two local rules iterated to fixpoint:
 *   1. Single-constraint propagation. A revealed numeric cell with K mines
 *      among N unknown neighbors yields:
 *        - K=0 → all neighbors safe.
 *        - K=N → all neighbors are mines.
 *   2. Pairwise subset (the generalized "1-1" / "1-2"). For constraints A
 *      and B over cell sets S_A and S_B with M_A and M_B mines:
 *      let onlyA = S_A \ S_B, onlyB = S_B \ S_A, d = M_B - M_A.
 *        - d = |onlyB| → onlyB all mines, onlyA all safe.
 *        - d = -|onlyA| → onlyA all mines, onlyB all safe.
 *
 * Player flags are trusted as ground-truth mines (same convention as Chord).
 * If a flag is wrong, the solver's deduction is wrong too — that's the
 * player's call. Post-Game Review will run a separate pass that ignores
 * flags and uses the layout's true mines for narration.
 *
 * Two rules cover the 1-1 and 1-2 patterns called out in the spec. They do
 * not solve every position — some boards require enumerating subsets of
 * cells (a full CSP search). Returning `null` in those cases is correct:
 * "no deducible safe cell — you must guess."
 */

type Constraint = { cells: Set<number>; mines: number };

const NEIGHBOR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export function findSafeCell(
  state: GameState,
): { row: number; col: number } | null {
  if (state.status !== "playing") return null;
  const { cols } = state.layout;

  const constraints = buildConstraints(state);
  if (constraints.length === 0) return null;

  const knownSafe = new Set<number>();
  const knownMine = new Set<number>();

  // 32 iterations is overkill; in practice propagation converges in < 5 for
  // any board we care about.
  for (let iter = 0; iter < 32; iter++) {
    let changed = false;

    // Single-constraint propagation. Strip resolved cells, then check the
    // zero-mines and all-mines triggers.
    for (const c of constraints) {
      if (c.cells.size === 0) continue;
      for (const idx of [...c.cells]) {
        if (knownMine.has(idx)) {
          c.cells.delete(idx);
          c.mines--;
        } else if (knownSafe.has(idx)) {
          c.cells.delete(idx);
        }
      }
      if (c.cells.size === 0) continue;
      if (c.mines === 0) {
        for (const idx of c.cells) {
          if (!knownSafe.has(idx)) {
            knownSafe.add(idx);
            changed = true;
          }
        }
        c.cells.clear();
      } else if (c.mines === c.cells.size) {
        for (const idx of c.cells) {
          if (!knownMine.has(idx)) {
            knownMine.add(idx);
            changed = true;
          }
        }
        c.cells.clear();
      }
    }

    // Pairwise subset rule — only run if single-constraint stalled, since
    // subset rule findings feed back into single-constraint next iter.
    if (!changed) {
      const live = constraints.filter((c) => c.cells.size > 0);
      for (let i = 0; i < live.length; i++) {
        const a = live[i]!;
        for (let j = i + 1; j < live.length; j++) {
          const b = live[j]!;
          const onlyA: number[] = [];
          const onlyB: number[] = [];
          for (const idx of a.cells) if (!b.cells.has(idx)) onlyA.push(idx);
          for (const idx of b.cells) if (!a.cells.has(idx)) onlyB.push(idx);
          if (onlyA.length === 0 && onlyB.length === 0) continue;
          const d = b.mines - a.mines;
          if (onlyB.length > 0 && d === onlyB.length) {
            for (const idx of onlyB)
              if (!knownMine.has(idx)) {
                knownMine.add(idx);
                changed = true;
              }
            for (const idx of onlyA)
              if (!knownSafe.has(idx)) {
                knownSafe.add(idx);
                changed = true;
              }
          }
          if (onlyA.length > 0 && -d === onlyA.length) {
            for (const idx of onlyA)
              if (!knownMine.has(idx)) {
                knownMine.add(idx);
                changed = true;
              }
            for (const idx of onlyB)
              if (!knownSafe.has(idx)) {
                knownSafe.add(idx);
                changed = true;
              }
          }
        }
      }
    }

    if (!changed) break;
  }

  if (knownSafe.size === 0) return null;
  // Return the lowest-index safe cell so output is deterministic across
  // runs and platforms (Set iteration order is insertion-based; depending
  // on which constraint fires first that could vary subtly).
  let minIdx = Number.POSITIVE_INFINITY;
  for (const idx of knownSafe) if (idx < minIdx) minIdx = idx;
  return { row: (minIdx / cols) | 0, col: minIdx % cols };
}

function buildConstraints(state: GameState): Constraint[] {
  const { rows, cols } = state.layout;
  const constraints: Constraint[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = state.cells[r]![c]!;
      if (!cell.revealed || cell.mine || cell.adjacent === 0) continue;
      const unknowns = new Set<number>();
      let flaggedCount = 0;
      for (let k = 0; k < NEIGHBOR_OFFSETS.length; k++) {
        const [dr, dc] = NEIGHBOR_OFFSETS[k]!;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        const n = state.cells[nr]![nc]!;
        if (n.revealed) continue;
        if (n.flagged) {
          flaggedCount++;
        } else {
          unknowns.add(nr * cols + nc);
        }
      }
      if (unknowns.size > 0) {
        constraints.push({ cells: unknowns, mines: cell.adjacent - flaggedCount });
      }
    }
  }
  return constraints;
}

export function annotateMoves(
  layout: BoardLayout,
  actions: ReadonlyArray<Action>,
): MoveAnnotation[] {
  const annotations: MoveAnnotation[] = new Array(actions.length);
  let state = initialState(layout);
  for (let i = 0; i < actions.length; i++) {
    const safe = findSafeCell(state);
    annotations[i] =
      safe !== null
        ? { actionIndex: i, safeMoveAvailable: true, safeCell: safe }
        : { actionIndex: i, safeMoveAvailable: false };
    state = applyAction(state, actions[i]!).state;
  }
  return annotations;
}
