"use client";

import {
  applyAction,
  findSafeCell,
  generateBoard,
  initialState,
  type Action,
  type BoardLayout,
  type GameState,
} from "@minesweeper/engine";
import { create } from "zustand";
import { saveQuickPlayGame, type SaveGameResult } from "@/app/play/actions";
import { buildSaveGamePayload } from "@/lib/games/stats";

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

export type SaveUiStatus =
  | { kind: "pending" }
  | { kind: "saved"; minesAwarded: number }
  | { kind: "unauthenticated" }
  | { kind: "error"; message: string };

export type SaveStatus = {
  /** The layout.seed of the game this save belongs to. Used to scope the
   * status to a single game so a stale save doesn't bleed into the next one. */
  seed: string;
  ui: SaveUiStatus;
};

type Store = {
  difficulty: Difficulty;
  layout: BoardLayout;
  state: GameState;
  hint: { row: number; col: number } | null;
  hintsUsed: number;
  /** Recorded for replay; only successful state-changing actions get appended. */
  actionLog: Action[];
  saveStatus: SaveStatus | null;
  /** ID of the game's row in public.games, populated after save. Lets the
   *  post-game banner link straight to the review page. */
  savedGameId: string | null;
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

function uiFromResult(result: SaveGameResult): SaveUiStatus {
  switch (result.status) {
    case "saved":
      return { kind: "saved", minesAwarded: result.minesAwarded };
    case "unauthenticated":
      return { kind: "unauthenticated" };
    case "invalid":
    case "error":
      return { kind: "error", message: result.message };
  }
}

/**
 * Append an Action to the running log only if `applyAction` produced a change.
 * The engine returns the same state by reference for no-ops (already revealed,
 * flag-on-revealed, etc.) — we use that signal to keep the log lean.
 */
function appendIfChanged(
  log: Action[],
  prev: GameState,
  next: GameState,
  action: Action,
): Action[] {
  if (prev === next) return log;
  return [...log, action];
}

export const useGameStore = create<Store>((set, get) => {
  /**
   * Fires once per (seed, terminal status) pair. Running inside store actions
   * — not a React effect — means strict-mode double-mounts can't cause double
   * inserts. The seed guard also rejects the rare case where two engine state
   * updates back-to-back both transition to terminal (can't happen with the
   * current engine, but the guard is cheap).
   */
  function maybePersistFinish(prevState: GameState) {
    const next = get();
    const wasTerminal =
      prevState.status === "won" || prevState.status === "lost";
    const isTerminal =
      next.state.status === "won" || next.state.status === "lost";
    if (wasTerminal || !isTerminal) return;
    if (next.saveStatus?.seed === next.layout.seed) return;

    const seed = next.layout.seed;
    const payload = buildSaveGamePayload({
      difficulty: next.difficulty,
      layout: next.layout,
      state: next.state,
      hintsUsed: next.hintsUsed,
      actionLog: next.actionLog,
    });
    set({ saveStatus: { seed, ui: { kind: "pending" } }, savedGameId: null });
    saveQuickPlayGame(payload)
      .then((result) => {
        if (get().layout.seed !== seed) return;
        set({
          saveStatus: { seed, ui: uiFromResult(result) },
          savedGameId: result.status === "saved" ? result.gameId : null,
        });
      })
      .catch((err: unknown) => {
        if (get().layout.seed !== seed) return;
        const message = err instanceof Error ? err.message : "Save failed";
        set({ saveStatus: { seed, ui: { kind: "error", message } } });
      });
  }

  return {
    difficulty: "beginner",
    ...fresh("beginner"),
    hint: null,
    hintsUsed: 0,
    actionLog: [],
    saveStatus: null,
    savedGameId: null,

    newGame: (d) => {
      const difficulty = d ?? get().difficulty;
      set({
        difficulty,
        ...fresh(difficulty),
        hint: null,
        hintsUsed: 0,
        actionLog: [],
        saveStatus: null,
        savedGameId: null,
      });
    },

    reveal: (row, col) => {
      const { state, difficulty, layout, actionLog } = get();
      const t = Date.now();
      if (state.status === "idle") {
        // First-click safety: regenerate the layout with this cell forbidden
        // from being a mine, then apply the reveal in one atomic step. The
        // seed is preserved so the game stays reproducible.
        const fc = fresh(difficulty, { row, col }, layout.seed);
        const action: Action = { kind: "reveal", row, col, t };
        const { state: next } = applyAction(fc.state, action);
        set({
          layout: fc.layout,
          state: next,
          hint: null,
          actionLog: [action],
        });
        maybePersistFinish(state);
        return;
      }
      const action: Action = { kind: "reveal", row, col, t };
      const { state: next } = applyAction(state, action);
      set({
        state: next,
        hint: null,
        actionLog: appendIfChanged(actionLog, state, next, action),
      });
      maybePersistFinish(state);
    },

    flag: (row, col) => {
      const { state: prev, actionLog } = get();
      const action: Action = { kind: "flag", row, col, t: Date.now() };
      const { state: next } = applyAction(prev, action);
      set({
        state: next,
        hint: null,
        actionLog: appendIfChanged(actionLog, prev, next, action),
      });
      maybePersistFinish(prev);
    },

    question: (row, col) => {
      const { state: prev, actionLog } = get();
      const action: Action = { kind: "question", row, col, t: Date.now() };
      const { state: next } = applyAction(prev, action);
      set({
        state: next,
        hint: null,
        actionLog: appendIfChanged(actionLog, prev, next, action),
      });
      maybePersistFinish(prev);
    },

    chord: (row, col) => {
      const { state: prev, actionLog } = get();
      const action: Action = { kind: "chord", row, col, t: Date.now() };
      const { state: next } = applyAction(prev, action);
      set({
        state: next,
        hint: null,
        actionLog: appendIfChanged(actionLog, prev, next, action),
      });
      maybePersistFinish(prev);
    },

    showHint: () => {
      const next = findSafeCell(get().state);
      set((s) => ({
        hint: next,
        hintsUsed: next !== null ? s.hintsUsed + 1 : s.hintsUsed,
      }));
    },

    clearHint: () => set({ hint: null }),
  };
});
