"use client";

import { useActionState } from "react";
import {
  equipSkinAction,
  INITIAL_SHOP_STATE,
  purchaseSkinAction,
  unequipSkinAction,
} from "@/app/shop/actions";
import type { Skin } from "@/lib/cosmetics/catalog";
import { cn } from "@/lib/cn";

type Props = {
  skin: Skin;
  owned: boolean;
  equipped: boolean;
  minesBalance: number;
  signedIn: boolean;
};

export function ShopCard({
  skin,
  owned,
  equipped,
  minesBalance,
  signedIn,
}: Props) {
  const [purchaseState, purchase, purchasePending] = useActionState(
    purchaseSkinAction,
    INITIAL_SHOP_STATE,
  );
  const [equipState, equip, equipPending] = useActionState(
    equipSkinAction,
    INITIAL_SHOP_STATE,
  );
  const [unequipState, unequip, unequipPending] = useActionState(
    unequipSkinAction,
    INITIAL_SHOP_STATE,
  );

  const latestState =
    purchaseState.status !== "idle"
      ? purchaseState
      : equipState.status !== "idle"
        ? equipState
        : unequipState;

  const canAfford = minesBalance >= skin.price;
  const busy = purchasePending || equipPending || unequipPending;

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-5 transition",
        equipped
          ? "border-emerald-500 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/20"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
      )}
    >
      {/* Preview */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-10 rounded-md shadow-inner",
            skin.swatchClass,
          )}
        />
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {skin.name}
          </h3>
          <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
            {skin.kind === "ui" ? "Site theme" : "Board theme"}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-mono text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            💎 {skin.price}
          </p>
        </div>
      </div>

      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {skin.description}
      </p>

      {/* Mini board preview for board skins */}
      {skin.kind === "board" ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto grid w-fit grid-cols-5 gap-0">
            {Array.from({ length: 25 }).map((_, i) => {
              const revealed = [6, 7, 8, 11, 12, 13, 16, 17, 18].includes(i);
              return (
                <div
                  key={i}
                  className={cn(
                    "size-6 border border-zinc-400 dark:border-zinc-600 flex items-center justify-center text-[10px] font-bold",
                    revealed
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : "bg-zinc-200 dark:bg-zinc-700",
                  )}
                  role={revealed ? undefined : "grid"}
                  style={{ filter: equipped ? undefined : "saturate(0.9)" }}
                >
                  {/* These cells aren't real grids — but we attach role=grid
                      to the unrevealed parents so the board-skin CSS hits them. */}
                  {i === 12 ? "1" : ""}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {latestState.status !== "idle" ? (
        <p
          role={latestState.status === "error" ? "alert" : "status"}
          className={cn(
            "rounded-md border px-3 py-2 text-xs",
            latestState.status === "error"
              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
              : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
          )}
        >
          {latestState.message}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2">
        {!signedIn ? (
          <a
            href="/auth?mode=sign-in&next=/shop"
            className="inline-flex flex-1 items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Sign in to buy
          </a>
        ) : !owned ? (
          <form action={purchase} className="flex-1">
            <input type="hidden" name="skin_id" value={skin.id} />
            <button
              type="submit"
              disabled={busy || !canAfford}
              className={cn(
                "w-full rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                canAfford
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300",
              )}
            >
              {purchasePending
                ? "Buying..."
                : canAfford
                  ? `Buy for 💎 ${skin.price}`
                  : `Need ${skin.price - minesBalance} more 💎`}
            </button>
          </form>
        ) : equipped ? (
          <form action={unequip} className="flex-1">
            <input type="hidden" name="kind" value={skin.kind} />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              {unequipPending ? "Removing..." : "Unequip"}
            </button>
          </form>
        ) : (
          <form action={equip} className="flex-1">
            <input type="hidden" name="skin_id" value={skin.id} />
            <input type="hidden" name="kind" value={skin.kind} />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {equipPending ? "Equipping..." : "Equip"}
            </button>
          </form>
        )}
      </div>

      {owned ? (
        <p className="text-xs text-zinc-500">
          Owned · {equipped ? "currently equipped" : "in your wardrobe"}
        </p>
      ) : null}
    </article>
  );
}
