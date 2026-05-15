import type { Metadata } from "next";
import {
  getDailyLeaderboard,
  getMyDailyResult,
  getOrCreateTodaysChallenge,
} from "@/lib/db/daily";
import { createClient } from "@/lib/supabase/server";
import { DailyView } from "@/components/daily/DailyView";

export const metadata: Metadata = {
  title: "Daily Challenge — Minesweeper Academy",
};

// Generate today's challenge fresh on every request so the page is always
// in sync with UTC. Caching would make the day-rollover feel laggy.
export const dynamic = "force-dynamic";

export default async function DailyPage() {
  const supabase = await createClient();
  const claimsResp = await supabase.auth.getClaims();
  const userId = claimsResp.data?.claims?.sub ?? null;

  const challenge = await getOrCreateTodaysChallenge();
  const [leaderboard, myResult] = await Promise.all([
    getDailyLeaderboard(challenge.date),
    userId ? getMyDailyResult(userId, challenge.date) : Promise.resolve(null),
  ]);

  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <DailyView
        challenge={challenge}
        myResult={myResult}
        leaderboard={leaderboard}
        signedIn={userId !== null}
      />
    </main>
  );
}
