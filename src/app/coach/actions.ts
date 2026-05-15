"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  annotateMoves,
  generateBoard,
  type Action,
} from "@minesweeper/engine";
import { createConversation } from "@/lib/db/coach";
import { getGameForReview } from "@/lib/db/games";
import { decodeReplayBlob } from "@/lib/games/replay";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

const StartReviewSchema = z.object({
  gameId: z.string().uuid(),
});

export type StartReviewResult =
  | { status: "redirect"; conversationId: string }
  | { status: "unauthenticated" }
  | { status: "not_found" }
  | { status: "missing_replay" }
  | { status: "tier_locked" }
  | { status: "error"; message: string };

/**
 * Server action invoked from /games/[id]/review.
 *
 * Spins up a coach_conversation of kind 'post_game_review' for the given
 * game, seeds it with a system message containing the game's CSP analysis,
 * and bounces the user to /coach?conversation=<id>.
 *
 * The system seed is written via the service-role client because
 * coach_messages has no INSERT RLS — preventing the user from forging the
 * coach's prompt. Same constraint as the regular chat handler.
 */
export async function startPostGameReviewConversation(
  payload: unknown,
): Promise<StartReviewResult> {
  const parsed = StartReviewSchema.safeParse(payload);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.message };
  }

  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (claims.error || !claims.data?.claims?.sub) {
    return { status: "unauthenticated" };
  }
  const userId = claims.data.claims.sub;

  const subResp = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle();
  const tier = subResp.data?.tier ?? "free";
  if (tier === "free") {
    return { status: "tier_locked" };
  }

  const game = await getGameForReview(parsed.data.gameId, userId);
  if (!game) return { status: "not_found" };
  if (game.replay_blob === null) return { status: "missing_replay" };

  let actions: Action[] | null;
  try {
    actions = decodeReplayBlob(game.replay_blob as unknown as string);
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "decode failed",
    };
  }
  if (!actions || actions.length === 0) {
    return { status: "missing_replay" };
  }

  const first = actions[0]!;
  if (first.kind !== "reveal") {
    return {
      status: "error",
      message: "replay missing first reveal — cannot rebuild layout",
    };
  }
  const layout = generateBoard({
    rows: game.rows,
    cols: game.cols,
    mineCount: game.mine_count,
    noGuess: game.no_guess,
    seed: game.seed,
    firstClick: { row: first.row, col: first.col },
  });
  const annotations = annotateMoves(layout, actions);
  const missedSafe = annotations.filter(
    (a, i) =>
      a.safeMoveAvailable &&
      a.safeCell &&
      actions![i]!.kind === "reveal" &&
      (actions![i]!.row !== a.safeCell.row ||
        actions![i]!.col !== a.safeCell.col),
  );

  const conversationId = await createConversation(userId, {
    kind: "post_game_review",
    gameId: game.id,
    title:
      game.source_mode === "daily"
        ? `Review · Daily ${game.daily_date ?? ""}`.trim()
        : `Review · ${game.difficulty}`,
  });

  const summaryLines: string[] = [];
  summaryLines.push(
    `Game record (id ${game.id}) — ${game.difficulty}, ${game.source_mode}, result=${game.result}, time=${(game.time_ms / 1000).toFixed(1)}s, hints=${game.hints_used}, flags=${game.flags_correct}/${game.mine_count} correct.`,
  );
  summaryLines.push(`Action log: ${actions.length} actions, threeBV=${layout.threeBV}.`);
  if (missedSafe.length > 0) {
    summaryLines.push(`Missed safe moves (${missedSafe.length}):`);
    for (let i = 0; i < Math.min(10, missedSafe.length); i++) {
      const ann = missedSafe[i]!;
      const action = actions[ann.actionIndex]!;
      summaryLines.push(
        `  · turn ${ann.actionIndex + 1}: chose ${action.kind} (${action.row},${action.col}); a logically safe cell existed at (${ann.safeCell!.row},${ann.safeCell!.col})`,
      );
    }
    if (missedSafe.length > 10) {
      summaryLines.push(`  · …and ${missedSafe.length - 10} more`);
    }
  } else {
    summaryLines.push(
      "No CSP-deducible safe moves were missed — every reveal was either logically forced or an unavoidable guess.",
    );
  }

  const systemSeed = [
    "You are reviewing a finished Minesweeper game with the player. The CSP analysis below was computed from the player's move log; treat it as authoritative.",
    "When the player asks about a turn, refer to it by index (e.g. 'on turn 7 you...') and the (row, col) coordinates from the analysis.",
    "If the analysis shows no missed safe moves, focus on pacing, opening choices, or what the player did well; don't invent mistakes.",
    "",
    summaryLines.join("\n"),
  ].join("\n");

  const service = createServiceClient();
  const { error } = await service.from("coach_messages").insert({
    conversation_id: conversationId,
    role: "system",
    content: systemSeed,
  });
  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/coach");
  return { status: "redirect", conversationId };
}

export async function startPostGameReviewAndRedirect(
  formData: FormData,
): Promise<void> {
  const gameId = formData.get("gameId");
  const result = await startPostGameReviewConversation({ gameId });
  if (result.status === "redirect") {
    redirect(`/coach?conversation=${result.conversationId}`);
  }
  // Surface failures via search params so the client can render them.
  const message =
    result.status === "tier_locked"
      ? "Upgrade to Pro to discuss with Coach"
      : result.status === "unauthenticated"
        ? "Sign in to discuss with Coach"
        : result.status === "missing_replay"
          ? "Replay not available for this game"
          : result.status === "not_found"
            ? "Game not found"
            : result.status === "error"
              ? result.message
              : "Failed to start review";
  redirect(
    `/games/${typeof gameId === "string" ? gameId : ""}/review?coach_error=${encodeURIComponent(message)}`,
  );
}
