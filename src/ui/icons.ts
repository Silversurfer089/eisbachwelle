import type { Trend } from "../data/model";
import type { WeatherKey } from "../data/domain/weather";

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

// Wetter-Icons (Linienstil) für die Vorhersage.
const W = `viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`;
const CLOUD = `<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 18z"/>`;
const WEATHER: Record<WeatherKey, string> = {
  clear: `<svg ${W}><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  cloudy: `<svg ${W}>${CLOUD}</svg>`,
  fog: `<svg ${W}>${CLOUD}<path d="M5 21h10M8 18h11" opacity="0.7"/></svg>`,
  rain: `<svg ${W}>${CLOUD}<path d="M8 20l-1 2M12 20l-1 2M16 20l-1 2"/></svg>`,
  snow: `<svg ${W}>${CLOUD}<path d="M8 21h.01M12 21h.01M16 21h.01M10 22.5h.01M14 22.5h.01"/></svg>`,
  storm: `<svg ${W}>${CLOUD}<path d="M13 18l-3 4h3l-2 3"/></svg>`,
  unknown: `<svg ${W}><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
};

export function weatherIcon(key: WeatherKey): string {
  return WEATHER[key];
}
