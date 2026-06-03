import type { MetricKey } from "../data/model";

// Formatierung in deutscher Lokale. Reine Darstellungslogik, keine Geschäftslogik.

const FRACTION_DIGITS: Record<MetricKey, number> = {
  flow: 1,
  level: 0,
  waterTemp: 1,
  airTemp: 1,
};

const numberFormats: Partial<Record<MetricKey, Intl.NumberFormat>> = {};

function numberFormat(metric: MetricKey): Intl.NumberFormat {
  let fmt = numberFormats[metric];
  if (!fmt) {
    const digits = FRACTION_DIGITS[metric];
    fmt = new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    numberFormats[metric] = fmt;
  }
  return fmt;
}

/** Formatiert einen Messwert in deutscher Schreibweise (Komma als Dezimaltrenner). */
export function formatValue(value: number, metric: MetricKey): string {
  return numberFormat(metric).format(value);
}

const absoluteFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

/** Absoluter Zeitstempel in Münchner Zeit, z. B. "03.06.26, 15:15". */
export function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return absoluteFormat.format(d);
}

const relativeFormat = new Intl.RelativeTimeFormat("de", { numeric: "auto" });

/** Relative Zeit zur Gegenwart, z. B. "vor 5 Minuten". */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = then - now.getTime();
  const diffMin = Math.round(diffMs / 60_000);

  if (Math.abs(diffMin) < 60) return relativeFormat.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return relativeFormat.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return relativeFormat.format(diffDay, "day");
}
