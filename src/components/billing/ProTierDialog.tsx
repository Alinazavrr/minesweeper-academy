"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { changeSubscriptionTierAction } from "@/app/account/actions";
import type { ChangeSubscriptionTierState } from "@/app/account/actions";
import {
  formatSubscriptionTier,
  subscriptionTierOptions,
  type SubscriptionGrantedVia,
  type SubscriptionTier,
} from "@/lib/billing/tiers";
import { cn } from "@/lib/cn";

type Props = {
  currentTier: SubscriptionTier;
  grantedVia?: SubscriptionGrantedVia | null;
  triggerLabel?: string;
  triggerClassName?: string;
};

const initialChangeSubscriptionTierState: ChangeSubscriptionTierState = {
  status: "idle",
  message: "",
  tier: null,
};

export function ProTierDialog({
  currentTier,
  grantedVia,
  triggerLabel,
  triggerClassName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    changeSubscriptionTierAction,
    initialChangeSubscriptionTierState,
  );
  const visibleTier =
    state.status === "success" && state.tier ? state.tier : currentTier;
  const activeTierName = formatSubscriptionTier(visibleTier);
  const resolvedTriggerLabel =
    triggerLabel ?? (visibleTier === "free" ? "Upgrade" : "Change tier");

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status, state.tier]);

  const statusTone = useMemo(() => {
    if (state.status === "success") {
      return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100";
    }
    if (state.status === "error") {
      return "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100";
    }
    return "";
  }, [state.status]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500",
          triggerClassName,
        )}
      >
        {resolvedTriggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pro-tier-dialog-title"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
          >
            <header className="flex flex-col gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                  Subscription
                </p>
                <h2
                  id="pro-tier-dialog-title"
                  className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
                >
                  Choose your Minesweeper tier
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Current tier: {activeTierName}
                  {grantedVia === "fake_purchase" ? " via fake purchase" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="self-start rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Close
              </button>
            </header>

            {state.message ? (
              <div
                role={state.status === "error" ? "alert" : "status"}
                className={cn("mt-4 rounded-md border px-3 py-2 text-sm", statusTone)}
              >
                {state.message}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {subscriptionTierOptions.map((tier) => {
                const isCurrent = visibleTier === tier.id;
                return (
                  <article
                    key={tier.id}
                    className={cn(
                      "flex min-h-[20rem] flex-col rounded-lg border p-4",
                      isCurrent
                        ? "border-emerald-500 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/30"
                        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                          {tier.name}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500">
                          {tier.coachLimit} Coach messages/day
                        </p>
                      </div>
                      <p className="font-mono text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                        {tier.price}
                      </p>
                    </div>

                    <ul className="mt-4 flex-1 space-y-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <span aria-hidden="true" className="text-emerald-600">
                            +
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <form action={formAction} className="mt-5">
                      <button
                        type="submit"
                        name="tier"
                        value={tier.id}
                        disabled={pending || isCurrent}
                        className={cn(
                          "w-full rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                          isCurrent
                            ? "border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                            : tier.id === "free"
                              ? "border border-zinc-300 text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
                              : "bg-emerald-600 text-white hover:bg-emerald-500",
                        )}
                      >
                        {isCurrent
                          ? "Current tier"
                          : pending
                            ? "Updating..."
                            : tier.id === "free"
                              ? "Downgrade to Free"
                              : `Upgrade to ${tier.name}`}
                      </button>
                    </form>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
