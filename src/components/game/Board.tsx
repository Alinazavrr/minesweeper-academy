"use client";

import { useGameStore, type Difficulty } from "@/stores/game";
import { Cell } from "./Cell";

const CELL_PX: Record<Difficulty, number> = {
  beginner: 36,
  intermediate: 30,
  expert: 26,
};

export function Board() {
  const difficulty = useGameStore((s) => s.difficulty);
  const rows = useGameStore((s) => s.layout.rows);
  const cols = useGameStore((s) => s.layout.cols);

  const sizePx = CELL_PX[difficulty];

  const children: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      children.push(<Cell key={`${r}-${c}`} row={r} col={c} sizePx={sizePx} />);
    }
  }

  return (
    <div
      role="grid"
      aria-label="Minesweeper board"
      aria-rowcount={rows}
      aria-colcount={cols}
      className="grid mx-auto select-none touch-manipulation"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${sizePx}px)`,
        gap: 0,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}
