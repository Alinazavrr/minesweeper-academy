# PROJECT_PLAN.md — Minesweeper Academy + Arena

> A training and competitive platform for Minesweeper players — Chess.com for logic lovers.

---

## 1. Executive Summary

Most Minesweeper sites are 20-year-old clones: a grid, a timer, and that's it. They reward luck, teach nothing, and have no reason for anyone to come back tomorrow. **Minesweeper Academy + Arena** turns Minesweeper into a real product: a place to *learn* the underlying logic, *train* on patterns, *compete* with timed Arena formats, and *talk to an AI coach* about every game you play.

What makes this different:

- **AI Coach (Pro)** — chat with an LLM-driven coach in plain English about any game you've played; the coach calls out missed safe moves and explains what went wrong.
- **Hint mode (Free)** — one-click "show me a provably safe cell" using a constraint-propagation solver. Different from the AI Coach.
- **No-Guess Mode** — boards are mathematically guaranteed solvable. In Arena, boards are drawn from a pre-generated pool so the same player never sees the same board twice.
- **Arena** — synchronized-start parallel runs (Bullet / Blitz / Rapid) with a live mid-match score race. If no opponent shows up within 10 seconds, the queue falls back to a bot replay so you never wait in an empty lobby.
- **Daily Challenge** — one board per day for everyone, rotating difficulty, global leaderboard, Wordle-style share card.
- **Replay system** — every game is recorded and shareable.
- **Academy** — public lesson pages that double as SEO content, each with an interactive demo and a playable practice map.
- **Mines & Shop** — earn Mines by playing, spend on cosmetic skins. Free players can buy basic skins; Pro tiers unlock additional shop categories.

The platform serves beginners learning probabilistic thinking, intermediate players who want to improve, and advanced players chasing the leaderboard. It is built to be played daily.

---

## 2. Product Vision & Positioning

**One-liner.** A training and competitive platform for Minesweeper — Chess.com for logic players.

**Positioning statement.** For people who love thinking games, Minesweeper Academy + Arena is the only Minesweeper platform that combines training, competition, and analytics. Unlike every existing site, we treat Minesweeper as a skill — not a time-killer.

**Differentiators vs. existing sites (minesweeper.online, minesweepergame.com, etc.):**

| Existing sites | Academy + Arena |
| --- | --- |
| Random boards, often unsolvable | No-Guess Mode by default for ranked Arena and daily play |
| Generic leaderboard | Bullet / Blitz / Rapid Arena + rotating Daily Challenge + monthly seasons + country/global filters |
| No coaching | Hint mode (free) and AI Coach chat + post-game review (Pro) |
| No structured learning | Academy with public lesson pages + interactive practice maps |
| Win/loss counters | Full analytics: mistake heatmap, flag accuracy, 3BV/s |
| Quit after one game | Daily streak, seasonal badges, live mid-match score race |
| No progression rewards | Mines currency + skin shop + tiered cosmetics |

**Brand tone.** Sharp, modern, intellectual. Closer to chess.com, Duolingo, and Linear than to a 2003 Flash game portal. Dark mode first. Typography-led. No cartoon mines.

---

## 3. Target Users

### Persona 1 — The Learner
"I want to actually understand Minesweeper, not just guess."
- **Motivation:** loves logic puzzles (Sudoku, chess); finds Minesweeper intimidating because every guide skips the math.
- **Frustration with existing sites:** no explanations, no training, dies on luck.
- **What hooks them:** Academy lesson pages teach 1-2-1 and 1-2-2-1 patterns step by step, then drop the user straight into a practice board. Pro-tier AI Coach reviews any saved game in plain English.

### Persona 2 — The Improver
"I play often and want to get faster."
- **Motivation:** has played hundreds of games, wants to break personal records.
- **Frustration:** no insight into what's actually slowing them down.
- **What hooks them:** analytics dashboard with 3BV/s, mistake heatmap, percentile comparisons. Replay system lets them rewatch their best games. Pro coach chat helps them ask "what did I do wrong on turn 23?"

### Persona 3 — The Competitor
"I want to be ranked."
- **Motivation:** competitive — leaderboards and rankings are the entire point.
- **Frustration:** no ladder or season structure anywhere.
- **What hooks them:** Bullet / Blitz / Rapid Arena with a **live in-match score race** against other players (or a bot fill if nobody else is queued), seasonal badges, friends-filter leaderboards.

---

## 4. Core Gameplay Experience

Standard Minesweeper, executed at premium quality.

- **Mechanics:** reveal, flag, chord (double-click on a satisfied number to clear neighbors). Question marks optional.
- **First-click safety:** never a mine on first click — for non-no-guess boards we shuffle mines after first interaction; for no-guess boards we draw from a pool of pre-generated layouts and pick one where the chosen first-click is on a safe cell (see §10 + §20).
- **No-Guess Mode (default for ranked Arena and daily play):** boards are pre-generated by a server-side worker that runs a logical solver and only stores boards that can be solved by pure logic. This is *the* feature that separates serious from casual Minesweeper.
- **Difficulty tiers:**
  - Beginner — 9×9, 10 mines
  - Intermediate — 16×16, 40 mines
  - Expert — 30×16, 99 mines
  - Custom — user-defined
- **Input model (MVP — simple defaults only).** Desktop: left = reveal, right = flag, double-click on a satisfied number = chord, keyboard shortcuts (arrows / Space / F / C). Mobile: tap = reveal, long-press = flag, pinch-zoom only enabled on Expert. **No in-product configuration panel for mobile controls in MVP** — sensible defaults are wired and nothing else. Configurable mobile controls (tap-mode toggle, gesture customization) ship in Phase 1.5.
- **Feel requirements:** instant response, snappy reveal animation, satisfying flag thunk, no first-click jank (achieved by pool-based generation, not in-browser regeneration), no input lag on Expert boards even on mid-range mobile.

---

## 5. Feature Pillars

All features live under one of six pillars. This structure keeps the product coherent as it grows.

1. **Play** — quick play, no-guess, custom boards, themes.
2. **Academy** — public lesson pages with interactive demos + practice maps. Doubles as SEO surface.
3. **Arena** — Bullet / Blitz / Rapid synchronized-start runs with **live mid-match score race**, bot fallback when human queue is empty, seasons, ranked leaderboards, ghost races.
4. **AI Coach** — hint mode (free CSP solver) + Pro-tier conversational coach + post-game review.
5. **Analytics** — personal stats (free) + advanced analytics dashboards (Pro).
6. **Community** — global / country leaderboards (with friends filter), replay sharing, **skin shop**.

---

## 6. MVP Scope (Phase 1)

MVP = the rubric's "Strong" tier plus several "Great" features (Daily Challenge with leaderboard + share card, Pro-tier AI Coach, functional fake-purchase flow). Shippable, demo-able, defensible. **Time-constrained: aggressive cuts on everything not load-bearing for the rubric.**

**In scope:**

