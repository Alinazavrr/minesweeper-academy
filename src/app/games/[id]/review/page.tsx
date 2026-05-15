import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  annotateMoves,
  generateBoard,
  type Action,
  type BoardLayout,
} from "@minesweeper/engine";
import { ProTierDialog } from "@/components/billing/ProTierDialog";
import { ReplayPlayer } from "@/components/review/ReplayPlayer";
import { getGameForReview } from "@/lib/db/games";
import { decodeReplayBlob } from "@/lib/games/replay";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type RouteParams = { id: string };

export const metadata: Metadata = {
  title: "Post-Game Review — Minesweeper Academy",
};

export default async function ReviewPage(props: {
  params: Promise<RouteParams>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) {
    redirect(`/auth?mode=sign-in&next=/games/${id}/review`);
  }
  const userId = claimsData.claims.sub;

  const [game, subResp] = await Promise.all([
    getGameForReview(id, userId),
    supabase
      .from("subscriptions")
      .select("tier,granted_via")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (!game) notFound();
  const subscription = subResp.data as
    | Pick<
        Database["public"]["Tables"]["subscriptions"]["Row"],
        "tier" | "granted_via"
      >
    | null;
  const tier = subscription?.tier ?? "free";

  if (tier === "free") {
    return <LockedReviewPanel grantedVia={subscription?.granted_via ?? null} />;
  }

  if (game.replay_blob === null) {
    return <ReplayUnavailablePanel gameId={game.id} />;
  }

  let actions: Action[] | null;
  try {
    actions = decodeReplayBlob(game.replay_blob as unknown as string);
  } catch (err) {
    return (
      <ReplayCorruptPanel
        gameId={game.id}
        message={err instanceof Error ? err.message : "decode failed"}
      />
    );
  }
  if (!actions || actions.length === 0) {
    return <ReplayUnavailablePanel gameId={game.id} />;
  }

  let layout: BoardLayout;
  try {
    layout = rebuildLayout(game, actions);
  } catch (err) {
    return (
      <ReplayCorruptPanel
        gameId={game.id}
        message={err instanceof Error ? err.message : "layout rebuild failed"}
      />
    );
  }

  const annotations = annotateMoves(layout, actions);

  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex items-center justify-between">
          <Link
            href="/account"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            ← Account
          </Link>
          <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
            Engine v{game.engine_version}
          </span>
        </header>
        <ReplayPlayer
          serializedLayout={{
            rows: layout.rows,
            cols: layout.cols,
            mineCount: layout.mineCount,
            noGuess: layout.noGuess,
            seed: layout.seed,
            mines: Array.from(layout.mines),
            threeBV: layout.threeBV,
          }}
          actions={actions}
          annotations={annotations}
          gameMeta={{
            id: game.id,
            difficulty: game.difficulty,
            result: game.result,
            timeMs: game.time_ms,
            hintsUsed: game.hints_used,
            flagsPlaced: game.flags_placed,
            flagsCorrect: game.flags_correct,
            mineCount: game.mine_count,
            sourceMode: game.source_mode,
            dailyDate: game.daily_date,
            finishedAt: game.finished_at,
          }}
        />
      </div>
    </main>
  );
}

/**
 * Replay's first action is canonically the first reveal — that's the
 * first-click-safety contract the capture path enforces. Re-running
 * generateBoard with the same seed + firstClick yields the byte-identical
 * layout the player saw, since the engine is deterministic.
 */
function rebuildLayout(
  game: Awaited<ReturnType<typeof getGameForReview>> & object,
  actions: ReadonlyArray<Action>,
): BoardLayout {
  const first = actions[0];
  if (!first || first.kind !== "reveal") {
    throw new Error(
      "replay: first action must be a reveal (first-click-safety invariant)",
    );
  }
  return generateBoard({
    rows: game.rows,
    cols: game.cols,
    mineCount: game.mine_count,
    noGuess: game.no_guess,
    seed: game.seed,
    firstClick: { row: first.row, col: first.col },
  });
}

function LockedReviewPanel({
  grantedVia,
}: {
  grantedVia: Database["public"]["Enums"]["subscription_granted_via"] | null;
}) {
  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header>
          <Link
            href="/account"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            ← Account
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Post-game review
          </h1>
        </header>
        <section className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Pro feature
          </p>
          <h2 className="mt-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Unlock per-turn analysis
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Scrub through each move you made, see the cells you could have
            proven safe, and find the moment a winnable game tipped over.
            Available on any paid tier.
          </p>
          <div className="mt-4">
            <ProTierDialog
              currentTier="free"
              grantedVia={grantedVia ?? "free_default"}
              triggerLabel="See plans"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function ReplayUnavailablePanel({ gameId }: { gameId: string }) {
  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header>
          <Link
            href="/account"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            ← Account
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Replay not available
          </h1>
        </header>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          This game (<span className="font-mono text-xs">{gameId}</span>) was
          played before replay recording shipped, so there&apos;s nothing to
          scrub through. New games you play from now on will be reviewable.
        </p>
      </div>
    </main>
  );
}

function ReplayCorruptPanel({
  gameId,
  message,
}: {
  gameId: string;
  message: string;
}) {
  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header>
          <Link
            href="/account"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            ← Account
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Replay couldn&apos;t be loaded
          </h1>
        </header>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          The replay blob for game{" "}
          <span className="font-mono text-xs">{gameId}</span> failed to decode:{" "}
          <span className="font-mono text-xs">{message}</span>
        </p>
      </div>
    </main>
  );
}
