"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  ENGINE_VERSION,
  applyAction,
  findSafeCell,
  generateBoard,
  initialState,
  type Action,
  type BoardLayout,
  type GameState,
} from "@minesweeper/engine";
import { submitDailyResult, type SubmitDailyResult } from "@/app/daily/actions";
import { Board, type BoardSize } from "@/components/game/Board";
import type {
  DailyChallenge,
  DailyLeaderboardEntry,
  MyDailyResult,
} from "@/lib/db/daily";
import { tryEncodeReplay } from "@/lib/games/stats";
import { ShareButton } from "@/components/daily/ShareButton";
import { track } from "@/lib/analytics/track";

type Props = {
  challenge: DailyChallenge;
  myResult: MyDailyResult | null;
  leaderboard: DailyLeaderboardEntry[];
  signedIn: boolean;
  myDisplayName: string | null;
  myRank: number | null;
};

const SIZE_MAP: Record<DailyChallenge["difficulty"], BoardSize> = {
  beginner: "beginner",
  intermediate: "intermediate",
  expert: "expert",
  // 'custom' is in the enum but we don't generate custom daily challenges.
  custom: "intermediate",
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

// ────────────────────────────────────────────────────────────────────────────
// Engine state (local, no Zustand needed for a single-page board).
// ────────────────────────────────────────────────────────────────────────────

type EngineState = {
  layout: BoardLayout;
  state: GameState;
  hintsUsed: number;
  hint: { row: number; col: number } | null;
  /** Recorded for replay; only state-changing actions get appended. */
  actionLog: Action[];
};

type EngineAction =
  | {
      kind: "reveal";
      row: number;
      col: number;
      baseConfig: {
        rows: number;
        cols: number;
        mineCount: number;
        seed: string;
      };
    }
  | { kind: "flag"; row: number; col: number }
  | { kind: "question"; row: number; col: number }
  | { kind: "chord"; row: number; col: number }
  | { kind: "showHint" }
  | { kind: "clearHint" };

function appendIfChanged(
  log: Action[],
  prev: GameState,
  next: GameState,
  action: Action,
): Action[] {
  if (prev === next) return log;
  return [...log, action];
}

function reducer(s: EngineState, action: EngineAction): EngineState {
  switch (action.kind) {
    case "reveal": {
      const t = Date.now();
      if (s.state.status === "idle") {
        // Same first-click-safety contract as Quick Play: regenerate the
        // layout so the first reveal can't be a mine. This means each user's
        // exact layout depends on their first click, but the seed + click are
        // both stored so a daily game stays reproducible from its games row.
        const fc = generateBoard({
          rows: action.baseConfig.rows,
          cols: action.baseConfig.cols,
          mineCount: action.baseConfig.mineCount,
          noGuess: false,
          seed: action.baseConfig.seed,
          firstClick: { row: action.row, col: action.col },
        });
        const init = initialState(fc);
        const reveal: Action = {
          kind: "reveal",
          row: action.row,
          col: action.col,
          t,
        };
        const next = applyAction(init, reveal);
        return {
          layout: fc,
          state: next.state,
          hintsUsed: 0,
          hint: null,
          actionLog: [reveal],
        };
      }
      const reveal: Action = {
        kind: "reveal",
        row: action.row,
        col: action.col,
        t,
      };
      const next = applyAction(s.state, reveal);
      return {
        ...s,
        state: next.state,
        hint: null,
        actionLog: appendIfChanged(s.actionLog, s.state, next.state, reveal),
      };
    }
    case "flag": {
      const flag: Action = {
        kind: "flag",
        row: action.row,
        col: action.col,
        t: Date.now(),
      };
      const next = applyAction(s.state, flag);
      return {
        ...s,
        state: next.state,
        hint: null,
        actionLog: appendIfChanged(s.actionLog, s.state, next.state, flag),
      };
    }
    case "question": {
      const question: Action = {
        kind: "question",
        row: action.row,
        col: action.col,
        t: Date.now(),
      };
      const next = applyAction(s.state, question);
      return {
        ...s,
        state: next.state,
        hint: null,
        actionLog: appendIfChanged(s.actionLog, s.state, next.state, question),
      };
    }
    case "chord": {
      const chord: Action = {
        kind: "chord",
        row: action.row,
        col: action.col,
        t: Date.now(),
      };
      const next = applyAction(s.state, chord);
      return {
        ...s,
        state: next.state,
        hint: null,
        actionLog: appendIfChanged(s.actionLog, s.state, next.state, chord),
      };
    }
    case "showHint": {
      const hint = findSafeCell(s.state);
      return {
        ...s,
        hint,
        hintsUsed: hint !== null ? s.hintsUsed + 1 : s.hintsUsed,
      };
    }
    case "clearHint":
      return { ...s, hint: null };
  }
}

function buildInitialEngineState(challenge: DailyChallenge): EngineState {
  const layout = generateBoard({
    rows: challenge.rows,
    cols: challenge.cols,
    mineCount: challenge.mine_count,
    noGuess: false,
    seed: challenge.seed,
  });
  return {
    layout,
    state: initialState(layout),
    hintsUsed: 0,
    hint: null,
    actionLog: [],
  };
}

function countCorrectFlags(state: GameState): number {
  let n = 0;
  for (const row of state.cells) {
    for (const c of row) {
      if (c.flagged && c.mine) n++;
    }
  }
  return n;
}

// ────────────────────────────────────────────────────────────────────────────
// Live game UI
// ────────────────────────────────────────────────────────────────────────────

type SubmitUi =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "result"; result: SubmitDailyResult };

