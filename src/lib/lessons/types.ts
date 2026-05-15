/**
 * Lesson content lives in code (one TS module per lesson) — keeps it under
 * version control, type-checked, and shippable without an MDX toolchain.
 *
 * The Phase 1 lessons table in Postgres is reserved for tracking
 * completion / ratings, not for storing content. We can mirror the registry
 * into the table later (see PROJECT_PLAN.md §17) without touching this code.
 */

export type LessonCategory =
  | "patterns"
  | "openings"
  | "endgame"
  | "probability";

export type LessonDifficulty = "beginner" | "intermediate" | "advanced";

/**
 * One static cell on a demo board. Order matters — the renderer just maps
 * `(row * cols + col)` → cell. Use sparingly; lessons are hand-authored.
 */
export type DemoCell =
  | { kind: "covered" }
  | { kind: "flag" }
  | { kind: "number"; value: number }
  | { kind: "mine" }
  | { kind: "empty" }
  /** A highlighted cell with a colored ring + optional letter label. */
  | {
      kind: "highlight";
      tone: "safe" | "mine" | "neutral";
      label?: string;
      under?: DemoCell;
    };

export type DemoBoard = {
  rows: number;
  cols: number;
  cells: DemoCell[];
  /** Caption rendered under the board. */
  caption?: string;
};

/**
 * A small, hand-authored playable board for the lesson's "try it" panel.
 * `mines` is a list of cell indices (`row * cols + col`). The runner uses
 * `layoutFromMines` so determinism is preserved.
 *
 * `prompt` describes the action that demonstrates mastery (e.g. "Click the
 * provably safe cell on the right-hand edge").
 */
export type PracticeBoard = {
  rows: number;
  cols: number;
  mines: number[];
  /** Cells revealed before the player even sees the board, so the lesson
   *  starts in mid-game position. row*cols+col indices. */
  prerevealed: number[];
  /** Optional cells flagged before the player starts, for layouts where the
   *  pattern only emerges once neighboring mines are explicitly marked. */
  preflagged?: number[];
  prompt: string;
};

export type Lesson = {
  slug: string;
  title: string;
  category: LessonCategory;
  difficulty: LessonDifficulty;
  /** One-line summary for the catalog. */
  summary: string;
  /** Body — plain text + the same minimal markdown the Coach uses. */
  body: string;
  demo?: DemoBoard;
  practice?: PracticeBoard;
  /** Marks the lesson as a stub (no demo/practice yet). Catalog renders a
   *  badge and links straight to the body. */
  isStub?: boolean;
};
