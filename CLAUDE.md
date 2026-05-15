@AGENTS.md

# Minesweeper Academy + Arena

## Source of truth

The product spec lives in `ideas/PROJECT_PLAN.md` (1042 lines). Every implementation decision references a `§` from that doc. When in doubt, read the spec, then code.

## Stack snapshot

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| Styling | Tailwind v4 (CSS-config; no `tailwind.config.ts`) + shadcn/ui |
| Client state | Zustand |
| Server state | TanStack Query |
| Backend | Supabase (Postgres + Auth + RLS + Realtime) |
| AI Coach | OpenAI `gpt-4o-mini` via server-side route handler |
| Hosting | Vercel (preview deploys per PR; production from `main`) |
| Engine | `@minesweeper/engine` workspace package — pure TS, deterministic |

Note: scaffold pinned Next.js 16, React 19, Tailwind v4 — newer than the spec assumed. AGENTS.md flags that v16 has breaking changes — when adding any non-trivial Next feature, sanity-check against `node_modules/next/dist/docs/` or the Next.js website.

## Repository layout

```
/                      Next.js app (App Router) at the root
  src/app/             Routes (App Router conventions)
  src/components/      Shared UI components
  src/components/ui/   shadcn primitives (generated; don't hand-edit)
  src/lib/             Non-UI utilities, clients, helpers
    supabase/          Supabase client factories
    openai.ts          OpenAI client
    db/                Supabase typed helpers + RPC wrappers
  src/server/          Server-only code: route handlers, RPCs
  src/stores/          Zustand stores
  src/types/           App-level types
packages/engine/       Pure TS Minesweeper engine + solver. ZERO DOM deps.
  src/                 Engine source
  src/**/*.test.ts     Vitest tests (co-located)
ideas/                 Spec + brainstorming docs (read-only reference)
```

## Hard rules (do not violate)

1. **The engine is pure.** No `Math.random()`, no DOM, no React, no Node-only APIs. Same code in browser, Web Worker, and serverless validator.
2. **Determinism**: every random op goes through the seed-driven Mulberry32 PRNG. No floating-point math in board-generation paths. Same seed + actions = byte-identical state across runtimes.
3. **Engine versioning**: every persisted game stores its `engine_version`. Bumping the engine major version means the validator must keep prior versions loadable.
4. **Service role key stays server-side.** Never imported in a client component. Never echoed to logs. The Supabase service-role client lives only under `src/server/`.
5. **OpenAI key stays server-side.** Only accessed inside `src/server/` route handlers or RPCs. Streaming responses are passed through; the key is not.
6. **Tier-gated server-side, not just hidden.** When a Pro feature ships, RLS or RPC-level checks must enforce the gate. Don't trust client-side hiding alone.
7. **TDD for the engine.** New public function in `packages/engine/`? Test first. Always.
8. **Migrations are additive.** Add columns. Never rename in-place; introduce a new column, deprecate the old one. Enum values: declare all forward-looking values up front (see `ideas/PROJECT_PLAN.md` §17).

## How to add things

### A new screen
1. Create `src/app/<route>/page.tsx`.
2. If it needs auth, use the server-side Supabase client in the page itself.
3. If it has interactive state, extract to a `"use client"` component under `src/components/<feature>/`.
4. For data: server-render the initial state via `createServerClient`, hydrate TanStack Query on the client.

### A new RPC / server action
1. Define the SQL function via a Supabase migration (use the Supabase MCP `apply_migration` tool).
2. Add a typed wrapper in `src/lib/db/<feature>.ts` using the regenerated DB types (`pnpm types:gen`).
3. Call from a `src/server/...` route handler or React Server Component.

### A new shadcn component
1. `pnpm dlx shadcn@latest add <component>`
2. Use the generated file under `src/components/ui/<name>.tsx`. Don't hand-edit unless extending.

### A new engine function
1. Write the test first in `packages/engine/src/<feature>.test.ts`.
2. Run `pnpm test --filter @minesweeper/engine` — confirm it fails.
3. Implement the function.
4. Confirm test passes.
5. Commit.

### A new Academy lesson
1. Add content as MDX (TBD: MDX integration ships with the first lesson).
2. Add row to `lessons` table via migration (slug, title, category, difficulty).
3. Hand-author the practice-board layout in `lesson_progress` config — see `ideas/PROJECT_PLAN.md` §9.

## Verification before claiming done

Per `superpowers:verification-before-completion`: never claim a feature works without:

- Running `pnpm typecheck` (zero errors).
- Running `pnpm test:all` (all green).
- Running `pnpm lint` (zero errors).
- For UI: opening the feature in a browser (Playwright MCP or dev server) and walking the golden path.
- For RPCs/server-side: actually invoking the endpoint and inspecting both the success and at least one failure case (auth denied, rate-limited, etc.).

## Commits + PRs

- Feature branches off `main`, PR-merge style. Vercel auto-deploys a preview per PR.
- Commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- Keep commits surgical — one logical change per commit.
- Never commit `.env.local` or any file with a real secret.

## Useful MCPs

- **Supabase MCP** — run SQL, apply migrations, deploy edge functions, generate TS types, read logs, get advisor warnings. Default first step when changing the DB.
- **Playwright MCP** — drive a real browser to verify UI flows.
- **GitHub MCP** — PRs, issues, repo management.
