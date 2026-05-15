"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

export type ConversationListItem = {
  id: string;
  title: string | null;
  kind: "free_chat" | "post_game_review";
  game_id: string | null;
  last_message_at: string;
};

type Props = {
  items: ConversationListItem[];
  selectedId: string | null;
  onNew: () => void;
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 7 * 86_400_000) return `${Math.floor(ms / 86_400_000)}d`;
  return new Intl.DateTimeFormat("en", { dateStyle: "short" }).format(d);
}

export function ConversationList({ items, selectedId, onNew }: Props) {
  return (
    <aside className="flex h-full flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.16em] text-zinc-500">
          Conversations
        </h2>
        <button
          type="button"
          onClick={onNew}
          className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-200"
        >
          + New
        </button>
      </div>
      <ol className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto pr-1 lg:max-h-none">
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed border-zinc-300 p-3 text-xs text-zinc-500 dark:border-zinc-700">
            No threads yet — send a message to start one.
          </li>
        ) : null}
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          const kindBadge =
            item.kind === "post_game_review" ? "Review" : "Chat";
          const kindClass =
            item.kind === "post_game_review"
              ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
              : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100";
          return (
            <li key={item.id}>
              <Link
                href={`/coach?conversation=${item.id}`}
                className={cn(
                  "flex flex-col gap-1 rounded-md border px-3 py-2 text-sm transition",
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/30"
                    : "border-transparent hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-800 dark:hover:bg-zinc-900",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      kindClass,
                    )}
                  >
                    {kindBadge}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatRelative(item.last_message_at)}
                  </span>
                </div>
                <span className="truncate text-zinc-900 dark:text-zinc-100">
                  {item.title ?? "Untitled thread"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
