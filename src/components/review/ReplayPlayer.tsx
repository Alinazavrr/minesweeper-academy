"use client";

import { useCallback, useMemo, useState } from "react";
import {
  applyAction,
  initialState,
  type Action,
  type BoardLayout,
  type GameState,
  type MoveAnnotation,
} from "@minesweeper/engine";
import { Board, type BoardSize } from "@/components/game/Board";

/**
 * Layout shape we receive over the RSC boundary. `Set` doesn't survive JSON,
 * so the server hands us a number[] of mine indices and we rebuild the Set
 * client-side once.
 */
export type SerializedLayout = {
  rows: number;
  cols: number;
  mineCount: number;
  noGuess: boolean;
  seed: string;
  mines: number[];
  threeBV: number;
};

export type ReplayGameMeta = {
  id: string;
  difficulty: "beginner" | "intermediate" | "expert" | "custom";
  result: "win" | "loss" | "abandoned";
  timeMs: number;
  hintsUsed: number;
  flagsPlaced: number;
  flagsCorrect: number;
  mineCount: number;
  sourceMode: "quick_play" | "daily" | "arena" | "practice" | "lesson_practice";
  dailyDate: string | null;
  finishedAt: string;
};

type Props = {
  serializedLayout: SerializedLayout;
  actions: Action[];
  annotations: MoveAnnotation[];
  gameMeta: ReplayGameMeta;
};

const SIZE_MAP: Record<ReplayGameMeta["difficulty"], BoardSize> = {
  beginner: "beginner",
  intermediate: "intermediate",
  expert: "expert",
  custom: "intermediate",
};

const ACTION_LABEL: Record<Action["kind"], string> = {
  reveal: "Reveal",
  flag: "Flag",
  question: "Question",
  chord: "Chord",
};

function rebuildLayout(s: SerializedLayout): BoardLayout {
  return {
    rows: s.rows,
    cols: s.cols,
    mineCount: s.mineCount,
    noGuess: s.noGuess,
    seed: s.seed,
    mines: new Set(s.mines),
    threeBV: s.threeBV,
  };
}

/**
 * Identify the per-turn moments where the player guessed despite a logically
 * provable safe cell being available. These are the "this is where the game
 * could have gone differently" markers — surfaced by the highlight overlay
 * and the jump-to-mistake button.
 */
function buildMistakes(
  actions: ReadonlyArray<Action>,
  annotations: ReadonlyArray<MoveAnnotation>,
): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]!;
    const ann = annotations[i];
    if (!ann || a.kind !== "reveal" || !ann.safeMoveAvailable) continue;
    if (!ann.safeCell) continue;
    const isSafePick = ann.safeCell.row === a.row && ann.safeCell.col === a.col;
    if (!isSafePick) out.add(i);
  }
  return out;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function ReplayPlayer({
  serializedLayout,
  actions,
  annotations,
  gameMeta,
}: Props) {
  const layout = useMemo(() => rebuildLayout(serializedLayout), [serializedLayout]);
  const initial = useMemo(() => initialState(layout), [layout]);
  const mistakeIndices = useMemo(
    () => buildMistakes(actions, annotations),
    [actions, annotations],
  );

  const [cursor, setCursor] = useState(0);

  const currentState = useMemo<GameState>(() => {
    let state = initial;
    for (let i = 0; i < cursor; i++) {
      state = applyAction(state, actions[i]!).state;
    }
    return state;
  }, [actions, cursor, initial]);

  // Per spec §12 Mode 3, the highlight is the safe cell *the player about to
  // act* could have chosen. So we look at annotations[cursor] (the action
  // they're about to play). The hint cell + Cell.tsx ring overlay share
  // styling.
  const upcomingHint = useMemo<{ row: number; col: number } | null>(() => {
    if (cursor >= actions.length) return null;
    const ann = annotations[cursor];
    const next = actions[cursor]!;
    if (!ann?.safeMoveAvailable || !ann.safeCell) return null;
    if (next.kind !== "reveal") return null;
    if (ann.safeCell.row === next.row && ann.safeCell.col === next.col) {
      return null; // they're picking the safe cell — not a mistake
    }
    return ann.safeCell;
  }, [actions, annotations, cursor]);

  // The replay player is read-only — Board still requires the handlers.
  const noop = useCallback(() => {}, []);

  const jumpToNextMistake = useCallback(() => {
    for (let i = cursor; i < actions.length; i++) {
      if (mistakeIndices.has(i)) {
        setCursor(i);
        return;
      }
    }
  }, [actions.length, cursor, mistakeIndices]);

  const hasMistakeAhead = useMemo(() => {
    for (let i = cursor; i < actions.length; i++) {
      if (mistakeIndices.has(i)) return true;
    }
    return false;
  }, [actions.length, cursor, mistakeIndices]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        <ReviewHeader gameMeta={gameMeta} mistakeCount={mistakeIndices.size} />
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <Board
            size={SIZE_MAP[gameMeta.difficulty]}
            cells={currentState.cells}
            rows={layout.rows}
            cols={layout.cols}
            status={currentState.status}
            hint={upcomingHint}
            onReveal={noop}
            onFlag={noop}
            onChord={noop}
          />
        </div>
        <Scrubber
          cursor={cursor}
          total={actions.length}
          mistakeIndices={mistakeIndices}
          hasMistakeAhead={hasMistakeAhead}
          onSetCursor={setCursor}
          onJumpToNextMistake={jumpToNextMistake}
        />
      </div>
      <ActionLog
        actions={actions}
        annotations={annotations}
        mistakeIndices={mistakeIndices}
        cursor={cursor}
        onSelect={setCursor}
      />
    </div>
  );
}

