// Optionaler Cloudflare-Worker für NEAR-LIVE-Werte (Free-Tier, serverlos).
//
// Zweck: Der GitHub-Cron aktualisiert nur ~stündlich (GitHub drosselt geplante Jobs).
// Dieser Worker holt die GKD-Aktuellwerte bei jedem Aufruf frisch und liefert sie mit
// CORS-Header aus – die PWA kann damit direkt häufiger pollen (z. B. alle 2–5 Min).
// Die Historie/Vorhersage kommt weiterhin aus dem GitHub-Cron (history/current.json).
//
// Deploy (kostenlos):
//   1) Cloudflare-Konto → Workers & Pages → Create Worker
//   2) Diesen Code einfügen, deployen → URL notieren (z. B. https://eisbach-live.<sub>.workers.dev)
//   3) Im Deploy-Workflow VITE_LIVE_URL auf diese URL setzen (dann nutzt die App sie).
//
// Hinweise: nicht-kommerziell, sparsame Abrufe; GKD-Nutzungsbedingungen beachten.

const PEGEL = "muenchen-himmelreichbruecke-16515005";
const METRICS = {
  flow: { thema: "abfluss", unit: "m³/s" },
  level: { thema: "wasserstand", unit: "cm" },
  waterTemp: { thema: "wassertemperatur", unit: "°C" },
};

const ROW =
  /<td[^>]*>\s*(\d{2}\.\d{2}\.\d{4}\s+\d{1,2}:\d{2})\s*<\/td>\s*<td[^>]*>\s*([^<]*?)\s*<\/td>/g;

function toIsoUtc(de) {
  // "DD.MM.YYYY HH:MM" (Europe/Berlin) -> ISO UTC.
  // Statt eines monatsscharfen DST-Tests prüfen wir per Intl, welcher Offset
  // (UTC+2 MESZ oder UTC+1 MEZ) den UTC-Kandidaten korrekt auf die lokale Zeit
  // zurück-formatiert. Damit stimmt die Umrechnung auch für die Übergangstage im
  // März und Oktober exakt – nicht nur monatsweise.
  const m = de.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]) - 1, y = Number(m[3]);
  const h = Number(m[4]), mi = Number(m[5]);
  const fmt = new Intl.DateTimeFormat("en-u-hc-h23", {
    timeZone: "Europe/Berlin",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  for (const off of [2, 1]) {
    const utc = new Date(Date.UTC(y, mo, d, h - off, mi));
    const p = Object.fromEntries(fmt.formatToParts(utc).map(x => [x.type, x.value]));
    if (
      Number(p.year) === y && Number(p.month) === mo + 1 && Number(p.day) === d &&
      Number(p.hour) === h && Number(p.minute) === mi
    ) {
      return utc.toISOString().replace(/\.\d{3}Z$/, "Z");
    }
  }
  // Fallback (sollte nicht eintreten): UTC+1
  return new Date(Date.UTC(y, mo, d, h - 1, mi)).toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function newest(thema) {
  const url = `https://www.gkd.bayern.de/de/fluesse/${thema}/bayern/${PEGEL}/messwerte/tabelle`;
  const html = await (await fetch(url, { cf: { cacheTtl: 60 } })).text();
  let best = null;
  for (const m of html.matchAll(ROW)) {
    const v = m[2].replace(/\./g, "").replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(v)) continue;
    const iso = toIsoUtc(m[1]);
    if (iso && (!best || iso > best.t)) best = { t: iso, v: parseFloat(v) };
  }
  return best;
}

export default {
  async fetch() {
    const out = {
      fetchedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      measurements: {},
    };
    await Promise.all(
      Object.entries(METRICS).map(async ([key, { thema, unit }]) => {
        try {
          const p = await newest(thema);
          out.measurements[key] = p ? { value: p.v, unit, t: p.t } : null;
        } catch {
          out.measurements[key] = null;
        }
      }),
    );
    return new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=60",
      },
    });
  },
};
