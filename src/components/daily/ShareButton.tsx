"use client";

import { useCallback, useState } from "react";

type Props = {
  date: string;
  difficulty: string;
  timeMs: number;
  hintsUsed: number;
  rank?: number | null;
  /** Player display name to render on the OG card. Optional. */
  displayName?: string | null;
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function ShareButton({
  date,
  difficulty,
  timeMs,
  hintsUsed,
  rank,
  displayName,
}: Props) {
  const [copied, setCopied] = useState<"idle" | "copied" | "error">("idle");

  const buildShareUrl = useCallback(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://minesweeper.academy";
    const params = new URLSearchParams({
      date,
      difficulty,
      time: String(timeMs),
    });
    if (rank) params.set("rank", String(rank));
    if (displayName) params.set("name", displayName);
    // Pretty link points at /daily; OG image is at /api/daily/og with params.
    // Twitter / iMessage / Slack will scrape the page meta and find the OG.
    return {
      url: `${origin}/daily?${params.toString()}`,
      tweet: `${origin}/daily?${params.toString()}`,
    };
  }, [date, difficulty, displayName, rank, timeMs]);

  const onCopy = useCallback(async () => {
    const { url } = buildShareUrl();
    const hintsSuffix =
      hintsUsed === 0
        ? "no hints"
        : `${hintsUsed} hint${hintsUsed === 1 ? "" : "s"}`;
    const message = `I solved the Minesweeper Daily (${difficulty}) on ${date} in ${formatTime(timeMs)} · ${hintsSuffix}. Beat me: ${url}`;
    try {
      await navigator.clipboard.writeText(message);
      setCopied("copied");
      setTimeout(() => setCopied("idle"), 2000);
    } catch {
      setCopied("error");
      setTimeout(() => setCopied("idle"), 2000);
    }
  }, [buildShareUrl, date, difficulty, hintsUsed, timeMs]);

  const onTweet = useCallback(() => {
    const { url, tweet } = buildShareUrl();
    const text = `I solved today's Minesweeper Daily in ${formatTime(timeMs)}. Beat me: ${tweet}`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank", "noopener");
  }, [buildShareUrl, timeMs]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        onClick={onCopy}
        className="rounded-md border border-zinc-300 px-3 py-1.5 font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
      >
        {copied === "copied"
          ? "Copied!"
          : copied === "error"
            ? "Copy failed"
            : "Copy share text"}
      </button>
      <button
        type="button"
        onClick={onTweet}
        className="rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white transition hover:bg-emerald-500"
      >
        Share on X
      </button>
    </div>
  );
}
