"use client";

import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/cn";
import { useGameStore } from "@/stores/game";

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
};

export function Cell({ row, col, sizePx }: Props) {
  const cell = useGameStore(
    useShallow((s) => {
      const c = s.state.cells[row]![col]!;
      return {
        revealed: c.revealed,
        flagged: c.flagged,
        questioned: c.questioned,
        mine: c.mine,
        adjacent: c.adjacent,
      };
    }),
  );
  const status = useGameStore((s) => s.state.status);
  const hinted = useGameStore(
    (s) => s.hint !== null && s.hint.row === row && s.hint.col === col,
  );
  const reveal = useGameStore((s) => s.reveal);
  const flag = useGameStore((s) => s.flag);
  const chord = useGameStore((s) => s.chord);

  const gameOver = status === "won" || status === "lost";

  const handleClick = (e: React.MouseEvent) => {
    if (gameOver) return;
    if (e.shiftKey && cell.revealed && cell.adjacent > 0) {
      chord(row, col);
      return;
    }
    if (cell.revealed && cell.adjacent > 0) {
      chord(row, col);
      return;
    }
    if (!cell.revealed && !cell.flagged) {
      reveal(row, col);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (gameOver || cell.revealed) return;
    flag(row, col);
  };

  const fontPx = Math.max(12, Math.floor(sizePx * 0.55));
  const baseStyle = {
    width: sizePx,
    height: sizePx,
    fontSize: fontPx,
    lineHeight: 1,
  };

  // Hidden cell (also covers flagged and questioned states).
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

  // Revealed mine — this is the cell that ended the game on a loss.
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

  // Revealed numeric or empty (0).
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