- **Core game** with full rules, three difficulties, timer, win/loss detection, chord.
- **Authentication** (email + Google) via Supabase. **No guest persistence** — guests can play Quick Play with a random board, but nothing is saved. Sign-up CTA copy: "Sign in to save your stats, attempt the Daily Challenge, and accrue Mines."
- **Per-user saved stats:** games played, win rate, best time per difficulty, flag accuracy, 3BV/s.
- **Daily Challenge** — one board per day for everyone, rotating difficulty (Mon–Sun schedule), time-based global leaderboard, Wordle-style share card.
- **Hint mode (free, MVP).** "Hint" button in Quick Play reveals one provably-safe cell using constraint propagation. Disabled when no logically-safe cell exists (button greys out with tooltip "no safe move — make a guess"). Hints count against final score in Daily Challenge.
- **AI Coach Chat (Pro, MVP).** LLM-driven chat where the user can talk about any saved game in plain English. The coach receives the game's move history + board states + win/loss outcome and discusses what happened. Pro-only feature, gated by the `subscriptions.tier` flag. Rate-limited per day to control API spend.
- **Post-Game Review (Pro, MVP).** After any saved game (Quick Play or Daily), Pro users can tap "Review with Coach". The system runs the CSP solver at each move to find turns where a provably-safe cell existed but was not chosen, then the LLM narrates "On turn 17 you guessed at (4,7); cell (8,2) was logically safe." Honest scope: this is CSP-based, not probability-based. The probability heatmap is Phase 2.
- **Mines currency stub** — accrue Mines on game finish; balance shown on profile. Shop UI is Phase 2; currency itself ships in MVP so balances accumulate from day 1. **No daily cap in MVP** (added in Phase 1.5 when the shop ships).
- **Pro modal (functional fake purchase).** Reachable from settings + hint overflow + post-game screen. Lists Free / Pro-Lite / Pro tiers with full pricing copy. Pressing "Upgrade to Pro-Lite" or "Upgrade to Pro" shows a success toast ("Thanks — you're upgraded to Pro!") and flips `subscriptions.tier`. The Pro features above (AI Coach Chat, Post-Game Review, advanced analytics) immediately unlock. **No real billing integration** — the fake purchase is the demonstration of business intent that the rubric asks for.
- **Pro-Lite tier features in MVP:** ad-free flag (no ads anywhere in MVP anyway, but the flag is wired), advanced analytics panels on the profile (3BV/s trend chart, flag-accuracy trend, mistake heatmap, recent-games table). Skin/theme access is Phase 2 (when shop ships).
- **At least 4 Academy lesson pages** (1-2-1, 1-2-2-1, corner logic, probability basics) — public URLs (`/learn/<slug>`) with embedded interactive demo + practice map. SEO + retention surface. **Cap MVP at 8 lessons.** Anything beyond that is Phase 2.
- **Personal stats dashboard** (free panels). Games played, win rate, best time per difficulty, flag accuracy, Daily Challenge streak, Mines balance.
- **Daily Challenge submission stub-validator.** Submissions write to `daily_results` with `validated = true`. The full move log is persisted to `games.replay_blob` so a real validator can replay them in Phase 1.5. **No anti-cheat heuristics in MVP** — there are no contested leaderboards yet.
- **Responsive UI** with simple mobile defaults (pinch-zoom on Expert only, long-press to flag), single dark/light toggle that persists.
- **Polished landing page** that communicates the bigger vision.
- **Basic accessibility:** all in-game color usage has a non-color secondary signal (icon/label/pattern); full keyboard play (arrows / Space / F / C); one accessibility-friendly palette toggle (high-contrast). Screen-reader live regions ship in Phase 1.5.

**Explicit non-goals for MVP:**

