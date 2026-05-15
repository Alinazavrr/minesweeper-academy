import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type ReviewableGame = Pick<
  Database["public"]["Tables"]["games"]["Row"],
  | "id"
  | "user_id"
  | "difficulty"
  | "rows"
  | "cols"
  | "mine_count"
  | "seed"
  | "no_guess"
  | "result"
  | "time_ms"
  | "hints_used"
  | "flags_placed"
  | "flags_correct"
  | "three_bv"
  | "three_bvs"
  | "engine_version"
  | "source_mode"
  | "daily_date"
  | "finished_at"
  | "replay_blob"
>;

/**
 * Load a game owned by `userId`. Returns null when no such game exists for
 * this user (covers both "does not exist" and "owned by someone else" — RLS
 * makes those indistinguishable, which is the right behavior).
 */
export async function getGameForReview(
  gameId: string,
  userId: string,
): Promise<ReviewableGame | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("games")
    .select(
      "id,user_id,difficulty,rows,cols,mine_count,seed,no_guess,result,time_ms,hints_used,flags_placed,flags_correct,three_bv,three_bvs,engine_version,source_mode,daily_date,finished_at,replay_blob",
    )
    .eq("id", gameId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as ReviewableGame | null) ?? null;
}
