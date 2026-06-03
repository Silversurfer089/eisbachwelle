// Internes Datenmodell der App. Die UI kennt ausschließlich diese Typen — niemals
// die Rohformate von HND/GKD/Open-Meteo. Der Cron (scripts/fetch_data.py) bzw. der
// Loader sind die einzigen Stellen, die Quellformate kennen (Anti-Corruption-Layer).

/** Die vier Messgrößen, die die App anzeigt. */
export type MetricKey = "flow" | "level" | "waterTemp" | "airTemp";

export const METRIC_KEYS: readonly MetricKey[] = [
  "flow",
  "level",
  "waterTemp",
  "airTemp",
];

/** Anzeige-Einheit je Messgröße (für Achsen/Tooltips, wenn kein Reading vorliegt). */
export const METRIC_UNIT: Record<MetricKey, string> = {
  flow: "m³/s",
  level: "cm",
  waterTemp: "°C",
  airTemp: "°C",
};

/** Trendrichtung einer Messgröße. "unknown", wenn zu wenige Daten vorliegen. */
export type Trend = "rising" | "falling" | "stable" | "unknown";

/** Ein einzelner aktueller Messwert. */
export interface Reading {
  /** Numerischer Wert (bereits normalisiert, Punkt-Dezimal). */
  value: number;
  /** Einheit zur Anzeige, z. B. "m³/s", "cm", "°C". */
  unit: string;
  /** Zeitstempel der Messung, ISO 8601 in UTC (…Z). */
  t: string;
}

/**
 * Aktueller Stand (Inhalt von public/data/current.json).
 * Jede Messgröße ist entweder ein Reading oder null (Quelle ausgefallen/kein Wert).
 */
export interface CurrentData {
  /** Wann der Cron-Job die Daten geholt hat, ISO 8601 UTC. */
  fetchedAt: string;
  /** Sichtbare Quellenangaben je Bereich (Attribution). */
  sources: Record<string, string>;
  /** Aktuelle Werte; Schlüssel immer vorhanden, Wert ggf. null. */
  measurements: Record<MetricKey, Reading | null>;
}

/** Ein Punkt einer Zeitreihe (kompakt gehalten). */
export interface SeriesPoint {
  /** ISO 8601 UTC. */
  t: string;
  /** Wert. */
  v: number;
}

/**
 * Historie (Inhalt von public/data/history.json).
 * Pro Messgröße eine nach Zeit aufsteigend sortierte Reihe.
 */
export interface HistoryData {
  /** Wann die Historie zuletzt geschrieben wurde, ISO 8601 UTC. */
  generatedAt: string;
  /** Zeitreihen je Messgröße (können fehlen oder leer sein). */
  series: Record<MetricKey, SeriesPoint[]>;
}
