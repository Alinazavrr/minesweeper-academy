import { describe, it, expect } from "vitest";
import { dailyConfig, dailySeed, todayUtcDateString } from "./daily";

describe("todayUtcDateString", () => {
  it("returns YYYY-MM-DD in UTC", () => {
    expect(todayUtcDateString(new Date("2026-05-15T12:00:00Z"))).toBe(
      "2026-05-15",
    );
  });

  it("uses UTC, not local time (date holds across timezone)", () => {
    // 2026-05-15 23:59:59 UTC is still 2026-05-15 regardless of local TZ.
    expect(todayUtcDateString(new Date("2026-05-15T23:59:59Z"))).toBe(
      "2026-05-15",
    );
    // One second later is the next UTC day.
    expect(todayUtcDateString(new Date("2026-05-16T00:00:00Z"))).toBe(
      "2026-05-16",
    );
  });

  it("zero-pads months and days", () => {
    expect(todayUtcDateString(new Date("2026-01-05T00:00:00Z"))).toBe(
      "2026-01-05",
    );
  });
});

describe("dailySeed", () => {
  it("derives a stable seed from the date string", () => {
    expect(dailySeed("2026-05-15")).toBe(dailySeed("2026-05-15"));
  });

  it("differs across dates", () => {
    expect(dailySeed("2026-05-15")).not.toBe(dailySeed("2026-05-16"));
  });

  it("is namespaced with a 'daily-' prefix so quick-play random seeds can't collide", () => {
    expect(dailySeed("2026-05-15").startsWith("daily-")).toBe(true);
  });
});

describe("dailyConfig", () => {
  it("returns Intermediate parameters by default", () => {
    const cfg = dailyConfig("2026-05-15");
    expect(cfg.difficulty).toBe("intermediate");
    expect(cfg.rows).toBe(16);
    expect(cfg.cols).toBe(16);
    expect(cfg.mineCount).toBe(40);
  });

  it("is deterministic across calls", () => {
    expect(dailyConfig("2026-05-15")).toEqual(dailyConfig("2026-05-15"));
  });
});
