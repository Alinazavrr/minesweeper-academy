import type { Action, Cell, GameEvent, GameState } from "./types";

/**
 * Pure state-transition function. Each call returns a fresh `state` plus the
 * list of `events` the action produced. Input state is never mutated.
 *
 * Terminal states (won / lost) absorb further actions: re-entry returns the
 * same state by reference and an empty event list.
 */
export function applyAction(
  state: GameState,
  action: Action,
): { state: GameState; events: GameEvent[] } {
  if (state.status === "won" || state.status === "lost") {
    return { state, events: [] };
  }
  switch (action.kind) {
    case "reveal":
      return revealAction(state, action);
    case "flag":
    case "question":
    case "chord":
      // Implemented in the next commit. Returning the input state for now
      // means a stray call doesn't crash, but its absence is visible.
      return { state, events: [] };
  }
}

function revealAction(
  state: GameState,
  action: Extract<Action, { kind: "reveal" }>,
): { state: GameState; events: GameEvent[] } {
  const { layout } = state;
  const { row, col, t } = action;
  if (!inBounds(layout.rows, layout.cols, row, col)) {
    throw new Error(`reveal: (${row}, ${col}) out of bounds for ${layout.rows}x${layout.cols}`);
  }

  const cellNow = state.cells[row]![col]!;
  if (cellNow.revealed || cellNow.flagged) {
    return { state, events: [] };
  }

  const cells = cloneCells(state.cells);
  const events: GameEvent[] = [];
  const startedAt = state.startedAt ?? t;

  // Hit a mine — terminal.
  if (cellNow.mine) {
    cells[row]![col]!.revealed = true;
    events.push({ kind: "revealed", row, col, adjacent: 0, flooded: false });
    events.push({ kind: "lost", t, mineRow: row, mineCol: col });
    return {
      state: {
        ...state,
        cells,
        status: "lost",
        startedAt,
        finishedAt: t,
        revealsCount: state.revealsCount + 1,
      },
      events,
    };
  }

  // Otherwise: flood-fill from the seed cell. Cascade continues through
  // 0-cells; numeric cells are revealed but do not propagate further.
  const queue: Array<[number, number]> = [[row, col]];
  const seedIdx = row * layout.cols + col;
  const visited = new Set<number>([seedIdx]);
  let revealed = 0;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const target = cells[r]![c]!;
    target.revealed = true;
    revealed++;
    const flooded = !(r === row && c === col);
    events.push({
      kind: "revealed",
      row: r,
      col: c,
      adjacent: target.adjacent,
      flooded,
    });

    if (target.adjacent !== 0) continue;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(layout.rows, layout.cols, nr, nc)) continue;
        const nIdx = nr * layout.cols + nc;
        if (visited.has(nIdx)) continue;
        const neighbor = cells[nr]![nc]!;
        if (neighbor.revealed || neighbor.flagged || neighbor.mine) continue;
        visited.add(nIdx);
        queue.push([nr, nc]);
      }
    }
  }

  const newRevealsCount = state.revealsCount + revealed;
  const nonMineTotal = layout.rows * layout.cols - layout.mineCount;
  const won = newRevealsCount >= nonMineTotal;
  if (won) {
    events.push({ kind: "won", t });
  }

  return {
    state: {
      ...state,
      cells,
      status: won ? "won" : "playing",
      startedAt,
      finishedAt: won ? t : null,
      revealsCount: newRevealsCount,
    },
    events,
  };
}

function inBounds(rows: number, cols: number, r: number, c: number): boolean {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

function cloneCells(cells: ReadonlyArray<ReadonlyArray<Cell>>): Cell[][] {
  const out: Cell[][] = new Array(cells.length);
  for (let r = 0; r < cells.length; r++) {
    const row = cells[r]!;
    const cloned = new Array<Cell>(row.length);
    for (let c = 0; c < row.length; c++) {
      cloned[c] = { ...row[c]! };
    }
    out[r] = cloned;
  }
  return out;
}
