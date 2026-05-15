import type { Lesson } from "../types";

export const probabilityBasics: Lesson = {
  slug: "probability-basics",
  title: "When you have to guess: probability basics",
  category: "probability",
  difficulty: "intermediate",
  summary:
    "When logic stalls, count what each constraint allows and pick the cell with the lowest mine probability — it's not always the obvious one.",
  body: `Every Expert game eventually hits a position with no logically safe cell. You **must** guess. The question is *which* cell.

The naive answer — "all unknowns are equally likely" — is wrong as soon as any number is revealed. Constraints concentrate probability mass.

A worked example:

- A revealed \`2\` borders three covered cells. From it alone, each of those three cells has a 2/3 mine probability.
- If a different \`1\` borders only one of those three cells, that single cell now has 1/1 = 100% mine probability — flag it and the \`2\` reduces to a 1/2 over the remaining two.
- Cells far from any number drop back toward the global density (≈ 99/480 ≈ 21% on Expert).

Practical rules of thumb:

- **Open the corners and edges first when guessing.** They border fewer cells, so each constraint they help solve is more impactful.
- **Avoid cells touching multiple high numbers.** A cell that two 3s both depend on is almost always a mine.
- **If you can choose, pick a cell whose reveal is most informative.** A safe \`0\` opens a flood; a safe \`1\` tells you something local. The \`0\` reveal is worth more.

The Pro coach mode (Phase 3) will compute these probabilities for you. Until then, build intuition: when you face a 50/50, you usually have one of the cells on the spec sheet above.`,
  demo: {
    rows: 3,
    cols: 5,
    cells: [
      // row 0 — covered with annotated probabilities
      { kind: "highlight", tone: "mine", label: "1/2", under: { kind: "covered" } },
      { kind: "highlight", tone: "neutral", label: "1/3", under: { kind: "covered" } },
      { kind: "highlight", tone: "neutral", label: "1/3", under: { kind: "covered" } },
      { kind: "highlight", tone: "safe", label: "21%", under: { kind: "covered" } },
      { kind: "highlight", tone: "safe", label: "21%", under: { kind: "covered" } },
      // row 1 — the 1 and the 2 that drive the math
      { kind: "number", value: 1 },
      { kind: "number", value: 2 },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
      // row 2 — revealed
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
    ],
    caption:
      "The 1 and 2 share the cell above them. The cell above the 1 is 50/50; cells above the 2 split the rest at 1/3 each. Cells far from any number are near global density (~21%).",
  },
};
