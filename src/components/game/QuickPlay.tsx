"use client";

import { useGameStore, type Difficulty } from "@/stores/game";
import { cn } from "@/lib/cn";
import { Board } from "./Board";
import { Hud } from "./Hud";

const DIFFICULTIES: ReadonlyArray<{ key: Difficulty; label: string; meta: string }> = [
  { key: "beginner", label: "Beginner", meta: "9 × 9 · 10 mines" },
  { key: "intermediate", label: "Intermediate", meta: "16 × 16 · 40 mines" },
  { key: "expert", label: "Expert", meta: "30 × 16 · 99 mines" },
];

function DifficultySelector() {
  const difficulty = useGameStore((s) => s.difficulty);
  const newGame = useGameStore((s) => s.newGame);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {DIFFICULTIES.map((d) => (
        <button
          key={d.key}
          type="button"
          onClick={() => newGame(d.key)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm transition-colors",
            difficulty === d.key
              ? "border-emerald-600 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200"
              : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500",
          )}
          aria-pressed={difficulty === d.key}
        >
          <span className="block font-semibold">{d.label}</span>
          <span className="block text-[10px] uppercase tracking-wider opacity-70">
            {d.meta}
          </span>
        </button>
      ))}
    </div>
  );
}

function HintBar() {
  const status = useGameStore((s) => s.state.status);
  const hint = useGameStore((s) => s.hint);
  const showHint = useGameStore((s) => s.showHint);
  const clearHint = useGameStore((s) => s.clearHint);
  const disabled = status === "won" || status === "lost";
  return (
    <div className="flex items-center justify-center gap-3 text-sm">
      <button
        type="button"
        onClick={showHint}
        disabled={disabled}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      >
        Hint
      </button>
      {hint !== null ? (
        <span className="text-emerald-700 dark:text-emerald-300">
          Try row {hint.row + 1}, col {hint.col + 1}
          <button
            type="button"
            onClick={clearHint}
            className="ml-2 text-xs underline opacity-70 hover:opacity-100"
          >
            dismiss
          </button>
        </span>
      ) : (
        <span className="text-zinc-500 dark:text-zinc-400">
          Get a provably-safe move
        </span>
      )}
    </div>
  );
}

function GameOverBanner() {
  const status = useGameStore((s) => s.state.status);
  const newGame = useGameStore((s) => s.newGame);
  if (status !== "won" && status !== "lost") return null;
  const won = status === "won";
  return (
    <div
      role="status"
      className={cn(
        "rounded-md border p-4 text-center",
        won
          ? "border-emerald-600 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200"
          : "border-red-600 bg-red-100 text-red-900 dark:border-red-500 dark:bg-red-950 dark:text-red-200",
      )}
    >
      <div className="text-lg font-semibold">
        {won ? "You won!" : "Game over"}
      </div>
      <button
        type="button"
        onClick={() => newGame()}
        className="mt-1 text-sm underline opacity-80 hover:opacity-100"
      >
        Play again
      </button>
    </div>
  );
}

export function QuickPlay() {
  return (
    <div className="mx-auto flex w-fit max-w-full flex-col items-center gap-4">
      <DifficultySelector />
      <Hud />
      <div className="overflow-x-auto max-w-[calc(100vw-2rem)]">
        <Board />
      </div>
      <HintBar />
      <GameOverBanner />
      <p className="max-w-md text-center text-xs text-zinc-500 dark:text-zinc-400">
        Left-click to reveal. Right-click to flag. Click a revealed number to chord
        (reveal its remaining neighbors when its flags match).
      </p>
    </div>
  );
}
