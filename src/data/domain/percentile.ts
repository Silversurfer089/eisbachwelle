/**
 * Perzentilrang von `x` innerhalb der Verteilung `values`, in Prozent (0–100).
 *
 * Verwendet die Standarddefinition mit Halbgewichtung gleicher Werte:
 *   rank = (Anzahl kleiner + 0,5 · Anzahl gleich) / N · 100
 *
 * Nicht-endliche Werte (NaN, ±Infinity) werden ignoriert. Bei leerer (bereinigter)
 * Verteilung wird `null` zurückgegeben — wir erfinden keine Einordnung ohne Datenbasis.
 *
 * Hinweis: Dies ist eine rein beschreibende Einordnung aus historischen Daten
 * (Orientierung), kein Qualitäts- oder Vorhersageversprechen.
 */
export function percentileRank(
  values: readonly number[],
  x: number,
): number | null {
  let less = 0;
  let equal = 0;
  let n = 0;

  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    n++;
    if (v < x) less++;
    else if (v === x) equal++;
  }

  if (n === 0) return null;
  return ((less + equal / 2) / n) * 100;
}
