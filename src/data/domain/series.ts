import { METRIC_KEYS } from "../model";
import type { CurrentData, HistoryData } from "../model";

// Verschmilzt den aktuellen Messwert (current.json, ggf. Near-Live vom Worker)
// mit der Cron-Historie. Ohne das endet der Verlaufs-Chart am letzten
// history.json-Punkt (bis ~20 Min alt), obwohl ein frischerer Wert vorliegt.

/**
 * Hängt je Messgröße den aktuellen Messwert ans Serienende an, sofern er neuer
 * als der letzte Historienpunkt ist. Eingaben werden nicht mutiert; ohne
 * Änderung kommt die Historie unverändert (referenzgleich) zurück.
 */
export function withCurrentReadings(
  history: HistoryData,
  current: CurrentData | null,
): HistoryData {
  if (!current) return history;
  let changed = false;
  const series = { ...history.series };
  for (const key of METRIC_KEYS) {
    const r = current.measurements[key];
    if (!r) continue;
    const ms = Date.parse(r.t);
    if (!Number.isFinite(ms)) continue;
    const s = series[key];
    const lastMs = s.length > 0 ? Date.parse(s[s.length - 1]!.t) : -Infinity;
    if (ms > lastMs) {
      series[key] = [...s, { t: r.t, v: r.value }];
      changed = true;
    }
  }
  return changed ? { ...history, series } : history;
}
