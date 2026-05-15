import { generateBoard, initialState } from "@minesweeper/engine";

/**
 * Static landing-page board preview. Server-rendered using the engine — same
 * visual vocabulary as the live game so the screenshot reads as authentic.
 *
 * Deterministic by seed, plus a fixed reveal sequence so it always looks the
 * same (no hydration mismatch, no per-request flicker).
 */
export function LandingPreviewBoard() {
  const layout = generateBoard({
    rows: 8,
    cols: 12,
    mineCount: 12,
    noGuess: false,
    seed: "landing-preview-v1",
    firstClick: { row: 4, col: 6 },
  });
  const cells = initialState(layout).cells;

  // Hand-pick a few cells to "reveal" so the board reads as a game in
  // progress instead of a blank slate.
  const revealedTargets = [
    [3, 5],
    [3, 6],
    [3, 7],
    [4, 5],
    [4, 6],
    [4, 7],
    [5, 5],
    [5, 6],
    [5, 7],
  ];
  const revealedSet = new Set<number>();
  for (const [r, c] of revealedTargets) {
    revealedSet.add(r! * layout.cols + c!);
  }

  return (
    <div
      role="img"
      aria-label="Minesweeper board preview"
      className="grid select-none rounded-lg border border-zinc-300 bg-zinc-200 p-2 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
      style={{
        gridTemplateColumns: `repeat(${layout.cols}, 22px)`,
        gap: 0,
      }}
    >
      {cells.map((row, rIdx) =>
        row.map((cell, cIdx) => {
          const idx = rIdx * layout.cols + cIdx;
          const revealed = revealedSet.has(idx);
          const baseStyle = {
            width: 22,
            height: 22,
            fontSize: 12,
            lineHeight: 1,
          };
          if (!revealed) {
            return (
              <div
                key={idx}
                style={baseStyle}
                className="border border-zinc-400 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700"
              />
            );
          }
          return (
            <div
              key={idx}
              style={baseStyle}
              className={`flex items-center justify-center border border-zinc-300 bg-zinc-100 font-bold text-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-blue-400`}
            >
              {cell.adjacent > 0 ? cell.adjacent : ""}
            </div>
          );
        }),
      )}
    </div>
  );
}
