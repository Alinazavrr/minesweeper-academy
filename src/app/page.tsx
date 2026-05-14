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
        <p className="text-sm text-zinc-500">
          The product is being built. Check back as features ship.
        </p>
      </div>
    </main>
  );
}
