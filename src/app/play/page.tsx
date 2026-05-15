import Link from "next/link";
import { QuickPlay } from "@/components/game/QuickPlay";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const metadata = {
  title: "Quick Play — Minesweeper Academy",
};

export default function PlayPage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <nav className="mx-auto mb-3 flex w-full max-w-4xl items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          ← Minesweeper Academy
        </Link>
        <ThemeToggle />
      </nav>
      <QuickPlay />
    </main>
  );
}
