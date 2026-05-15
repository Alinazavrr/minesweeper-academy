import type { Database } from "@/types/supabase";

export type MineRewardDifficulty =
  Database["public"]["Enums"]["game_difficulty"];
export type MineRewardResult = Extract<
  Database["public"]["Enums"]["game_result"],
  "win" | "loss"
>;
export type MineRewardSourceMode =
  Database["public"]["Enums"]["game_source_mode"];
export type MineTransactionReason =
  Database["public"]["Enums"]["mines_transaction_reason"];

type MineRewardInput = {
  difficulty: MineRewardDifficulty;
  result: MineRewardResult;
  sourceMode: MineRewardSourceMode;
};

const WIN_REWARD_BY_DIFFICULTY: Record<MineRewardDifficulty, number> = {
  beginner: 5,
  intermediate: 15,
  expert: 50,
  // Custom boards are not exposed in MVP Quick Play yet. Keep them positive
  // without letting arbitrary custom settings become the best farming path.
  custom: 5,
};

const DAILY_WIN_REWARD = 25;

export function mineRewardForFinishedGame(input: MineRewardInput): number {
  const base =
    input.sourceMode === "daily"
      ? DAILY_WIN_REWARD
      : WIN_REWARD_BY_DIFFICULTY[input.difficulty];

  return input.result === "win" ? base : Math.max(1, Math.floor(base * 0.2));
}

export function mineTransactionReasonForGame(
  sourceMode: MineRewardSourceMode,
): Extract<MineTransactionReason, "game_finish" | "daily_finish"> {
  return sourceMode === "daily" ? "daily_finish" : "game_finish";
}
