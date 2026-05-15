import { describe, expect, it } from "vitest";
import {
  mineRewardForFinishedGame,
  mineTransactionReasonForGame,
} from "./rewards";

describe("mineRewardForFinishedGame", () => {
  it.each([
    ["beginner", "win", "quick_play", 5],
    ["intermediate", "win", "quick_play", 15],
    ["expert", "win", "quick_play", 50],
    ["beginner", "loss", "quick_play", 1],
    ["intermediate", "loss", "quick_play", 3],
    ["expert", "loss", "quick_play", 10],
  ] as const)(
    "awards %i Mines for %s %s %s",
    (difficulty, result, sourceMode, expected) => {
      expect(
        mineRewardForFinishedGame({
          difficulty,
          result,
          sourceMode,
        }),
      ).toBe(expected);
    },
  );

  it("uses the Daily Challenge reward table for daily games", () => {
    expect(
      mineRewardForFinishedGame({
        difficulty: "intermediate",
        result: "win",
        sourceMode: "daily",
      }),
    ).toBe(25);
    expect(
      mineRewardForFinishedGame({
        difficulty: "intermediate",
        result: "loss",
        sourceMode: "daily",
      }),
    ).toBe(5);
  });

  it("keeps custom games worth a small positive MVP reward", () => {
    expect(
      mineRewardForFinishedGame({
        difficulty: "custom",
        result: "win",
        sourceMode: "quick_play",
      }),
    ).toBe(5);
  });
});

describe("mineTransactionReasonForGame", () => {
  it("marks daily games with the daily_finish reason", () => {
    expect(mineTransactionReasonForGame("daily")).toBe("daily_finish");
  });

  it.each(["quick_play", "arena", "practice", "lesson_practice"] as const)(
    "marks %s games with the game_finish reason",
    (sourceMode) => {
      expect(mineTransactionReasonForGame(sourceMode)).toBe("game_finish");
    },
  );
});
