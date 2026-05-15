import type { DemoBoard as DemoBoardType, DemoCell } from "@/lib/lessons/types";
import { cn } from "@/lib/cn";

const NUMBER_COLORS: Record<number, string> = {
  1: "text-blue-600 dark:text-blue-400",
  2: "text-green-700 dark:text-green-400",
  3: "text-red-600 dark:text-red-400",
  4: "text-blue-900 dark:text-blue-300",
  5: "text-red-900 dark:text-rose-400",
  6: "text-teal-600 dark:text-teal-300",
  7: "text-zinc-900 dark:text-zinc-100",
  8: "text-zinc-500 dark:text-zinc-400",
};

const TONE_RING: Record<"safe" | "mine" | "neutral", string> = {
  safe: "ring-emerald-500 bg-emerald-100/60 dark:bg-emerald-950/40",
  mine: "ring-red-500 bg-red-100/60 dark:bg-red-950/40",
  neutral: "ring-amber-500 bg-amber-100/60 dark:bg-amber-950/40",
};

const TONE_LABEL: Record<"safe" | "mine" | "neutral", string> = {
  safe: "text-emerald-800 dark:text-emerald-200",
  mine: "text-red-800 dark:text-red-200",
  neutral: "text-amber-800 dark:text-amber-200",
};

type Props = {
  board: DemoBoardType;
  /** Pixel size per cell. Defaults to 36 (matches Quick Play beginner). */
  cellPx?: number;
};

/**
 * Static, non-interactive board used inside lesson pages. Same visual
 * vocabulary as the live Board component (covered/numeric/mine/empty), with
 * an extra "highlight" cell type for the labeled annotations the lesson
 * authors tag in their content (S = safe, M = mine, ? = unknown, etc.).
 */
export function DemoBoard({ board, cellPx = 36 }: Props) {
  const fontPx = Math.max(11, Math.floor(cellPx * 0.5));
  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        role="img"
        aria-label={board.caption ?? "Lesson demonstration board"}
        className="grid select-none rounded-md border border-zinc-300 bg-zinc-200 p-2 shadow-inner dark:border-zinc-700 dark:bg-zinc-900"
        style={{
          gridTemplateColumns: `repeat(${board.cols}, ${cellPx}px)`,
          gap: 0,
        }}
      >
        {board.cells.map((cell, idx) => (
          <CellNode
            key={idx}
            cell={cell}
            cellPx={cellPx}
            fontPx={fontPx}
          />
        ))}
      </div>
      {board.caption ? (
        <figcaption className="max-w-md text-center text-xs text-zinc-600 dark:text-zinc-400">
          {board.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function CellNode({
  cell,
  cellPx,
  fontPx,
}: {
  cell: DemoCell;
  cellPx: number;
  fontPx: number;
}) {
  const baseStyle = {
    width: cellPx,
    height: cellPx,
    fontSize: fontPx,
    lineHeight: 1,
  };
  if (cell.kind === "highlight") {
    const ring = TONE_RING[cell.tone];
    const label = TONE_LABEL[cell.tone];
    const under = cell.under ?? { kind: "covered" };
    return (
      <div
        style={baseStyle}
        className={cn(
          "relative flex items-center justify-center font-bold ring-2 ring-inset",
          ring,
          renderUnderClasses(under),
        )}
      >
        {cell.label ? (
          <span className={cn("font-mono text-[11px]", label)}>{cell.label}</span>
        ) : (
          renderUnderContent(under)
        )}
      </div>
    );
  }
  return (
    <div
      style={baseStyle}
      className={cn(
        "flex items-center justify-center font-bold",
        renderUnderClasses(cell),
      )}
    >
      {renderUnderContent(cell)}
    </div>
  );
}

function renderUnderClasses(cell: DemoCell): string {
  if (cell.kind === "highlight") return "";
  if (cell.kind === "covered") {
    return "border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700";
  }
  if (cell.kind === "flag") {
    return "border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700";
  }
  if (cell.kind === "mine") {
    return "border border-red-700 dark:border-red-800 bg-red-500";
  }
  if (cell.kind === "number") {
    return cn(
      "border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800",
      NUMBER_COLORS[cell.value] ?? "",
    );
  }
  // empty
  return "border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800";
}

function renderUnderContent(cell: DemoCell): React.ReactNode {
  if (cell.kind === "covered") return null;
  if (cell.kind === "flag") return "🚩";
  if (cell.kind === "mine") return "💣";
  if (cell.kind === "number") return cell.value;
  if (cell.kind === "empty") return null;
  return null; // highlight handled by parent
}