function ActiveGame({
  challenge,
  signedIn,
}: {
  challenge: DailyChallenge;
  signedIn: boolean;
}) {
  const [engine, dispatch] = useReducer(reducer, challenge, buildInitialEngineState);
  const [submitUi, setSubmitUi] = useState<SubmitUi>({ kind: "idle" });
  const submittedRef = useRef(false);

  const baseConfig = {
    rows: challenge.rows,
    cols: challenge.cols,
    mineCount: challenge.mine_count,
    seed: challenge.seed,
  };

  const onReveal = useCallback(
    (row: number, col: number) => dispatch({ kind: "reveal", row, col, baseConfig }),
    // baseConfig is derived from challenge which is stable per render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challenge.rows, challenge.cols, challenge.mine_count, challenge.seed],
  );
  const onFlag = useCallback(
    (row: number, col: number) => dispatch({ kind: "flag", row, col }),
    [],
  );
  const onChord = useCallback(
    (row: number, col: number) => dispatch({ kind: "chord", row, col }),
    [],
  );

  useEffect(() => {
    const { state } = engine;
    if (state.status !== "won" && state.status !== "lost") return;
    if (submittedRef.current) return;
    submittedRef.current = true;

    const time_ms = Math.max(
      0,
      (state.finishedAt ?? 0) - (state.startedAt ?? 0),
    );
    const three_bvs = time_ms === 0 ? 0 : engine.layout.threeBV / (time_ms / 1000);
    setSubmitUi({ kind: "pending" });
    submitDailyResult({
      date: challenge.date,
      result: state.status === "won" ? "win" : "loss",
      time_ms,
      mistakes: 0,
      flags_placed: state.flagsPlaced,
      flags_correct: countCorrectFlags(state),
      hints_used: engine.hintsUsed,
      three_bv: engine.layout.threeBV,
      three_bvs,
      finished_at: new Date(state.finishedAt ?? Date.now()).toISOString(),
      replay_blob_b64: tryEncodeReplay(engine.actionLog),
    })
      .then((result) => {
        setSubmitUi({ kind: "result", result });
        track("daily_complete", {
          date: challenge.date,
          difficulty: challenge.difficulty,
          result: state.status,
          time_ms,
          hints_used: engine.hintsUsed,
          status: result.status,
        });
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Submission failed";
        setSubmitUi({
          kind: "result",
          result: { status: "error", message },
        });
      });
  }, [engine, challenge.date, challenge.difficulty]);

  const terminal =
    engine.state.status === "won" || engine.state.status === "lost";

  return (
    <div className="flex flex-col items-center gap-4">
      <DailyHud
        mineCount={challenge.mine_count}
        flagsPlaced={engine.state.flagsPlaced}
        startedAt={engine.state.startedAt}
        finishedAt={engine.state.finishedAt}
      />
      <div className="overflow-x-auto max-w-[calc(100vw-2rem)]">
        <Board
          size={SIZE_MAP[challenge.difficulty]}
          cells={engine.state.cells}
          rows={engine.layout.rows}
          cols={engine.layout.cols}
          status={engine.state.status}
          hint={engine.hint}
          onReveal={onReveal}
          onFlag={onFlag}
          onChord={onChord}
        />
      </div>
      <HintBar
        disabled={terminal}
        hint={engine.hint}
        onShowHint={() => dispatch({ kind: "showHint" })}
        onClearHint={() => dispatch({ kind: "clearHint" })}
      />
      {terminal ? (
        <FinishBanner
          won={engine.state.status === "won"}
          submitUi={submitUi}
          signedIn={signedIn}
        />
      ) : null}
      <p className="max-w-md text-center text-xs text-zinc-500 dark:text-zinc-400">
        One attempt per day — your result is locked in after the game ends.
      </p>
    </div>
  );
}

