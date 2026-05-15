"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

const PayloadSchema = z.object({
  difficulty: z.enum(["beginner", "intermediate", "expert", "custom"]),
  rows: z.number().int().min(1).max(64),
  cols: z.number().int().min(1).max(64),
  mine_count: z.number().int().min(0),
  seed: z.string().min(1).max(256),
  no_guess: z.boolean(),
  result: z.enum(["win", "loss"]),
  time_ms: z.number().int().min(0),
  mistakes: z.number().int().min(0),
  flags_placed: z.number().int().min(0),
  flags_correct: z.number().int().min(0),
  hints_used: z.number().int().min(0),
  three_bv: z.number().int().min(0),
  three_bvs: z.number().min(0),
  engine_version: z.string().min(1).max(64),
  source_mode: z.enum(["quick_play"]),
  daily_date: z.null(),
  arena_match_id: z.null(),
  finished_at: z.string().min(1),
});

export type SaveGameResult =
  | { status: "saved"; gameId: string }
  | { status: "unauthenticated" }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

type GamesInsert = Database["public"]["Tables"]["games"]["Insert"];

export async function saveQuickPlayGame(
  payload: unknown,
): Promise<SaveGameResult> {
  const parsed = PayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { status: "invalid", message: parsed.error.message };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) {
    return { status: "unauthenticated" };
  }

  const insert: GamesInsert = {
    ...parsed.data,
    user_id: claimsData.claims.sub,
  };

  const { data, error } = await supabase
    .from("games")
    .insert(insert)
    .select("id")
    .single();

  if (error || !data) {
    return {
      status: "error",
      message: error?.message ?? "Insert returned no row",
    };
  }
  return { status: "saved", gameId: data.id };
}
