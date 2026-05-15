import type { Metadata } from "next";
import Link from "next/link";
import { ScoreRaceMock } from "@/components/arena/ScoreRaceMock";

export const metadata: Metadata = {
  title: "Arena (Coming Soon) — Minesweeper Academy",
  description:
    "Bullet, Blitz, and Rapid time controls with a live mid-match score race. Phase 2 of Minesweeper Academy + Arena.",
};

type Format = {
  id: "bullet" | "blitz" | "rapid";
  duration: string;
  durationDetail: string;
  vibe: string;
  strategy: string;
  accent: string;
  badge: string;
};

const FORMATS: ReadonlyArray<Format> = [
  {
    id: "bullet",
    duration: "60s",
    durationDetail: "1 minute",
    vibe: "Frantic. Highlight-friendly. Built for streamers.",
    strategy:
      "Stack Beginner solves at 1,000 pts each. One Expert run is a gamble.",
    accent:
      "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  },
  {
    id: "blitz",
    duration: "3m",
    durationDetail: "3 minutes",
    vibe: "The default competitive mode.",
    strategy:
      "Intermediate boards (3,500 pts) mixed with occasional Expert (10,000) attempts.",
    accent:
      "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20",
    badge:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  {
    id: "rapid",
    duration: "5m",
    durationDetail: "5 minutes",
    vibe: "Deliberate. Accuracy starts to matter as much as speed.",
    strategy:
      "Expert boards (10,000 pts) become viable. Optimal flagging pays off.",
    accent:
      "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/20",
    badge: "bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  },
];

const VISION_BULLETS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Synchronized start",
    body: "Every player's timer begins at the exact same instant. The server creates the match within 10 seconds of you joining the queue.",
  },
  {
    title: "Bot fallback",
    body: "If nobody else queues, the match fills with stored bot replays at your rating band — so the queue never blocks. Bots broadcast scores on the same channel, labeled honestly.",
  },
  {
    title: "Pick your tier mid-match",
    body: "Each new board, you choose Beginner / Intermediate / Expert. Race a stack of safe wins or gamble on a high-value Expert clear.",
  },
  {
    title: "No-Guess Mode",
    body: "Every Arena board is drawn from a pre-generated, logically solvable pool. No 50/50 guessing decides ranked matches.",
  },
  {
    title: "Seasons + badges",
    body: "Monthly seasons award Bronze / Silver / Gold / Diamond per format. Decay after 14 days inactive on Bullet and Blitz.",
  },
  {
    title: "Honest ratings",
    body: "Per-format Elo. Friends filter. Country filter. Phase 3 splits ranked vs. casual queues.",
  },
];

export default function ArenaPreviewPage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-400 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              Coming soon · Phase 2
            </span>
            <span className="text-xs text-zinc-500">
              Queues are not live yet
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
            Arena
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Synchronized-start parallel runs across Bullet, Blitz, and Rapid
            time controls. A live mid-match score race makes the competition
            feel real-time — even when a bot is filling the seat next to you.
            Below is the planned UI; nothing here is matchmaking against real
            opponents yet.
          </p>
        </header>

        {/* Format cards */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Formats
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {FORMATS.map((format) => (
              <li
                key={format.id}
                className={`flex h-full flex-col gap-4 rounded-lg border-2 p-5 ${format.accent}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 capitalize">
                    {format.id}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${format.badge}`}
                  >
                    {format.duration}
                  </span>
                </div>
                <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  {format.vibe}
                </p>
                <dl className="mt-auto grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <dt className="font-semibold uppercase tracking-wider text-zinc-500">
                    Length
                  </dt>
                  <dd className="text-right font-mono">
                    {format.durationDetail}
                  </dd>
                  <dt className="font-semibold uppercase tracking-wider text-zinc-500">
                    Strategy
                  </dt>
                  <dd className="text-right leading-5">{format.strategy}</dd>
                </dl>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="mt-2 cursor-not-allowed rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                >
                  Queue locked · launching in Phase 2
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Live score race mock */}
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              The heart of Arena: live score race
            </h2>
            <span className="text-xs text-zinc-500">Bullet (60s) · demo</span>
          </div>
          <ScoreRaceMock />
        </section>

        {/* Vision */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            What it ships with
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {VISION_BULLETS.map((bullet) => (
              <li
                key={bullet.title}
                className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {bullet.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {bullet.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="rounded-lg border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Until Arena lands, race the clock solo
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            The Daily Challenge already has a global leaderboard, and Quick
            Play tracks your 3BV/s and best times. Sharpen your patterns in
            the Academy so you&apos;re ready when the queues open.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/daily"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Today&apos;s daily →
            </Link>
            <Link
              href="/play"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Quick play
            </Link>
            <Link
              href="/learn"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Academy
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
