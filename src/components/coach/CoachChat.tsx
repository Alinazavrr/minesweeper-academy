"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProTierDialog } from "@/components/billing/ProTierDialog";
import { Markdown } from "@/components/coach/Markdown";
import { cn } from "@/lib/cn";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type InitialUsage = {
  tier: "free" | "pro_lite" | "pro";
  limit: number;
  used: number;
  remaining: number;
};

type Props = {
  initialConversationId: string | null;
  initialMessages: Message[];
  initialUsage: InitialUsage;
  conversationKind?: "free_chat" | "post_game_review";
  conversationTitle?: string | null;
  reviewGameId?: string | null;
};

type SseEvent =
  | { kind: "init"; conversationId: string }
  | { kind: "delta"; text: string }
  | { kind: "done"; inputTokens: number; outputTokens: number }
  | { kind: "error"; message: string };

function parseSse(buffer: string): { events: SseEvent[]; remainder: string } {
  const parts = buffer.split("\n\n");
  const remainder = parts.pop() ?? "";
  const events: SseEvent[] = [];
  for (const part of parts) {
    if (!part.startsWith("data: ")) continue;
    try {
      events.push(JSON.parse(part.slice(6)) as SseEvent);
    } catch {
      // Drop malformed events silently — the server is the only writer.
    }
  }
  return { events, remainder };
}

export function CoachChat({
  initialConversationId,
  initialMessages,
  initialUsage,
  conversationKind = "free_chat",
  conversationTitle = null,
  reviewGameId = null,
}: Props) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(initialUsage.remaining);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Switching threads remounts via `key` in CoachLayout — no in-component
  // prop-sync useEffect needed (would trigger react-hooks/set-state-in-effect).

  // Keep the message list scrolled to the bottom as content streams in.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (busy || trimmed.length === 0) return;
    if (remaining <= 0) {
      setError("Daily limit reached. Try again after 00:00 UTC.");
      return;
    }
    setError(null);
    setInput("");
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "" },
    ]);

    let res: Response;
    try {
      res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: trimmed,
        }),
      });
    } catch (err) {
      setBusy(false);
      const msg = err instanceof Error ? err.message : "Network error";
      setError(msg);
      // Roll back the optimistic user + empty-assistant pair.
      setMessages((prev) => prev.slice(0, -2));
      setInput(trimmed);
      return;
    }

    if (res.status === 429 || (res.status >= 400 && !res.body)) {
      const body = await res.json().catch(() => ({}));
      setError(body?.message ?? `Request failed (${res.status})`);
      setMessages((prev) => prev.slice(0, -2));
      setInput(trimmed);
      setBusy(false);
      if (res.status === 429) setRemaining(0);
      return;
    }

    if (!res.body) {
      setError("No response body");
      setMessages((prev) => prev.slice(0, -2));
      setInput(trimmed);
      setBusy(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, remainder } = parseSse(buffer);
        buffer = remainder;
        for (const ev of events) {
          if (ev.kind === "init") {
            setConversationId(ev.conversationId);
          } else if (ev.kind === "delta") {
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const last = prev[prev.length - 1]!;
              if (last.role !== "assistant") return prev;
              const next = prev.slice();
              next[next.length - 1] = {
                ...last,
                content: last.content + ev.text,
              };
              return next;
            });
          } else if (ev.kind === "done") {
            setRemaining((r) => Math.max(0, r - 1));
          } else if (ev.kind === "error") {
            setError(ev.message);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stream error";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [busy, conversationId, input, remaining]);

  const newConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setInput("");
    router.push("/coach");
  }, [router]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col gap-3">
      <header className="flex flex-col gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            AI Coach
          </h1>
          {conversationKind === "post_game_review" ? (
            <p className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-semibold uppercase tracking-wider text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Review
              </span>
              {conversationTitle ?? "Post-game review"}
              {reviewGameId ? (
                <a
                  href={`/games/${reviewGameId}/review`}
                  className="underline decoration-dotted hover:decoration-solid"
                >
                  ↗ open replay
                </a>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span>
            {remaining} / {initialUsage.limit} left today
            <span className="ml-1 uppercase tracking-wider opacity-70">
              · {initialUsage.tier}
            </span>
          </span>
          {initialUsage.tier !== "pro" ? (
            <ProTierDialog
              currentTier={initialUsage.tier}
              triggerLabel="Upgrade"
              triggerClassName="px-2 py-1 text-xs"
            />
          ) : null}
          <button
            type="button"
            onClick={newConversation}
            className="rounded border border-zinc-300 px-2 py-1 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-200"
          >
            New conversation
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex min-h-[24rem] flex-1 flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.length === 0 ? (
          <div className="m-auto max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
            Ask anything about Minesweeper — openings, patterns, when to guess.
            <br />
            Try: <em>What&apos;s the 1-2-1 pattern?</em>
          </div>
        ) : (
          messages.map((m, i) => <MessageBubble key={i} message={m} />)
        )}
      </div>

      {error !== null ? (
        <div
          role="alert"
          className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask the Coach…"
          rows={3}
          disabled={busy || remaining <= 0}
          className="flex-1 resize-y rounded-md border border-zinc-300 bg-white p-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || input.trim().length === 0 || remaining <= 0}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-emerald-500"
        >
          {busy ? "Streaming…" : "Send"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">⌘/Ctrl+Enter to send.</p>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  if (!message.content) {
    return (
      <div
        className={cn(
          "flex w-full",
          isUser ? "justify-end" : "justify-start",
        )}
      >
        <div className="max-w-[85%] rounded-2xl bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">
          <span className="inline-block animate-pulse text-zinc-500">…</span>
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
          isUser
            ? "whitespace-pre-wrap bg-emerald-600 text-white"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
        )}
      >
        {isUser ? message.content : <Markdown text={message.content} />}
      </div>
    </div>
  );
}
