import type { Database } from "@/types/supabase";

export type CosmeticKind = Database["public"]["Enums"]["cosmetic_kind"];

export type Skin = {
  id: string;
  kind: CosmeticKind;
  name: string;
  description: string;
  price: number;
  /** Tailwind class string used to preview the skin's accent color. */
  swatchClass: string;
};

export const SKIN_CATALOG: ReadonlyArray<Skin> = [
  {
    id: "blue-ui",
    kind: "ui",
    name: "Cobalt UI",
    description:
      "Recolors every accent on the site — buttons, links, badges — to a cool blue.",
    price: 100,
    swatchClass: "bg-blue-600",
  },
  {
    id: "blue-board",
    kind: "board",
    name: "Cobalt Board",
    description:
      "Paints the Minesweeper grid blue. Cells, hover states, and revealed tiles all switch.",
    price: 100,
    swatchClass: "bg-blue-500",
  },
];

export function findSkin(skinId: string): Skin | undefined {
  return SKIN_CATALOG.find((s) => s.id === skinId);
}

/**
 * CSS class names placed on <html> when each skin is equipped. The
 * actual color overrides live in globals.css and target these roots.
 */
export const SKIN_HTML_CLASS: Record<string, string> = {
  "blue-ui": "skin-ui-blue",
  "blue-board": "skin-board-blue",
};

export type EquippedSkins = {
  ui: string | null;
  board: string | null;
};

export function equippedSkinsToClassNames(
  equipped: EquippedSkins,
): ReadonlyArray<string> {
  const out: string[] = [];
  if (equipped.ui && SKIN_HTML_CLASS[equipped.ui]) {
    out.push(SKIN_HTML_CLASS[equipped.ui]!);
  }
  if (equipped.board && SKIN_HTML_CLASS[equipped.board]) {
    out.push(SKIN_HTML_CLASS[equipped.board]!);
  }
  return out;
}
