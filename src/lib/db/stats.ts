import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type Difficulty = Database["public"]["Enums"]["game_difficulty"];

export type DifficultyBreakdown = {
  difficulty: Difficulty;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  bestTimeMs: number | null;
  bestThreeBvs: number;
};

export type SparklinePoint = {
  finishedAt: string;
  threeBvs: number;
  result: "win" | "loss" | "abandoned";
};

export type StatsView = {
  totals: {
    games: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  byDifficulty: DifficultyBreakdown[];
  recent3BvsSeries: SparklinePoint[];
  recentFlagAccuracy: number | null;
  dailyStreak: {
    current: number;
    longest: number;
    todayCompleted: boolean;
  };
};

const DIFFICULTIES: Difficulty[] = [
  "beginner",
  "intermediate",
  "expert",
  "custom",
];

/**
 * Aggregate every metric the stats dashboard needs in one round-trip's worth
 * of queries. Direct selects + JS aggregation are fine at MVP volumes (a power
 * user has hundreds, not millions, of games). Swap to a SQL function if it
 * becomes a bottleneck.
 */
export async function getUserStats(userId: string): Promise<StatsView> {
  const supabase = await createClient();

  const [allGamesResp, dailyResp] = await Promise.all([
    supabase
      .from("games")
      .select(
        "difficulty,result,time_ms,three_bvs,flags_placed,flags_correct,finished_at",
      )
      .eq("user_id", userId)
      .order("finished_at", { ascending: false })
      .limit(500),
    supabase
      .from("daily_results")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(365),
  ]);

  type GameRow = {
    difficulty: Difficulty;
    result: "win" | "loss" | "abandoned";
    time_ms: number;
    three_bvs: number;
    flags_placed: number;
    flags_correct: number;
    finished_at: string;
  };
  const games = (allGamesResp.data ?? []) as GameRow[];
  const dailies = (dailyResp.data ?? []) as Array<{ date: string }>;

  const totals = {
    games: games.length,
    wins: games.filter((g) => g.result === "win").length,
    losses: games.filter((g) => g.result === "loss").length,
    winRate: 0,
  };
  totals.winRate =
    totals.games === 0
      ? 0
      : Math.round((totals.wins / totals.games) * 100);

  const byDifficulty: DifficultyBreakdown[] = DIFFICULTIES.map(
    (difficulty) => {
      const subset = games.filter((g) => g.difficulty === difficulty);
      const wins = subset.filter((g) => g.result === "win");
      const bestTimeMs =
        wins.length === 0
          ? null
          : wins.reduce(
              (min, g) => (min === null || g.time_ms < min ? g.time_ms : min),
              null as number | null,
            );
      const bestThreeBvs = wins.reduce(
        (max, g) => (g.three_bvs > max ? g.three_bvs : max),
        0,
      );
      return {
        difficulty,
        total: subset.length,
        wins: wins.length,
        losses: subset.filter((g) => g.result === "loss").length,
        winRate:
          subset.length === 0
            ? 0
            : Math.round((wins.length / subset.length) * 100),
        bestTimeMs,
        bestThreeBvs,
      };
    },
  );

  // Sparkline = last 30 finished games, oldest first (so the chart reads L→R).
  const recent3BvsSeries: SparklinePoint[] = games
    .slice(0, 30)
    .reverse()
    .map((g) => ({
      finishedAt: g.finished_at,
      threeBvs: g.three_bvs,
      result: g.result,
    }));

  const recentFlagsTotal = games.slice(0, 50).reduce(
    (acc, g) => {
      acc.placed += g.flags_placed;
      acc.correct += g.flags_correct;
      return acc;
    },
    { placed: 0, correct: 0 },
  );
  const recentFlagAccuracy =
    recentFlagsTotal.placed === 0
      ? null
      : Math.round((recentFlagsTotal.correct / recentFlagsTotal.placed) * 100);

  const dailyStreak = computeDailyStreak(dailies);

  return {
    totals,
    byDifficulty,
    recent3BvsSeries,
    recentFlagAccuracy,
    dailyStreak,
  };
}

function computeDailyStreak(rows: ReadonlyArray<{ date: string }>): {
  current: number;
  longest: number;
  todayCompleted: boolean;
} {
  if (rows.length === 0) {
    return { current: 0, longest: 0, todayCompleted: false };
  }
  // Rows arrive newest-first; dedupe by date (a user only ever has one
  // daily_results row per date, but be defensive).
  const dates = Array.from(new Set(rows.map((r) => r.date))).sort().reverse();
  const today = todayUtcString();
  const yesterday = addDaysUtc(today, -1);
  const todayCompleted = dates[0] === today;

  // Anchor the current streak to today if completed, else yesterday so a
  // streak in progress isn't reset by a fresh UTC day with no submission yet.
  let cursor = todayCompleted ? today : yesterday;
  let current = 0;
  for (const d of dates) {
    if (d === cursor) {
      current++;
      cursor = addDaysUtc(cursor, -1);
    } else if (d < cursor) {
      break;
    }
  }
  if (!todayCompleted && current === 0) {
    // Streak starts further back than yesterday — no active streak at all.
    current = 0;
  }

  // Longest streak = walk all dates and count consecutive runs.
  let longest = 0;
  let runHead: string | null = null;
  let runLen = 0;
  for (const d of dates) {
    if (runHead === null) {
      runHead = d;
      runLen = 1;
    } else if (d === addDaysUtc(runHead, -runLen)) {
      runLen++;
    } else {
      if (runLen > longest) longest = runLen;
      runHead = d;
      runLen = 1;
    }
  }
  if (runLen > longest) longest = runLen;

  return { current, longest, todayCompleted };
}

function todayUtcString(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${now.getUTCDate().toString().padStart(2, "0")}`;
}

function addDaysUtc(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = (dt.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = dt.getUTCDate().toString().padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
