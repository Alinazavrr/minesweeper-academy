"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

type Mode = "system" | "light" | "dark";

const NEXT_MODE: Record<Mode, Mode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const ICON: Record<Mode, string> = {
  system: "🖥️",
  light: "☀️",
  dark: "🌙",
};

const LABEL: Record<Mode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

function readMode(): Mode {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

/**
 * Subscribes to the only two events that can change the persisted mode
 * outside this tab: a `storage` event from another tab updating
 * localStorage, and a `theme-change` custom event we dispatch from
 * `cycle()` to fan changes out to other ThemeToggle instances on the
 * same page. matchMedia changes don't go through here — they only matter
 * while in 'system' mode and are handled by a separate effect.
 */
function subscribe(notify: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", notify);
  window.addEventListener("ms-theme-change", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("ms-theme-change", notify);
  };
}

function applyMode(mode: Mode): void {
  const root = document.documentElement;
  const systemDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && systemDark);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

type Props = {
  className?: string;
};

/**
 * Three-state toggle: System → Light → Dark → System. Persists to
 * localStorage. Keeps the document class in sync with whatever the boot
 * script set, then handles user clicks + system-preference changes.
 *
 * The boot script (<ThemeScript>) runs first and renders the right colours
 * on initial paint; this component reconciles React state on mount and
 * handles future changes.
 */
export function ThemeToggle({ className }: Props) {
  // useSyncExternalStore returns "system" during SSR and on the very first
  // client render; React reconciles to the real value after hydration via a
  // re-render. The button has `suppressHydrationWarning` so the harmless
  // text flicker doesn't trip the dev warning.
  const mode = useSyncExternalStore<Mode>(
    subscribe,
    readMode,
    () => "system",
  );

  // Re-apply the CSS class when the system preference changes — only
  // matters when the user is on "system" mode.
  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyMode("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const cycle = useCallback(() => {
    const next = NEXT_MODE[mode];
    try {
      window.localStorage.setItem("theme", next);
    } catch {
      // Quota or sandboxed iframe — applying the mode still works for the
      // current session, just won't persist.
    }
    applyMode(next);
    // Fan out to any other ThemeToggle instances mounted on the page.
    window.dispatchEvent(new Event("ms-theme-change"));
  }, [mode]);

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${LABEL[mode]} (click to cycle)`}
      title={`Theme: ${LABEL[mode]}`}
      suppressHydrationWarning
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
        className,
      )}
    >
      <span aria-hidden="true" suppressHydrationWarning>
        {ICON[mode]}
      </span>
      <span className="hidden sm:inline" suppressHydrationWarning>
        {LABEL[mode]}
      </span>
    </button>
  );
}
