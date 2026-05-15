import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CoachLayout } from "@/components/coach/CoachLayout";
import {
  getActiveConversation,
  getCoachUsage,
  getConversationById,
  listConversations,
} from "@/lib/db/coach";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "AI Coach — Minesweeper Academy",
};

export const dynamic = "force-dynamic";

type SearchParams = { conversation?: string | string[] };

export default async function CoachPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const claimsResp = await supabase.auth.getClaims();
  const userId = claimsResp.data?.claims?.sub;
  if (!userId) {
    redirect("/auth?mode=sign-in&next=/coach");
  }

  const sp = await props.searchParams;
  const requestedId = Array.isArray(sp.conversation)
    ? sp.conversation[0]
    : sp.conversation;

  const [conversations, usage] = await Promise.all([
    listConversations(userId),
    getCoachUsage(userId),
  ]);

  const selected = requestedId
    ? await getConversationById(userId, requestedId)
    : await getActiveConversation(userId);

  const initialMessages = (selected?.messages ?? [])
    .filter(
      (m): m is { role: "user" | "assistant"; content: string; created_at: string } =>
        m.role === "user" || m.role === "assistant",
    )
    .map((m) => ({ role: m.role, content: m.content }));

  return (
    <main className="flex flex-1 flex-col px-4 py-6">
      <nav className="mx-auto mb-3 w-full max-w-6xl">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          ← Minesweeper Academy
        </Link>
      </nav>
      <CoachLayout
        conversations={conversations}
        selectedId={selected?.id ?? null}
        initialMessages={initialMessages}
        initialUsage={usage}
        conversationKind={selected?.kind ?? "free_chat"}
        conversationTitle={selected?.title ?? null}
        reviewGameId={selected?.game_id ?? null}
      />
    </main>
  );
}
