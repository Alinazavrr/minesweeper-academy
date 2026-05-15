import "server-only";

import { generateBoard } from "@minesweeper/engine";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  dailyConfig,
  dailySeed,
  todayUtcDateString,
} from "@/lib/games/daily";
import type { Database } from "@/types/supabase";

type DailyChallengeRow = Pick<
  Database["public"]["Tables"]["daily_challenges"]["Row"],
  | "date"
  | "difficulty"
  | "seed"
  | "rows"
  | "cols"
  | "mine_count"
  | "three_bv"
  | "created_at"
>;

export type DailyChallenge = DailyChallengeRow;

/**
 * Returns today's daily challenge, generating + persisting it the first time
 * any visitor lands on the page that day. Uses the service-role client because
 * daily_challenges has no INSERT RLS policy (intentional — only the system
 * creates them, never a user).
 */
export async function getOrCreateTodaysChallenge(): Promise<DailyChallenge> {
  const date = todayUtcDateString(new Date());
  const service = createServiceClient();

  const existingResp = await service
    .from("daily_challenges")
    .select(
      "date, difficulty, seed, rows, cols, mine_count, three_bv, created_at",
    )
    .eq("date", date)
    .maybeSingle();
  if (existingResp.data) return existingResp.data;

  const cfg = dailyConfig(date);
  const seed = dailySeed(date);
  const layout = generateBoard({
    rows: cfg.rows,
    cols: cfg.cols,
    mineCount: cfg.mineCount,
    noGuess: false,
    seed,
  });

  const insertResp = await service
    .from("daily_challenges")
    .insert({
      date,
      difficulty: cfg.difficulty,
      seed,
      rows: cfg.rows,
      cols: cfg.cols,
      mine_count: cfg.mineCount,
      three_bv: layout.threeBV,
    })
    .select(
      "date, difficulty, seed, rows, cols, mine_count, three_bv, created_at",
    )
    .maybeSingle();
  if (insertResp.data) return insertResp.data;

  // A racing request inserted first; re-read.
  const raceResp = await service
    .from("daily_challenges")
    .select(
      "date, difficulty, seed, rows, cols, mine_count, three_bv, created_at",
    )
    .eq("date", date)
    .single();
  if (raceResp.data) return raceResp.data;
  throw insertResp.error ?? raceResp.error ?? new Error("daily challenge missing after upsert");
}

export type DailyLeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  time_ms: number;
  hints_used: number;
  submitted_at: string;
};

/**
 * Top times for the given date. The users join only resolves for authenticated
 * viewers (public.users RLS is TO authenticated); anonymous viewers see a "—"
 * fallback. daily_results SELECT is public so the times themselves always show.
 */
export async function getDailyLeaderboard(
  date: string,
  limit = 25,
): Promise<DailyLeaderboardEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_results")
    .select(
      "user_id, time_ms, hints_used, submitted_at, users:user_id ( display_name )",
    )
    .eq("date", date)
    .order("time_ms", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row, index) => {
    const joined = row.users as { display_name: string | null } | null;
    return {
      rank: index + 1,
      user_id: row.user_id,
      display_name: joined?.display_name ?? "—",
      time_ms: row.time_ms,
      hints_used: row.hints_used,
      submitted_at: row.submitted_at,
    };
  });
}

export type MyDailyResult = {
  time_ms: number;
  hints_used: number;
  mistakes: number;
  submitted_at: string;
  game_id: string;
};

export async function getMyDailyResult(
  userId: string,
  date: string,
): Promise<MyDailyResult | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_results")
    .select("time_ms, hints_used, mistakes, submitted_at, game_id")
    .eq("date", date)
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}
