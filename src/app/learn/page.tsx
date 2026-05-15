import type { Metadata } from "next";
import Link from "next/link";
import { categoryLabel, lessonsByCategory } from "@/lib/lessons/registry";

export const metadata: Metadata = {
  title: "Academy — Minesweeper Academy",
  description:
    "Learn the patterns that turn Minesweeper from luck into logic — from the 1-1 reduction up to probability-aware guessing.",
  openGraph: {
    title: "Minesweeper Academy",
    description:
      "Lessons on the patterns that make Minesweeper a logic game, not a luck game.",
  },
};

const DIFFICULTY_BADGE: Record<"beginner" | "intermediate" | "advanced", string> =
  {
    beginner:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
    intermediate:
      "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
    advanced:
      "bg-purple-100 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200",
  };

export default function AcademyCatalogPage() {
  const grouped = lessonsByCategory();
  return (
    <main className="flex flex-1 flex-col px-4 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Academy
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Lessons on the patterns that make Minesweeper a logic game, not a
            luck game. Every page is public — no account needed to read or
            practice.
          </p>
        </header>

        {grouped.map(({ category, lessons }) => (
          <section key={category} className="flex flex-col gap-3">
            <h2 className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              {categoryLabel(category)}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {lessons.map((lesson) => (
                <li key={lesson.slug}>
                  <Link
                    href={`/learn/${lesson.slug}`}
                    className="flex h-full flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-700"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${DIFFICULTY_BADGE[lesson.difficulty]}`}
                      >
                        {lesson.difficulty}
                      </span>
                      {lesson.isStub ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Concept
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                          Practice
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                      {lesson.title}
                    </h3>
                    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {lesson.summary}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
