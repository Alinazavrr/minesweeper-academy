# Post-Game Review + Replay Serialization — Design

Date: 2026-05-15
Status: Approved (CTO mode, max-autonomy)
Spec source: `ideas/PROJECT_PLAN.md` §12 Mode 3, §16.5 (engine), §17 (`games.replay_blob`)

## Goal

Ship the Pro post-game review feature: any saved game can be re-opened
on `/games/<id>/review`, where the player scrubs through their own
moves on the same board they played, and per-turn CSP annotations call
out moments where a logically-safe cell existed but the player guessed
instead.

**Out of scope (explicit cut):** LLM-generated narration, audio/voice,
and conversation follow-up about the review. The `coach_conversation_kind`
enum already carries `'post_game_review'` for a future slice but this
slice does not write to it.

## User-visible surfaces

1. **`/games/[id]/review`** — RSC. Auth + tier gate. Free users see an
   inline upsell with `<ProTierDialog>`; Pro users see the player.
2. **Account "Recent games"** — each row gets a `Review` link when
   `replay_blob IS NOT NULL`.
3. **Quick Play post-game line** — adds `Review this game` next to the
   `+N Mines` chip.
4. **Daily already-played panel** — adds `Review your run`.

## Engine changes (`packages/engine`)

Add two pure functions in a new `src/replay.ts`:

```ts
export function serializeReplay(actions: ReadonlyArray<Action>): Uint8Array;
export function deserializeReplay(bytes: Uint8Array): Action[];
```

**Binary format** (LE byte order, target <8 bytes/action per §16.5):

```
[0]      magic 0x4d (ASCII 'M')
[1]      format version (currently 1)
[2..]    n_actions: LEB128 varint
then per action:
  [0]    kind (0=reveal, 1=flag, 2=question, 3=chord)
  [1]    row (0..63)
  [2]    col (0..63)
  [3..]  dt_ms since previous action: LEB128 varint
         (action 0's dt is interpreted as the wall-clock t for
         the first action; we set it to 0 so reconstructed t values
         are relative-from-start, which is fine because annotateMoves
         only cares about action order, not wall-clock.)
```

Action 0 always carries `dt = 0`. On deserialize, reconstructed `t` is
the cumulative sum of `dt`s. Original wall-clock timing isn't preserved
end-to-end and isn't needed — `time_ms` lives on the games row.

**Constraints** enforced by the encoder (assertion errors on violation):

- `0 ≤ row ≤ 63`, `0 ≤ col ≤ 63` (matches `games` CHECK constraints)
- `kind` in {reveal, flag, question, chord}
- `dt ≥ 0` (clock cannot go backward)

**Tests** (TDD, `src/replay.test.ts`):

- Round-trip empty action list
- Round-trip a 1-action reveal
- Round-trip a mix of all four kinds
- Round-trip a synthetic Expert game (~150 actions) and assert
  `bytes.length < 1500`
- Reject malformed magic
- Reject unsupported version
- Reject truncated buffer

`packages/engine/src/index.ts` re-exports `serializeReplay` and
`deserializeReplay`. `ENGINE_VERSION` stays at `0.1.0` (additive change).

## Capture path

### Quick Play (`src/stores/game.ts`)

- Add `actionLog: Action[]` to the store, reset on `newGame`.
- Each store action (`reveal`/`flag`/`question`/`chord`) appends the
  action to `actionLog` *only if it produced an effect* (the engine
  `applyAction` returns the same state by reference for no-op inputs;
  we already have access to the prev/next pair so we compare cheaply).
- The first-click safety path regenerates the layout — at that point the
  `actionLog` is empty (it's the first reveal). Append the reveal action
  using the *new* state.
- In `maybePersistFinish`: serialize `actionLog`, base64-encode, pass as
  `replay_blob_b64` to `saveQuickPlayGame`.

### Daily (`src/components/daily/DailyView.tsx`)

- DailyView already maintains its own engine state for the in-progress
  game. Add an `actionLog` ref or local state synced the same way.
- On terminal, base64-encode and pass to `submitDailyResult`.

### Server actions (`src/app/play/actions.ts`, `src/app/daily/actions.ts`)

- Both schemas accept `replay_blob_b64: z.string().min(1).max(8000)` (8KB
  is comfortable headroom over the 1.5KB Expert target).
- Decode b64 → `Uint8Array` → `Buffer` → set on insert payload's
  `replay_blob`. Supabase JS sends bytea as base64 over PostgREST
  automatically when the value is a `Buffer`/`Uint8Array`; we'll pass the
  base64 string directly using the documented `\x` hex prefix or rely on
  PostgREST's `Buffer` handling. (Implementation detail confirmed at
  build time.)

## Review server-side prep

`src/app/games/[id]/review/page.tsx` (RSC):

1. `await createClient()` + `getClaims()`. Redirect to `/auth` if
   unauthenticated.
