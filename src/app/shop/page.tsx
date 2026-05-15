import type { Metadata } from "next";
import Link from "next/link";
import { ShopCard } from "@/components/cosmetics/ShopCard";
import { SKIN_CATALOG } from "@/lib/cosmetics/catalog";
import { getOwnedSkins, pickEquipped } from "@/lib/db/cosmetics";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Shop — Minesweeper Academy",
};

export default async function ShopPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  const [ownedSkins, currencyResp] = await Promise.all([
    userId ? getOwnedSkins(userId) : Promise.resolve([]),
    userId
      ? supabase
          .from("user_currency")
          .select("mines_balance")
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const minesBalance = (currencyResp as { data: { mines_balance: number } | null })
    .data?.mines_balance ?? 0;
  const equipped = pickEquipped(ownedSkins);
  const ownedSet = new Set(ownedSkins.map((s) => s.skin_id));

  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-5 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
            Cosmetics
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Shop
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Spend Mines on skins. Equip a UI skin to recolor the site, or a
                board skin to repaint the Minesweeper grid.
              </p>
            </div>
            {userId ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                Balance: 💎{" "}
                <span className="font-mono">{minesBalance}</span> Mines
              </div>
            ) : (
              <Link
                href="/auth?mode=sign-in&next=/shop"
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Sign in to start collecting
              </Link>
            )}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {SKIN_CATALOG.map((skin) => (
            <ShopCard
              key={skin.id}
              skin={skin}
              owned={ownedSet.has(skin.id)}
              equipped={
                (skin.kind === "ui" && equipped.ui === skin.id) ||
                (skin.kind === "board" && equipped.board === skin.id)
              }
              minesBalance={minesBalance}
              signedIn={!!userId}
            />
          ))}
        </section>

        <section className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            How do I earn Mines?
          </p>
          <p className="mt-1">
            Finish games. Beginner wins pay 5, Intermediate 15, Expert 50, and a
            Daily Challenge win is 25. Losses still pay a small consolation.
            <Link
              href="/play"
              className="ml-1 font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              Play a quick match →
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
