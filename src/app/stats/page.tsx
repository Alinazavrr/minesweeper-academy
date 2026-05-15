import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProTierDialog } from "@/components/billing/ProTierDialog";
import { Sparkline } from "@/components/stats/Sparkline";
import { getUserStats } from "@/lib/db/stats";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export const metadata: Metadata = {
  title: "Stats — Minesweeper Academy",
};

export const dynamic = "force-dynamic";

const DIFFICULTY_LABEL: Record<
  Database["public"]["Enums"]["game_difficulty"],
  string
> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Expert",
  custom: "Custom",
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default async function StatsPage() {
  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (claims.error || !claims.data?.claims?.sub) {
    redirect("/auth?mode=sign-in&next=/stats");
  }
  const userId = claims.data.claims.sub;

  const [stats, subResp] = await Promise.all([
    getUserStats(userId),
    supabase
      .from("subscriptions")
      .select("tier,granted_via")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const subscription = subResp.data as
    | Pick<
        Database["public"]["Tables"]["subscriptions"]["Row"],
        "tier" | "granted_via"
      >
    | null;
  const tier = subscription?.tier ?? "free";
  const isPaid = tier !== "free";

  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <Link
            href="/account"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            ← Account
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Stats
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Aggregated from your last 500 games. Daily streak counts unique
            UTC days you submitted a Daily Challenge result.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-4">
          <BigStat label="Games" value={stats.totals.games.toString()} />
          <BigStat
            label="Win rate"
            value={`${stats.totals.winRate}%`}
            sub={`${stats.totals.wins} W / ${stats.totals.losses} L`}
          />
          <BigStat
            label="Daily streak"
            value={stats.dailyStreak.current.toString()}
            sub={
              stats.dailyStreak.todayCompleted
                ? `Longest: ${stats.dailyStreak.longest}`
                : `${stats.dailyStreak.current === 0 ? "Play today to start" : "Play today to keep it"}`
            }
          />
          <BigStat
            label="Best Expert"
            value={
              stats.byDifficulty.find((d) => d.difficulty === "expert")
                ?.bestTimeMs !== null &&
              stats.byDifficulty.find((d) => d.difficulty === "expert")!
                .bestTimeMs !== undefined
                ? formatTime(
                    stats.byDifficulty.find((d) => d.difficulty === "expert")!
                      .bestTimeMs!,
                  )
                : "—"
            }
          />
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {stats.byDifficulty
            .filter((d) => d.difficulty !== "custom" || d.total > 0)
            .map((d) => (
              <article
                key={d.difficulty}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                  {DIFFICULTY_LABEL[d.difficulty]}
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                  {d.bestTimeMs !== null ? formatTime(d.bestTimeMs) : "—"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">Best win time</p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-zinc-500">Played</dt>
                    <dd className="mt-1 font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                      {d.total}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Win rate</dt>
                    <dd className="mt-1 font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                      {d.total === 0 ? "—" : `${d.winRate}%`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Top 3BV/s</dt>
                    <dd className="mt-1 font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                      {d.bestThreeBvs > 0 ? d.bestThreeBvs.toFixed(2) : "—"}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
        </section>

        {isPaid ? (
          <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                  Pro analytics
                </p>
                <h2 className="mt-1 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  3BV/s — last {stats.recent3BvsSeries.length} games
                </h2>
              </div>
              <span className="text-xs text-zinc-500">
                Higher is faster · red dots are losses
              </span>
            </div>
            <div className="mt-4">
              <Sparkline
                ariaLabel="3BV per second over recent games"
                points={stats.recent3BvsSeries.map((p) => ({
                  value: p.threeBvs,
                  tone: p.result,
                }))}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Mini
                label="Recent flag accuracy"
                value={
                  stats.recentFlagAccuracy === null
                    ? "—"
                    : `${stats.recentFlagAccuracy}%`
                }
              />
              <Mini
                label="Best 3BV/s overall"
                value={
                  Math.max(
                    0,
                    ...stats.byDifficulty.map((d) => d.bestThreeBvs),
                  ).toFixed(2)
                }
              />
              <Mini
                label="Longest daily streak"
                value={stats.dailyStreak.longest.toString()}
              />
            </div>
          </section>
        ) : (
          <section className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                  Pro analytics
                </p>
                <h2 className="mt-1 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  3BV/s trends and accuracy panels
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  Upgrade to see your speed sparkline, flag accuracy over the
                  last 50 games, and longest daily streak.
                </p>
              </div>
              <ProTierDialog
                currentTier={tier}
                grantedVia={subscription?.granted_via ?? "free_default"}
                triggerLabel="See plans"
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function BigStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
      {sub ? (
        <p className="mt-1 text-xs text-zinc-500">{sub}</p>
      ) : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}