- Arena live matches (Phase 2)
- Skin shop UI (Phase 2 — currency accrues in MVP)
- Replay viewer (replays are *recorded* into `games.replay_blob` in MVP but no UI to scrub them)
- Full Academy (40+ lessons; MVP ships 4–8)
- Seasons + Elo ladder (Phase 2 / Phase 3)
- Real billing integration (out of scope for this plan)
- Probability overlay heatmap (Phase 2, Pro)
- Probability-aware coach (Phase 3)
- Guest games migration cookie (cut — guests don't persist at all)
- Configurable mobile controls UI (Phase 1.5)
- Screen-reader live regions (Phase 1.5)
- Mines daily-earn cap (Phase 1.5)
- Real move-log validator (Phase 1.5)
- Full PostHog funnel (minimal events in MVP: `signup`, `game_start`, `game_finish`, `daily_complete`; rest in Phase 1.5)
- Email notifications

---

## 7. "Wow" Features

These are the five features that get top billing in the README and the demo:

1. **AI Coach in plain English (Pro).** Chat with the coach about any game you've played. It calls out the move that lost the game, the safe cells you missed, and explains the logic — like having a chess engine that talks. CSP-based identification in MVP, probability-aware in Phase 3.
2. **No-Guess Mode.** A constraint solver verifies every Daily Challenge board, Arena board, and Pro practice board can be solved by pure logic. Arena boards come from a pre-generated server-side pool, so no in-browser stalls.
3. **Replay System (Phase 2 viewer).** Every game records each move with a timestamp from MVP onward. Phase 2 ships the scrubbable viewer + shareable `/r/<id>` link.
4. **Bullet / Blitz / Rapid Arena with live score race + bot fallback.** Players queue for a format. Within 10s the server creates a match — pairing real players if any are queued, falling back to bot replays if nobody else is around. Every player's timer starts at the same instant; **the live score-race panel is the heart of Arena.** Each time a player finishes a board, their score increments by a difficulty-weighted amount (Beginner ≈ 1,000, Intermediate ≈ 3,500, Expert ≈ 10,000 per §10) and that update is broadcast instantly to every opponent's screen. You watch your bar shoot forward when you win a board, watch a rival's bar climb when they win one, watch a slow-and-steady bot inch upward, and decide whether to race for a Beginner stack or gamble on an Expert. The competitive feel is preserved even in bot matches: bot fills broadcast their score updates on the same channel at their replay's original pace, so racing a bot is visually and emotionally identical to racing a human (with a clear "Bot — [name]" label so users aren't deceived). Monthly seasons award Bronze / Silver / Gold / Diamond badges per format.
5. **Academy lesson pages.** Public, indexable URLs that explain a pattern, demonstrate it on an interactive board, and drop the player into a practice map. SEO content and training feature in one.

---

## 8. Page / Screen Inventory

| Screen | Phase | Purpose | Key Components | Primary Actions |
| --- | --- | --- | --- | --- |
| Landing | 1 | Sell the vision | Hero, feature pillars, daily challenge teaser, CTA | Sign up, play as guest |
| Auth | 1 | Onboarding | Email + Google buttons, optional display name | Sign in / sign up |
| Home dashboard | 1 | Daily hub | "Continue playing", Daily Challenge banner, stats snippet, streak, Mines balance | Start game, open daily, go to Academy |
| Game | 1 | The actual game | Board, timer, mine counter, flag/hint buttons, difficulty selector | Play, flag, chord, request hint |
| Post-game | 1 | Closure + retention | Result, stats, mistakes, share card, Mines earned, "play again", **"Review with Coach" (Pro)** | Play again, share, review |
| Daily Challenge | 1 | Today's board + ranking | Board, rotating-difficulty tag, time leaderboard, your rank/percentile, share card, streak, countdown to reset | Play today's board, share, view leaderboard |
| Academy hub | 1 | Lesson catalog | Browseable lesson list grouped by category + difficulty | Pick lesson |
| Lesson page (public) | 1 | Teach a pattern | Concept text + annotated diagrams, embedded demo board, practice board, related lessons | Watch demo, attempt practice, share |
| **Coach Chat (Pro)** | 1 | Plain-English game discussion | Game selector, threaded chat, message composer, rate-limit indicator | Pick a game, ask, follow-up |
| **Post-Game Review (Pro)** | 1 | Walk-through of a finished game | Board scrubber, per-move annotation ("safe cell available here"), coach narration | Scrub, ask coach follow-up |
| Profile + analytics | 1 | Long-term stats | Free panels (basic stats); Pro panels behind tier flag (advanced analytics: 3BV/s trend, flag-accuracy trend, heatmap) | Edit profile |
| Pro modal | 1 | Monetization (functional fake purchase) | Tier comparison, pricing, feature lists, "Upgrade" buttons that grant the tier | Upgrade (sets tier flag) |
| Settings | 1 | Account + prefs | Theme, high-contrast toggle, account | Edit, sign out, delete |
| Arena hub | 2 | Competitive home | Bullet / Blitz / Rapid queues, recent matches, season progress, badge case | Queue by format, view season |
| Arena match screen | 2 | Live timed run | Player's own board, timer, **live score-race panel** (bars/sparkline for every participant — humans + bot fills) | Play, pick next tier, watch race |
| Replay viewer | 2 | Watch a game | Scrubbable timeline, board snapshot, move list | Scrub, comment, copy link |
| Leaderboards | 2 | Rankings | Tabs: global / country, format filter (Bullet/Blitz/Rapid), friends-filter toggle, time window | Filter, view player |
| Shop | 2 | Buy skins | Categories, tier filter, Mines balance, skin previews | Purchase, equip |
| Inventory | 2 | Owned skins | Equipped slots, owned-vs-unowned | Equip / unequip |
| **Probability overlay** (Pro) | 2 | In-game probability heat map | Toggle on board; per-cell mine probability shaded | Toggle, hover for value |
| Ghost race | 3 | Race against a stored replay | Player's board + ghost timer + opponent's score sparkline | Play |
| Settings — advanced controls | 1.5 | Mobile + a11y config | Tap-mode toggle, gesture customization, SR options | Edit |

---

## 9. Learning / Training System (Academy)

The Academy is what turns one-time visitors into daily users — and it's the product's main SEO surface. Every lesson is built as a **public, indexable URL** at `/learn/<slug>` that anyone can read without signing in.

**Lesson page structure (template):**
- **Hero** — lesson title, one-sentence summary, difficulty badge.
- **Concept** — 3–5 short paragraphs + 1–2 annotated SVG diagrams.
- **See it live** — an interactive embedded board pre-set to demonstrate the pattern. The user can step through reveals to watch the logic play out.
- **Practice** — a generated (or hand-authored, for MVP) practice map where the exact pattern appears. The user attempts it; signed-in users get star ratings recorded to `lesson_progress`.
- **Related lessons** + Open Graph share card.

**Why this doubles up.**
- Free SEO traffic on a high-volume keyword pool ("minesweeper 1-2-1 pattern," "minesweeper probability," "no-guess minesweeper").
- One artifact serves two purposes: content marketing and training.
- Visitors land from Google, see a real lesson + interactive practice, and have a strong reason to sign up.

**Lesson catalog.**
- **MVP (4–8 max):** 1-2-1 pattern, 1-2-2-1 pattern, 1-2 corner, probability basics. Optionally: flag-vs-chord, edge logic, counting unrevealed neighbors, opening theory. **Hand-author** practice boards rather than generating them — pattern-targeted generation is significantly more work than vanilla no-guess generation.
- **Phase 2 (~15):** add the remaining patterns and speed drills.
- **Phase 3 (40+):** the full library.

**Progression.** Skill-tree view in the Academy hub — later lessons unlock as earlier ones earn ≥1 star. Three-star rating per lesson (completion / time / no-hint).

**Retention hooks.** A "daily lesson" surfaced on the home dashboard. Streak counter for consecutive days completing a lesson. Email reminders deferred to a later phase.

---

## 10. Competitive / Leaderboard System (Arena)

Arena is **time-control matchmaking with parallel solo runs** — Phase 2. Players queue for a format; everyone in the match starts at the exact same moment; each player plays their own boards and chooses difficulty mid-run. A **live score race** visualization makes the competition feel real-time. If no human opponent is queued, the match fills with bot replays so the queue never blocks forever.

**Arena formats.**

| Format | Time limit | Product feel | Strategic tension |
| --- | ---: | --- | --- |
| **Bullet** | 60 seconds | frantic, highlight-friendly | many Beginner solves vs. one risky Expert solve |
| **Blitz** | 3 minutes | default competitive mode | mix Intermediate boards with occasional Expert attempts |
| **Rapid** | 5 minutes | more deliberate | Expert boards and accuracy become more viable |

**Match lifecycle.**
1. Player queues for one format — a row is inserted into `arena_queue`.
2. A scheduled matchmaker function runs every ~2s. When ≥2 queued players exist for a format (or any one player has been queued ≥10s), it creates a match.
3. If only one human is queued at the 10s timeout, the matchmaker pulls 1–3 stored replays from `bot_replay_pool` (filtered by format and rating band) and adds them as participants. `arena_matches.is_bot_match = true`.
4. The matchmaker writes the match row, picks board seeds from `board_pool` (filtered to exclude any seed already in this user's `user_seen_boards`), and broadcasts `match_start { match_id, starts_at_unix_ms, board_stream }` via a Supabase Realtime channel.
5. Every client's timer starts at the exact same wall-clock instant. (Client performs a one-shot clock-sync exchange on channel join to compute server-time offset — addresses the cold-launch clock-skew risk.)
6. During the run, each player picks Beginner / Intermediate / Expert per board. The client requests the next board's seed from the match's board stream; the server marks that seed as `seen` for the user. **All Arena boards are no-guess and come from the pre-generated server pool — no in-browser generation.**
7. On each successful solve, the client publishes `score_update { user_id, total_score, boards_solved, elapsed_ms, board_difficulty, awarded_points }` to the match channel. All clients subscribe and update the **live score race UI** — every opponent sees the solving player's bar punch forward, with a small `+1,000` / `+3,500` / `+10,000` badge briefly floating over the row indicating exactly how much was earned and on which difficulty. Bot replays publish `score_update` on a schedule matched to the original replay's pace so the visual experience is indistinguishable from racing a human.
8. Failing a board (revealing a mine) costs time but keeps banked points; the player picks the next tier.
9. On timer end, the client submits its full move log per board to the validator. Server replays the log against the engine, computes final score and Elo deltas, broadcasts `match_complete { standings }`, and writes `arena_match_results`.

**Live score race UI.** This is the single most important UI surface in the entire product — the moment that turns Arena from "solo play with a final ranking" into "I am racing this person right now." A persistent panel is visible throughout the match. Each participant gets one row containing:

- Their avatar / display name (or "Bot — [name]" for bot fills).
- A live horizontal bar whose length is `current_score / dynamic_target`, where `dynamic_target = current_leader_score × 1.15`. The bar lengthens with an ease-out animation every time the player's score increments.
- A thin sparkline below the bar showing score-over-time.
- The current difficulty the player is attempting (so opponents can see "they just started an Expert — will they finish it before the timer ends?").
- A "+N" badge that briefly floats over the row when that player solves a board, showing the awarded points colored by difficulty (green for Beginner, yellow for Intermediate, red for Expert).

Behavior:
- **The leader's row pulses** with a soft glow so the eye is drawn to it.
- **When one player overtakes another, both rows flash briefly** (the overtaker green, the overtaken red) so the dramatic moment is impossible to miss.
- **Solving a board punches your own row forward** with a quick scale animation and a satisfying tick sound; the score counter rolls up rather than snapping.
- **The order of rows shifts in real time** as scores change — a player who was last and is now climbing visibly slides up past their rivals.
- **Bots broadcast `score_update` events at the cadence of the replay driving them**, so to your eyes nothing distinguishes a real opponent racing you from a bot racing you. This is what keeps the experience honest even when the queue is empty: a single human matched with three bot replays still feels like four-player Arena.

Implementation note: the panel subscribes to the match's Supabase Realtime channel and reduces incoming `score_update` events into a local Zustand store. Each row is a memoized component keyed on `user_id` (or `bot_slot`) so only the rows that actually changed re-render. Animations are CSS-only; no per-frame React updates.

**Disconnect handling.** Wall-clock-honest: a player's timer continues regardless of connection state. On reconnect, the client catches up by replaying buffered `score_update` events from the channel history. If the player misses the submission window, the partial moves they did broadcast count, but their final score is computed from validated state at disconnect time.

**Anti-cheat (Phase 2, light).** Server replays the submitted log; rejects logs with median reveal-interval < 30ms across 100+ reveals on Expert; rejects impossible chord patterns; double-submission returns 409. Suspect runs are shadow-flagged for review, not auto-banned.

**Arena scoring.**

| Board tier | Target solve | Target 3BV | Base points | Role |
| --- | ---: | ---: | ---: | --- |
| Beginner | ~10 s | 25 | 1,000 | low risk, fast stacking |
| Intermediate | ~35 s | 90 | 3,500 | balanced value |
| Expert | ~100 s | 170 | 10,000 | high risk, high reward |

```text
complexity_factor = clamp(board_3BV / target_3BV_for_tier, 0.70, 1.35)
board_score = round(base_points * complexity_factor)
```

The clamp prevents one weird board from breaking a match. The pool generator targets complexity bands per tier (Beginner 20–30, Intermediate 75–105, Expert 150–190) so the pool's distribution is already healthy.

**Board pool architecture (Phase 2).** A nightly server worker (Vercel Cron + Edge Function) generates ~1000 no-guess boards across the three tiers and inserts them into `board_pool`. The matchmaker selects from this pool. Per-user `user_seen_boards` rows track which pool entries each player has played; the matchmaker excludes seen entries when picking the next board. Global random selection from unseen pool entries — fair across users, no need for elaborate "around the world" rotation.

**Daily Challenge.**
- One board per day, the same for everyone, like Wordle.
- Rotating difficulty: Mon = Beginner, Tue = Intermediate, Wed = Expert, Thu = Beginner, Fri = Intermediate, Sat = Expert, Sun = wildcard.
- Daily boards are also drawn from `board_pool` (or generated bespoke at midnight UTC if pool is exhausted).
- Time-based leaderboard (fastest time wins; ties broken by mistake count, then submission time).
- One official attempt per user per day; practice attempts allowed but excluded from the leaderboard.
- Auto-generated Wordle-style share card on completion.
- Daily reset countdown shown on the home dashboard.

**Seasons (Phase 2).**
- Monthly. Aggregate season points from Arena matches and Daily Challenge finishes.
- Tier badges awarded at season end per Arena format: Bronze (top 50%), Silver (top 20%), Gold (top 5%), Diamond (top 1%).
- Badges visible on profile permanently.

**Ranked ladder (Phase 3).**
- Elo-style rating per Arena format. Schema stub (`ratings` table) exists in Phase 2 — Phase 3 adds the actual ladder logic and ranked-vs-unranked queue split.
- Ranked Arena uses No-Guess Mode only. Hints are disabled in ranked Arena.
- Decay after 14 days inactive on Bullet and Blitz; Rapid does not decay.

**Leaderboard filters (Phase 2).**
- Global, country (self-declared, IP-defaulted at sign-up).
- Format filter: Bullet, Blitz, Rapid (each its own table).
- **Friends-only toggle** that narrows the current view to your friends list.
- Time window: today, this week, this season, all-time.

**Ghost race (Phase 3).**
- Pick any past replay of comparable rating from the same Arena format; your reveals race against the ghost.
- Async by design — same parallel-solo pattern as Arena, but the "opponent" is a stored replay (same mechanism as Arena's bot fills).

**Cold-start.** Generated bot results + named AI benchmarks ("Beat the Solver", "Beat Speedrun AI") populate every leaderboard from day 1 so the first user never sees an empty table. Bot replays double as Arena queue fillers.

---

## 11. Player Stats & Analytics

Profile dashboard is one screen, scannable in 5 seconds. Two layers:

**Free panels (MVP):**
- Games played, win rate per difficulty
- Best time + average time per difficulty
- Flag accuracy (correct flags / total flags placed)
- Daily Challenge streak (current + longest)
- Mines balance + total earned
- Recent games (list with result, time)

**Pro / Pro-Lite panels (MVP, unlocked by fake purchase):**
- **3BV/s** — the standard Minesweeper efficiency metric, with 30-day trend chart
- **Flag-accuracy trend** — weekly time series
- **Mistake heatmap** — board grid colored by where the user dies most (per difficulty)
- **Games-played calendar** — GitHub-style contribution graph
- **Percentile cards** — "Top 28% in Daily Challenge this month"

**Phase 2 additions (Pro):** Arena rating + best Daily Challenge time per difficulty, Arena score trend per format, lessons-completed-per-week.

The free/Pro split is enforced by hiding/showing panels based on `subscriptions.tier`. RPC for stats already returns everything; the gating is purely client-side render in MVP. Server-side enforcement on stat-returning RPCs is straightforward to add later if needed.

---

## 12. AI Coach

The coach is split across **five escalating modes**, two of which ship in MVP. **Critical distinction:** *Hint* and *AI Coach* are two different features:

- **Hint** = a button in Quick Play / Daily that highlights a provably-safe cell. CSP solver. **Free, MVP.**
- **AI Coach** = a conversational LLM-driven feature that discusses your games in plain English. **Pro, MVP.**

### Mode 1 — Hint (Free, MVP)
- Button in Quick Play. Disabled in ranked Arena.
- Runs constraint propagation against the current board state → highlights one cell that is provably safe.
- If no logically-safe cell exists, the button greys out with tooltip "no safe move — make a guess." **No probability fallback in MVP** — that's Phase 2's overlay feature.
- Hint usage counts against score in Daily Challenge and is recorded on the game record.

### Mode 2 — AI Coach Chat (Pro, MVP)
- Pro users get a "Coach" entry in nav and on each Quick Play / Daily post-game screen.
- The user picks a saved game; the system loads the game's seed, move history, board snapshots, and outcome.
- A serverless function calls the Anthropic API (claude-haiku-4-5 by default for cost; can be swapped to claude-sonnet-4-6 for higher-quality replies) with a structured prompt: *"You are a Minesweeper coach. Here's the user's game [data]. The user asks: '[question]'."*
- Conversation persists in `coach_conversations` / `coach_messages` so the user can come back and continue the chat.
- **Rate-limited per day** via `coach_usage_daily` (e.g. 20 messages/day for Pro) to control API spend.
- API key lives server-side only; client never sees it.

### Mode 3 — Post-Game Review (Pro, MVP)
- "Review with Coach" button on any saved game.
- The server pre-computes a per-move analysis: for each player action, run the CSP solver against the pre-action state and check whether a provably-safe cell existed that wasn't chosen. Mark each turn `safe_move_available: bool`.
- The LLM is given the analysis + move history and asked to narrate the user's mistakes in plain English: *"On turn 17 you revealed (4,7) which was a 50/50 guess; cell (8,2) was logically safe from the (3,3)=1 constraint."*
- The narrative is interactive — the board scrubs to each annotated move as the user reads.
- **Honest scope.** This is CSP-based, not probability-based: it identifies *missed safe moves*, not *suboptimal probabilistic guesses*. The probability-aware variant ships in Phase 3.

### Mode 4 — Probability Overlay (Pro, Phase 2)
- Toggle: every uncovered cell adjacent to numbers is shaded by mine probability.
- Computed via subset enumeration over the constraint graph, cached per board state.
- Runs server-side via RPC so the Pro paywall is enforceable. Pro feature; free users get 3 toggles per day as a teaser.

### Mode 5 — Probability-Aware Coach (Pro, Phase 3)
- Combines Mode 3's CSP analysis with Mode 4's probability solver: walks the game move by move, computes win probability before and after each move (Monte Carlo from the constraint state).
- Highlights the move where win probability dropped the most — "this is where the game was lost".
- LLM narrates the optimal alternative.
- This is the "full" post-game review the original spec envisioned; MVP ships the CSP-only version and Phase 3 upgrades it.

**Implementation notes.**
- Use `claude-haiku-4-5` as the default model. Haiku is fast and cheap — even a 5000-token coaching conversation costs roughly a fraction of a cent. Offer claude-sonnet-4-6 as an opt-in for users who want deeper analysis (no charge difference in MVP since Pro is fake-purchased).
- Stream responses with the streaming API for the chat experience.
- Persist conversations server-side so the user can refer back. Cap retention at 90 days for free-tier teasers / 1 year for Pro.

---

## 13. Social / Community

- **Friends (Phase 2).** Add by username or share-link. Surfaced as a **friends-only filter** on every leaderboard, not as a separate screen.
- **Shareable replays (Phase 2).** `/r/<replay-id>` short link. No account required to view. Viewers can drop a single emoji reaction. Replays themselves are recorded into `games.replay_blob` from MVP onward — the viewer ships in Phase 2.
- **Daily Challenge share card (MVP).** Auto-generated Wordle-style text + Open Graph image on completion. Free viral hook.
- **Challenge a friend (Phase 2).** Send a seed → friend plays the same board → side-by-side comparison.
- **Skin shop & inventory (Phase 2).** See §14. Cosmetic engagement loop. Free players can buy basic-tier skins with Mines from day 1 of Phase 2.
- **Featured content (Phase 2+).** Curated weekly: fastest Daily Challenge times, notable replays.

---

## 14. Monetization — Free, Pro-Lite, Pro + Mines

### Tiers

| Tier | What you get |
| --- | --- |
| **Free** | Core game, Daily Challenge, Bullet / Blitz / Rapid Arena (when it ships), basic stats, hint mode, public leaderboards, Academy access, earn and **spend Mines on basic skins** (Phase 2+ shop). |
| **Pro-Lite (~$2.99/mo)** | Everything Free, plus: **advanced analytics panels** (MVP), ad-free, **access to the Pro-Lite skin tier in the shop** (still costs Mines — Pro-Lite unlocks the *category*, not the items, Phase 2+). |
| **Pro (~$4.99/mo or ~$29/yr)** | Everything Pro-Lite, plus: **AI Coach Chat + Post-Game Review (MVP)**, probability overlay (Phase 2), unlimited replay history (Phase 2), **instant ownership of every skin Free players can buy with Mines** (Phase 2), exclusive Pro-only skins (Phase 2+), season-pass cosmetics (Phase 2+). |

### Fake-purchase mechanics (MVP)

The Pro modal is **functional in MVP** — not just a mockup:
- Reachable from Settings, the hint-counter overflow, and the post-game screen's "Review with Coach" button (when user is Free).
- Lists Free / Pro-Lite / Pro tiers with full per-tier feature copy and pricing.
- "Upgrade to Pro-Lite" / "Upgrade to Pro" buttons each:
  1. Show a success toast: *"Thanks for the purchase — you're now on Pro!"*
  2. Update `subscriptions` row: `tier = 'pro'`, `granted_via = 'fake_purchase'`, `granted_at = NOW()`.
  3. Immediately unlock the corresponding features (analytics panels for Pro-Lite; AI Coach + Post-Game Review for Pro).
- **No real billing in this plan.** The `subscriptions` table records the tier and how it was granted; whatever billing integration is added later is out of scope for this document.
- A "Downgrade to Free" link exists in Settings so reviewers can try the tier swap.

### Mines currency

- Earned by: completing games (rate scales with difficulty and result), completing the Daily Challenge, season-finish bonuses (Phase 2+), mission stars (Phase 3+).
- Spent on: skins in the shop (Phase 2+) — board themes, number fonts, reveal effects, profile flair.
- **Free** users can buy basic-tier skins.
- **Pro-Lite** users unlock the Pro-Lite skin tier — these skins still cost Mines.
- **Pro** users own every Mine-purchasable skin instantly plus exclusive Pro-only items and seasonal drops.
- **Daily earning cap** ships in Phase 1.5 alongside the shop (no need for the cap when there's nothing to farm for).
- Rough rates (recalibrate post-launch): Beginner win = 5 Mines; Intermediate = 15; Expert = 50; Daily Challenge = 25; loss = 20% of corresponding win; daily cap ≈ 250 (when shop ships).

### Roadmap

- **MVP:** fake purchase, Pro features above unlocked client-side via tier flag, currency accrues.
- **Phase 2:** shop UI, skin grants, daily earning cap, ProLite cosmetic theme unlocks.

---

## 15. Development Phases

### Phase 1 — MVP (≈ first sprint, realistic 3–4 weeks for one developer)
**Goal.** Ship a "ready startup prototype" per the rubric. Free tier fully playable; Pro tier functional via fake purchase.
**Includes.** §6 in full — core game, auth, Daily Challenge, hint mode, AI Coach chat + post-game review (Pro), Pro modal with functional fake purchase, 4–8 Academy lessons, personal stats (free + Pro panels), Mines accrual, single dark/light theme, simple mobile.
**Dependencies.** Supabase project + schema (§17 Phase 1 tables). Anthropic API key in server env for AI Coach.
**Definition of done.** A signed-in user can play a full game, see saved stats, attempt today's Daily Challenge, accrue Mines, complete an Academy lesson, appear on the daily leaderboard, fake-buy Pro, chat with the coach about a game, and run a post-game review with annotated missed-safe-moves. Pro-Lite users see the advanced analytics panels. Mobile and desktop both feel polished.

### Phase 1.5 — Polish & Trust (≈ 1–2 weeks post-MVP)
**Goal.** Harden everything that was deliberately shipped as a stub. Pure additive work — no MVP behavior changes.
**Includes.**
- Real Daily Challenge move-log validator (replay log against engine, enforce `state.status === 'won'`, reject impossible-cadence submissions).
- Configurable mobile controls UI (tap-mode toggle, long-press behavior, gesture customization).
- Screen-reader live regions for reveal announcements.
- Full PostHog funnel: `landing_view`, `lesson_view`, `daily_complete`, `share_card_copied`, `arena_queue`, `arena_complete`, `pro_modal_view`, `coach_message_sent`, `post_game_review_opened`.
- Mines daily-earn cap (in preparation for the shop).
- Optional: guest-game persistence cookie if user research shows demand.

### Phase 2 — The "Wow" Layer (≈ 4–6 weeks)
**Goal.** Activate the differentiators.
**Includes.**
- **Arena** — Bullet / Blitz / Rapid live matches with synchronized start + live score race + bot fallback (10s queue timeout → fill with replay bots from `bot_replay_pool`).
- **Pre-generated no-guess board pool** with nightly refill worker and `user_seen_boards` dedup.
- **Shop + skin inventory** with Free / Pro-Lite / Pro skin tiers, daily earning cap enforced.
- **Probability overlay** (Coach Mode 4) — Pro only.
- **Replay viewer** + shareable `/r/<id>` links.
- **Academy expansion** to ~15 lessons.
- **Monthly seasons** with Bronze/Silver/Gold/Diamond badges per Arena format.
- **Friends + friends-filter leaderboards.**
- Server-authoritative move-log validation for Arena (extension of the Phase 1.5 Daily validator).
**Dependencies.** Phase 1 game engine and replay recording in place. Edge Function quota for the nightly pool refill.
**Definition of done.** A user can queue for Arena, see the live score race (real opponents or bot fills), share a replay link, buy a skin with Mines, complete a Phase 2 lesson, earn a season badge, and toggle a probability overlay in Pro.

### Phase 3 — Competitive Depth (≈ 3–4 weeks)
**Goal.** Make the platform sticky for serious players.
**Includes.**
- **Elo ladder per Arena format** — ranked queue separated from unranked, decay rules.
- **Probability-aware coach** (Coach Mode 5) — combines CSP analysis with Monte Carlo win-probability for post-game review v2.
- **Async ghost races** — race against a stored replay using the bot-fill mechanism.
- **Full Academy** (40+ lessons).
**Dependencies.** Replay data + ratings table from Phase 2.
**Definition of done.** Ranked queue assigns format-specific Elo; probability-aware review pinpoints turning-point moves; ghost race is playable.

---

## 16. Recommended Tech Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 14 (App Router) + TypeScript** | SSR for landing/SEO/lesson pages, RSC for dashboard, single deploy target |
| Styling | **Tailwind CSS + shadcn/ui** | Fast, themeable, dark mode trivial |
| Client state | **Zustand** | Game state is local-heavy; Zustand is lighter than Redux |
| Server state | **TanStack Query** | Caching for leaderboards, stats |
| Backend / DB / Auth | **Supabase (Postgres + Auth + RLS + Realtime)** | Zero ops; Realtime channels for Arena synchronized-start signal and live score-race broadcasts; RLS protects user data |
| Game engine | **Pure TypeScript package (`packages/engine/`)** — see §16.5 | Same code runs in browser, Web Worker, and serverless validator |
| Solver / no-guess gen | **TypeScript module run by a server-side Edge Function (nightly pool refill)** + Web Worker variant for any in-browser fallback | Heavy compute off the main thread; pool architecture sidesteps p95 perf risk |
| Move-log validator | **Serverless function (Supabase Edge or Vercel function)** | Replays move log to verify Daily Challenge & Arena submissions; enforces Pro overlay paywall later |
| **AI Coach** | **Anthropic API via server-side function** | claude-haiku-4-5 default for cost (~$0.001/conversation); streaming responses; API key never on client |
| Share card images | **`@vercel/og`** | Server-rendered Open Graph images for Daily Challenge + replay shares |
| Analytics | **PostHog (free tier)** | Funnels and retention out of the box |
| Hosting | **Vercel** | First-class Next.js, free tier covers MVP traffic; Vercel Cron drives the nightly pool refill |

**Why this stack.** Every piece has a generous free tier, near-zero ops, excellent docs, and is well-supported by AI coding assistants. Game engine ships as a pure TypeScript package consumed by client, Web Worker, and serverless validator — same code, three runtimes — which makes server-side anti-cheat a thin wrapper instead of a parallel reimplementation. AI Coach adds one additional dependency (Anthropic SDK) and ~50 lines of serverless function code.

---

## 16.5 Game Engine Architecture

The engine is the most load-bearing piece of code in the project — every mode (quick play, Daily Challenge, Arena, mission, replay, lesson embed) runs on it. Designing it right once prevents months of bug-divergence.

**Design principles.**
- **Pure & deterministic.** No `Math.random()` inside the engine — all randomness is seed-driven via a stable cross-platform PRNG (Mulberry32 or xoshiro128**). No floating-point arithmetic anywhere in the generation path; otherwise browser and Node will diverge subtly and the validator will reject legitimate runs. Same seed + same actions = byte-identical state. Enables deterministic daily boards, replays, server validation, and tests.
- **Immutable state snapshots.** Each action returns a new state; the old state is unchanged. Enables time-travel (replays, undo) and trivial snapshot serialization.
- **Pure TypeScript, zero DOM dependency.** Same engine runs in the browser (UI), the Web Worker (heavy generation), Node (server validator + nightly pool refill), and tests.
- **Versioned.** Every game record stores the `engine_version` it was played under. The validator loads the matching version. New engine versions never silently break old replays.
- **Separation: engine ≠ runner.** The engine handles rules. Modes are thin "runners" wrapping the engine with mode-specific state (timer, score, board stream).

**Engine API surface (the only public functions).**

```ts
// Board generation
type BoardConfig = {
  rows: number;
  cols: number;
  mineCount: number;
  noGuess: boolean;
  seed: string;
  firstClick?: { row: number; col: number };
};

function generateBoard(config: BoardConfig): BoardLayout;
function validateBoard(layout: BoardLayout): boolean;

// State + actions
type Cell = {
  revealed: boolean;
  flagged: boolean;
  questioned: boolean;
  mine: boolean;
  adjacent: number;
};
type GameState = {
  layout: BoardLayout;
  cells: Cell[][];
  status: 'idle' | 'playing' | 'won' | 'lost';
  startedAt: number | null;
  finishedAt: number | null;
  flagsPlaced: number;
  revealsCount: number;
};
type Action =
  | { kind: 'reveal';   row: number; col: number; t: number }
  | { kind: 'flag';     row: number; col: number; t: number }
  | { kind: 'chord';    row: number; col: number; t: number }
  | { kind: 'question'; row: number; col: number; t: number };

function initialState(layout: BoardLayout): GameState;
function applyAction(state: GameState, action: Action): { state: GameState; events: GameEvent[] };

// Solver / coach (separate module, depends on engine types only)
function findSafeCell(state: GameState): { row: number; col: number } | null;
function probabilityMap(state: GameState): Map<string, number>;          // Phase 2
function annotateMoves(history: Action[], layout: BoardLayout): MoveAnnotation[];  // CSP per-move, MVP
function reviewGame(history: Action[], layout: BoardLayout): ReviewResult;          // Phase 3 (uses probabilityMap)

// Serialization
function serializeState(state: GameState): Uint8Array;
function deserializeState(bytes: Uint8Array): GameState;
function serializeReplay(actions: Action[]): Uint8Array;   // ~8 bytes per action
function deserializeReplay(bytes: Uint8Array): Action[];
```

**Performance budgets (also in §18 acceptance criteria).**
- `generateBoard` (Expert, no-guess): server-side, < 2s per board acceptable since it runs in nightly pool refill; **no in-browser generation requirement for Arena**.
- `applyAction` (any action including chord on a 30×16 board): < 5ms p95.
- `findSafeCell` (Expert, mid-game): < 50ms p95.
- `annotateMoves` (Expert, full game): < 500ms — runs server-side for post-game review.
- `probabilityMap` (Expert, mid-game, Phase 2): < 250ms p95.
- `serializeReplay`: < 8 bytes per action; full Expert replay < 1.5 KB.

**Why these specs matter.**
- Sub-frame `applyAction` keeps reveals snappy on mobile.
- Cheap serialization keeps replay storage tiny.
- Pure functions make server-side validation trivial: fold `applyAction` over the submitted move log, assert final state is `won`, and check timing cadence.
- Pool-based generation removes the in-browser 200ms p95 risk that was the original plan's biggest technical bet.

**Where it lives.**
- `packages/engine/` — pure module, no React, no DOM.
- Consumed by: Next.js client, Web Worker (any in-browser generation for Quick Play / lessons), serverless validator, nightly pool worker.
- Its own test suite — unit tests per public function + property-based tests via fast-check + cross-runtime determinism test (run same seeds in browser + Node, compare bytes).

**Runner responsibilities per mode.**
- **Quick Play runner:** local timer, persists final game to `games`.
- **Daily Challenge runner:** fixed daily seed, one official attempt, generates share card.
- **Arena runner (Phase 2):** match-level score, broadcasts `score_update` events on the Realtime channel, on time-up serializes the action history and submits to validator.
- **Replay runner (Phase 2):** consumes a serialized replay, exposes scrub controls, calls `applyAction` per timeline position.
- **Lesson runner:** loads a hand-authored board state and a guided overlay; reuses engine but disables loss conditions during the demo.
- **Coach runner (MVP):** loads a saved game's replay, runs `annotateMoves` to flag missed-safe-move turns, passes annotation + history to the LLM prompt.

---

## 17. Data Model Sketch

Designed forward-looking: every table that any phase will need is sketched here, even if the table is unused until a later phase. Phase-tag column annotates when the table starts being read/written. Adding columns is easy; adding tables across phases is harder, so they're all here from day 1.

### Phase 1 (MVP)

```text
users
  id (uuid, pk)             display_name (text, unique, case-insensitive)
  email (text)              country (text, nullable)
  created_at (timestamptz)

user_settings                              -- Phase 1 (theme + a11y core)
  user_id (fk users, pk)
  theme (enum: light|dark|system)
  high_contrast (bool default false)
  tap_mode (enum: reveal|flag, default reveal)                                       -- Phase 1.5
  long_press_to_flag (bool default true)                                             -- Phase 1.5
  zoom_on_expert (bool default true)                                                 -- Phase 1.5
  updated_at (timestamptz)

subscriptions                              -- Phase 1
  user_id (fk users, pk)
  tier (enum: free|pro_lite|pro, default 'free')
  granted_via (enum: free_default|fake_purchase|admin_grant, default 'free_default')
  granted_at (timestamptz, nullable)
  valid_until (timestamptz, nullable)
  updated_at (timestamptz)

games                                      -- Phase 1; replay_blob recorded MVP, surfaced Phase 2
  id (uuid, pk)
  user_id (fk users)                       -- NOT NULL; guests don't persist in MVP
  difficulty (enum: beginner|intermediate|expert|custom)
  rows (int)                               -- denormalized for query convenience
  cols (int)
  mine_count (int)
  seed (text)
  no_guess (bool)
  result (enum: win|loss|abandoned)
  time_ms (int)
  mistakes (int)
  flags_placed (int)
  flags_correct (int)
  hints_used (int)
  three_bv (int)                           -- for analytics
  three_bvs (float)                        -- 3BV/s
  engine_version (text)                    -- pinned for validator reproducibility
  replay_blob (bytea, nullable)            -- ~1.5KB Expert; capped retention
  source_mode (enum: quick_play|daily|arena|practice|lesson_practice)
  daily_date (date, nullable)              -- non-null if source_mode = daily
  arena_match_id (uuid, nullable)          -- non-null if source_mode = arena; Phase 2
  finished_at (timestamptz)
  created_at (timestamptz)

daily_challenges                           -- Phase 1
  date (date, pk)
  difficulty (enum)
  seed (text)                              -- references board_pool.seed when drawn from pool (Phase 2)
  rows (int)  cols (int)  mine_count (int)
  three_bv (int)

daily_results                              -- Phase 1
  date (date, pk)
  user_id (fk users, pk)
  game_id (fk games)
  time_ms (int)
  mistakes (int)
  hints_used (int)
  validated (bool default true)            -- stub MVP; real Phase 1.5
  submitted_at (timestamptz)

daily_share_cards                          -- Phase 1 (cached @vercel/og output)
  date (date, pk)
  user_id (fk users, pk)
  image_url (text)
  created_at (timestamptz)

user_currency                              -- Phase 1
  user_id (fk users, pk)
  mines_balance (int default 0)
  total_earned (int default 0)
  total_spent (int default 0)
  last_earn_at (timestamptz)
  daily_earn_cap_reset_at (date, nullable) -- Phase 1.5
  updated_at (timestamptz)

mines_transactions                         -- Phase 1 (audit log; grows in Phase 2 with shop)
  id (uuid, pk)
  user_id (fk users)
  delta (int)                              -- positive earn, negative spend
  reason (enum: game_finish|daily_finish|season_reward|shop_purchase|admin)
  source_id (uuid, nullable)               -- game_id, season_id, skin_id depending on reason
  balance_after (int)
  created_at (timestamptz)

lessons                                    -- Phase 1
  id (uuid, pk)
  slug (text, unique)
  title (text)
  category (enum)
  difficulty (enum)
  concept_md (text)
  demo_board (jsonb)
  practice_board_config (jsonb)            -- hand-authored layout for MVP
  order_in_category (int)
  published (bool default false)
  seo_meta (jsonb)
  created_at (timestamptz)
  updated_at (timestamptz)

lesson_progress                            -- Phase 1
  user_id (fk users, pk)
  lesson_id (fk lessons, pk)
  stars (int 0..3 default 0)
  best_time_ms (int, nullable)
  viewed_at (timestamptz)
  completed_at (timestamptz, nullable)

coach_conversations                        -- Phase 1 (Pro-tier feature)
  id (uuid, pk)
  user_id (fk users)
  game_id (fk games, nullable)             -- non-null when chat is about a specific game
  kind (enum: post_game_review|free_chat)
  title (text, nullable)                   -- auto-generated from first message
  created_at (timestamptz)
  last_message_at (timestamptz)

coach_messages                             -- Phase 1
  id (uuid, pk)
  conversation_id (fk coach_conversations)
  role (enum: user|assistant|system)
  content (text)
  token_count_input (int, nullable)        -- for cost tracking on assistant messages
  token_count_output (int, nullable)
  model (text, nullable)                   -- e.g., 'claude-haiku-4-5'
  created_at (timestamptz)

coach_usage_daily                          -- Phase 1 (rate limit)
  user_id (fk users, pk)
  date (date, pk)
  message_count (int default 0)
  token_count (int default 0)
```

### Phase 2 (Arena, shop, replays)

```text
board_pool                                 -- Phase 2: pre-generated no-guess boards
  id (uuid, pk)
  difficulty (enum: beginner|intermediate|expert)
  seed (text, unique)
  rows (int)  cols (int)  mine_count (int)
  three_bv (int)
  generated_at (timestamptz)
  generator_version (text)                 -- engine version that produced it
  use_count (int default 0)
  retired (bool default false)             -- soft-retire stale boards
  -- INDEX (difficulty, retired, three_bv) for fast pool pick

user_seen_boards                           -- Phase 2: per-user dedup
  user_id (fk users, pk)
  board_pool_id (fk board_pool, pk)
  seen_in_context (enum: arena|daily|practice)
  seen_at (timestamptz)

arena_queue                                -- Phase 2: matchmaking queue
  user_id (fk users, pk)
  format (enum: bullet|blitz|rapid, pk)
  queued_at (timestamptz)
  rating_snapshot (int)                    -- Elo at queue time, used for bot-rating-match
  region (text, nullable)

arena_matches                              -- Phase 2
  id (uuid, pk)
  format (enum: bullet|blitz|rapid)
  status (enum: pending|running|complete|cancelled)
  starts_at (timestamptz)
  ends_at (timestamptz)
  duration_ms (int)                        -- 60000 | 180000 | 300000
  is_bot_match (bool default false)        -- true if any participant is a bot
  realtime_channel (text)                  -- Supabase channel id
  created_at (timestamptz)

arena_participants                         -- Phase 2
  match_id (fk arena_matches, pk)
  slot (int, pk)                           -- 0..N-1; allows bot slots without user_id
  user_id (fk users, nullable)             -- null for bot slots
  bot_replay_id (fk games, nullable)       -- the replay used to drive a bot's score events
  display_name_snapshot (text)             -- frozen for the match
  joined_at (timestamptz)
  disconnected_at (timestamptz, nullable)
  final_score (int, nullable)
  boards_solved (int, nullable)
  failed_boards (int, nullable)
  total_3bv (int, nullable)
  elo_before (int, nullable)
  elo_after (int, nullable)
  validated (bool, nullable)

arena_board_attempts                       -- Phase 2: per-board record within a match
  id (uuid, pk)
  match_id (fk arena_matches)
  user_id (fk users, nullable)             -- null for bot attempts
  board_pool_id (fk board_pool, nullable)
  seed (text)
  difficulty (enum)
  started_at_ms (int)                      -- ms from match start
  finished_at_ms (int)
  result (enum: win|loss|abandoned)
  three_bv (int)
  base_points (int)
  complexity_factor (float)
  awarded_points (int)
  replay_blob (bytea, nullable)
  validated (bool default true)

bot_replay_pool                            -- Phase 2: curated bot replays for queue fill + ghost race
  id (uuid, pk)
  source_game_id (fk games)
  format (enum: bullet|blitz|rapid)
  rating_band_low (int)
  rating_band_high (int)
  final_score (int)
  display_name (text)                      -- "Speedrun AI", "Bot — Carla"
  available (bool default true)

ratings                                    -- Phase 2 (schema); Phase 3 (ranked logic)
  user_id (fk users, pk)
  format (enum: bullet|blitz|rapid, pk)
  elo (int default 1200)
  games_played (int default 0)
  wins (int default 0)
  last_played_at (timestamptz)
  decay_paused_until (timestamptz, nullable)

seasons                                    -- Phase 2
  id (uuid, pk)
  name (text)
  starts_at (timestamptz)
  ends_at (timestamptz)
  archived (bool default false)

season_results                             -- Phase 2
  season_id (fk seasons, pk)
  user_id (fk users, pk)
  format (enum: bullet|blitz|rapid, pk)
  points (int default 0)
  rank (int, nullable)
  badge (enum: bronze|silver|gold|diamond, nullable)
  computed_at (timestamptz, nullable)

skins                                      -- Phase 2
  id (uuid, pk)
  slug (text, unique)
  name (text)
  category (enum: board|numbers|reveal_fx|profile_flair)
  tier_required (enum: free|pro_lite|pro_only)
  mine_price (int)                         -- 0 for pro_grant items
  available_in_shop (bool default true)
  season_id (fk seasons, nullable)         -- seasonal skins
  preview_image (text)
  released_at (timestamptz)

user_skins                                 -- Phase 2
  user_id (fk users, pk)
  skin_id (fk skins, pk)
  equipped (bool default false)
  source (enum: shop|pro_grant|season_pass|admin)
  acquired_at (timestamptz)

friendships                                -- Phase 2
  user_id (fk users, pk)
  friend_user_id (fk users, pk)
  status (enum: pending|accepted|blocked)
  created_at (timestamptz)
  accepted_at (timestamptz, nullable)
```

### Phase 3 (ranked, ghost race)

```text
ghost_races                                -- Phase 3
  id (uuid, pk)
  user_id (fk users)
  ghost_replay_id (fk games)
  format (enum: bullet|blitz|rapid)
  started_at (timestamptz)
  finished_at (timestamptz, nullable)
  user_final_score (int, nullable)
  ghost_final_score (int)
  winner (enum: user|ghost|tie, nullable)
```

### RLS / write-path policies
- All score, Elo, Mines, and `subscriptions.tier` writes go through Postgres RPCs / serverless functions so the server is the source of truth.
- Users can read/write their own `games`, `lesson_progress`, `user_currency` (read-only via RPC for writes), `user_skins`, `friendships`, `coach_conversations`, `coach_messages`, `user_settings`, `user_seen_boards`.
- Public read on `daily_results` (leaderboards), `lessons` (SEO), `arena_match_results`, `seasons`, `skins`.
- `board_pool`, `bot_replay_pool` — service-role-only writes; public read of seed + 3BV (no other metadata leaks).
- `coach_*` tables — strictly user-scoped reads; assistant messages are server-written via RPC.
- `subscriptions` is server-written only (the fake-purchase RPC sets the tier).

### Migration discipline
- Add columns; never rename them. If a column needs a new meaning, add a new one and deprecate the old.
- Every table has `created_at` / `updated_at` (omitted from sketch above for brevity but assume present).
- Every enum starts with all forward-looking values from day 1, even if MVP code only writes a subset — adding enum values later requires migrations on Postgres.

---

## 18. Per-Feature Acceptance Criteria (MVP)

### Core game
- Three difficulties produce correct dimensions and mine counts.
- First click never reveals a mine.
- Flagging is independent from revealing; chord works on satisfied numbers.
- Win triggers when all non-mine cells are revealed; loss when a mine is revealed.
- Timer starts on first action and stops on terminal state.

### Auth + saved stats
- A user can sign up with email or Google.
- After login, finished games persist to `games` and show on the profile.
- Logging out hides personal data; logging back in restores it.
- Guests can play Quick Play; **nothing is saved** for guests in MVP.

### Daily Challenge
- All users on a given UTC day see the same board, with difficulty set by the rotating schedule (Mon–Sun).
- A user's first official run writes to `daily_results`; subsequent attempts are practice and excluded.
- Leaderboard sorts by `time_ms` ascending, ties broken by `mistakes`, then `submitted_at`.
- User sees their rank, total participants, and percentile.
- An auto-generated share card (text grid + OG image) is offered on completion.
- A reset countdown is visible on the home dashboard.
- **Submission validation in MVP is a stub** (`validated = true`); move log persisted for Phase 1.5 retroactive validation.

### Hint mode (Free)
- "Hint" button is disabled until the first reveal.
- A click highlights exactly one cell that is provably safe via CSP.
- If no logically-safe cell exists, the button is greyed out with tooltip "no safe move — make a guess".
- Hint usage is recorded on the game record and reflected in stats.
- Hints reduce score in Daily Challenge.

### AI Coach Chat (Pro)
- Available only to users with `subscriptions.tier IN ('pro')`.
- Free users see the modal upgrade path when they click "Coach".
- Pro user can pick any saved game and start or resume a conversation.
- The serverless function streams responses from Anthropic and persists each turn into `coach_messages`.
- Daily rate limit (e.g. 20 messages) enforced via `coach_usage_daily`.
- API key never appears in client bundles or network responses.
- Coach can answer questions about: the user's moves, missed safe cells, win/loss outcome, general strategy from this board.

### Post-Game Review (Pro)
- "Review with Coach" button appears on the post-game screen for Pro users only.
- Server runs `annotateMoves` over the game's replay to identify turns where a provably-safe cell existed that wasn't chosen.
- The board scrubs to each annotated turn as the LLM narrates the analysis.
- Free users see the upgrade modal when they click the button.

### Pro modal + fake purchase
- Modal lists Free / Pro-Lite / Pro tiers with pricing and full per-tier feature copy.
- "Upgrade" buttons toast success and set `subscriptions.tier` to the corresponding value with `granted_via = 'fake_purchase'`.
- The Pro features (Coach Chat, Post-Game Review, advanced analytics panels, ad-free flag) immediately unlock client-side.
- A "Downgrade to Free" link in Settings reverts the tier.
- Modal is reachable from at least three locations: Settings, hint-counter overflow, "Review with Coach" CTA on the post-game screen.

### Mines currency (MVP)
- Each completed game writes a delta to `user_currency.mines_balance` via RPC (rates per §14).
- Profile shows the current balance and total earned.
- **No daily cap in MVP** — added in Phase 1.5.

### Academy lesson pages
- 4–8 lessons published.
- `/learn/<slug>` is reachable without sign-in.
- Page loads in < 1s on a fast connection.
- Embedded demo board is interactive (user can step reveals).
- Practice board is solvable (hand-authored) and records `lesson_progress` for signed-in users.
- Each page has OpenGraph metadata via `@vercel/og`.

### Stats page
- Free panels: games played, win rate, best time per difficulty, flag accuracy, Daily streak, Mines balance.
- Pro-Lite panels (visible after fake purchase): 3BV/s trend, flag-accuracy trend, mistake heatmap, contribution graph, percentile cards.
- Renders in under 500ms with up to 1,000 historical games for the user.
- Empty state ("Play your first game") is designed, not raw.

### Responsive UI + theme
- All MVP screens render usably from 360px wide up to 1920px wide.
- Expert difficulty supports pinch-zoom on mobile (single default; no in-product configuration UI in MVP).
- Long-press flags on mobile by default.
- Dark/light toggle persists across sessions and respects system preference on first visit.
- No layout shift on game start.

### Accessibility (MVP minimum)
- All in-game color usage has a non-color secondary signal (icon, label, or pattern).
- The game is fully playable with keyboard only (arrows to move focus, Space to reveal, F to flag, C to chord).
- One high-contrast palette toggle exists in Settings.
- Screen-reader live regions ship in Phase 1.5.

### Engine performance budgets
- `applyAction`: < 5ms p95.
- `findSafeCell` Expert: < 50ms p95.
- `annotateMoves` Expert full game: < 500ms (server-side).
- `serializeReplay`: ≤ 8 bytes per action.
- **No in-browser `generateBoard` budget for no-guess in MVP** — Daily Challenge boards are generated server-side; Quick Play uses standard (non-no-guess) generation in browser when needed.

### Landing page
- Above the fold: product name, one-liner, primary CTA, secondary "Play as guest".
- Sections covering the five wow features (Coach, No-Guess, Replay, Arena, Academy).
- Live Daily Challenge teaser pulling today's stats.

### PostHog (minimal MVP funnel)
- Events fire for: `signup`, `game_start`, `game_finish`, `daily_complete`.
- Full funnel (lesson_view, share_card_copied, pro_modal_view, coach_message_sent, etc.) ships in Phase 1.5.

---

## 19. README.md Outline

When the project is submitted, the final `README.md` at the repo root should contain:

1. **Project name + one-liner** — "Minesweeper Academy + Arena — Chess.com for Minesweeper."
2. **Live demo link** and **GitHub repo link** (placeholders until deployed).
3. **What it is and who it's for** — 3 sentences pulled from §2 and §3.
4. **Why it's different** — subsections, one per wow feature, each with a screenshot or GIF:
   - AI Coach (Pro: chat + post-game review in MVP; probability overlay later).
   - No-Guess Mode + pre-generated pool.
   - Daily Challenge with Wordle-style share.
   - Arena with live score race + bot fallback (Phase 2 preview if not shipped).
   - Academy with public lesson pages + embedded practice.
   - Mines & Shop (cosmetic engagement loop; Phase 2).
5. **Tech stack** — badges for Next.js, TypeScript, Tailwind, Supabase, Anthropic, Vercel.
6. **Screenshots / GIFs** — at minimum: game in progress, Daily Challenge with leaderboard, AI coach chat, post-game review with coach, profile dashboard, an Academy lesson page, Pro modal.
7. **Local setup** — clone, `pnpm install`, `.env.local` keys (Supabase URL/anon key, Anthropic API key), `pnpm dev`. Note about SQL migrations.
8. **Roadmap** — short paragraph + link to this `PROJECT_PLAN.md` for the full plan.
9. **Acknowledgments** — nFactorial assignment, inspiration from chess.com / Duolingo / minesweeper.online.

Keep the README marketing-led. The detailed plan lives here.

---

## 20. Risks & Open Questions

- **AI Coach response latency.** Streaming from Anthropic is fast (first token < 1s for Haiku), but if the user is on a slow connection or the API has a hiccup, the experience suffers. Mitigation: show a skeleton + streaming indicator; allow conversation to fail-soft (toast + retry).
- **AI Coach cost at scale.** Haiku is cheap (~$0.001/conversation) but unbounded usage by a viral product is still a real bill. The `coach_usage_daily` table enforces a per-day cap; revisit pricing tier limits once real usage data exists.
- **Coach accuracy with CSP-only analysis (MVP).** The post-game review can identify *missed safe moves* but cannot label a probabilistic guess as "correct" or "wrong" — the coach will sometimes talk around the issue. Acceptable for MVP; Phase 3's probability-aware coach addresses this.
- **Cross-runtime PRNG determinism.** TypeScript's `Math.random` is not seedable. Lock in a custom PRNG (Mulberry32 or xoshiro128**) day 1, write a cross-runtime determinism test (same seed → same bytes in browser and Node), and never break it.
- **Engine versioning.** Every game record stores `engine_version`. The validator must load the matching version. Don't ship engine v2 to the validator without keeping v1 available for older replays.
- **No-Guess generator at the pool worker.** Pool generation may take 1–10s per Expert no-guess board. With nightly cron generating ~1000 boards, that's 15min–3hr of CPU. Fits a single Vercel Edge Function execution if batched and parallelized; otherwise schedule a long-running worker.
- **Pool exhaustion edge case.** If `user_seen_boards` grows past the pool size, the matchmaker has nothing to pick. Mitigation: pool refill should keep ahead of usage (target 100x active-user count); soft-retire old boards rather than deleting; in fallback, allow re-seeing oldest-seen boards.
- **Arena queue liquidity → bot fallback.** Bot fills work technically but break the "real competition" feel. Label bot opponents clearly ("Bot — [name]") and bias matchmaking to wait the full 10s for real players whenever any are queued. Tune the timeout shorter for low-rating users (more bot fills accepted) and longer for high-rating (preserve real matches).
- **Clock skew at Arena synchronized start.** Client `Date.now()` can drift by hundreds of ms. The Phase 2 implementation must include a one-shot clock-sync exchange on channel join (client records `server_time - local_time` offset) before scheduling its match-start timer.
- **Arena disconnect handling.** Wall-clock-honest is the right default. Communicate this in the Arena onboarding flow ("Your timer keeps running if you disconnect") so users aren't surprised.
- **Mobile Expert render perf.** 480 cells as React components will jank on low-end Android. Plan to test with throttled CPU + 4G. If problematic, switch the board to canvas rendering on mobile Expert only (engine perf is unaffected; only the visual layer changes).
- **First-click safety + no-guess interaction.** Solved by pool-based generation: when a player makes the first click, the runner picks a pool entry where the chosen first-click cell happens to be safe. With a sufficiently large pool, this is always possible.
- **UTC daily-reset confusion.** "Today's daily" rolls over at 00:00 UTC, which is mid-afternoon for some users. Display a clear local-time countdown to the next reset on the home dashboard.
- **Replay storage cost.** ~1.5KB/Expert × N users × M games/day adds up. Cap retention at 30 days for Quick Play replays in MVP; keep Daily Challenge + Arena replays permanently. Re-evaluate at Phase 2 once shop economics are known.
- **Fake-purchase UX clarity.** Reviewers will hit "Upgrade to Pro," see a success toast, and need to immediately experience the Pro features. The grant must be synchronous and the next screen must visibly change (analytics panels appear, "Review with Coach" button enables). If the change is invisible, the rubric judge won't notice the business intent.

---

*This document is the source of truth for product direction. When in doubt, follow the phase boundaries: ship MVP first, then polish, then unlock the wow layer, then competitive depth. Time is short — every section here has been pruned for what the rubric actually rewards.*
