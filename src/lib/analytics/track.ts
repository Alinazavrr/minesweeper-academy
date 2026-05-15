/**
 * Lightweight client-side analytics — no SDK dependency.
 *
 * If `NEXT_PUBLIC_POSTHOG_KEY` is set, every call POSTs to PostHog's
 * `/capture/` endpoint. Otherwise the call is a no-op (with a
 * `console.debug` in dev so wiring is verifiable without a real key).
 *
 * Server-side rendering callers get a noop — this module is meant to be
 * imported only from "use client" components.
 */

export type AnalyticsEvent =
  | "landing_view"
  | "lesson_view"
  | "daily_complete"
  | "share_card_copied"
  | "share_card_tweet_intent"
  | "coach_message_sent"
  | "post_game_review_opened"
  | "pro_modal_view";

type Properties = Record<string, string | number | boolean | null | undefined>;

const POSTHOG_KEY =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ""
    : "";
const POSTHOG_HOST =
  (typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? ""
    : "") || "https://us.i.posthog.com";

const IS_DEV =
  typeof process !== "undefined" && process.env.NODE_ENV !== "production";

/**
 * Per-tab anonymous distinct id. Survives reloads via sessionStorage —
 * good enough for funnel analysis without persistent identifiers. If the
 * user signs in, a future `identify()` call can alias to their user_id.
 */
function getDistinctId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.sessionStorage.getItem("ms_did");
    if (existing) return existing;
    const fresh = `anon_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    window.sessionStorage.setItem("ms_did", fresh);
    return fresh;
  } catch {
    return "anon_storageless";
  }
}

export function track(
  event: AnalyticsEvent,
  properties: Properties = {},
): void {
  if (typeof window === "undefined") return;

  if (IS_DEV) {
    console.debug("[analytics]", event, properties);
  }

  if (!POSTHOG_KEY) return;

  const payload = {
    api_key: POSTHOG_KEY,
    event,
    distinct_id: getDistinctId(),
    properties: {
      ...properties,
      $current_url: window.location.href,
      $pathname: window.location.pathname,
    },
    timestamp: new Date().toISOString(),
  };

  // Fire-and-forget — never block the UI on a tracking call. Use keepalive
  // so the request survives a navigation immediately after.
  fetch(`${POSTHOG_HOST}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Swallow — analytics failures must never surface to the user.
  });
}
