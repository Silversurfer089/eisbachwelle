import type { Trend } from "../data/model";

// Inline-SVG-Icons (statisches Markup). Trends werden nie allein über Farbe
// kommuniziert: Pfeilrichtung (Icon) + Text tragen die Aussage.

const ARROW_UP = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg>`;
const ARROW_DOWN = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></svg>`;
const ARROW_FLAT = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`;
const QUESTION = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`;

export function trendIcon(trend: Trend): string {
  switch (trend) {
    case "rising":
      return ARROW_UP;
    case "falling":
      return ARROW_DOWN;
    case "stable":
      return ARROW_FLAT;
    case "unknown":
      return QUESTION;
  }
}
