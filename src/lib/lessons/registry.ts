import type { Lesson, LessonCategory } from "./types";
import { oneOneReduction } from "./content/one-one-reduction";
import { oneTwoOne } from "./content/one-two-one";
import { oneTwoTwoOne } from "./content/one-two-two-one";
import { probabilityBasics } from "./content/probability-basics";
import { cornerEdgeLogic, flagDiscipline } from "./content/stubs";

/**
 * Ordered registry — also drives the catalog rendering order. Keep
 * difficulty-ascending within each category so the catalog reads naturally.
 */
export const LESSONS: ReadonlyArray<Lesson> = [
  oneOneReduction,
  oneTwoOne,
  oneTwoTwoOne,
  cornerEdgeLogic,
  flagDiscipline,
  probabilityBasics,
];

const BY_SLUG = new Map(LESSONS.map((l) => [l.slug, l]));

export function getLesson(slug: string): Lesson | null {
  return BY_SLUG.get(slug) ?? null;
}

export type LessonsByCategory = {
  category: LessonCategory;
  lessons: Lesson[];
};

const CATEGORY_ORDER: LessonCategory[] = [
  "patterns",
  "openings",
  "endgame",
  "probability",
];

const CATEGORY_LABEL: Record<LessonCategory, string> = {
  patterns: "Patterns",
  openings: "Openings & flags",
  endgame: "Endgame",
  probability: "Probability",
};

export function lessonsByCategory(): LessonsByCategory[] {
  const buckets = new Map<LessonCategory, Lesson[]>();
  for (const cat of CATEGORY_ORDER) buckets.set(cat, []);
  for (const lesson of LESSONS) {
    const arr = buckets.get(lesson.category);
    if (arr) arr.push(lesson);
  }
  return CATEGORY_ORDER.filter((cat) => buckets.get(cat)!.length > 0).map(
    (cat) => ({ category: cat, lessons: buckets.get(cat)! }),
  );
}

export function categoryLabel(cat: LessonCategory): string {
  return CATEGORY_LABEL[cat];
}
