import type { NewsItem } from "../model";

// Anzeigeauswahl für den News-Feed: nur aktuelle, valide Einträge.
// "Keine Neuigkeiten = keine Neuigkeiten" — liefert diese Funktion eine leere
// Liste, blendet die UI die Sektion komplett aus.

const MAX_AGE_DAYS = 180;
const MAX_ITEMS = 6;

/** Filtert auf https-Links mit gültigem, nicht-zukünftigem Datum (≤ 180 Tage),
 *  sortiert neueste zuerst, maximal 6 Einträge. */
export function freshNews(
  items: NewsItem[],
  now: Date = new Date(),
): NewsItem[] {
  const nowMs = now.getTime();
  const cutoff = nowMs - MAX_AGE_DAYS * 86_400_000;
  return items
    .filter((i) => {
      const ms = Date.parse(i.t);
      return (
        i.url.startsWith("https://") &&
        i.title.trim().length > 0 &&
        Number.isFinite(ms) &&
        ms >= cutoff &&
        ms <= nowMs
      );
    })
    .sort((a, b) => Date.parse(b.t) - Date.parse(a.t))
    .slice(0, MAX_ITEMS);
}
