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
- **Replay serialization + Post-Game Review**: engine ships `serializeReplay`/`deserializeReplay` (binary, magic+version header, 1-byte kind + row + col + LEB128 dt; <8 bytes/action, full-Expert <1.5KB per spec §16.5). Quick Play store and Daily reducer accumulate the action log; finish actions base64-encode and pass it through to `saveQuickPlayGame`/`submitDailyResult`, which write `\x<hex>` bytea into `games.replay_blob`. RSC at `/games/[id]/review` does auth, owner-scoped fetch (RLS), tier check (free → upsell with `<ProTierDialog>`, missing blob → "replay not available" panel, decode error → corrupt panel), reconstructs the layout from `seed + actions[0]` (first-click safety invariant), runs `annotateMoves` server-side, and renders `<ReplayPlayer>` — slider + step buttons + jump-to-mistake, side action log with mistake badges, missed-safe-cell ring overlay. Entry points wired on Account recent-games rows, Quick Play save line, Daily finish banner, Daily already-played panel.
- **Theme toggle + analytics (new today — last Phase 1 piece)**:
  - **Theme toggle** — Tailwind v4 `@custom-variant dark (&:where(.dark, .dark *))` switches the `dark:` variant from `prefers-color-scheme` to a `.dark` class on `<html>`. `<ThemeScript>` is an inline IIFE in `<head>` that reads localStorage + matchMedia and sets the class before first paint (no FOUC). `<ThemeToggle>` cycles System → Light → Dark via `useSyncExternalStore` so multiple toggle instances on the same page stay in sync (custom `ms-theme-change` event broadcasts within-tab; `storage` event covers cross-tab). Toggle wired into Account, Daily, Coach, Stats, Learn (catalog + slug), Quick Play, and the home page.
  - **Analytics** — Tiny in-house tracker at `src/lib/analytics/track.ts`. If `NEXT_PUBLIC_POSTHOG_KEY` is set, fires fetch-with-keepalive POSTs to PostHog's `/capture/` (no SDK dependency). Otherwise no-ops with a `console.debug` so wiring is verifiable in dev. Distinct id is per-tab via sessionStorage. Wired events: `landing_view` (home), `lesson_view` (lesson page, with slug + difficulty + is_stub), `daily_complete` (after submit, with date/difficulty/result/time/hints), `share_card_copied` + `share_card_tweet_intent` (Daily ShareButton), `coach_message_sent` (CoachChat send, with conversation kind + length), `post_game_review_opened` (review page mount, with game/difficulty/result/source mode), `pro_modal_view` (ProTierDialog open, with current tier).
- **Academy + Landing page**:
  - **Engine** ships `layoutFromMines({rows, cols, mines, seed, noGuess?})` — builds a `BoardLayout` from explicit mine indices (no PRNG) so lesson authors can ship deterministic hand-authored boards. 4 new tests.
  - **Lesson registry** (`src/lib/lessons/`): typed `Lesson` shape (slug, title, category, difficulty, summary, body, optional `demo` annotated board, optional `practice` playable board). 4 fully authored lessons (1-1 reduction, 1-2-1, 1-2-2-1, probability basics) + 2 concept-only stubs (corner/edge logic, flag discipline). Practice boards designed to be fully solvable: pre-revealing a single 0-cell floods to expose the pattern, then the deduction wins the board.
  - **Lesson UI**: `<DemoBoard>` is a static SVG-style grid with annotated highlight cells (S/M/?), `<PracticeRunner>` wraps the engine + Board for a small playable board with reset.
  - **Routes**: `/learn` catalog (no auth, public — SEO surface), `/learn/[slug]` lesson page with demo + body (rendered through the same Markdown component the Coach uses) + practice. `generateStaticParams` pre-renders all lesson slugs.
  - **Landing page rewrite** at `/`: marketing-led hero with engine-rendered live board preview (`<LandingPreviewBoard>` — server-rendered, deterministic seed), 4 feature pillars (Daily / Academy / Coach / Pro tier), under-the-hood blurb with sign-in/sign-up CTAs, footer.
