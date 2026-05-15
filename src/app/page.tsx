import Link from "next/link";
import { ENGINE_VERSION } from "@minesweeper/engine";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="max-w-2xl space-y-6">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Engine v{ENGINE_VERSION} · scaffold online
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
          Minesweeper Academy + Arena
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          A training and competitive platform for Minesweeper players — Chess.com
          for logic lovers.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/daily"
            className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            Daily challenge →
          </Link>
          <Link
            href="/play"
            className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Quick play
          </Link>
          <Link
            href="/auth?mode=sign-up"
            className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Sign in
          </Link>
        </div>
        <p className="text-sm text-zinc-500">
          The product is being built. Check back as features ship.
        </p>
      </div>
    </main>
  );
}
