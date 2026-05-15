export type DailyConfig = {
  difficulty: "beginner" | "intermediate" | "expert";
  rows: number;
  cols: number;
  mineCount: number;
};

/**
 * Date in UTC, formatted as YYYY-MM-DD. Use UTC consistently so all players
 * worldwide see the same "today's challenge" at the same instant — the
 * countdown ticks to UTC midnight regardless of viewer timezone.
 */
export function todayUtcDateString(now: Date): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const d = now.getUTCDate();
  return `${y}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

/**
 * Seed for today's daily challenge. Prefixed with "daily-" so it can't collide
 * with quick-play's randomly generated seeds.
 */
export function dailySeed(dateString: string): string {
  return `daily-${dateString}`;
}

/**
 * Board parameters for the daily challenge. Intermediate every day for MVP —
 * we can rotate by day-of-week later without breaking historical daily_results
 * since each row carries its own challenge metadata.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dailyConfig(dateString: string): DailyConfig {
  return {
    difficulty: "intermediate",
    rows: 16,
    cols: 16,
    mineCount: 40,
  };
}
