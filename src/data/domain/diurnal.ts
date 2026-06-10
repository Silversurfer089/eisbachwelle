import type { SeriesPoint } from "../model";

// Typisches Tagesgang-Maximum der Wassertemperatur aus den jüngsten Messwerten.
//
// Bewusst KEINE Vorhersage: Wir beschreiben nur das beobachtete Muster der letzten
// Tage ("meist am wärmsten ca. 17–20 Uhr") und kennzeichnen es in der UI als
// Beobachtung. Erst mit mehr Datenbasis folgt ein echtes Vorhersagemodell.

const LOOKBACK_MS = 14 * 24 * 60 * 60_000;
const MIN_DAYS = 3; // mindestens 3 verschiedene Tage
const MIN_HOURS_COVERED = 18; // fast vollständiger Tagesgang nötig
const NEAR_PEAK_C = 0.15; // Stunden innerhalb 0,15 °C des Maximums zählen zum Fenster
const MAX_WINDOW_H = 6;

// Locale-unabhängige Berlin-Stunde/-Datum (DST-sicher via Intl).
const berlinParts = new Intl.DateTimeFormat("en-u-hc-h23", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
});

export interface WarmWindow {
  /** Beginn des Fensters, Stunde 0–23 (Europe/Berlin). */
  startHour: number;
  /** Ende des Fensters, exklusiv (1–24); Peak liegt in [startHour, endHour). */
  endHour: number;
}

/**
 * Findet das typische Tagesfenster mit der höchsten Wassertemperatur
 * (Europe/Berlin) aus den Messwerten der letzten 14 Tage.
 * Null, wenn die Datenbasis zu dünn ist (zu wenige Tage oder Stunden).
 */
export function warmestWaterWindow(
  points: SeriesPoint[],
  now: Date = new Date(),
): WarmWindow | null {
  const cutoff = now.getTime() - LOOKBACK_MS;
  const byHour = new Map<number, number[]>();
  const days = new Set<string>();

  for (const p of points) {
    const ms = Date.parse(p.t);
    if (!Number.isFinite(ms) || ms < cutoff || ms > now.getTime()) continue;
    const parts = Object.fromEntries(
      berlinParts.formatToParts(new Date(ms)).map((x) => [x.type, x.value]),
    );
    const hour = Number(parts["hour"]);
    if (!Number.isFinite(hour)) continue;
    days.add(`${parts["year"]}-${parts["month"]}-${parts["day"]}`);
    const arr = byHour.get(hour) ?? [];
    arr.push(p.v);
    byHour.set(hour, arr);
  }

  if (days.size < MIN_DAYS || byHour.size < MIN_HOURS_COVERED) return null;

  const mean = new Map<number, number>();
  for (const [h, vs] of byHour)
    mean.set(h, vs.reduce((a, b) => a + b, 0) / vs.length);

  let peakHour = -1;
  let peakVal = -Infinity;
  for (const [h, v] of mean) {
    if (v > peakVal) {
      peakVal = v;
      peakHour = h;
    }
  }

  // Zusammenhängenden Block um den Peak ausweiten, solange die Stundenmittel
  // nah am Maximum liegen. Über Mitternacht wird nicht ausgeweitet — für
  // Wassertemperatur (Peak nachmittags/abends) ist das nicht plausibel.
  let start = peakHour;
  let end = peakHour; // inklusiv
  const near = (h: number) => {
    const v = mean.get(h);
    return v !== undefined && peakVal - v <= NEAR_PEAK_C;
  };
  while (start > 0 && end - start + 1 < MAX_WINDOW_H && near(start - 1))
    start--;
  while (end < 23 && end - start + 1 < MAX_WINDOW_H && near(end + 1)) end++;

  return { startHour: start, endHour: end + 1 };
}
