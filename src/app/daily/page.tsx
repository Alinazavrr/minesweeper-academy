import type { Metadata } from "next";
import {
  getDailyLeaderboard,
  getMyDailyResult,
  getOrCreateTodaysChallenge,
} from "@/lib/db/daily";
import { createClient } from "@/lib/supabase/server";
import { DailyView } from "@/components/daily/DailyView";

type DailySearchParams = {
  date?: string | string[];
  difficulty?: string | string[];
  time?: string | string[];
  rank?: string | string[];
  name?: string | string[];
};

function pickFirst(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function generateMetadata(props: {
  searchParams: Promise<DailySearchParams>;
}): Promise<Metadata> {
  const sp = await props.searchParams;
  const params = new URLSearchParams();
  for (const key of ["date", "difficulty", "time", "rank", "name"] as const) {
    const v = pickFirst(sp[key]);
    if (v) params.set(key, v);
  }
  const ogUrl = `/api/daily/og${params.toString().length > 0 ? `?${params.toString()}` : ""}`;
  const title = "Daily Challenge — Minesweeper Academy";
  const description =
    "One board, one attempt — same board for every player worldwide. Resets at 00:00 UTC.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

// Generate today's challenge fresh on every request so the page is always
// in sync with UTC. Caching would make the day-rollover feel laggy.
export const dynamic = "force-dynamic";

export default async function DailyPage() {
  const supabase = await createClient();
  const claimsResp = await supabase.auth.getClaims();
  const userId = claimsResp.data?.claims?.sub ?? null;

  const challenge = await getOrCreateTodaysChallenge();
  const [leaderboard, myResult, profileResp] = await Promise.all([
    getDailyLeaderboard(challenge.date),
    userId ? getMyDailyResult(userId, challenge.date) : Promise.resolve(null),
    userId
      ? supabase
          .from("users")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const myDisplayName = profileResp.data?.display_name ?? null;
  const myRank =
    myResult === null
      ? null
      : (leaderboard.find((entry) => entry.user_id === userId)?.rank ?? null);

  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <DailyView
        challenge={challenge}
        myResult={myResult}
        leaderboard={leaderboard}
        signedIn={userId !== null}
        myDisplayName={myDisplayName}
        myRank={myRank}
      />
    </main>
  );
}
