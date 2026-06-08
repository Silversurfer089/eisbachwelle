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
  // "DD.MM.YYYY HH:MM" (Europe/Berlin) -> ISO UTC. Sommerzeit (MESZ) = UTC+2, sonst +1.
  const m = de.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const [, d, mo, y, h, mi] = m.map(Number);
  // grober DST-Test (letzter So März – letzter So Okt)
  const dst = mo > 3 && mo < 10 ? true : mo === 3 || mo === 10 ? true : false;
  const off = dst ? 2 : 1;
  return new Date(Date.UTC(y, mo - 1, d, h - off, mi))
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
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
