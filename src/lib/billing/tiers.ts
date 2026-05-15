import type { Database } from "@/types/supabase";

export type SubscriptionTier = Database["public"]["Enums"]["subscription_tier"];
export type SubscriptionGrantedVia =
  Database["public"]["Enums"]["subscription_granted_via"];

export type SubscriptionGrant = {
  tier: SubscriptionTier;
  granted_via: SubscriptionGrantedVia;
  granted_at: string | null;
  valid_until: string | null;
};

export type SubscriptionTierOption = {
  id: SubscriptionTier;
  name: string;
  price: string;
  coachLimit: number;
  features: string[];
};

export const subscriptionTierOptions = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    coachLimit: 5,
    features: [
      "Quick Play and Daily Challenge",
      "5 Coach messages per day",
      "Recent games and basic stats",
    ],
  },
  {
    id: "pro_lite",
    name: "Pro Lite",
    price: "$4",
    coachLimit: 20,
    features: [
      "20 Coach messages per day",
      "Advanced analytics panels",
      "Post-game review preview",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$8",
    coachLimit: 100,
    features: [
      "100 Coach messages per day",
      "Full post-game review",
      "Priority analytics and ad-free polish",
    ],
  },
] as const satisfies SubscriptionTierOption[];

export const coachLimitByTier = Object.fromEntries(
  subscriptionTierOptions.map((tier) => [tier.id, tier.coachLimit]),
) as Record<SubscriptionTier, number>;

const subscriptionTierSet = new Set<SubscriptionTier>(
  subscriptionTierOptions.map((tier) => tier.id),
);

export function parseSubscriptionTier(value: unknown): SubscriptionTier | null {
  if (typeof value !== "string") return null;
  return subscriptionTierSet.has(value as SubscriptionTier)
    ? (value as SubscriptionTier)
    : null;
}

export function buildSubscriptionGrant(
  tier: SubscriptionTier,
  now = new Date(),
): SubscriptionGrant {
  if (tier === "free") {
    return {
      tier,
      granted_via: "free_default",
      granted_at: null,
      valid_until: null,
    };
  }

  return {
    tier,
    granted_via: "fake_purchase",
    granted_at: now.toISOString(),
    valid_until: null,
  };
}

export function formatSubscriptionTier(tier: SubscriptionTier): string {
  return subscriptionTierOptions.find((option) => option.id === tier)!.name;
}