function ReviewHeader({
  gameMeta,
  mistakeCount,
}: {
  gameMeta: ReplayGameMeta;
  mistakeCount: number;
}) {
  const won = gameMeta.result === "win";
  return (
    <section className="flex flex-col gap-1">
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
        Post-game review
      </p>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {gameMeta.sourceMode === "daily" && gameMeta.dailyDate
            ? `Daily · ${gameMeta.dailyDate}`
            : `${capitalize(gameMeta.difficulty)} · Quick Play`}
        </h1>
        <span
          className={
            won
              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              : "rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-200"
          }
        >
          {won ? "Win" : "Loss"}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <Stat label="Time" value={formatMs(gameMeta.timeMs)} />
        <Stat
          label="Flags"
          value={`${gameMeta.flagsCorrect}/${gameMeta.mineCount} correct`}
        />
        <Stat label="Hints" value={gameMeta.hintsUsed.toString()} />
        <Stat
          label="Missed safe moves"
          value={mistakeCount.toString()}
          tone={mistakeCount > 0 ? "warn" : "ok"}
        />
      </dl>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn" | "ok";
}) {
  const valueColor =
    tone === "warn"
      ? "text-amber-700 dark:text-amber-300"
      : tone === "ok"
        ? "text-emerald-700 dark:text-emerald-300"
        : "text-zinc-950 dark:text-zinc-50";
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </dt>
      <dd className={`mt-1 font-mono text-sm tabular-nums ${valueColor}`}>
        {value}
      </dd>
    </div>
  );
}

function Scrubber({
  cursor,
  total,
  mistakeIndices,
  hasMistakeAhead,
  onSetCursor,
  onJumpToNextMistake,
}: {
  cursor: number;
  total: number;
  mistakeIndices: Set<number>;
  hasMistakeAhead: boolean;
  onSetCursor: (n: number) => void;
  onJumpToNextMistake: () => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
        <span>
          Turn {cursor} / {total}
        </span>
        <span>
          {mistakeIndices.size} missed safe move
          {mistakeIndices.size === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ScrubButton onClick={() => onSetCursor(0)} disabled={cursor === 0}>
          ⏮
        </ScrubButton>
        <ScrubButton
          onClick={() => onSetCursor(Math.max(0, cursor - 1))}
          disabled={cursor === 0}
        >
          ◀
        </ScrubButton>
        <input
          type="range"
          min={0}
          max={total}
          step={1}
          value={cursor}
          onChange={(e) => onSetCursor(Number(e.target.value))}
          className="flex-1 accent-emerald-600"
          aria-label="Replay scrub position"
        />
        <ScrubButton
          onClick={() => onSetCursor(Math.min(total, cursor + 1))}
          disabled={cursor === total}
        >
          ▶
        </ScrubButton>
        <ScrubButton
          onClick={() => onSetCursor(total)}
          disabled={cursor === total}
        >
          ⏭
        </ScrubButton>
      </div>
      <button
        type="button"
        onClick={onJumpToNextMistake}
        disabled={!hasMistakeAhead}
        className="self-start rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/70"
      >
        Jump to next missed safe move
      </button>
    </section>
  );
}

function ScrubButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500"
    >
      {children}
    </button>
  );
}

function ActionLog({
  actions,
  annotations,
  mistakeIndices,
  cursor,
  onSelect,
}: {
  actions: Action[];
  annotations: MoveAnnotation[];
  mistakeIndices: Set<number>;
  cursor: number;
  onSelect: (n: number) => void;
}) {
  return (
    <aside className="max-h-[600px] overflow-y-auto rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-3 py-2 text-xs uppercase tracking-[0.16em] text-zinc-500 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        Move log
      </div>
      <ol className="divide-y divide-zinc-100 dark:divide-zinc-900">
        <li
          className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 ${
            cursor === 0
              ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
          }`}
          onClick={() => onSelect(0)}
        >
          <span className="w-8 text-right font-mono text-[10px]">—</span>
          <span>Initial board</span>
        </li>
        {actions.map((a, i) => {
          const ann = annotations[i];
          const mistake = mistakeIndices.has(i);
          const isCurrent = cursor === i + 1;
          return (
            <li
              key={i}
              onClick={() => onSelect(i + 1)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 ${
                isCurrent
                  ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                  : mistake
                    ? "bg-amber-50/60 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
                    : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              <span className="w-8 text-right font-mono text-[10px] tabular-nums opacity-70">
                {i + 1}
              </span>
              <span className="font-medium">{ACTION_LABEL[a.kind]}</span>
              <span className="font-mono text-xs tabular-nums opacity-80">
                ({a.row},{a.col})
              </span>
              <span className="ml-auto font-mono text-[10px] tabular-nums opacity-60">
                {formatMs(a.t)}
              </span>
              {mistake && ann?.safeCell ? (
                <span className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                  safe at ({ann.safeCell.row},{ann.safeCell.col})
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}
