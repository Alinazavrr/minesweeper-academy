# Current Development State

Last updated: 2026-05-15

## Repo

- Branch: `main`
- Last known HEAD: `47915c6 feat(coach): AI Coach chat — streaming gpt-4o-mini, persisted, rate-limited` (verify with `git log -1`)
- Product source of truth: `ideas/PROJECT_PLAN.md`
- Agent rules: read `AGENTS.md` and `CLAUDE.md` before coding

## Shipped on main

- Engine package (`@minesweeper/engine` v0.1.0): PRNG, generateBoard, applyAction, CSP solver. 81 unit tests.
- Phase 1 Supabase schema: 14 tables, 11 enums, RLS on every table, on_auth_user_created trigger.
- Quick Play at `/play`: Beginner/Intermediate/Expert, first-click safety, flag/chord/hint, save-on-finish.
- Auth: email/password + Google OAuth + Supabase SSR session refresh + `/auth/callback` PKCE + `/account` page.
- Game persistence: finished quick-play games inserted into `public.games` via `saveQuickPlayGame` server action. Save logic lives in the Zustand store so React 19 StrictMode dev double-mounts can't duplicate rows.
- Recent games on `/account`: last 10 games per user.
- Daily Challenge at `/daily`: deterministic seed per UTC date (`daily-YYYY-MM-DD`), Intermediate every day for MVP, lazy-creates `daily_challenges` row via the service-role client on first visit, public-read `daily_results` table acts as the leaderboard, owner-only INSERT enforces one attempt per day per user (PK + pre-check). RSC pulls today's challenge + leaderboard + your existing result; `<DailyView>` switches between active game / already-played panel; auto-submit runs in `useEffect` keyed on engine status — safe under StrictMode because `ActiveGame` is unconditionally mounted (initial mount sees `status === "idle"`, transition to terminal is a re-render which fires the effect exactly once).
- Cell + Board components refactored to be presentational (props in, callbacks out) with `React.memo` per-cell. Both Quick Play and Daily use the same Board.
- **AI Coach at `/coach` (new today)**: streaming `gpt-4o-mini` chat via `/api/coach/chat`. SSE pipeline emits `init` / `delta` / `done` / `error` events; client streams tokens into the latest assistant bubble. Per-tier daily rate limit (free=5, pro_lite=20, pro=100) enforced server-side via `coach_usage_daily`. `coach_messages` and `coach_usage_daily` writes go through the service-role client (those tables have no INSERT RLS — users can't forge assistant messages or fake usage). System prompt is domain-trained: references 1-1, 1-2-1, 1-2-2-1 patterns and refuses to play moves. RSC server-renders the user's most-recent free-chat thread; client persists across refreshes.
- **Pro tier modal + fake purchase (new today)**: shared billing tier helpers (`free`=5, `pro_lite`=20, `pro`=100 Coach messages/day), `public.fake_purchase_subscription(target_tier)` RPC with authenticated-only execute and `SECURITY DEFINER`, server action at `/account`, reusable `<ProTierDialog>`, Account locked/unlocked analytics panels, and Coach upgrade/manage entry points. Paid tiers are still fake-purchase only; downgrading to Free clears `granted_at`/`valid_until` and restores `free_default`.
- **Mines currency accrual**: `public.award_mines_for_game(target_game_id)` RPC awards Mines exactly once per completed game, writes the `mines_transactions` audit row, and updates `user_currency` under a per-user row lock. Rates follow §14: Beginner/Intermediate/Expert wins = 5/15/50, Daily win = 25, losses = 20% rounded down with a minimum of 1. Quick Play and Daily finish actions call the RPC and return the awarded amount so the post-game UI can show `+N Mines`.
- **Replay serialization + Post-Game Review (new today)**: engine ships `serializeReplay`/`deserializeReplay` (binary, magic+version header, 1-byte kind + row + col + LEB128 dt; <8 bytes/action, full-Expert <1.5KB per spec §16.5). Quick Play store and Daily reducer accumulate the action log; finish actions base64-encode and pass it through to `saveQuickPlayGame`/`submitDailyResult`, which write `\x<hex>` bytea into `games.replay_blob`. New RSC at `/games/[id]/review` does auth, owner-scoped fetch (RLS), tier check (free → upsell with `<ProTierDialog>`, missing blob → "replay not available" panel, decode error → corrupt panel), reconstructs the layout from `seed + actions[0]` (first-click safety invariant), runs `annotateMoves` server-side, and renders `<ReplayPlayer>`. The player reuses the existing `<Board>` with read-only handlers; provides slider + step buttons + jump-to-mistake, a side action log (current row highlighted, missed-safe-cell rows badged), and a missed-safe-cell ring overlay on the board for the upcoming turn. Entry points wired on Account recent-games rows, the Quick Play save line, the Daily finish banner, and the Daily already-played panel. No LLM narration in this slice (explicit cut).
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test:all` (43 app + 94 engine, including 13 new replay tests) all green. Bytea wire format confirmed end-to-end via Supabase MCP: engine output `TQEDAAQHAAEBAvoBAAgC7gU=` round-trips through `\x<hex>` insert and base64 SELECT bit-for-bit on a synthetic games row. Browser walkthrough deferred — the Playwright profile was held by the user's existing Chrome session; visual smoke is left for the next session (golden path: sign in → quick-play to terminal → "Review this game" link → scrub end-to-end → jump-to-mistake button activates on a guess turn).

## External config confirmed

- Supabase project ref: `ihwwibhdnjsgsspenzru`.
- `@supabase/ssr` on ^0.10.3 (matches hoisted `@supabase/supabase-js@2.105.4` typings).
- pg_cron is NOT enabled — daily_challenges rows are created lazily on first request to `/daily`. Swap to a cron-seeded approach later when scale demands it; the table contract doesn't change.

## Test data

- Confirmed test user: `claude-test-1@example.test` / `TestPassword123!` (direct insert into `auth.users` bypasses Supabase email-domain validation). Has quick-play history, Daily Challenge history on 2026-05-15, currently reset to `subscriptions.tier = 'free'` / `granted_via = 'free_default'`, and currently has `1` Mine from the currency browser smoke. Wipe with:
  ```sql
  delete from auth.users where email = 'claude-test-1@example.test';
  ```

## Known follow-ups

- `public.users` SELECT is `TO authenticated` with `qual = true`, so any signed-in user can SELECT another user's `email` column. Tighten to `display_name` only (column-level grant or a `users_public` view) before the user count grows.
- Daily leaderboard hides display names for anonymous viewers (the users join needs auth). Acceptable for MVP — fix with a `daily_leaderboard_v` view that exposes only public columns and is readable by `anon`.
- Daily Challenge MVP allows local-state restart before submission (just refresh the page before clicking). Real anti-cheat needs a server-side "started_at" record. Out of scope for now.
- **OpenAI quota** on the project key is exhausted. Coach failure path proves the error pipeline works (errors surface as SSE `error` events and render in the UI alert), but you'll need to top up `OPENAI_API_KEY` credits to test the happy path. The conversation row + user message persist even on OpenAI failure; usage is only bumped on a successful completion, so failed attempts don't burn the daily counter.

## Current next slice

Replay + Post-Game Review just shipped. Pick from:

- **Stats dashboard**: aggregate RPCs over `public.games` for the free + Pro analytics panels (3BV/s trend, flag accuracy, mistake heatmap, win-rate-by-difficulty, recent-games table). Spec §11.
- **Daily share card**: `@vercel/og` route to render "I solved today's challenge in Ns" image; OpenGraph metadata on `/daily/[date]` (or `/daily?d=YYYY-MM-DD`) so the link previews on socials.
- **Coach polish**: markdown rendering for assistant messages; conversation list (so the user can switch threads); per-game `post_game_review` conversation kind that links from the review page back to a Coach thread seeded with the annotated game context.
- **Pro_lite vs pro UX split**: today review is open to both paid tiers; PROJECT_PLAN.md §14 reserves "full" review for Pro. If you want the tier ladder to feel meaningful, add a soft cap (e.g. only first 3 mistakes shown for Pro Lite).

CTO recommendation: bundle **Stats dashboard + Daily share card + Coach polish** as one "polish" slice — none individually is large; together they round out the free + Pro story before anyone notices the Arena gap.

## Notes for the next agent

- This is Next.js 16. Read relevant docs in `node_modules/next/dist/docs/` before changing Next APIs.
- Tailwind v4 uses CSS config; do not add `tailwind.config.ts`.
- The engine package is pure and deterministic. Any engine public function requires TDD.
- Migrations are additive only — never rename a column in place.
- Do not commit `.env.local`.
- **React 19 StrictMode double-fires `useEffect` only on initial mount.** Side effects that must be exactly-once-per-event are safe in `useEffect` if the component is unconditionally mounted and the effect body short-circuits when the engine state isn't yet in a terminal state — the first transition into terminal is a re-render, not a fresh mount. The Quick Play case (save-on-finish) was a fresh mount of `SaveOnFinish`, which is why it lived inside a store action; the Daily case is fine in `useEffect` because `ActiveGame` is unconditionally mounted. See `feedback_strict_mode` in the memory.
- **Replay format contract**: encoder normalizes `action[0].t` to 0; decoded `t`s are relative-to-game-start, not wall-clock. `time_ms` lives on `games` separately. Bytea write uses `\x<hex>` text format; PostgREST returns base64 on read. `decodeReplayBlob` accepts both.
- **First-click safety invariant for replay**: `actions[0]` is canonically a `reveal` — the review page asserts this and uses it as the `firstClick` arg to `generateBoard` so the rebuilt layout matches the original byte-for-byte.
