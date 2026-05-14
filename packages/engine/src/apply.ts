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
      return flagAction(state, action);
    case "question":
      return questionAction(state, action);
    case "chord":
      return chordAction(state, action);
  }
}

function revealAction(
  state: GameState,
  action: Extract<Action, { kind: "reveal" }>,
): { state: GameState; events: GameEvent[] } {
  const { layout } = state;
  const { row, col, t } = action;
  assertInBounds(layout.rows, layout.cols, row, col, "reveal");

  const cellNow = state.cells[row]![col]!;
  if (cellNow.revealed || cellNow.flagged) {
    return { state, events: [] };
  }

  const cells = cloneCells(state.cells);
  const events: GameEvent[] = [];
  const startedAt = state.startedAt ?? t;

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

  const revealed = floodReveal(layout.rows, layout.cols, cells, row, col, events);
  return finalizeReveal(state, cells, events, revealed, startedAt, t);
}

function flagAction(
  state: GameState,
  action: Extract<Action, { kind: "flag" }>,
): { state: GameState; events: GameEvent[] } {
  const { layout } = state;
  const { row, col, t } = action;
  assertInBounds(layout.rows, layout.cols, row, col, "flag");

  const cellNow = state.cells[row]![col]!;
  if (cellNow.revealed) {
    return { state, events: [] };
  }

  const cells = cloneCells(state.cells);
  const target = cells[row]![col]!;
  const willBeFlagged = !target.flagged;
  const wasQuestioned = target.questioned;

  target.flagged = willBeFlagged;
  if (willBeFlagged) target.questioned = false;

  // flagsPlaced tracks only true flags.
  const flagsDelta = willBeFlagged ? 1 : -1;
  const events: GameEvent[] = [
    { kind: "flagged", row, col, on: willBeFlagged },
  ];
  if (wasQuestioned && willBeFlagged) {
    events.push({ kind: "questioned", row, col, on: false });
  }

  return {
    state: {
      ...state,
      cells,
      startedAt: state.startedAt ?? t,
      flagsPlaced: state.flagsPlaced + flagsDelta,
    },
    events,
  };
}

function questionAction(
  state: GameState,
  action: Extract<Action, { kind: "question" }>,
): { state: GameState; events: GameEvent[] } {
  const { layout } = state;
  const { row, col, t } = action;
  assertInBounds(layout.rows, layout.cols, row, col, "question");

  const cellNow = state.cells[row]![col]!;
  if (cellNow.revealed) {
    return { state, events: [] };
  }

  const cells = cloneCells(state.cells);
  const target = cells[row]![col]!;
  const willBeQuestioned = !target.questioned;
  const wasFlagged = target.flagged;

  target.questioned = willBeQuestioned;
  if (willBeQuestioned) target.flagged = false;

  const flagsDelta = wasFlagged && willBeQuestioned ? -1 : 0;
  const events: GameEvent[] = [
    { kind: "questioned", row, col, on: willBeQuestioned },
  ];
  if (wasFlagged && willBeQuestioned) {
    events.push({ kind: "flagged", row, col, on: false });
  }

  return {
    state: {
      ...state,
      cells,
      startedAt: state.startedAt ?? t,
      flagsPlaced: state.flagsPlaced + flagsDelta,
    },
    events,
  };
}

function chordAction(
  state: GameState,
  action: Extract<Action, { kind: "chord" }>,
): { state: GameState; events: GameEvent[] } {
  const { layout } = state;
  const { row, col, t } = action;
  assertInBounds(layout.rows, layout.cols, row, col, "chord");

  const cellNow = state.cells[row]![col]!;
  // Chord requires a revealed, numeric cell.
  if (!cellNow.revealed || cellNow.adjacent === 0 || cellNow.mine) {
    return { state, events: [] };
  }

  // Count flags in the 8-neighborhood.
  let flagCount = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (!inBounds(layout.rows, layout.cols, nr, nc)) continue;
      if (state.cells[nr]![nc]!.flagged) flagCount++;
    }
  }
  if (flagCount !== cellNow.adjacent) {
    return { state, events: [] };
  }

  // Fire: reveal each unflagged neighbor. A mine reveal = loss; else flood
  // through 0-cell neighbors.
  const cells = cloneCells(state.cells);
  const events: GameEvent[] = [];
  const startedAt = state.startedAt ?? t;
  let revealed = 0;
  let hitMine: { row: number; col: number } | null = null;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (!inBounds(layout.rows, layout.cols, nr, nc)) continue;
      const neighbor = cells[nr]![nc]!;
      if (neighbor.revealed || neighbor.flagged) continue;
      if (neighbor.mine) {
        neighbor.revealed = true;
        events.push({
          kind: "revealed",
          row: nr,
          col: nc,
          adjacent: 0,
          flooded: false,
        });
        revealed++;
        hitMine = { row: nr, col: nc };
        break;
      }
      revealed += floodReveal(
        layout.rows,
        layout.cols,
        cells,
        nr,
        nc,
        events,
      );
    }
    if (hitMine) break;
  }

  if (hitMine) {
    events.push({
      kind: "lost",
      t,
      mineRow: hitMine.row,
      mineCol: hitMine.col,
    });
    return {
      state: {
        ...state,
        cells,
        status: "lost",
        startedAt,
        finishedAt: t,
        revealsCount: state.revealsCount + revealed,
      },
      events,
    };
  }

  return finalizeReveal(state, cells, events, revealed, startedAt, t);
}

/**
 * BFS flood-fill starting at (row, col). The seed cell must already pass the
 * "can be revealed" check (not a mine, not flagged, not revealed). Returns
 * the number of cells newly revealed and appends events.
 */
function floodReveal(
  rows: number,
  cols: number,
  cells: Cell[][],
  row: number,
  col: number,
  events: GameEvent[],
): number {
  const queue: Array<[number, number]> = [[row, col]];
  const seedIdx = row * cols + col;
  const visited = new Set<number>([seedIdx]);
  let count = 0;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const target = cells[r]![c]!;
    if (target.revealed) continue;
    target.revealed = true;
    count++;
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
        if (!inBounds(rows, cols, nr, nc)) continue;
        const nIdx = nr * cols + nc;
        if (visited.has(nIdx)) continue;
        const neighbor = cells[nr]![nc]!;
        if (neighbor.revealed || neighbor.flagged || neighbor.mine) continue;
        visited.add(nIdx);
        queue.push([nr, nc]);
      }
    }
  }

  return count;
}

/**
 * Wrap up a reveal/chord action: update counters, check win condition,
 * stamp finishedAt if won.
 */
function finalizeReveal(
  state: GameState,
  cells: Cell[][],
  events: GameEvent[],
  revealed: number,
  startedAt: number,
  t: number,
): { state: GameState; events: GameEvent[] } {
  const { layout } = state;
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

function assertInBounds(
  rows: number,
  cols: number,
  r: number,
  c: number,
  op: string,
): void {
  if (!inBounds(rows, cols, r, c)) {
    throw new Error(`${op}: (${r}, ${c}) out of bounds for ${rows}x${cols}`);
  }
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
