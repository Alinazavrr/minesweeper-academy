import Link from "next/link";
import { ENGINE_VERSION } from "@minesweeper/engine";
import { LandingAnalytics } from "@/components/analytics/LandingAnalytics";
import { LandingPreviewBoard } from "@/components/landing/LandingPreviewBoard";
import { todayUtcDateString } from "@/lib/games/daily";
import { createClient } from "@/lib/supabase/server";

const FEATURE_PILLARS: ReadonlyArray<{
  title: string;
  body: string;
  href: string;
  cta: string;
}> = [
  {
    title: "Daily Challenge",
    body: "One board per day for everyone — same seed, global leaderboard, share card. Resets at 00:00 UTC.",
    href: "/daily",
    cta: "Today's daily →",
  },
  {
    title: "Academy",
    body: "Public lessons on the patterns that turn Minesweeper into logic — 1-1 reductions, 1-2-1, probability basics.",
    href: "/learn",
    cta: "Browse lessons →",
  },
  {
    title: "AI Coach",
    body: "Chat with a Minesweeper coach about any game you've played. Pro plan unlocks per-turn post-game review.",
    href: "/coach",
    cta: "Talk to the coach →",
  },
  {
    title: "Pro tier",
    body: "Advanced analytics, scrubbable post-game review, and unlimited coach messages. Fake-purchase to try it.",
    href: "/account",
    cta: "Tier comparison →",
  },
];

const QUICK_ACTIONS: ReadonlyArray<{
  title: string;
  body: string;
  href: string;
  accent: string;
}> = [
  {
    title: "Quick Play",
    body: "Pick a difficulty and drop into a fresh board.",
    href: "/play",
    accent: "border-emerald-300 hover:border-emerald-500 dark:border-emerald-800 dark:hover:border-emerald-600",
  },
  {
    title: "Today's Daily",
    body: "One global seed. Climb the leaderboard.",
    href: "/daily",
    accent: "border-amber-300 hover:border-amber-500 dark:border-amber-800 dark:hover:border-amber-600",
  },
  {
    title: "Arena · Preview",
    body: "Bullet / Blitz / Rapid + live score race. Phase 2.",
    href: "/arena",
    accent: "border-orange-300 hover:border-orange-500 dark:border-orange-800 dark:hover:border-orange-600",
  },
  {
    title: "AI Coach",
    body: "Chat with the gpt-4o-mini coach.",
    href: "/coach",
    accent: "border-sky-300 hover:border-sky-500 dark:border-sky-800 dark:hover:border-sky-600",
  },
  {
    title: "Academy",
    body: "Pattern lessons + practice boards.",
    href: "/learn",
    accent: "border-violet-300 hover:border-violet-500 dark:border-violet-800 dark:hover:border-violet-600",
  },
  {
    title: "Stats",
    body: "Win rate, 3BV/s, streaks.",
    href: "/stats",
    accent: "border-rose-300 hover:border-rose-500 dark:border-rose-800 dark:hover:border-rose-600",
  },
  {
    title: "Shop",
    body: "Spend Mines on UI + board skins.",
    href: "/shop",
    accent: "border-cyan-300 hover:border-cyan-500 dark:border-cyan-800 dark:hover:border-cyan-600",
  },
];

export default async function Home() {
  const today = todayUtcDateString(new Date());

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  if (userId) {
    return <SignedInHome today={today} userId={userId} />;
  }

  return <AnonHome today={today} />;
}

