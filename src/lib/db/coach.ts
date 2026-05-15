import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { todayUtcDateString } from "@/lib/games/daily";
import type { Database } from "@/types/supabase";

type Tier = Database["public"]["Enums"]["subscription_tier"];

export const DAILY_LIMIT_BY_TIER: Record<Tier, number> = {
  free: 5,
  pro_lite: 20,
  pro: 100,
};

export type CoachMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export type ConversationView = {
  id: string;
  title: string | null;
  created_at: string;
  last_message_at: string;
  messages: CoachMessage[];
};

export type CoachUsageView = {
  tier: Tier;
  limit: number;
  used: number;
  remaining: number;
};

export async function getCoachUsage(userId: string): Promise<CoachUsageView> {
  const supabase = await createClient();
  const today = todayUtcDateString(new Date());
  const [subResp, usageResp] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("coach_usage_daily")
      .select("message_count")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle(),
  ]);
  const tier: Tier = subResp.data?.tier ?? "free";
  const limit = DAILY_LIMIT_BY_TIER[tier];
  const used = usageResp.data?.message_count ?? 0;
  return { tier, limit, used, remaining: Math.max(0, limit - used) };
}

/**
 * Returns the user's most recent free-chat conversation along with its full
 * message history. If none exists yet, returns null — the route handler will
 * create one on the next send.
 */
export async function getActiveConversation(
  userId: string,
): Promise<ConversationView | null> {
  const supabase = await createClient();
  const convResp = await supabase
    .from("coach_conversations")
    .select("id, title, created_at, last_message_at")
    .eq("user_id", userId)
    .eq("kind", "free_chat")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!convResp.data) return null;
  const conv = convResp.data;

  const msgResp = await supabase
    .from("coach_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true });
  return {
    id: conv.id,
    title: conv.title,
    created_at: conv.created_at,
    last_message_at: conv.last_message_at,
    messages: (msgResp.data ?? []) as CoachMessage[],
  };
}

export async function getConversationMessages(
  userId: string,
  conversationId: string,
): Promise<CoachMessage[] | null> {
  const supabase = await createClient();
  // Verify ownership before reading. RLS would block other users' rows but a
  // missing row is easier to handle here than a silently empty array.
  const conv = await supabase
    .from("coach_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!conv.data) return null;
  const msgResp = await supabase
    .from("coach_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (msgResp.data ?? []) as CoachMessage[];
}

export async function createConversation(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_conversations")
    .insert({ user_id: userId, kind: "free_chat", title: null })
    .select("id")
    .single();
  if (error || !data) {
    throw error ?? new Error("Failed to create conversation");
  }
  return data.id;
}

/**
 * Inserts a coach_messages row. coach_messages has no INSERT RLS policy so
 * this MUST use the service-role client — preventing users from forging an
 * 'assistant' role message in their own history.
 */
export async function persistMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  meta?: {
    token_count_input?: number | null;
    token_count_output?: number | null;
    model?: string | null;
  },
): Promise<void> {
  const service = createServiceClient();
  const { error } = await service.from("coach_messages").insert({
    conversation_id: conversationId,
    role,
    content,
    token_count_input: meta?.token_count_input ?? null,
    token_count_output: meta?.token_count_output ?? null,
    model: meta?.model ?? null,
  });
  if (error) throw error;
}

/**
 * Bumps coach_usage_daily for the user. Uses service-role to bypass the
 * no-write RLS on this table.
 */
export async function bumpUsage(
  userId: string,
  tokensDelta: number,
): Promise<void> {
  const service = createServiceClient();
  const today = todayUtcDateString(new Date());
  // PostgREST doesn't expose atomic increment cleanly without an RPC; read +
  // upsert is fine here because the user is the only writer for their row and
  // the route handler serializes their requests on the network level.
  const cur = await service
    .from("coach_usage_daily")
    .select("message_count, token_count")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();
  const nextCount = (cur.data?.message_count ?? 0) + 1;
  const nextTokens = (cur.data?.token_count ?? 0) + Math.max(0, tokensDelta | 0);
  const { error } = await service
    .from("coach_usage_daily")
    .upsert(
      {
        user_id: userId,
        date: today,
        message_count: nextCount,
        token_count: nextTokens,
      },
      { onConflict: "user_id,date" },
    );
  if (error) throw error;
}

export async function touchConversationLastMessage(
  conversationId: string,
): Promise<void> {
  const service = createServiceClient();
  await service
    .from("coach_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
}
