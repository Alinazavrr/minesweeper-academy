"use client";

type Point = { value: number; tone?: "win" | "loss" | "abandoned" };

type Props = {
  points: ReadonlyArray<Point>;
  width?: number;
  height?: number;
  ariaLabel: string;
};

/**
 * Inline-SVG sparkline. No chart library — the dataset is at most 30 points
 * and we only need a polyline + dots. Keeps bundle small and avoids the
 * Recharts/Tremor dependency surface.
 */
export function Sparkline({
  points,
  width = 480,
  height = 80,
  ariaLabel,
}: Props) {
  if (points.length === 0) {
    return (
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex h-20 w-full items-center justify-center rounded-md border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700"
      >
        Not enough data yet
      </div>
    );
  }
  const padding = 6;
  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const minValue = Math.min(...points.map((p) => p.value), 0);
  const range = Math.max(0.0001, maxValue - minValue);
  const stepX =
    points.length === 1
      ? 0
      : (width - padding * 2) / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = padding + stepX * i;
    const y = padding + (height - padding * 2) * (1 - (p.value - minValue) / range);
    return { x, y, tone: p.tone };
  });

  const polyPoints = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-20 w-full text-emerald-600 dark:text-emerald-400"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyPoints}
      />
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={2.5}
          className={
            c.tone === "loss"
              ? "fill-red-500"
              : c.tone === "abandoned"
                ? "fill-zinc-400"
                : "fill-current"
          }
        />
      ))}
    </svg>
  );
}