async function SignedInHome({
  today,
  userId,
}: {
  today: string;
  userId: string;
}) {
  const supabase = await createClient();
  const [profileResp, currencyResp, recentResp] = await Promise.all([
    supabase
      .from("users")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_currency")
      .select("mines_balance")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("games")
      .select("id,difficulty,result,time_ms,finished_at")
      .eq("user_id", userId)
      .order("finished_at", { ascending: false })
      .limit(3),
  ]);

  const displayName = profileResp.data?.display_name ?? "Player";
  const minesBalance = currencyResp.data?.mines_balance ?? 0;
  const recent = recentResp.data ?? [];

  return (
    <main className="flex flex-1 flex-col">
      <LandingAnalytics />

      <section className="border-b border-zinc-200 bg-gradient-to-br from-emerald-50 via-white to-zinc-50 px-4 py-12 dark:border-zinc-800 dark:from-emerald-950/30 dark:via-zinc-950 dark:to-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
            Welcome back
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
            Hello, {displayName}.
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Balance:{" "}
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              💎 {minesBalance} Mines
            </span>{" "}
            · Today: <span className="font-mono">{today}</span>
          </p>
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Jump in
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_ACTIONS.map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className={`flex h-full flex-col gap-2 rounded-lg border-2 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-zinc-950 ${action.accent}`}
                >
                  <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {action.title}
                  </h3>
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {action.body}
                  </p>
                  <span className="mt-auto text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {recent.length > 0 ? (
        <section className="border-t border-zinc-200 px-4 py-10 dark:border-zinc-800">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Recent games
              </h2>
              <Link
                href="/account"
                className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Full history →
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-3">
              {recent.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/games/${g.id}/review`}
                    className="flex flex-col gap-1 rounded-md border border-zinc-200 bg-white p-3 transition hover:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-700"
                  >
                    <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                      {g.difficulty}
                    </span>
                    <span
                      className={
                        g.result === "win"
                          ? "text-emerald-700 dark:text-emerald-300 font-semibold"
                          : g.result === "loss"
                            ? "text-red-700 dark:text-red-300 font-semibold"
                            : "text-zinc-500 font-semibold"
                      }
                    >
                      {g.result}
                    </span>
                    <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                      {(g.time_ms / 1000).toFixed(1)}s
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <footer className="mt-auto border-t border-zinc-200 px-4 py-6 text-xs text-zinc-500 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
          <span>Minesweeper Academy · nFactorial demo</span>
          <span className="font-mono">engine v{ENGINE_VERSION}</span>
        </div>
      </footer>
    </main>
  );
}

function AnonHome({ today }: { today: string }) {
  return (
    <main className="flex flex-1 flex-col">
      <LandingAnalytics />
      <section className="border-b border-zinc-200 bg-gradient-to-br from-emerald-50 via-white to-zinc-50 px-6 py-20 dark:border-zinc-800 dark:from-emerald-950/30 dark:via-zinc-950 dark:to-zinc-950">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex flex-col gap-6">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              Engine v{ENGINE_VERSION} · live preview
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl dark:text-zinc-50">
              Minesweeper, but with a coach in your ear.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-zinc-700 dark:text-zinc-300">
              A training and competitive platform for Minesweeper players. Daily
              global challenge, scrubbable post-game review, AI coach chat, and
              a public Academy of pattern lessons.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/daily"
                className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
              >
                Play today&apos;s daily
              </Link>
              <Link
                href="/play"
                className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Quick play
              </Link>
              <Link
                href="/learn"
                className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Browse Academy
              </Link>
            </div>
            <p className="text-xs text-zinc-500">
              No account needed to play, learn, or read lessons. Sign in to
              save runs, climb the leaderboard, and use the AI coach.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <LandingPreviewBoard />
            <p className="text-xs text-zinc-500">
              Today: <span className="font-mono">{today}</span> · Intermediate
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 px-6 py-16 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <header className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              What you get
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Four surfaces, one engine.
            </h2>
          </header>
          <ul className="grid gap-4 sm:grid-cols-2">
            {FEATURE_PILLARS.map((pillar) => (
              <li key={pillar.title}>
                <Link
                  href={pillar.href}
                  className="flex h-full flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-700"
                >
                  <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {pillar.title}
                  </h3>
                  <p className="flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {pillar.body}
                  </p>
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {pillar.cta}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 text-zinc-700 dark:text-zinc-300">
          <header className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              Under the hood
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Built deterministically, on purpose.
            </h2>
          </header>
          <p className="text-base leading-7">
            The Minesweeper engine is a pure TypeScript module shared across
            the browser, the server, and the validator. Every game stores its
            seed, action log, and engine version, so any saved game can be
            replayed byte-for-byte and analysed by the CSP solver — that&apos;s
            what powers the post-game review.
          </p>
          <p className="text-base leading-7">
            Auth and persistence sit on Supabase with row-level security on
            every table; the AI coach streams from gpt-4o-mini through a
            server-side route handler so the API key never touches the
            client. Stats, share cards, and Daily Challenge submissions all
            run off the same data path.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/auth?mode=sign-up"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Create an account
            </Link>
            <Link
              href="/auth?mode=sign-in"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 px-6 py-8 text-xs text-zinc-500 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <span>Minesweeper Academy · nFactorial demo</span>
          <span className="font-mono">engine v{ENGINE_VERSION}</span>
        </div>
      </footer>
    </main>
  );
}
