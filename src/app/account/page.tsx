import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export const metadata: Metadata = {
  title: "Account - Minesweeper Academy",
};

type UserProfile = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "email" | "display_name" | "created_at"
>;
type Subscription = Pick<
  Database["public"]["Tables"]["subscriptions"]["Row"],
  "tier" | "granted_via" | "granted_at"
>;
type UserCurrency = Pick<
  Database["public"]["Tables"]["user_currency"]["Row"],
  "mines_balance" | "total_earned"
>;

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/auth?mode=sign-in&next=/account");
  }

  const userId = claimsData.claims.sub;
  const [profileResponse, subscriptionResponse, currencyResponse] =
    await Promise.all([
      supabase
        .from("users")
        .select("id,email,display_name,created_at")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("tier,granted_via,granted_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_currency")
        .select("mines_balance,total_earned")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
  const profile = profileResponse.data as UserProfile | null;
  const subscription = subscriptionResponse.data as Subscription | null;
  const currency = currencyResponse.data as UserCurrency | null;

  const email = claimsData.claims.email ?? profile?.email ?? "Signed-in user";
  const joinedAt = profile?.created_at
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
      }).format(new Date(profile.created_at))
    : "Provisioning";

  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Minesweeper Academy + Arena
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Account
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Logged in as {email}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Player
            </p>
            <p className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {profile?.display_name ?? "Provisioning"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">Joined {joinedAt}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Tier
            </p>
            <p className="mt-2 text-lg font-semibold capitalize text-zinc-950 dark:text-zinc-50">
              {(subscription?.tier ?? "free").replace("_", " ")}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {subscription?.granted_via === "fake_purchase"
                ? "Granted by upgrade"
                : "Free default"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Mines
            </p>
            <p className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {currency?.mines_balance ?? 0}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {currency?.total_earned ?? 0} earned all time
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            No saved games yet
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Play your first game to start building your stats.
          </p>
          <Link
            href="/play"
            className="mt-4 inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Quick play
          </Link>
        </section>
      </div>
    </main>
  );
}
