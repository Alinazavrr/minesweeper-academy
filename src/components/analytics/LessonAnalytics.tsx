"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

type Props = {
  slug: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  isStub: boolean;
};

export function LessonAnalytics({ slug, difficulty, isStub }: Props) {
  useEffect(() => {
    track("lesson_view", { slug, difficulty, is_stub: isStub });
  }, [slug, difficulty, isStub]);
  return null;
}
