"use server";

import { revalidatePath } from "next/cache";
import { formatSubscriptionTier, parseSubscriptionTier } from "@/lib/billing/tiers";
import { fakePurchaseSubscription } from "@/lib/db/subscriptions";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionTier } from "@/lib/billing/tiers";

export type ChangeSubscriptionTierState =
  | { status: "idle"; message: string; tier: null }
  | { status: "success"; message: string; tier: SubscriptionTier }
  | { status: "error"; message: string; tier: null };

export async function changeSubscriptionTierAction(
  _state: ChangeSubscriptionTierState,
  formData: FormData,
): Promise<ChangeSubscriptionTierState> {
  const targetTier = parseSubscriptionTier(formData.get("tier"));
  if (!targetTier) {
    return {
      status: "error",
      message: "Choose a valid subscription tier.",
      tier: null,
    };
  }

  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (claims.error || !claims.data?.claims?.sub) {
    return {
      status: "error",
      message: "Sign in before changing your subscription tier.",
      tier: null,
    };
  }

  try {
    const subscription = await fakePurchaseSubscription(targetTier);
    revalidatePath("/account");
    revalidatePath("/coach");

    return {
      status: "success",
      message:
        subscription.tier === "free"
          ? "Downgraded to Free."
          : `${formatSubscriptionTier(subscription.tier)} unlocked.`,
      tier: subscription.tier,
    };
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error
          ? err.message
          : "Could not update your subscription tier.",
      tier: null,
    };
  }
}
