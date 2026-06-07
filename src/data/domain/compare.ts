import type { SeriesPoint } from "../model";

// Vergleich des aktuellen Werts mit „gestern, gleiche Uhrzeit" aus der Historie.

export interface YesterdayDelta {
  /** aktuell − gestern. */
  delta: number;
  /** Wert von gestern (gleiche Uhrzeit, nächster Punkt im Toleranzfenster). */
  yesterday: number;
}

/**
 * Liefert die Differenz zum Wert vor ~24 h (nächster Punkt innerhalb `toleranceMs`),
 * oder null, wenn kein passender Punkt vorliegt. Standardtoleranz: ±2 h.
 */
export function deltaToYesterday(
  series: readonly SeriesPoint[],
  currentValue: number,
  currentMs: number,
  toleranceMs = 2 * 60 * 60 * 1000,
): YesterdayDelta | null {
  if (!Number.isFinite(currentValue) || !Number.isFinite(currentMs))
    return null;

  const target = currentMs - 24 * 60 * 60 * 1000;
  let best: number | null = null;
  let bestDiff = Infinity;
  for (const p of series) {
    const ms = Date.parse(p.t);
    if (!Number.isFinite(ms) || !Number.isFinite(p.v)) continue;
    const diff = Math.abs(ms - target);
    if (diff <= toleranceMs && diff < bestDiff) {
      bestDiff = diff;
      best = p.v;
    }
  }

  if (best === null) return null;
  return { delta: currentValue - best, yesterday: best };
}
