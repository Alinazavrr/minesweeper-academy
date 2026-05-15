"use client";

import { useCallback, useMemo, useReducer } from "react";
import {
  applyAction,
  initialState,
  layoutFromMines,
  type Action,
  type GameState,
} from "@minesweeper/engine";
import { Board, type BoardSize } from "@/components/game/Board";
import type { PracticeBoard } from "@/lib/lessons/types";
import { cn } from "@/lib/cn";

type Props = {
  practice: PracticeBoard;
  /** Cell pixel size — defaults to 'beginner' size (36px). */
  size?: BoardSize;
  lessonSlug: string;
};

type State = {
  game: GameState;
};

type Reducer =
  | { kind: "reveal"; row: number; col: number }
  | { kind: "flag"; row: number; col: number }
  | { kind: "chord"; row: number; col: number }
  | { kind: "reset"; baseline: GameState };

function reducer(state: State, action: Reducer): State {
  switch (action.kind) {
    case "reveal":
    case "flag":
    case "chord": {
      const eng = applyAction(state.game, {
        kind: action.kind,
        row: action.row,
        col: action.col,
        t: 0,
      } as Action);
      return { game: eng.state };
    }
    case "reset":
      return { game: action.baseline };
  }
}

function buildBaseline(practice: PracticeBoard, slug: string): GameState {
  const layout = layoutFromMines({
    rows: practice.rows,
    cols: practice.cols,
    mines: practice.mines,
    seed: `lesson:${slug}`,
  });
  let state = initialState(layout);
  // Apply the prereveal/preflag prelude. Internally these go through
  // applyAction so flood-fill, win checks, etc. all stay consistent.
  for (const idx of practice.prerevealed) {
    const r = Math.floor(idx / practice.cols);
    const c = idx % practice.cols;
    state = applyAction(state, { kind: "reveal", row: r, col: c, t: 0 }).state;
  }
  for (const idx of practice.preflagged ?? []) {
    const r = Math.floor(idx / practice.cols);
    const c = idx % practice.cols;
    state = applyAction(state, { kind: "flag", row: r, col: c, t: 0 }).state;
  }
  return state;
}

export function PracticeRunner({ practice, size = "beginner", lessonSlug }: Props) {
  const baseline = useMemo(
    () => buildBaseline(practice, lessonSlug),
    [practice, lessonSlug],
  );
  const [state, dispatch] = useReducer(reducer, { game: baseline });

  const onReveal = useCallback(
    (row: number, col: number) => dispatch({ kind: "reveal", row, col }),
    [],
  );
  const onFlag = useCallback(
    (row: number, col: number) => dispatch({ kind: "flag", row, col }),
    [],
  );
  const onChord = useCallback(
    (row: number, col: number) => dispatch({ kind: "chord", row, col }),
    [],
  );
  const onReset = useCallback(
    () => dispatch({ kind: "reset", baseline }),
    [baseline],
  );

  const status = state.game.status;
  const won = status === "won";
  const lost = status === "lost";

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
        Practice
      </p>
      <p className="text-center text-sm text-zinc-700 dark:text-zinc-300">
        {practice.prompt}
      </p>
      <div className="overflow-x-auto max-w-[calc(100vw-3rem)]">
        <Board
          size={size}
          cells={state.game.cells}
          rows={state.game.layout.rows}
          cols={state.game.layout.cols}
          status={status}
          hint={null}
          onReveal={onReveal}
          onFlag={onFlag}
          onChord={onChord}
        />
      </div>
      <div
        className={cn(
          "min-h-[2rem] text-center text-sm font-medium",
          won
            ? "text-emerald-700 dark:text-emerald-300"
            : lost
              ? "text-red-700 dark:text-red-300"
              : "text-zinc-500",
        )}
      >
        {won
          ? "Solved — pattern internalised."
          : lost
            ? "That cell was a mine. Reset and try the deduction again."
            : "Left-click to reveal, right-click to flag, click a number to chord."}
      </div>
      <button
        type="button"
        onClick={onReset}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
      >
        Reset board
      </button>
    </div>
  );
}
