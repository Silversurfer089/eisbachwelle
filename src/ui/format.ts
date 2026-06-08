import type { MetricKey } from "../data/model";
import { locale } from "../i18n";

// Locale-bewusste Formatierung: Zahlen/Datum richten sich nach der aktiven Sprache
// (Deutsch → de-DE, Englisch → en-GB). Formatter werden je (Locale + Optionen) gecacht.

const nfCache = new Map<string, Intl.NumberFormat>();
export function nfmt(opts: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = locale() + JSON.stringify(opts);
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale(), opts);
    nfCache.set(key, f);
  }
  return f;
}

const dtCache = new Map<string, Intl.DateTimeFormat>();
export function dtf(
  opts: Intl.DateTimeFormatOptions = {},
): Intl.DateTimeFormat {
  const key = locale() + JSON.stringify(opts);
  let f = dtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale(), opts);
    dtCache.set(key, f);
  }
  return f;
}

const rtCache = new Map<string, Intl.RelativeTimeFormat>();
function rtf(): Intl.RelativeTimeFormat {
  const base = locale().slice(0, 2);
  let f = rtCache.get(base);
  if (!f) {
    f = new Intl.RelativeTimeFormat(base, { numeric: "auto" });
    rtCache.set(base, f);
  }
  return f;
}

const FRACTION_DIGITS: Record<MetricKey, number> = {
  flow: 1,
  level: 0,
  waterTemp: 1,
  airTemp: 1,
};

/** Formatiert einen Messwert in der aktiven Lokale. */
export function formatValue(value: number, metric: MetricKey): string {
  const digits = FRACTION_DIGITS[metric];
  return nfmt({
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Absoluter Zeitstempel in Münchner Zeit, lokalisiert. */
export function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dtf({
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(d);
}

/** Relative Zeit zur Gegenwart, lokalisiert (z. B. „vor 5 Minuten" / „5 minutes ago"). */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMin = Math.round((then - now.getTime()) / 60_000);

  if (Math.abs(diffMin) < 60) return rtf().format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf().format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return rtf().format(diffDay, "day");
}
