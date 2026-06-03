import type { SeriesPoint, Trend } from "../model";

export interface TrendOptions {
  /** Zeitfenster (ms) zurück, über das der Trend bewertet wird. Standard: 3 h. */
  lookbackMs?: number;
  /** Relative Schwelle, unter der eine Änderung als "stable" gilt. Standard: 5 %. */
  relThreshold?: number;
  /** Mindestanzahl Punkte im Fenster für eine Aussage. Standard: 2. */
  minPoints?: number;
}

const DEFAULTS: Required<TrendOptions> = {
  lookbackMs: 3 * 60 * 60 * 1000,
  relThreshold: 0.05,
  minPoints: 2,
};

interface Parsed {
  ms: number;
  v: number;
}

/**
 * Bestimmt die Trendrichtung einer Zeitreihe.
 *
 * Vergleicht den jüngsten Wert mit dem ältesten Wert innerhalb des Lookback-Fensters.
 * Liegt die relative Änderung unter `relThreshold`, gilt der Verlauf als "stable".
 * Bei zu wenigen Punkten im Fenster: "unknown" — wir täuschen keine Aussage vor.
 */
export function computeTrend(
  points: readonly SeriesPoint[],
  opts: TrendOptions = {},
): Trend {
  const { lookbackMs, relThreshold, minPoints } = { ...DEFAULTS, ...opts };

  const parsed: Parsed[] = points
    .map((p) => ({ ms: Date.parse(p.t), v: p.v }))
    .filter((p) => Number.isFinite(p.ms) && Number.isFinite(p.v))
    .sort((a, b) => a.ms - b.ms);

  if (parsed.length < minPoints) return "unknown";

  const latest = parsed[parsed.length - 1]!;
  const windowStart = latest.ms - lookbackMs;
  const window = parsed.filter((p) => p.ms >= windowStart);

  if (window.length < minPoints) return "unknown";

  const ref = window[0]!;
  const diff = latest.v - ref.v;
  const base = Math.abs(ref.v);

  if (base === 0) {
    if (diff === 0) return "stable";
    return diff > 0 ? "rising" : "falling";
  }

  const rel = diff / base;
  if (Math.abs(rel) < relThreshold) return "stable";
  return rel > 0 ? "rising" : "falling";
}
