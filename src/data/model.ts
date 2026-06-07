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
 * Tagesvorhersage (nur für seriös vorhersagbare Größen: Luft + Niederschlag).
 * Quelle: Open-Meteo. Bewusst KEINE Wasser-/Abfluss-Vorhersage (reguliert/träge).
 */
export interface ForecastDay {
  /** Lokales Datum "YYYY-MM-DD" (Europe/Berlin). */
  date: string;
  /** Höchst-/Tiefstwert Lufttemperatur in °C. */
  tMax: number | null;
  tMin: number | null;
  /** Niederschlagsmenge in mm und Höchstwahrscheinlichkeit in %. */
  precip: number | null;
  precipProb: number | null;
  /** WMO-Wettercode (für Symbol/Beschriftung). */
  code: number | null;
}

/** Eine Stunde der Vorhersage (Open-Meteo). */
export interface ForecastHour {
  /** ISO 8601 UTC. */
  t: string;
  /** Lufttemperatur in °C. */
  temp: number | null;
  /** Niederschlagsmenge in mm. */
  precip: number | null;
  /** Niederschlagswahrscheinlichkeit in %. */
  precipProb: number | null;
  /** WMO-Wettercode. */
  code: number | null;
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
  /** Tagesvorhersage (kann leer sein). */
  forecast: ForecastDay[];
  /** Stündliche Vorhersage der nächsten ~48 h (kann leer sein). */
  forecastHourly: ForecastHour[];
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
