import { METRIC_KEYS } from "./model";
import type {
  CurrentData,
  ForecastDay,
  ForecastHour,
  HistoryData,
  MetricKey,
  Reading,
  SeriesPoint,
} from "./model";

/** Daten gelten als veraltet, wenn der jüngste Wert älter als dies ist. Standard: 45 Min. */
export const DEFAULT_STALE_MS = 45 * 60 * 1000;

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isValidIso(s: unknown): s is string {
  return typeof s === "string" && !Number.isNaN(Date.parse(s));
}

function parseReading(raw: unknown, key: MetricKey): Reading | null {
  if (raw === null || raw === undefined) return null;
  if (!isObject(raw)) {
    throw new Error(`measurements.${key}: Objekt oder null erwartet`);
  }
  const { value, unit, t } = raw;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`measurements.${key}.value: endliche Zahl erwartet`);
  }
  if (typeof unit !== "string") {
    throw new Error(`measurements.${key}.unit: Zeichenkette erwartet`);
  }
  if (!isValidIso(t)) {
    throw new Error(`measurements.${key}.t: ISO-Zeitstempel erwartet`);
  }
  return { value, unit, t };
}

/** Validiert und normalisiert den Inhalt von current.json. Wirft bei kaputter Struktur. */
export function validateCurrent(raw: unknown): CurrentData {
  if (!isObject(raw)) throw new Error("current.json: Objekt erwartet");

  const { fetchedAt, sources, measurements } = raw;
  if (!isValidIso(fetchedAt)) {
    throw new Error("current.json.fetchedAt: ISO-Zeitstempel erwartet");
  }

  const src: Record<string, string> = {};
  if (sources !== undefined) {
    if (!isObject(sources)) {
      throw new Error("current.json.sources: Objekt erwartet");
    }
    for (const [k, v] of Object.entries(sources)) {
      if (typeof v === "string") src[k] = v;
    }
  }

  const meas = isObject(measurements) ? measurements : {};
  const out = {} as Record<MetricKey, Reading | null>;
  for (const key of METRIC_KEYS) {
    out[key] = parseReading(meas[key], key);
  }

  return {
    fetchedAt,
    sources: src,
    measurements: out,
    forecast: parseForecast((raw as { forecast?: unknown }).forecast),
    forecastHourly: parseForecastHourly(
      (raw as { forecastHourly?: unknown }).forecastHourly,
    ),
  };
}

function num(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

/** Validiert die Vorhersage tolerant: ungültige Tage werden verworfen, nie geworfen. */
function parseForecast(raw: unknown): ForecastDay[] {
  if (!Array.isArray(raw)) return [];
  const days: ForecastDay[] = [];
  for (const d of raw) {
    if (!isObject(d) || typeof d.date !== "string") continue;
    days.push({
      date: d.date,
      tMax: num(d.tMax),
      tMin: num(d.tMin),
      precip: num(d.precip),
      precipProb: num(d.precipProb),
      code: num(d.code),
    });
  }
  return days;
}

/** Validiert den Stundenverlauf tolerant (ungültige Stunden verworfen). */
function parseForecastHourly(raw: unknown): ForecastHour[] {
  if (!Array.isArray(raw)) return [];
  const hours: ForecastHour[] = [];
  for (const h of raw) {
    if (!isObject(h) || !isValidIso(h.t)) continue;
    hours.push({
      t: h.t,
      temp: num(h.temp),
      precip: num(h.precip),
      precipProb: num(h.precipProb),
      code: num(h.code),
    });
  }
  return hours;
}

/** Jüngster Messzeitstempel über alle Messgrößen, oder null wenn keine vorhanden. */
export function freshestTimestamp(current: CurrentData): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const key of METRIC_KEYS) {
    const r = current.measurements[key];
    if (!r) continue;
    const ms = Date.parse(r.t);
    if (ms > bestMs) {
      bestMs = ms;
      best = r.t;
    }
  }
  return best;
}

/** True, wenn der jüngste Wert älter als `maxAgeMs` ist oder gar keine Werte vorliegen. */
export function isStale(
  current: CurrentData,
  now: Date,
  maxAgeMs: number = DEFAULT_STALE_MS,
): boolean {
  const ts = freshestTimestamp(current);
  if (ts === null) return true;
  return now.getTime() - Date.parse(ts) > maxAgeMs;
}

function parseSeries(raw: unknown): SeriesPoint[] {
  if (!Array.isArray(raw)) return [];
  const pts: SeriesPoint[] = [];
  for (const p of raw) {
    if (!isObject(p)) continue;
    const { t, v } = p;
    if (!isValidIso(t)) continue;
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    pts.push({ t, v });
  }
  pts.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  return pts;
}

/** Validiert den Inhalt von history.json. Ungültige Punkte werden verworfen, nicht geworfen. */
export function validateHistory(raw: unknown): HistoryData {
  if (!isObject(raw)) throw new Error("history.json: Objekt erwartet");

  const { generatedAt, series } = raw;
  if (typeof generatedAt !== "string") {
    throw new Error("history.json.generatedAt: Zeichenkette erwartet");
  }
  if (!isObject(series)) {
    throw new Error("history.json.series: Objekt erwartet");
  }

  const out = {} as Record<MetricKey, SeriesPoint[]>;
  for (const key of METRIC_KEYS) {
    out[key] = parseSeries(series[key]);
  }

  return { generatedAt, series: out };
}
