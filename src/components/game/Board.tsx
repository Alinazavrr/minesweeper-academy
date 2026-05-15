"use client";

import type { Cell as EngineCell, GameStatus } from "@minesweeper/engine";
import { Cell } from "./Cell";

export type BoardSize = "beginner" | "intermediate" | "expert";

const CELL_PX: Record<BoardSize, number> = {
  beginner: 36,
  intermediate: 30,
  expert: 26,
};

type Props = {
  size: BoardSize;
  cells: ReadonlyArray<ReadonlyArray<EngineCell>>;
  rows: number;
  cols: number;
  status: GameStatus;
  hint: { row: number; col: number } | null;
  onReveal: (row: number, col: number) => void;
  onFlag: (row: number, col: number) => void;
  onChord: (row: number, col: number) => void;
};

export function Board({
  size,
  cells,
  rows,
  cols,
  status,
  hint,
  onReveal,
  onFlag,
  onChord,
}: Props) {
  const sizePx = CELL_PX[size];

  const children: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hinted = hint !== null && hint.row === r && hint.col === c;
      children.push(
        <Cell
          key={`${r}-${c}`}
          row={r}
          col={c}
          sizePx={sizePx}
          cell={cells[r]![c]!}
          status={status}
          hinted={hinted}
          onReveal={onReveal}
          onFlag={onFlag}
          onChord={onChord}
        />,
      );
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
