import type { Lesson } from "../types";

export const oneTwoTwoOne: Lesson = {
  slug: "1-2-2-1-pattern",
  title: "The 1-2-2-1 pattern",
  category: "patterns",
  difficulty: "intermediate",
  summary:
    "A 1-2-2-1 against a wall locks the two middle cells as mines and clears the two ends.",
  body: `The **1-2-2-1** is the 1-2-1's bigger cousin. Same idea, two more cells.

Setup: four numbers in a row along a wall, reading \`1 2 2 1\`, with four covered cells on the open side.

The deduction:

- The two \`2\`s together see all four cells. Each \`2\` needs exactly two mines.
- The pair \`(1, 2)\` on the left tells you the leftmost cell is safe (the same reasoning as the 1-1 reduction).
- The pair \`(2, 1)\` on the right tells you the rightmost cell is safe by symmetry.
- That leaves the two middle covered cells: between them they must contain *all* mines the 2s see — so both middle cells are mines.

In one move you've flagged two mines and revealed two safes — almost as efficient as the 1-2-1, and just as common on Intermediate boards.`,
  demo: {
    rows: 3,
    cols: 6,
    cells: [
      // row 0 — covered border
      { kind: "highlight", tone: "safe", label: "S", under: { kind: "covered" } },
      { kind: "highlight", tone: "mine", label: "M", under: { kind: "covered" } },
      { kind: "highlight", tone: "mine", label: "M", under: { kind: "covered" } },
      { kind: "highlight", tone: "safe", label: "S", under: { kind: "covered" } },
      { kind: "covered" },
      { kind: "covered" },
      // row 1 — the 1-2-2-1
      { kind: "number", value: 1 },
      { kind: "number", value: 2 },
      { kind: "number", value: 2 },
      { kind: "number", value: 1 },
      { kind: "empty" },
      { kind: "empty" },
      // row 2 — revealed empties
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
    ],
    caption:
      "The two ends are safe (S). The middle two are mines (M). One pattern, four cells solved.",
  },
  practice: {
    // Layout (3×6) — mines at (0,1) + (0,2). Pre-revealing (1,4)=10
    // floods through the open right and reveals row 1 = `1 2 2 1 0 0`.
    // The 1-2-2-1 pattern proves the two ends safe and the two middles
    // are the mines.
    rows: 3,
    cols: 6,
    mines: [1, 2],
    prerevealed: [10],
    prompt:
      "Reveal both end cells of the 1-2-2-1 (the safes), then flag the two middles.",
  },
};
