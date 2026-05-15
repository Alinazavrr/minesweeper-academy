# Current Development State

Last updated: 2026-05-15

## Repo

- Branch: `main`
- Last known HEAD: `5e075aa feat: add Supabase auth UI`
- Working tree before this note: clean against `origin/main`
- Product source of truth: `ideas/PROJECT_PLAN.md`
- Agent rules: read `AGENTS.md` and `CLAUDE.md` before coding

## Shipped

- Auth UI is merged on `main`.
- Email/password sign-up and sign-in are implemented.
- Google OAuth button and `/auth/callback` PKCE exchange are implemented.
- Supabase SSR session refresh is implemented through the Next 16 Proxy path.
- `/account` shows the logged-in user's email/profile/tier/mines and has sign-out.
- Previous auth PR verification passed: `pnpm typecheck`, `pnpm lint`, `pnpm test:all`, and browser auth checks.

## External Config Confirmed

- Supabase project ref: `ihwwibhdnjsgsspenzru`
- Google OAuth provider initially failed because Supabase reported `external.google=false`.
- User configured Google OAuth in Supabase/Google Cloud after that.
- User confirmed Google authentication now works and the user page is visible.
- No code change was needed for that Google provider issue.

## Current Next Slice

Build game persistence:

- Persist finished games to the `games` table.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Enforce ownership/RLS server-side, not only in UI.
- Store `engine_version` with every persisted game.
- Verify authenticated save succeeds and cross-user access is denied.

## Notes For The Next Agent

- This is Next.js 16. Read relevant docs in `node_modules/next/dist/docs/` before changing Next APIs.
- Tailwind v4 uses CSS config; do not add `tailwind.config.ts`.
- The engine package is pure and deterministic. Any engine public function requires TDD.
- Migrations are additive only.
- Do not commit `.env.local`.
