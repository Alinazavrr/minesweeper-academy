"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ENGINE_VERSION } from "@minesweeper/engine";
import { awardMinesForGame } from "@/lib/db/currency";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateTodaysChallenge } from "@/lib/db/daily";
import { todayUtcDateString } from "@/lib/games/daily";
import { base64ToPostgresBytea } from "@/lib/games/replay";
import type { Database } from "@/types/supabase";

const PayloadSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  result: z.enum(["win", "loss"]),
  time_ms: z.number().int().min(0),
  mistakes: z.number().int().min(0),
  flags_placed: z.number().int().min(0),
  flags_correct: z.number().int().min(0),
  hints_used: z.number().int().min(0),
  three_bv: z.number().int().min(0),
  three_bvs: z.number().min(0),
  finished_at: z.string().min(1),
  replay_blob_b64: z
    .string()
    .min(1)
    .max(16 * 1024)
    .nullable(),
});

export type SubmitDailyResult =
  | {
      status: "submitted";
      gameId: string;
      minesAwarded: number;
      balanceAfter: number;
    }
  | { status: "already_submitted" }
  | { status: "unauthenticated" }
  | { status: "invalid"; message: string }
  | { status: "stale_date" }
  | { status: "error"; message: string };

type GamesInsert = Database["public"]["Tables"]["games"]["Insert"];

export async function submitDailyResult(
  payload: unknown,
): Promise<SubmitDailyResult> {
  const parsed = PayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { status: "invalid", message: parsed.error.message };
  }

  const today = todayUtcDateString(new Date());
  if (parsed.data.date !== today) {
    return { status: "stale_date" };
  }

  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (claims.error || !claims.data?.claims?.sub) {
    return { status: "unauthenticated" };
  }
  const userId = claims.data.claims.sub;

  // Server is the source of truth for board metadata: rows / cols / mine_count
  // / seed / difficulty come from the daily_challenges row, never from the
  // client.
  const challenge = await getOrCreateTodaysChallenge();

  // Pre-check that catches honest double-submits. The DB PK on
  // (date, user_id) is still the authoritative guard below.
  const existing = await supabase
    .from("daily_results")
    .select("date")
    .eq("date", today)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing.data) {
    return { status: "already_submitted" };
  }

  const gameInsert: GamesInsert = {
    user_id: userId,
    difficulty: challenge.difficulty,
    rows: challenge.rows,
    cols: challenge.cols,
    mine_count: challenge.mine_count,
    seed: challenge.seed,
    no_guess: false,
    result: parsed.data.result,
    time_ms: parsed.data.time_ms,
    mistakes: parsed.data.mistakes,
    flags_placed: parsed.data.flags_placed,
    flags_correct: parsed.data.flags_correct,
    hints_used: parsed.data.hints_used,
    three_bv: parsed.data.three_bv,
    three_bvs: parsed.data.three_bvs,
    engine_version: ENGINE_VERSION,
    source_mode: "daily",
    daily_date: today,
    finished_at: parsed.data.finished_at,
    replay_blob: base64ToPostgresBytea(parsed.data.replay_blob_b64),
  };
  const gameInsResp = await supabase
    .from("games")
    .insert(gameInsert)
    .select("id")
    .single();
  if (gameInsResp.error || !gameInsResp.data) {
    return {
      status: "error",
      message: gameInsResp.error?.message ?? "Failed to insert game",
    };
  }
  const gameId = gameInsResp.data.id;

  const drInsResp = await supabase.from("daily_results").insert({
    date: today,
    user_id: userId,
    game_id: gameId,
    time_ms: parsed.data.time_ms,
    mistakes: parsed.data.mistakes,
    hints_used: parsed.data.hints_used,
    validated: true,
  });
  if (drInsResp.error) {
    // Clean up the orphan games row. The user owns it so RLS allows the delete.
    await supabase.from("games").delete().eq("id", gameId);
    if (drInsResp.error.code === "23505") {
      return { status: "already_submitted" };
    }
    return { status: "error", message: drInsResp.error.message };
  }

  const award = await awardMinesForGame(gameId);
  revalidatePath("/account");
  revalidatePath("/daily");

  return {
    status: "submitted",
    gameId,
    minesAwarded: award.awardedMines,
    balanceAfter: award.balanceAfter,
  };
}
