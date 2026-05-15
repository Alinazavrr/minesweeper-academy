import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type NavItem = { href: string; label: string };

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/play", label: "Play" },
  { href: "/daily", label: "Daily" },
  { href: "/arena", label: "Arena" },
  { href: "/learn", label: "Learn" },
  { href: "/coach", label: "Coach" },
  { href: "/stats", label: "Stats" },
  { href: "/shop", label: "Shop" },
];

export async function SiteNav() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  let minesBalance: number | null = null;
  if (userId) {
    const { data } = await supabase
      .from("user_currency")
      .select("mines_balance")
      .eq("user_id", userId)
      .maybeSingle();
    minesBalance = data?.mines_balance ?? 0;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-5 min-w-0">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 whitespace-nowrap"
          >
            <span className="text-emerald-700 dark:text-emerald-400">◆</span>{" "}
            <span className="hidden sm:inline">Minesweeper Academy</span>
            <span className="sm:hidden">MS</span>
          </Link>
          <ul className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded px-2.5 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2">
          {userId ? (
            <>
              <span
                title="Your Mines balance"
                className="hidden sm:inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
              >
                <span aria-hidden="true">💎</span>
                <span className="font-mono">{minesBalance ?? 0}</span>
              </span>
              <Link
                href="/account"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Account
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth?mode=sign-in"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Sign in
              </Link>
              <Link
                href="/auth?mode=sign-up"
                className="hidden sm:inline-flex rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
              >
                Sign up
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </nav>

      {/* mobile nav row */}
      <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800">
        <ul className="mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-4 py-1.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="rounded px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 whitespace-nowrap"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