function DailyHud({
  mineCount,
  flagsPlaced,
  startedAt,
  finishedAt,
}: {
  mineCount: number;
  flagsPlaced: number;
  startedAt: number | null;
  finishedAt: number | null;
}) {
  const remaining = Math.max(0, mineCount - flagsPlaced);
  return (
    <div className="flex w-full max-w-sm items-center justify-between rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-2">
      <div
        aria-label={`Mines remaining: ${remaining}`}
        className="font-mono text-2xl tabular-nums text-red-600 bg-black px-2 py-1 rounded min-w-[3.5rem] text-center"
      >
        {remaining.toString().padStart(3, "0")}
      </div>
      <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
        Daily
      </div>
      <DailyTimer
        key={startedAt ?? "idle"}
        startedAt={startedAt}
        finishedAt={finishedAt}
      />
    </div>
  );
}

function DailyTimer({
  startedAt,
  finishedAt,
}: {
  startedAt: number | null;
  finishedAt: number | null;
}) {
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

function HintBar({
  disabled,
  hint,
  onShowHint,
  onClearHint,
}: {
  disabled: boolean;
  hint: { row: number; col: number } | null;
  onShowHint: () => void;
  onClearHint: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 text-sm">
      <button
        type="button"
        onClick={onShowHint}
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
            onClick={onClearHint}
            className="ml-2 text-xs underline opacity-70 hover:opacity-100"
          >
            dismiss
          </button>
        </span>
      ) : (
        <span className="text-zinc-500 dark:text-zinc-400">
          Get a provably-safe move (counted on your record)
        </span>
      )}
    </div>
  );
}