2. Load the games row by id, scoped by `user_id = claims.sub` (RLS will
   reject other users' rows; we rely on it).
3. If `subscriptions.tier !== 'pro'` (and `'pro_lite'` is *not* enough —
   per spec §14, post-game review is full Pro), render `<ReviewLocked>`
   with `<ProTierDialog>` and exit.
4. If `replay_blob` is null, render `<ReviewUnavailable />` ("This game
   was played before replay recording shipped").
5. Decode `replay_blob` (Supabase returns bytea as base64 in `data.replay_blob`).
6. `actions = deserializeReplay(bytes)`.
7. Reconstruct layout: extract `firstClick` from `actions[0]` if it's a
   `reveal` (always true for a valid game). Call
   `generateBoard({ rows, cols, mineCount, noGuess, seed, firstClick })`.
8. `annotations = annotateMoves(layout, actions)`.
9. Pass `{ layout, actions, annotations, gameMeta }` to
   `<ReplayPlayer>`. The layout includes `mines: Set<number>` — we
   serialize to `{ mines: number[] }` for the wire and rebuild on the
   client.

Server-side budget per §16.5: `annotateMoves` <500ms p95 on Expert.
Acceptable for an interactive page load.

## ReplayPlayer client component

`src/components/review/ReplayPlayer.tsx`:

- Props: `{ layout, actions, annotations, gameMeta }`.
- Local state: `cursor: number` (0..actions.length).
- Derived state via `useMemo` keyed on `cursor`: replay
  `actions.slice(0, cursor)` from `initialState(layout)` to get the
  current `GameState`. Cheap: <5ms even on Expert (`applyAction` is
  <5ms p95).
- Reuses existing `<Board>` (presentational props-in component used by
  Quick Play + Daily).
- **Annotation overlay**: when the *next* action (i.e. `actions[cursor]`)
  is a `reveal` AND `annotations[cursor].safeMoveAvailable` AND the
  reveal cell is not the safe cell, highlight the safe cell with a
  yellow ring + small "Safe cell here" pill. This is the "missed safe
  move" moment — visible at the turn before the player chose
  unsafely.
- **Controls**:
  - `<<` jump to start
  - `<` step back
  - Range slider 0..actions.length
  - `>` step forward
  - `>>` jump to end
  - `Jump to next mistake` button — finds the next index where
    `safeMoveAvailable` is true and the player's chosen cell wasn't the
    safe one. Disabled when no more mistakes.
- **Action log panel** (right side, scrollable):
  - One row per action: index, kind, (row,col), elapsed ms.
  - Rows where the player missed a safe move get a red dot + "Safe cell
    was at (r,c)".
  - Current cursor row is highlighted; clicking a row jumps to that
    cursor.
- **Summary header**: Total turns, mistakes count, win/loss badge,
  difficulty + time from `gameMeta`.

No auto-play in v1 (spec §6 polish bucket — explicit cut).

## Tier gate philosophy

Per CLAUDE.md hard rule §6: tier gating is server-side. The RSC
performs the tier check before rendering. The Account "Review" link is
*shown to all users* (we don't hide it), but free users hitting the
page get the upsell. Showing the link to free users is a deliberate
demand-generation choice — it surfaces the existence of the feature.

## What is not built

- LLM narration (cut)
- Coach follow-up chat thread on a review (`coach_conversations` kind
  `post_game_review`) — separate slice
- Replay sharing (`/r/<id>` short links) — Phase 2
- Probability heatmap overlay — Phase 2 / 3
- Caching annotations to a column — wait until perf complains
- Replay viewer for games created before this slice ships
  (`replay_blob` is null → "Review unavailable")

## Verification gates

Per CLAUDE.md verification checklist:

1. `pnpm test --filter @minesweeper/engine` green (new replay tests
   included)
2. `pnpm typecheck` green
3. `pnpm lint` green
4. `pnpm test:all` green
5. Browser walkthrough: play a Quick Play game to win or loss, click
   "Review", scrub the slider end-to-end, verify a missed-safe-cell
   highlight appears at least once if the game involved any logically
   guessable position
6. Free-user flow: log out, sign in as a free user, hit a review URL,
   confirm the upsell renders

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| First-click reconstruction wrong → layout differs from original | actions[0] is canonically the first reveal; assert this in the page handler and surface a clear error if violated |
| bytea round-trip (b64 in/b64 out) corrupts data | Round-trip test in the engine package + a smoke test in the page that asserts `serializeReplay(deserializeReplay(blob)).length === blob.length` (when the page loads) |
| annotateMoves slow on Expert | Spec budget is 500ms; if it exceeds, cache to a `replay_annotations` JSONB column in a follow-up |
| Replay diverges between encoder/decoder across runtimes | Replay tests in the engine package are pure TS — same code in browser, Node, Vitest. No floating-point, no `Math.random()` |
