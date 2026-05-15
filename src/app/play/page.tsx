import { QuickPlay } from "@/components/game/QuickPlay";

export const metadata = {
  title: "Quick Play — Minesweeper Academy",
};

export default function PlayPage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <QuickPlay />
    </main>
  );
}
