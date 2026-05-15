# Current Development State

Last updated: 2026-05-15

## Repo

- Branch: `main`
- Last known HEAD: `6400111 feat(daily): Daily Challenge end-to-end` (verify with `git log -1`)
- Product source of truth: `ideas/PROJECT_PLAN.md`
- Agent rules: read `AGENTS.md` and `CLAUDE.md` before coding

## Shipped on main

- Engine package (`@minesweeper/engine` v0.1.0): PRNG, generateBoard, applyAction, CSP solver. 81 unit tests.
- Phase 1 Supabase schema: 14 tables, 11 enums, RLS on every table, on_auth_user_created trigger.
- Quick Play at `/play`: Beginner/Intermediate/Expert, first-click safety, flag/chord/hint, save-on-finish.
- Auth: email/password + Google OAuth + Supabase SSR session refresh + `/auth/callback` PKCE + `/account` page.
- Game persistence: finished quick-play games inserted into `public.games` via `saveQuickPlayGame` server action. Save logic lives in the Zustand store so React 19 StrictMode dev double-mounts can't duplicate rows.
- Recent games on `/account`: last 10 games per user.
- **Daily Challenge at `/daily` (new today)**: deterministic seed per UTC date (`daily-YYYY-MM-DD`), Intermediate every day for MVP, lazy-creates `daily_challenges` row via the service-role client on first visit, public-read `daily_results` table acts as the leaderboard, owner-only INSERT enforces one attempt per day per user (PK + pre-check). RSC pulls today's challenge + leaderboard + your existing result; `<DailyView>` switches between active game / already-played panel; auto-submit runs in `useEffect` keyed on the engine status — safe under StrictMode because the component is unconditionally mounted (initial mount sees `status === "idle"`, transition to terminal is a re-render which fires the effect exactly once).
- Cell + Board components refactored to be presentational (props in, callbacks out) with `React.memo` per-cell. Both Quick Play and Daily use the same Board.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test:all` (24 app + 81 engine) all green. Daily flow browser-verified end-to-end.

## External config confirmed

- Supabase project ref: `ihwwibhdnjsgsspenzru`.
- `@supabase/ssr` on ^0.10.3 (matches hoisted `@supabase/supabase-js@2.105.4` typings).
- pg_cron is NOT enabled — daily_challenges rows are created lazily on first request to `/daily`. Swap to a cron-seeded approach later when scale demands it; the table contract doesn't change.

## Test data

- Confirmed test user: `claude-test-1@example.test` / `TestPassword123!` (direct insert into `auth.users` bypasses Supabase email-domain validation). Has one quick-play loss + one daily-challenge loss on 2026-05-15. Wipe with:
  ```sql
  delete from auth.users where email = 'claude-test-1@example.test';
  ```

## Known follow-ups

- `public.users` SELECT is `TO authenticated` with `qual = true`, so any signed-in user can SELECT another user's `email` column. Tighten to `display_name` only (column-level grant or a `users_public` view) before the user count grows.
- Daily leaderboard hides display names for anonymous viewers (the users join needs auth). Acceptable for MVP — fix with a `daily_leaderboard_v` view that exposes only public columns and is readable by `anon`.
- Daily Challenge MVP allows local-state restart before submission (just refresh the page before clicking). Real anti-cheat needs a server-side "started_at" record. Out of scope for now.

## Current next slice

Pick from:

- **AI Coach (free chat)**: server route streaming `gpt-4o-mini`, persistence to `coach_conversations`/`coach_messages`, daily rate limit from `coach_usage_daily`. Schema is ready.
- **Pro tier modal + fake-purchase RPC**: write to `subscriptions`, gate Pro features (Coach unlimited, advanced analytics, Post-Game Review).
- **Replay serialization + Post-Game Review**: encode action log into `games.replay_blob`, build a scrubbable board UI annotated by the CSP solver.
- **Mines currency accrual**: on game finish, server-side RPC writes to `user_currency` + `mines_transactions`. Daily completion bonus.
- **Stats dashboard**: aggregate RPCs over `public.games` for the free + Pro analytics panels.
- **Daily share card**: `@vercel/og` route to render an image of "I solved today's challenge in N seconds."

CTO recommendation: **AI Coach next** — it's the second headline feature and unlocks Pro tier value. Mines currency is small and can follow.

## Notes for the next agent

- This is Next.js 16. Read relevant docs in `node_modules/next/dist/docs/` before changing Next APIs.
- Tailwind v4 uses CSS config; do not add `tailwind.config.ts`.
- The engine package is pure and deterministic. Any engine public function requires TDD.
- Migrations are additive only — never rename a column in place.
- Do not commit `.env.local`.
- **React 19 StrictMode double-fires `useEffect` only on initial mount.** Side effects that must be exactly-once-per-event are safe in `useEffect` if the component is unconditionally mounted and the effect body short-circuits when the engine state isn't yet in a terminal state — the first transition into terminal is a re-render, not a fresh mount. The Quick Play case (save-on-finish) was a fresh mount of `SaveOnFinish`, which is why it lived inside a store action; the Daily case is fine in `useEffect` because `ActiveGame` is unconditionally mounted. See `feedback_strict_mode` in the memory.
