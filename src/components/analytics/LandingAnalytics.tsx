"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

/**
 * Tiny zero-render component — fires `landing_view` exactly once on mount.
 * Lives in a "use client" island so the home page itself can stay an RSC.
 */
export function LandingAnalytics() {
  useEffect(() => {
    track("landing_view");
  }, []);
  return null;
}
