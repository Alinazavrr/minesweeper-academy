"use client";

import { useEffect } from "react";
import {
  equippedSkinsToClassNames,
  SKIN_HTML_CLASS,
  type EquippedSkins,
} from "@/lib/cosmetics/catalog";

type Props = {
  equipped: EquippedSkins;
};

/**
 * Applies skin classes to <html> on mount. Reconciles by removing any
 * skin-* class first, then adding the currently equipped ones — so a
 * navigation that re-renders the layout with new equipped values cleans
 * up the prior skin without leaving stale classes behind.
 */
export function SkinApplier({ equipped }: Props) {
  useEffect(() => {
    const root = document.documentElement;
    const allClasses = Object.values(SKIN_HTML_CLASS);
    for (const cls of allClasses) root.classList.remove(cls);
    for (const cls of equippedSkinsToClassNames(equipped)) {
      root.classList.add(cls);
    }
  }, [equipped]);

  return null;
}
