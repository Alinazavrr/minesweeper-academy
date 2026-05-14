import "server-only";

import OpenAI from "openai";

let cached: OpenAI | undefined;

export function getOpenAI(): OpenAI {
  if (!cached) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    cached = new OpenAI({ apiKey });
  }
  return cached;
}

export const COACH_MODEL = process.env.OPENAI_COACH_MODEL ?? "gpt-4o-mini";
