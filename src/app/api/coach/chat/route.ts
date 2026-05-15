import { z } from "zod";
import { COACH_MODEL, getOpenAI } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import {
  bumpUsage,
  createConversation,
  DAILY_LIMIT_BY_TIER,
  getCoachUsage,
  getConversationMessages,
  persistMessage,
  touchConversationLastMessage,
  type CoachMessage,
} from "@/lib/db/coach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().min(1).max(4000),
});

const SYSTEM_PROMPT = `You are an expert Minesweeper coach helping a player improve. Be concise and technical.

Reference standard deduction patterns by name when relevant: 1-1 reduction, 1-2-1, 1-2-2-1, 1-1+1 chain, and corner / edge patterns.

When the player asks "should I click X?" — first deduce whether X is logically safe, logically a mine, or only probabilistically known. Show the constraint, not just the answer.

Don't play for the user — explain what you'd look at and why. If they're stuck, suggest the most informative next click rather than handing over the whole solution.

Keep replies under ~250 words unless the question genuinely needs more. Markdown is fine.`;

type SsePayload =
  | { kind: "init"; conversationId: string }
  | { kind: "delta"; text: string }
  | { kind: "done"; inputTokens: number; outputTokens: number }
  | { kind: "error"; message: string };

function sseLine(payload: SsePayload): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Body must be JSON");
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "invalid_payload", parsed.error.message);
  }

  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (claims.error || !claims.data?.claims?.sub) {
    return jsonError(401, "unauthenticated", "Sign in to use the Coach");
  }
  const userId = claims.data.claims.sub;

  const usage = await getCoachUsage(userId);
  if (usage.remaining <= 0) {
    return Response.json(
      {
        error: "rate_limited",
        message: `Daily Coach limit reached (${usage.limit}/${usage.limit} for ${usage.tier}). Resets at 00:00 UTC.`,
        tier: usage.tier,
        limit: usage.limit,
      },
      { status: 429 },
    );
  }

  // Resolve conversation: use the one the client supplied if it belongs to
  // them, otherwise mint a fresh one.
  let conversationId = parsed.data.conversationId ?? null;
  let history: CoachMessage[] = [];
  if (conversationId) {
    const fetched = await getConversationMessages(userId, conversationId);
    if (fetched === null) {
      // Either doesn't exist or isn't theirs. Treat as no conversation.
      conversationId = null;
    } else {
      history = fetched;
    }
  }
  if (!conversationId) {
    conversationId = await createConversation(userId);
  }
  const finalConversationId = conversationId;

  // Persist the user message before streaming so the server's record of the
  // exchange is monotonic even if the stream crashes.
  await persistMessage(finalConversationId, "user", parsed.data.message);

  const openai = getOpenAI();
  const openaiMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: parsed.data.message },
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let assistantText = "";
      let inputTokens = 0;
      let outputTokens = 0;
      try {
        controller.enqueue(
          encoder.encode(
            sseLine({ kind: "init", conversationId: finalConversationId }),
          ),
        );

        const completion = await openai.chat.completions.create({
          model: COACH_MODEL,
          stream: true,
          stream_options: { include_usage: true },
          messages: openaiMessages,
          temperature: 0.4,
        });

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            assistantText += delta;
            controller.enqueue(encoder.encode(sseLine({ kind: "delta", text: delta })));
          }
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? 0;
            outputTokens = chunk.usage.completion_tokens ?? 0;
          }
        }

        // Persist + bump usage regardless of whether the assistant produced
        // text — empty replies still count as a message against the rate
        // limit (one round-trip == one consumption).
        await persistMessage(
          finalConversationId,
          "assistant",
          assistantText,
          {
            token_count_input: inputTokens || null,
            token_count_output: outputTokens || null,
            model: COACH_MODEL,
          },
        );
        await bumpUsage(userId, inputTokens + outputTokens);
        await touchConversationLastMessage(finalConversationId);

        controller.enqueue(
          encoder.encode(sseLine({ kind: "done", inputTokens, outputTokens })),
        );
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Coach stream failed";
        // Best-effort persistence of whatever we already streamed.
        if (assistantText.length > 0) {
          try {
            await persistMessage(
              finalConversationId,
              "assistant",
              assistantText,
              {
                token_count_input: inputTokens || null,
                token_count_output: outputTokens || null,
                model: COACH_MODEL,
              },
            );
            await bumpUsage(userId, inputTokens + outputTokens);
          } catch {
            // Swallow — we're already in an error path.
          }
        }
        controller.enqueue(encoder.encode(sseLine({ kind: "error", message })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Coach-Limit": String(DAILY_LIMIT_BY_TIER[usage.tier]),
      "X-Coach-Remaining": String(Math.max(0, usage.remaining - 1)),
    },
  });
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: code, message }, { status });
}
