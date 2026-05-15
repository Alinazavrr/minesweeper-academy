"use client";

import { useEffect, useRef, useState } from "react";

type Racer = {
  id: string;
  name: string;
  flag: string;
  rating: number;
  isBot: boolean;
  isYou?: boolean;
  /** Boards-per-second tick magnitude in arbitrary score units. */
  speed: number;
  /** Variability so bars don't move in lockstep. */
  jitter: number;
  /** Tailwind text color for the row's accent. */
  accent: string;
};

const RACERS: ReadonlyArray<Racer> = [
  {
    id: "you",
    name: "You",
    flag: "🟢",
    rating: 1450,
    isBot: false,
    isYou: true,
    speed: 1850,
    jitter: 700,
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "p2",
    name: "GridGoblin",
    flag: "🇩🇪",
    rating: 1612,
    isBot: false,
    speed: 2050,
    jitter: 900,
    accent: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "p3",
    name: "Bot — Replay-2024-03-12",
    flag: "🤖",
    rating: 1500,
    isBot: true,
    speed: 1700,
    jitter: 350,
    accent: "text-zinc-600 dark:text-zinc-400",
  },
  {
    id: "p4",
    name: "snorlax42",
    flag: "🇯🇵",
    rating: 1388,
    isBot: false,
    speed: 1500,
    jitter: 1100,
    accent: "text-violet-600 dark:text-violet-400",
  },
];

const MATCH_SECONDS = 60; // Bullet
const TICK_MS = 200;

function formatScore(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toFixed(0);
}

function formatClock(remaining: number): string {
  const s = Math.max(0, Math.floor(remaining));
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function ScoreRaceMock() {
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(RACERS.map((r) => [r.id, 0])),
  );
  const [secondsRemaining, setSecondsRemaining] = useState(MATCH_SECONDS);
  const [running, setRunning] = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setScores((prev) => {
        const next = { ...prev };
        for (const racer of RACERS) {
          // Each racer wins boards at probability tied to speed; on a "win"
          // tick, bump their score by a chunk weighted by jitter. Otherwise
          // a small drip so bars never look frozen.
          const winRoll = Math.random();
          const winChance = racer.speed / 12000; // ~per-tick win probability
          if (winRoll < winChance) {
            const chunk = 1000 + Math.random() * (racer.jitter + 1500);
            next[racer.id] = (next[racer.id] ?? 0) + chunk;
          } else {
            next[racer.id] = (next[racer.id] ?? 0) + Math.random() * 25;
          }
        }
        return next;
      });
      setSecondsRemaining((s) => {
        if (s <= 0) {
          if (tickRef.current) clearInterval(tickRef.current);
          setRunning(false);
          return 0;
        }
        return s - TICK_MS / 1000;
      });
    }, TICK_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running]);

  const restart = () => {
    setScores(Object.fromEntries(RACERS.map((r) => [r.id, 0])));
    setSecondsRemaining(MATCH_SECONDS);
    setRunning(true);
  };

  const max = Math.max(1, ...Object.values(scores));
  const sorted = [...RACERS].sort(
    (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0),
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
            Phase 2 preview · not live
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Live score race
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 font-mono text-lg font-semibold tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
            {formatClock(secondsRemaining)}
          </div>
          <button
            type="button"
            onClick={restart}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            {running ? "Restart" : "Replay"}
          </button>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {sorted.map((racer, i) => {
          const score = scores[racer.id] ?? 0;
          const pct = (score / max) * 100;
          return (
            <li
              key={racer.id}
              className={
                racer.isYou
                  ? "rounded-md border border-emerald-300 bg-emerald-50/60 p-3 dark:border-emerald-800 dark:bg-emerald-950/20"
                  : "rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-zinc-500 w-5">
                    #{i + 1}
                  </span>
                  <span aria-hidden="true">{racer.flag}</span>
                  <span
                    className={`truncate text-sm font-semibold ${racer.accent}`}
                  >
                    {racer.name}
                    {racer.isYou ? " (you)" : ""}
                  </span>
                  {racer.isBot ? (
                    <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      bot
                    </span>
                  ) : null}
                  <span className="text-[10px] text-zinc-500">
                    · {racer.rating}
                  </span>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatScore(score)}
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                <div
                  className={
                    racer.isYou
                      ? "h-full rounded-full bg-emerald-500 transition-[width] duration-200 ease-out"
                      : racer.isBot
                        ? "h-full rounded-full bg-zinc-400 transition-[width] duration-200 ease-out dark:bg-zinc-600"
                        : "h-full rounded-full bg-sky-500 transition-[width] duration-200 ease-out"
                  }
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs leading-5 text-zinc-500">
        Mock data. In the real match, each bar advances when that player
        finishes a board — Beginner ≈ 1,000, Intermediate ≈ 3,500, Expert ≈
        10,000 points. Bot fills broadcast on the same channel so racing a bot
        looks identical to racing a human.
      </p>
    </div>
  );
}
