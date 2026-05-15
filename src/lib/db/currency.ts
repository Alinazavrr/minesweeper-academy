import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type AwardMinesRpcReturn =
  Database["public"]["Functions"]["award_mines_for_game"]["Returns"][number];

export type AwardMinesResult = {
  userId: string;
  gameId: string;
  awardedMines: number;
  balanceAfter: number;
  totalEarned: number;
  transactionId: string;
  reason: Database["public"]["Enums"]["mines_transaction_reason"];
  alreadyAwarded: boolean;
};

export async function awardMinesForGame(
  gameId: string,
): Promise<AwardMinesResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("award_mines_for_game", {
    target_game_id: gameId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = data?.[0] as AwardMinesRpcReturn | undefined;
  if (!row) {
    throw new Error("award_mines_for_game returned no row");
  }

  return {
    userId: row.user_id,
    gameId: row.game_id,
    awardedMines: row.awarded_mines,
    balanceAfter: row.balance_after,
    totalEarned: row.total_earned,
    transactionId: row.transaction_id,
    reason: row.reason,
    alreadyAwarded: row.already_awarded,
  };
}
