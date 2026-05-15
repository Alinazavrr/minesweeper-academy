"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/stores/game";

function Timer({
  startedAt,
  finishedAt,
}: {
  startedAt: number | null;
  finishedAt: number | null;
}) {
  // Initial render shows 0. The effect below updates via setInterval /
  // setTimeout — never synchronously in the effect body — so the React 19
  // `set-state-in-effect` rule stays happy.
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (startedAt === null) return;
    if (finishedAt !== null) {
      const final = Math.min(
        999,
        Math.max(0, Math.floor((finishedAt - startedAt) / 1000)),
      );
      const id = setTimeout(() => setSeconds(final), 0);
      return () => clearTimeout(id);
    }
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(Math.min(999, Math.max(0, elapsed)));
    }, 250);
    return () => clearInterval(id);
  }, [startedAt, finishedAt]);

  return (
    <div
      aria-label={`Elapsed seconds: ${seconds}`}
      className="font-mono text-2xl tabular-nums text-red-600 bg-black px-2 py-1 rounded min-w-[3.5rem] text-center"
    >
      {seconds.toString().padStart(3, "0")}
    </div>
  );
}

function MineCounter() {
  const mineCount = useGameStore((s) => s.layout.mineCount);
  const flagsPlaced = useGameStore((s) => s.state.flagsPlaced);
  const remaining = Math.max(0, mineCount - flagsPlaced);
  return (
    <div
      aria-label={`Mines remaining: ${remaining}`}
      className="font-mono text-2xl tabular-nums text-red-600 bg-black px-2 py-1 rounded min-w-[3.5rem] text-center"
    >
      {remaining.toString().padStart(3, "0")}
    </div>
  );
}

function ResetButton() {
  const status = useGameStore((s) => s.state.status);
  const newGame = useGameStore((s) => s.newGame);
  const face = status === "won" ? "😎" : status === "lost" ? "😵" : "🙂";
  return (
    <button
      type="button"
      aria-label="New game"
      onClick={() => newGame()}
      className="text-3xl hover:scale-110 active:scale-95 transition-transform"
    >
      {face}
    </button>
  );
}

export function Hud() {
  const startedAt = useGameStore((s) => s.state.startedAt);
  const finishedAt = useGameStore((s) => s.state.finishedAt);
  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-2">
      <MineCounter />
      <ResetButton />
      {/* key remounts the timer on new game so the displayed count resets. */}
      <Timer
        key={startedAt ?? "idle"}
        startedAt={startedAt}
        finishedAt={finishedAt}
      />
    </div>
  );
}
