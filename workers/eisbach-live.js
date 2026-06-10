// Optionaler Cloudflare-Worker für NEAR-LIVE-Werte + Community-Abstimmung.
//
// Endpunkte:
//   GET  /              → aktuelle Messwerte (Abfluss, Pegel, Wassertemp)
//   GET  /wave-status   → Community-Abstimmstatus (letzte 6 h)
//   POST /wave-vote     → Stimme abgeben { status: "good"|"okay"|"poor"|"closed" }
//
// Deploy (kostenlos):
//   1) Cloudflare-Konto → Workers & Pages → Worker "eisbachlive" öffnen
//   2) Code komplett ersetzen → Deploy
//   3) Für Community-Voting: Settings → Variables → KV Namespace Bindings
//      Variable name: KV  → neue oder bestehende KV-Namespace wählen/erstellen
//
// Ohne KV-Binding funktionieren die Messwerte weiterhin; /wave-status liefert dann
// immer { total: 0 } und /wave-vote gibt 503 zurück.
//
// Hinweise: nicht-kommerziell, sparsame Abrufe; GKD-Nutzungsbedingungen beachten.

const PEGEL = "muenchen-himmelreichbruecke-16515005";
const METRICS = {
  flow: { thema: "abfluss", unit: "m³/s" },
  level: { thema: "wasserstand", unit: "cm" },
  waterTemp: { thema: "wassertemperatur", unit: "°C" },
};

const VOTE_STATUSES = ["good", "okay", "poor", "closed"];
const VOTE_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 h
const MIN_VOTES = 2; // Mindestmeldungen für Status-Anzeige
const COOLDOWN_MS = 60 * 60 * 1000; // 1 Stimme/IP/h
const MAX_VOTES = 200;

const ROW =
  /<td[^>]*>\s*(\d{2}\.\d{2}\.\d{4}\s+\d{1,2}:\d{2})\s*<\/td>\s*<td[^>]*>\s*([^<]*?)\s*<\/td>/g;

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function toIsoUtc(de) {
  // "DD.MM.YYYY HH:MM" (Europe/Berlin) -> ISO UTC.
  // Prüft per Intl, welcher Offset (UTC+2 MESZ oder UTC+1 MEZ) korrekt ist.
  const m = de.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const d = Number(m[1]),
    mo = Number(m[2]) - 1,
    y = Number(m[3]);
  const h = Number(m[4]),
    mi = Number(m[5]);
  const fmt = new Intl.DateTimeFormat("en-u-hc-h23", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  for (const off of [2, 1]) {
    const utc = new Date(Date.UTC(y, mo, d, h - off, mi));
    const p = Object.fromEntries(
      fmt.formatToParts(utc).map((x) => [x.type, x.value]),
    );
    if (
      Number(p.year) === y &&
      Number(p.month) === mo + 1 &&
      Number(p.day) === d &&
      Number(p.hour) === h &&
      Number(p.minute) === mi
    ) {
      return utc.toISOString().replace(/\.\d{3}Z$/, "Z");
    }
  }
  return new Date(Date.UTC(y, mo, d, h - 1, mi))
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
}

async function sha256short(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

function corsHeaders() {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

// ── Messwerte ────────────────────────────────────────────────────────────────

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

async function handleMeasurements() {
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
}

// ── Community-Voting ──────────────────────────────────────────────────────────

async function handleStatus(env) {
  if (!env?.KV)
    return json({
      status: null,
      counts: { good: 0, okay: 0, poor: 0, closed: 0 },
      total: 0,
      lastVoteAt: null,
    });
  try {
    const raw = (await env.KV.get("votes")) ?? "[]";
    const votes = JSON.parse(raw);
    const cutoff = Date.now() - VOTE_WINDOW_MS;
    const recent = votes.filter((v) => v.t >= cutoff);
    const counts = { good: 0, okay: 0, poor: 0, closed: 0 };
    for (const v of recent) counts[v.s] = (counts[v.s] ?? 0) + 1;
    const total = recent.length;
    const dominant =
      total >= MIN_VOTES
        ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        : null;
    const lastVoteAt =
      total > 0
        ? new Date(Math.max(...recent.map((v) => v.t)))
            .toISOString()
            .replace(/\.\d{3}Z$/, "Z")
        : null;
    return json({ status: dominant, counts, total, lastVoteAt });
  } catch {
    return json({
      status: null,
      counts: { good: 0, okay: 0, poor: 0, closed: 0 },
      total: 0,
      lastVoteAt: null,
    });
  }
}

async function handleVote(request, env) {
  if (!env?.KV) return json({ error: "not_configured" }, 503);

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const ipHash = await sha256short(ip);

  // Cooldown prüfen
  const lastTs = await env.KV.get(`rl:${ipHash}`);
  if (lastTs && Date.now() - Number(lastTs) < COOLDOWN_MS) {
    return json({ error: "cooldown" }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const status = body?.status;
  if (!VOTE_STATUSES.includes(status))
    return json({ error: "invalid_status" }, 400);

  // Stimme speichern
  try {
    const raw = (await env.KV.get("votes")) ?? "[]";
    const votes = JSON.parse(raw);
    votes.push({ s: status, t: Date.now(), h: ipHash });
    // Nur Stimmen der letzten 6 h behalten, max MAX_VOTES
    const cutoff = Date.now() - VOTE_WINDOW_MS;
    const trimmed = votes.filter((v) => v.t >= cutoff).slice(-MAX_VOTES);
    await env.KV.put("votes", JSON.stringify(trimmed));
    await env.KV.put(`rl:${ipHash}`, String(Date.now()), {
      expirationTtl: 3600,
    });
  } catch {
    return json({ error: "storage_error" }, 500);
  }

  return json({ ok: true });
}

// ── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/wave-status") return handleStatus(env);
    if (pathname === "/wave-vote" && request.method === "POST")
      return handleVote(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }

    // Standard: Messwerte
    return handleMeasurements();
  },
};
