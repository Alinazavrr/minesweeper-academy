import type { Lesson } from "../types";

export const oneTwoOne: Lesson = {
  slug: "1-2-1-pattern",
  title: "The 1-2-1 pattern",
  category: "patterns",
  difficulty: "beginner",
  summary:
    "A 1-2-1 sitting against a wall pins the two outside cells as mines and clears the one between them.",
  body: `The **1-2-1** is the first pattern most players learn to recognise without thinking. You'll see it dozens of times per Expert game.

The setup: three numbers in a row — \`1\`, \`2\`, \`1\` — with a wall (or revealed open area) on one side and three covered cells on the other.

Why it works:

- The middle \`2\` sees three covered cells: left, centre, right. Two of them must be mines.
- The left \`1\` sees only the left and centre cells. Exactly one of those is a mine.
- The right \`1\` sees only the right and centre cells. Exactly one of those is a mine.

If the centre were a mine, the left \`1\` and right \`1\` would both already be satisfied — but then the \`2\` would only have one mine in its neighbourhood. Contradiction.

So the centre is safe and the two outside cells are the mines.

Once you see this pattern, **flag both outside cells, then chord the 2** to clear three cells in one click.`,
  demo: {
    rows: 3,
    cols: 5,
    cells: [
      // row 0 — covered border
      { kind: "highlight", tone: "mine", label: "M", under: { kind: "covered" } },
      { kind: "highlight", tone: "safe", label: "S", under: { kind: "covered" } },
      { kind: "highlight", tone: "mine", label: "M", under: { kind: "covered" } },
      { kind: "covered" },
      { kind: "covered" },
      // row 1 — the 1-2-1
      { kind: "number", value: 1 },
      { kind: "number", value: 2 },
      { kind: "number", value: 1 },
      { kind: "empty" },
      { kind: "empty" },
      // row 2 — revealed empties (the "wall" side)
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
    ],
    caption:
      "Reading top-to-bottom: two mines (M) flank the safe centre (S). After flagging, chord the 2 to clear the centre in one click.",
  },
  practice: {
    // Layout (3×6) — mines at (0,0) + (0,2). Pre-revealing (1,4)=10
    // floods through the open right side and surfaces the 1-2-1 along
    // row 1 (cols 0..2). The pattern proves (0,1) safe and pins (0,0)
    // and (0,2) as mines.
    rows: 3,
    cols: 6,
    mines: [0, 2],
    prerevealed: [10],
    prompt:
      "Flag both mines, then chord the centre 2 to clear the safe cell — the textbook 1-2-1.",
  },
};
