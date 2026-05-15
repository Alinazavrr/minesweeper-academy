import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CoachChat } from "@/components/coach/CoachChat";
import {
  getActiveConversation,
  getCoachUsage,
} from "@/lib/db/coach";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "AI Coach — Minesweeper Academy",
};

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const supabase = await createClient();
  const claimsResp = await supabase.auth.getClaims();
  const userId = claimsResp.data?.claims?.sub;
  if (!userId) {
    redirect("/auth?mode=sign-in&next=/coach");
  }

  const [conversation, usage] = await Promise.all([
    getActiveConversation(userId),
    getCoachUsage(userId),
  ]);

  const initialMessages = (conversation?.messages ?? [])
    .filter((m): m is { role: "user" | "assistant"; content: string; created_at: string } =>
      m.role === "user" || m.role === "assistant",
    )
    .map((m) => ({ role: m.role, content: m.content }));

  return (
    <main className="flex flex-1 flex-col px-4 py-6">
      <nav className="mx-auto mb-3 w-full max-w-3xl">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          ← Minesweeper Academy
        </Link>
      </nav>
      <CoachChat
        initialConversationId={conversation?.id ?? null}
        initialMessages={initialMessages}
        initialUsage={usage}
      />
    </main>
  );
}
