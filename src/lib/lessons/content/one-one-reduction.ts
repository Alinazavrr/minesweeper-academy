import type { Lesson } from "../types";

export const oneOneReduction: Lesson = {
  slug: "1-1-reduction",
  title: "The 1-1 reduction",
  category: "patterns",
  difficulty: "beginner",
  summary:
    "When two adjacent 1s share neighbours, the cell that only the second 1 can see is forced to be safe.",
  body: `The **1-1 reduction** is the workhorse of beginner Minesweeper deduction. You see it constantly along revealed edges.

Both 1s know that exactly one mine sits in their unrevealed neighbourhood. If those neighbourhoods *overlap*, you can subtract them.

Mechanically:

- Let \`A\` be a revealed \`1\` and \`B\` be the next-door revealed \`1\`.
- Let \`only_A\` = unknown neighbours of A that B cannot see.
- Let \`only_B\` = unknown neighbours of B that A cannot see.
- The shared neighbour already accounts for B's mine — so every cell in \`only_B\` is **safe**.

If only_A is non-empty (and the shared cell has to contain B's mine), then symmetrically every cell in only_A is also safe.

The pattern recurs everywhere: it's why "1s along a wall" almost always lets you peel back the next row.`,
  demo: {
    rows: 3,
    cols: 5,
    cells: [
      // row 0 — covered cells
      { kind: "covered" },
      { kind: "highlight", tone: "neutral", label: "?", under: { kind: "covered" } },
      { kind: "highlight", tone: "neutral", label: "?", under: { kind: "covered" } },
      { kind: "highlight", tone: "safe", label: "S", under: { kind: "covered" } },
      { kind: "covered" },
      // row 1 — the two 1s
      { kind: "empty" },
      { kind: "number", value: 1 },
      { kind: "number", value: 1 },
      { kind: "empty" },
      { kind: "empty" },
      // row 2 — revealed empties
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
    ],
    caption:
      "Both 1s share the two ? cells. The right 1 sees an extra cell (S) that the left 1 doesn't — so the shared mine satisfies the right 1, leaving S provably safe.",
  },
  practice: {
    // Layout (3×4):
    //   0  1  2  3
    //   4  5  6  7
    //   8  9 10 11
    // Mine at (0,1). Pre-revealing (1,3)=7 floods through the open right
    // half and reaches every cell except (0,0) and (0,1). The (1,2)=1 in
    // the resulting board (it sees (0,1) only) proves (0,1) is the mine,
    // and the 1-1 reduction with (1,1)=1 + (1,2)=1 proves (0,0) is safe.
    rows: 3,
    cols: 4,
    mines: [1],
    prerevealed: [7],
    prompt:
      "Two cells are still covered. Find the safe one — the 1-1 reduction names it.",
  },
};
