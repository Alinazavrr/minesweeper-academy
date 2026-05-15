"use client";

import {
  applyAction,
  findSafeCell,
  generateBoard,
  initialState,
  type BoardLayout,
  type GameState,
} from "@minesweeper/engine";
import { create } from "zustand";

export type Difficulty = "beginner" | "intermediate" | "expert";

export type DifficultyConfig = {
  rows: number;
  cols: number;
  mineCount: number;
};

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  beginner: { rows: 9, cols: 9, mineCount: 10 },
  intermediate: { rows: 16, cols: 16, mineCount: 40 },
  expert: { rows: 16, cols: 30, mineCount: 99 },
};

type Store = {
  difficulty: Difficulty;
  layout: BoardLayout;
  state: GameState;
  hint: { row: number; col: number } | null;
  hintsUsed: number;
  newGame: (difficulty?: Difficulty) => void;
  reveal: (row: number, col: number) => void;
  flag: (row: number, col: number) => void;
  question: (row: number, col: number) => void;
  chord: (row: number, col: number) => void;
  showHint: () => void;
  clearHint: () => void;
};

function randomSeed(): string {
  // 64 bits of entropy is more than enough for casual play. Daily Challenge
  // will pass a deterministic date-based seed instead.
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function fresh(
  difficulty: Difficulty,
  firstClick?: { row: number; col: number },
  seed?: string,
): { layout: BoardLayout; state: GameState } {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const layout = generateBoard({
    rows: cfg.rows,
    cols: cfg.cols,
    mineCount: cfg.mineCount,
    noGuess: false,
    seed: seed ?? randomSeed(),
    firstClick,
  });
  return { layout, state: initialState(layout) };
}

export const useGameStore = create<Store>((set, get) => ({
  difficulty: "beginner",
  ...fresh("beginner"),
  hint: null,
  hintsUsed: 0,

  newGame: (d) => {
    const difficulty = d ?? get().difficulty;
    set({ difficulty, ...fresh(difficulty), hint: null, hintsUsed: 0 });
  },

  reveal: (row, col) => {
    const { state, difficulty, layout } = get();
    if (state.status === "idle") {
      // First-click safety: regenerate the layout with this cell forbidden
      // from being a mine, then apply the reveal in one atomic step. The
      // seed is preserved so the game stays reproducible.
      const fc = fresh(difficulty, { row, col }, layout.seed);
      const { state: next } = applyAction(fc.state, {
        kind: "reveal",
        row,
        col,
        t: Date.now(),
      });
      set({ layout: fc.layout, state: next, hint: null });
      return;
    }
    const { state: next } = applyAction(state, {
      kind: "reveal",
      row,
      col,
      t: Date.now(),
    });
    set({ state: next, hint: null });
  },

  flag: (row, col) => {
    const { state: next } = applyAction(get().state, {
      kind: "flag",
      row,
      col,
      t: Date.now(),
    });
    set({ state: next, hint: null });
  },

  question: (row, col) => {
    const { state: next } = applyAction(get().state, {
      kind: "question",
      row,
      col,
      t: Date.now(),
    });
    set({ state: next, hint: null });
  },

  chord: (row, col) => {
    const { state: next } = applyAction(get().state, {
      kind: "chord",
      row,
      col,
      t: Date.now(),
    });
    set({ state: next, hint: null });
  },

  showHint: () => {
    const next = findSafeCell(get().state);
    set((s) => ({
      hint: next,
      hintsUsed: next !== null ? s.hintsUsed + 1 : s.hintsUsed,
    }));
  },

  clearHint: () => set({ hint: null }),
}));
