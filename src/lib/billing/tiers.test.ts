import { describe, expect, it } from "vitest";
import {
  buildSubscriptionGrant,
  coachLimitByTier,
  formatSubscriptionTier,
  parseSubscriptionTier,
  subscriptionTierOptions,
} from "./tiers";

describe("subscription tier helpers", () => {
  it("accepts only known subscription tiers", () => {
    expect(parseSubscriptionTier("free")).toBe("free");
    expect(parseSubscriptionTier("pro_lite")).toBe("pro_lite");
    expect(parseSubscriptionTier("pro")).toBe("pro");
    expect(parseSubscriptionTier("team")).toBeNull();
    expect(parseSubscriptionTier(null)).toBeNull();
  });

  it("builds a fake-purchase grant for paid tiers", () => {
    const grant = buildSubscriptionGrant(
      "pro",
      new Date("2026-05-15T08:30:00.000Z"),
    );

    expect(grant).toEqual({
      tier: "pro",
      granted_via: "fake_purchase",
      granted_at: "2026-05-15T08:30:00.000Z",
      valid_until: null,
    });
  });

  it("builds a free-default grant when downgrading to free", () => {
    const grant = buildSubscriptionGrant(
      "free",
      new Date("2026-05-15T08:30:00.000Z"),
    );

    expect(grant).toEqual({
      tier: "free",
      granted_via: "free_default",
      granted_at: null,
      valid_until: null,
    });
  });

  it("formats user-facing tier labels", () => {
    expect(formatSubscriptionTier("free")).toBe("Free");
    expect(formatSubscriptionTier("pro_lite")).toBe("Pro Lite");
    expect(formatSubscriptionTier("pro")).toBe("Pro");
  });

  it("keeps pricing cards in upgrade order", () => {
    expect(subscriptionTierOptions.map((tier) => tier.id)).toEqual([
      "free",
      "pro_lite",
      "pro",
    ]);
  });

  it("uses the same Coach limits as the tier cards", () => {
    expect(coachLimitByTier).toEqual({
      free: 5,
      pro_lite: 20,
      pro: 100,
    });
  });
});
