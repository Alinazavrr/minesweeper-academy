import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  SubscriptionGrantedVia,
  SubscriptionTier,
} from "@/lib/billing/tiers";

export type SubscriptionView = {
  tier: SubscriptionTier;
  granted_via: SubscriptionGrantedVia;
  granted_at: string | null;
  valid_until: string | null;
};

export async function fakePurchaseSubscription(
  targetTier: SubscriptionTier,
): Promise<SubscriptionView> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fake_purchase_subscription", {
    target_tier: targetTier,
  });

  if (error) throw error;

  const row = data?.[0];
  if (!row) {
    throw new Error("fake_purchase_subscription returned no subscription row");
  }

  return {
    tier: row.tier,
    granted_via: row.granted_via,
    granted_at: row.granted_at ?? null,
    valid_until: row.valid_until ?? null,
  };
}
