import { validateCurrent, validateHistory } from "./loader";
import type { CurrentData, HistoryData } from "./model";

/** Basis-URL der Datendateien (siehe src/env.d.ts). Garantiert mit "/" am Ende. */
function dataBase(): string {
  const raw = import.meta.env.VITE_DATA_BASE_URL ?? "/data/";
  return raw.endsWith("/") ? raw : raw + "/";
}

const FETCH_TIMEOUT_MS = 15_000;

async function fetchJson(name: string, signal?: AbortSignal): Promise<unknown> {
  const url = dataBase() + name;
  // Eigener Timeout, damit ein hängender Request die Aktualisierung nicht blockiert.
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const sig = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const res = await fetch(url, { signal: sig });
  if (!res.ok) {
    throw new Error(`Laden von ${name} fehlgeschlagen: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Optionaler Near-Live-Override: Ist VITE_LIVE_URL gesetzt (Cloudflare-Worker), werden die
 * Wasser-Aktuellwerte bei jedem Laden frisch geholt und – falls neuer – über die Cron-Werte
 * gelegt. Historie/Vorhersage bleiben aus dem Cron. Fällt der Worker aus, zählt der Cron-Stand.
 */
async function applyLive(base: CurrentData, signal?: AbortSignal): Promise<void> {
  const url = import.meta.env.VITE_LIVE_URL;
  if (!url) return;
  try {
    const timeout = AbortSignal.timeout(8000);
    const sig = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const res = await fetch(url, { signal: sig });
    if (!res.ok) return;
    const meas = (await res.json())?.measurements;
    if (!meas || typeof meas !== "object") return;
    for (const key of ["flow", "level", "waterTemp"] as const) {
      const r = meas[key];
      if (
        r &&
        typeof r.value === "number" &&
        Number.isFinite(r.value) &&
        typeof r.unit === "string" &&
        typeof r.t === "string" &&
        !Number.isNaN(Date.parse(r.t))
      ) {
        const cur = base.measurements[key];
        if (!cur || Date.parse(r.t) > Date.parse(cur.t)) {
          base.measurements[key] = { value: r.value, unit: r.unit, t: r.t };
        }
      }
    }
  } catch {
    /* Near-Live ist optional; bei Fehler bleibt der Cron-Stand. */
  }
}

/** Lädt und validiert den aktuellen Stand. Wirft bei Netz-/Format-Fehlern. */
export async function loadCurrent(signal?: AbortSignal): Promise<CurrentData> {
  const base = validateCurrent(await fetchJson("current.json", signal));
  await applyLive(base, signal);
  return base;
}

/** Lädt und validiert die Historie. Wirft bei Netz-/Format-Fehlern. */
export async function loadHistory(signal?: AbortSignal): Promise<HistoryData> {
  return validateHistory(await fetchJson("history.json", signal));
}
