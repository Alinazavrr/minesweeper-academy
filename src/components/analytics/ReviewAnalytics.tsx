"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

type Props = {
  gameId: string;
  difficulty: "beginner" | "intermediate" | "expert" | "custom";
  result: "win" | "loss" | "abandoned";
  sourceMode:
    | "quick_play"
    | "daily"
    | "arena"
    | "practice"
    | "lesson_practice";
};

export function ReviewAnalytics({
  gameId,
  difficulty,
  result,
  sourceMode,
}: Props) {
  useEffect(() => {
    track("post_game_review_opened", {
      game_id: gameId,
      difficulty,
      result,
      source_mode: sourceMode,
    });
  }, [gameId, difficulty, result, sourceMode]);
  return null;
}
