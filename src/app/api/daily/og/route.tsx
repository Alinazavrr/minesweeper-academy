import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Expert",
};

function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

/**
 * Open Graph card for a Daily Challenge result.
 *
 * URL params (all optional, all rendered server-side — no DB access from the
 * edge runtime, so the share URL carries the data):
 *   ?date=YYYY-MM-DD
 *   ?difficulty=beginner|intermediate|expert
 *   ?time=<ms>
 *   ?rank=<int>
 *   ?name=<player display name>
 *
 * Sized 1200x630, the standard Open Graph aspect.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const sp = req.nextUrl.searchParams;
  const date = sp.get("date") ?? "Today";
  const difficulty = sp.get("difficulty") ?? "intermediate";
  const time = Number(sp.get("time") ?? 0);
  const rank = sp.get("rank");
  const name = sp.get("name");
  const difficultyLabel = DIFFICULTY_LABEL[difficulty] ?? "Daily";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px",
          background:
            "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)",
          color: "#ecfdf5",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 28,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#a7f3d0",
          }}
        >
          <span>Minesweeper Academy</span>
          <span>{date}</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            gap: 24,
          }}
        >
          <div style={{ display: "flex", fontSize: 36, opacity: 0.85 }}>
            Daily Challenge · {difficultyLabel}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: 180,
              fontWeight: 700,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.04em",
            }}
          >
            {formatTime(time)}
          </div>
          {name || rank ? (
            <div
              style={{
                display: "flex",
                gap: 24,
                fontSize: 36,
                color: "#bbf7d0",
              }}
            >
              {name ? <span>{name}</span> : null}
              {rank ? <span>#{rank} on the board</span> : null}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 26,
            color: "#a7f3d0",
          }}
        >
          <span>Beat me at the Daily</span>
          <span>minesweeper.academy</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
