import type { Lesson } from "../types";

/**
 * Concept-only lessons — the body is enough to teach the idea, but the
 * demo + practice boards aren't authored yet. Catalog renders them with a
 * "Concept" badge.
 *
 * These exist so the Academy doesn't feel sparse during the MVP demo. Each
 * graduates to a full lesson when someone authors a `demo` and `practice`.
 */

export const cornerEdgeLogic: Lesson = {
  slug: "corner-edge-logic",
  title: "Corner and edge logic",
  category: "patterns",
  difficulty: "beginner",
  summary:
    "Corners only have three neighbours and edges only have five — most patterns simplify dramatically there.",
  body: `Corners and edges are where most early-game deduction happens.

A corner cell has just **three** unrevealed neighbours when it's first uncovered, and edge cells have **five**. The same numbers carry far more information there than in the open middle.

Three rules of thumb worth memorising:

1. **A 1 in the corner with two flagged neighbours forces the third to be safe.** This is the most common one-click chord setup.
2. **A 1 next to two 1s on an edge usually completes a 1-1 reduction without you needing to draw it out.** Train the pattern recognition.
3. **A 2 in the corner with no flags means *both* unrevealed neighbours are mines.** Flag, then chord — two mines confirmed in one move.

When you open a board and have a choice of corners to start in, the one furthest from any visible numbers is usually the most informative click — the flood reveals the most border.`,
  isStub: true,
};

export const flagDiscipline: Lesson = {
  slug: "flag-discipline",
  title: "Flag discipline and chording",
  category: "openings",
  difficulty: "beginner",
  summary:
    "Flag every mine before you chord — wrong flags are how 90% of intermediate-tier losses happen.",
  body: `**Chording** — clicking a revealed numeric cell whose neighbouring flags equal its number — reveals every other neighbour at once. It's the single biggest speed multiplier in Minesweeper.

But the engine *trusts* your flags. If you flag the wrong cell and chord, you'll reveal a mine and lose the game.

Rules to internalise:

1. **Only flag when you have a logical proof.** "I think it's a mine" is not enough — back it up with a constraint.
2. **Never speed-chord.** When the win is close and you start chording fast, that's exactly when a mis-flag turns a winning game into a loss.
3. **A wrong flag is recoverable** — right-click again to remove it. Don't let one bad flag escalate.
4. **In Daily Challenge mode, chording is free.** Flag everything you can prove and chord aggressively — it's the difference between a 90-second time and a 200-second one.

The coach won't tell you to flag for you — that's a choice the player makes. But it will tell you when a flag is provably wrong.`,
  isStub: true,
};
