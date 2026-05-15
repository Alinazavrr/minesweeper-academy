"use client";

import { memo } from "react";
import type { Cell as EngineCell, GameStatus } from "@minesweeper/engine";
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

type Props = {
  row: number;
  col: number;
  sizePx: number;
  cell: EngineCell;
  status: GameStatus;
  hinted: boolean;
  onReveal: (row: number, col: number) => void;
  onFlag: (row: number, col: number) => void;
  onChord: (row: number, col: number) => void;
};

function CellInner({
  row,
  col,
  sizePx,
  cell,
  status,
  hinted,
  onReveal,
  onFlag,
  onChord,
}: Props) {
  const gameOver = status === "won" || status === "lost";

  const handleClick = (e: React.MouseEvent) => {
    if (gameOver) return;
    if (e.shiftKey && cell.revealed && cell.adjacent > 0) {
      onChord(row, col);
      return;
    }
    if (cell.revealed && cell.adjacent > 0) {
      onChord(row, col);
      return;
    }
    if (!cell.revealed && !cell.flagged) {
      onReveal(row, col);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (gameOver || cell.revealed) return;
    onFlag(row, col);
  };

  const fontPx = Math.max(12, Math.floor(sizePx * 0.55));
  const baseStyle = {
    width: sizePx,
    height: sizePx,
    fontSize: fontPx,
    lineHeight: 1,
  };

  if (!cell.revealed) {
    const showMine = gameOver && status === "lost" && cell.mine && !cell.flagged;
    const wrongFlag = gameOver && cell.flagged && !cell.mine;
    return (
      <button
        type="button"
        aria-label={`Row ${row + 1}, column ${col + 1}, ${
          cell.flagged ? "flagged" : cell.questioned ? "questioned" : "hidden"
        }`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "select-none flex items-center justify-center font-bold",
          "border border-zinc-400 dark:border-zinc-600",
          "bg-zinc-200 dark:bg-zinc-700",
          !gameOver && "hover:bg-zinc-300 dark:hover:bg-zinc-600",
          !gameOver && "active:bg-zinc-100 dark:active:bg-zinc-800",
          hinted && "ring-2 ring-emerald-500 ring-inset",
          gameOver && "cursor-default",
        )}
        style={baseStyle}
      >
        {cell.flagged ? (wrongFlag ? "❌" : "🚩") : cell.questioned ? "?" : showMine ? "💣" : ""}
      </button>
    );
  }

  if (cell.mine) {
    return (
      <div
        aria-label={`Row ${row + 1}, column ${col + 1}, mine`}
        className="select-none flex items-center justify-center bg-red-500 border border-red-700 dark:border-red-800"
        style={baseStyle}
      >
        💣
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={cell.adjacent > 0 && !gameOver ? 0 : -1}
      aria-label={
        cell.adjacent > 0
          ? `Row ${row + 1}, column ${col + 1}, ${cell.adjacent}`
          : `Row ${row + 1}, column ${col + 1}, empty`
      }
      onClick={cell.adjacent > 0 && !gameOver ? handleClick : undefined}
      className={cn(
        "select-none flex items-center justify-center font-bold",
        "border border-zinc-300 dark:border-zinc-700",
        "bg-zinc-100 dark:bg-zinc-800",
        cell.adjacent > 0 && NUMBER_COLORS[cell.adjacent],
        cell.adjacent > 0 && !gameOver && "cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700",
      )}
      style={baseStyle}
    >
      {cell.adjacent > 0 ? cell.adjacent : ""}
    </div>
  );
}

/**
 * Memoized so unchanged cells skip render work when their board peer updates.
 * Comparator covers every field the render reads — handlers must be stable
 * references (the QuickPlay parent reads them via useGameStore selectors which
 * are stable; the DailyView parent wraps in useCallback).
 */
export const Cell = memo(CellInner, (prev, next) =>
  prev.row === next.row &&
  prev.col === next.col &&
  prev.sizePx === next.sizePx &&
  prev.cell.revealed === next.cell.revealed &&
  prev.cell.flagged === next.cell.flagged &&
  prev.cell.questioned === next.cell.questioned &&
  prev.cell.mine === next.cell.mine &&
  prev.cell.adjacent === next.cell.adjacent &&
  prev.status === next.status &&
  prev.hinted === next.hinted &&
  prev.onReveal === next.onReveal &&
  prev.onFlag === next.onFlag &&
  prev.onChord === next.onChord,
);
