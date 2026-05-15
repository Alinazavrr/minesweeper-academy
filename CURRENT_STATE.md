# Current Development State

Last updated: 2026-05-15

## Repo

- Branch: `main`
- Last known HEAD: `4ac536d fix(games): dedup save under React 19 StrictMode double-mount`
- Working tree expected clean against `origin/main` after a fresh push.
- Product source of truth: `ideas/PROJECT_PLAN.md`
- Agent rules: read `AGENTS.md` and `CLAUDE.md` before coding

## Shipped on main

- Engine package (`@minesweeper/engine` v0.1.0): PRNG, generateBoard, applyAction, CSP solver. 81 unit tests.
- Phase 1 Supabase schema: 14 tables, 11 enums, RLS on every table, on_auth_user_created trigger.
- Quick Play at `/play`: Beginner/Intermediate/Expert, first-click safety, flag/chord/hint, save-on-finish banner.
- Auth: email/password + Google OAuth + Supabase SSR session refresh + `/auth/callback` PKCE + `/account` page with sign-out.
- **Game persistence (new today)**: finished quick-play games are inserted into `public.games` via a server action that authenticates with `auth.getClaims` and attaches `user_id` server-side. RLS still enforces ownership independently. Unauthenticated path shows "Sign in to save your games"; authed path shows "Saved to your account". Save runs inside the Zustand action (not a useEffect) so React 19 StrictMode double-mounts in dev no longer duplicate rows.
- **Recent games on /account**: lists the user's most recent 10 games — difficulty, result, time, flag accuracy, finished_at — falling back to the empty-state CTA when there are no rows.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test:all` (16 app + 81 engine) all green. End-to-end browser-verified via Playwright MCP.

## External Config Confirmed

- Supabase project ref: `ihwwibhdnjsgsspenzru`
- Google OAuth provider is wired and tested.
- `@supabase/ssr` bumped to ^0.10.3 to match the hoisted `@supabase/supabase-js@2.105.4` typing — older 0.5.2 made typed inserts/selects resolve to `never`.

## Test Data

- A confirmed test user exists in `auth.users`: `claude-test-1@example.test` (password `TestPassword123!`). Created via direct insert (bypasses Supabase's email-domain validation). Deletable at any time:
  ```sql
  delete from auth.users where email = 'claude-test-1@example.test';
  ```

## Current Next Slice

Pick from:

- **Daily Challenge**: pg_cron seeds layout each day; `/daily` runner; submission writes `daily_results`; leaderboard view; share card via @vercel/og.
- **AI Coach (free chat)**: server route handler streaming `gpt-4o-mini`, persistence to `coach_conversations`/`coach_messages`, daily rate limit from `coach_usage_daily`.
- **Pro tier modal + fake-purchase RPC**: write to `subscriptions` server-side, gate Pro features (Coach unlimited, advanced analytics, Post-Game Review).
- **Replay serialization**: serializeReplay/deserializeReplay in engine; write `replay_blob` on game save; enables Post-Game Review.
- **Stats dashboard**: aggregate RPCs over `public.games` for the free + Pro panels.

CTO recommendation: **Daily Challenge next** — it's the headline feature of the product and the schema is fully ready. AI Coach has a real LLM dependency that's worth doing third.

## Notes For The Next Agent

- This is Next.js 16. Read relevant docs in `node_modules/next/dist/docs/` before changing Next APIs.
- Tailwind v4 uses CSS config; do not add `tailwind.config.ts`.
- The engine package is pure and deterministic. Any engine public function requires TDD.
- Migrations are additive only — never rename a column in place.
- Do not commit `.env.local`.
- React 19's StrictMode double-mount in dev WILL fire `useEffect` twice. Any side effect that needs strict once-per-event semantics (DB writes, analytics) must live outside `useEffect` (e.g. inside a Zustand action or behind a module-scoped guard). The pattern in `src/stores/game.ts` `maybePersistFinish` is the reference for this in the repo.
