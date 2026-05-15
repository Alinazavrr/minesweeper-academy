import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonAnalytics } from "@/components/analytics/LessonAnalytics";
import { Markdown } from "@/components/coach/Markdown";
import { DemoBoard } from "@/components/lessons/DemoBoard";
import { PracticeRunner } from "@/components/lessons/PracticeRunner";
import { LESSONS, categoryLabel, getLesson } from "@/lib/lessons/registry";

type RouteParams = { slug: string };

export function generateStaticParams(): RouteParams[] {
  return LESSONS.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata(props: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const lesson = getLesson(slug);
  if (!lesson) return { title: "Lesson not found" };
  const title = `${lesson.title} — Minesweeper Academy`;
  return {
    title,
    description: lesson.summary,
    openGraph: {
      title: `${lesson.title} · Minesweeper Academy`,
      description: lesson.summary,
    },
  };
}

export default async function LessonPage(props: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await props.params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  return (
    <main className="flex flex-1 flex-col px-4 py-10">
      <LessonAnalytics
        slug={lesson.slug}
        difficulty={lesson.difficulty}
        isStub={Boolean(lesson.isStub)}
      />
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/learn"
              className="font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              ← Academy
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-zinc-500">{categoryLabel(lesson.category)}</span>
          </nav>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {lesson.title}
          </h1>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {lesson.summary}
          </p>
        </header>

        {lesson.demo ? (
          <section className="flex flex-col items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              The pattern
            </p>
            <DemoBoard board={lesson.demo} />
          </section>
        ) : null}

        <section className="text-zinc-800 dark:text-zinc-200">
          <Markdown text={lesson.body} />
        </section>

        {lesson.practice ? (
          <PracticeRunner
            practice={lesson.practice}
            lessonSlug={lesson.slug}
          />
        ) : (
          <section className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
            Practice board coming soon. In the meantime, go play a Quick Play
            round and look for this pattern in the wild.
          </section>
        )}

        <footer className="flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <Link
            href="/learn"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            ← Back to Academy
          </Link>
          <Link
            href="/play"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Quick Play →
          </Link>
        </footer>
      </article>
    </main>
  );
}
