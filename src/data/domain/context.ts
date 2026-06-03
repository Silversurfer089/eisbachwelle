import { percentileRank } from "./percentile";
import type { SeriesPoint } from "../model";

// Ehrliche Einordnung des aktuellen Abflusses relativ zur bisher erfassten Historie.
// Bewusst KEINE festen "gut/schlecht"-Schwellen: Wir leiten ausschließlich einen
// Perzentilrang aus den vorhandenen Daten ab und geben den Umfang der Datenbasis mit
// an, damit die Aussage als Orientierung (nicht als Versprechen) lesbar ist.

export interface DistributionContext {
  /** Perzentilrang des aktuellen Werts in der Verteilung, 0–100. */
  percentile: number;
  /** Anzahl der berücksichtigten Messwerte. */
  count: number;
  /** Abgedeckter Zeitraum in Tagen (für ehrliche Beschriftung). */
  spanDays: number;
  min: number;
  max: number;
  current: number;
}

/**
 * Liefert die Einordnung des Werts `current` in die Verteilung von `points`,
 * oder `null`, wenn die Datenbasis zu klein ist (`minCount`). Nicht-endliche Werte
 * werden ignoriert.
 */
export function describeContext(
  points: readonly SeriesPoint[],
  current: number,
  minCount = 24,
): DistributionContext | null {
  if (!Number.isFinite(current)) return null;

  const values: number[] = [];
  let minMs = Infinity;
  let maxMs = -Infinity;
  for (const p of points) {
    if (!Number.isFinite(p.v)) continue;
    values.push(p.v);
    const ms = Date.parse(p.t);
    if (Number.isFinite(ms)) {
      if (ms < minMs) minMs = ms;
      if (ms > maxMs) maxMs = ms;
    }
  }

  if (values.length < minCount) return null;

  const percentile = percentileRank(values, current);
  if (percentile === null) return null;

  const spanDays = maxMs > minMs ? (maxMs - minMs) / (24 * 60 * 60 * 1000) : 0;

  return {
    percentile,
    count: values.length,
    spanDays,
    min: Math.min(...values),
    max: Math.max(...values),
    current,
  };
}