function FinishBanner({
  won,
  submitUi,
  signedIn,
}: {
  won: boolean;
  submitUi: SubmitUi;
  signedIn: boolean;
}) {
  let footer: React.ReactNode = null;
  if (!signedIn) {
    footer = (
      <span className="text-zinc-700 dark:text-zinc-300">
        <a href="/auth?mode=sign-in&next=/daily" className="underline">
          Sign in
        </a>{" "}
        to record your result on the leaderboard
      </span>
    );
  } else if (submitUi.kind === "idle" || submitUi.kind === "pending") {
    footer = <span className="opacity-70">Submitting your result…</span>;
  } else {
    const r = submitUi.result;
    if (r.status === "submitted") {
      footer = (
        <span className="text-emerald-700 dark:text-emerald-300">
          Submitted to today&apos;s leaderboard · +{r.minesAwarded} Mines ·{" "}
          <a
            href={`/games/${r.gameId}/review`}
            className="underline decoration-dotted hover:decoration-solid"
          >
            Review your run
          </a>
        </span>
      );
    } else if (r.status === "already_submitted") {
      footer = (
        <span className="text-zinc-700 dark:text-zinc-300">
          You already submitted a result today
        </span>
      );
    } else if (r.status === "unauthenticated") {
      footer = (
        <span className="text-zinc-700 dark:text-zinc-300">
          Session expired — sign in again to record this run
        </span>
      );
    } else if (r.status === "stale_date") {
      footer = (
        <span className="text-zinc-700 dark:text-zinc-300">
          The day rolled over — refresh for tomorrow&apos;s challenge
        </span>
      );
    } else {
      footer = (
        <span title={r.message} className="text-red-700 dark:text-red-300">
          Submit failed: {r.message}
        </span>
      );
    }
  }
  return (
    <div
      role="status"
      className={
        won
          ? "rounded-md border border-emerald-600 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200 p-4 text-center"
          : "rounded-md border border-red-600 bg-red-100 text-red-900 dark:border-red-500 dark:bg-red-950 dark:text-red-200 p-4 text-center"
      }
    >
      <div className="text-lg font-semibold">
        {won ? "You won!" : "Game over"}
      </div>
      <div className="mt-1 text-xs">{footer}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Already played view
// ────────────────────────────────────────────────────────────────────────────

function AlreadyPlayed({
  challenge,
  result,
  displayName,
  rank,
}: {
  challenge: DailyChallenge;
  result: MyDailyResult;
  displayName: string | null;
  rank: number | null;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
        Today&apos;s run
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Difficulty" value={challenge.difficulty} />
        <Stat label="Time" value={formatTime(result.time_ms)} />
        <Stat label="Hints used" value={result.hints_used.toString()} />
        <Stat label="3BV" value={challenge.three_bv.toString()} />
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <ShareButton
          date={challenge.date}
          difficulty={challenge.difficulty}
          timeMs={result.time_ms}
          hintsUsed={result.hints_used}
          rank={rank}
          displayName={displayName}
        />
        <Link
          href={`/games/${result.game_id}/review`}
          className="font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          Review your run →
        </Link>
      </div>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        Come back tomorrow for a new challenge.
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-lg tabular-nums text-zinc-950 dark:text-zinc-50">
        {value}
      </dd>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Leaderboard
// ────────────────────────────────────────────────────────────────────────────

function Leaderboard({
  entries,
  signedIn,
}: {
  entries: DailyLeaderboardEntry[];
  signedIn: boolean;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
        Leaderboard
      </h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          No results yet. Be the first to play today.
        </p>
      ) : (
        <ol className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
          {entries.map((e) => (
            <li
              key={e.user_id}
              className="grid grid-cols-12 gap-2 py-1.5 text-sm"
            >
              <span className="col-span-1 text-zinc-500">#{e.rank}</span>
              <span className="col-span-7 truncate text-zinc-950 dark:text-zinc-50">
                {signedIn ? e.display_name : "—"}
              </span>
              <span className="col-span-2 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                {formatTime(e.time_ms)}
              </span>
              <span className="col-span-2 text-right text-xs text-zinc-500">
                {e.hints_used > 0 ? `${e.hints_used} hint${e.hints_used === 1 ? "" : "s"}` : "no hints"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Top-level page composition
// ────────────────────────────────────────────────────────────────────────────

export function DailyView({
  challenge,
  myResult,
  leaderboard,
  signedIn,
  myDisplayName,
  myRank,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Daily Challenge · {challenge.date}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          One board, one attempt — same board for every player worldwide.
          Resets at 00:00 UTC. Engine v{ENGINE_VERSION}.
        </p>
      </header>

      {myResult ? (
        <AlreadyPlayed
          challenge={challenge}
          result={myResult}
          displayName={myDisplayName}
          rank={myRank}
        />
      ) : (
        <ActiveGame challenge={challenge} signedIn={signedIn} />
      )}

      <Leaderboard entries={leaderboard} signedIn={signedIn} />
    </div>
  );
}