- **Polish slice**:
  - **Stats dashboard at `/stats`** — RSC pulls last 500 games + last 365 daily_results, computes per-difficulty win rate / best time / top 3BV/s, daily streak (current + longest), recent flag accuracy, and a 30-game 3BV/s sparkline (inline SVG, no chart lib). Free users see counts + best times; Pro tier unlocks the sparkline and trend mini-cards. "Full stats" link wired from `/account`.
  - **Daily share card** — `@vercel/og` edge route at `/api/daily/og` renders a 1200×630 PNG from URL params (`date`, `difficulty`, `time`, `rank`, `name`). Daily page sets dynamic `openGraph` + `twitter` meta from search params via `generateMetadata`, so a shared link previews the player's specific result. New `<ShareButton>` in the Daily already-played panel: copies a tweet text + opens twitter intent.
  - **Coach polish** — safe in-house markdown renderer (`renderMarkdown` + `<Markdown>`, 10 unit tests covering bold, italic, lists, code, links, javascript: rejection); side conversation list (kind-tagged with Chat/Review badge, last-active relative time, click to switch via `?conversation=<id>`); per-game post-game review threads — "Discuss with Coach" button on `/games/[id]/review` invokes `startPostGameReviewAndRedirect` server action which creates a `coach_conversations` row with `kind='post_game_review'`, seeds a system message containing the CSP analysis (missed safe moves, action log summary), and redirects to `/coach?conversation=<id>`. The Coach page now reads conversation lists + targeted thread by id; CoachChat shows a "Review" badge + open-replay link when in review mode.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test:all` (53 app + 98 engine) all green. **Phase 1 §6 is done** as of this commit — every line item in the spec's MVP list is shipped (core game, auth, Daily Challenge + leaderboard + share card, hint mode, AI Coach chat, Post-Game Review, Pro modal + fake purchase, Academy with 4 lessons + 2 stubs, personal stats free + Pro panels, Mines accrual, dark/light theme toggle, basic a11y via color+label cues, landing page rewrite, minimal PostHog events). Browser walk still owed across the recent slices — the Playwright profile is held by the user's other Chrome session. Smoke for the next session: confirm theme toggle persists across reloads + cycles correctly; play a Daily and confirm `daily_complete` fires (visible in dev via console.debug); open `/coach`, switch threads, send a message and confirm `coach_message_sent` fires; open `/games/<id>/review` to confirm `post_game_review_opened` fires.

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

**Phase 1 §6 is done.** Optional follow-ups, in rough priority order:

- **Browser walkthrough** — clear out the verification debt. Run through every recent slice in a real browser (theme cycle, Academy practice boards, Daily share, Coach review thread, post-game review).
- **`NEXT_PUBLIC_POSTHOG_KEY` wiring** — the analytics module fires `fetch` POSTs when the env var is set. Currently null-coalesced so events stay local. Add the key (or any other capture-compatible endpoint) in Vercel + `.env.local` to start collecting real events.
- **Phase 1.5 hardening** — real Daily move-log validator (replay against engine, enforce `state.status === 'won'`, reject impossible-cadence submissions); configurable mobile controls; screen-reader live regions; full PostHog funnel set; share card OG that pulls a per-user gradient. Spec §17 phase 1.5.
- **Pro tier UX split** — review is currently open to both paid tiers; PROJECT_PLAN.md §14 reserves "full" review for Pro. Cap the missed-mistake count or hide the action log for Pro Lite if you want the tier ladder to feel meaningful.
- **Phase 2 scaffolding** — Arena schema is in the migration but no UI; live score race + bot fallback are the headline Phase 2 features. CTO call: only start once the demo is recorded and submitted.

## Notes for the next agent

- This is Next.js 16. Read relevant docs in `node_modules/next/dist/docs/` before changing Next APIs.
- Tailwind v4 uses CSS config; do not add `tailwind.config.ts`.
- The engine package is pure and deterministic. Any engine public function requires TDD.
- Migrations are additive only — never rename a column in place.
- Do not commit `.env.local`.
- **React 19 StrictMode double-fires `useEffect` only on initial mount.** Side effects that must be exactly-once-per-event are safe in `useEffect` if the component is unconditionally mounted and the effect body short-circuits when the engine state isn't yet in a terminal state — the first transition into terminal is a re-render, not a fresh mount. The Quick Play case (save-on-finish) was a fresh mount of `SaveOnFinish`, which is why it lived inside a store action; the Daily case is fine in `useEffect` because `ActiveGame` is unconditionally mounted. See `feedback_strict_mode` in the memory.
- **Replay format contract**: encoder normalizes `action[0].t` to 0; decoded `t`s are relative-to-game-start, not wall-clock. `time_ms` lives on `games` separately. Bytea write uses `\x<hex>` text format; PostgREST returns base64 on read. `decodeReplayBlob` accepts both.
- **First-click safety invariant for replay**: `actions[0]` is canonically a `reveal` — the review page asserts this and uses it as the `firstClick` arg to `generateBoard` so the rebuilt layout matches the original byte-for-byte.
- **Coach prop-sync pattern**: `<CoachChat>` resets via `key={selectedId}` in `<CoachLayout>` rather than a `useEffect` that mirrors `initialConversationId` into local state — that pattern is now banned by `react-hooks/set-state-in-effect`. If you add another Chat-like component, follow the same key approach.
- **OG card link contract**: `/daily?date=...&difficulty=...&time=...&rank=...&name=...` produces a personalized share preview; the params are passed straight into `/api/daily/og` from `generateMetadata`. The share button builds these URLs client-side.
- **Theme toggle invariant**: `<ThemeScript>` runs first in `<head>` and sets `.dark` on `<html>` before paint. `<ThemeToggle>` reads via `useSyncExternalStore` and writes to localStorage + dispatches an `ms-theme-change` window event so multiple toggles on the same page stay in sync. Avoid the temptation to use `useEffect`+`setState` for prop sync (lint-blocked, see also CoachChat key-based remount).
- **Analytics invariant**: `track()` always returns synchronously and never throws — analytics failures must not surface to the user. The fetch is `keepalive: true` so it survives navigation. If you add a new event, also add it to the `AnalyticsEvent` union in `src/lib/analytics/track.ts` so the call sites stay typed.
