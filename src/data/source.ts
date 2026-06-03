import { validateCurrent, validateHistory } from "./loader";
import type { CurrentData, HistoryData } from "./model";

/** Basis-URL der Datendateien (siehe src/env.d.ts). Garantiert mit "/" am Ende. */
function dataBase(): string {
  const raw = import.meta.env.VITE_DATA_BASE_URL ?? "/data/";
  return raw.endsWith("/") ? raw : raw + "/";
}

async function fetchJson(name: string, signal?: AbortSignal): Promise<unknown> {
  const url = dataBase() + name;
  const res = await fetch(url, signal ? { signal } : {});
  if (!res.ok) {
    throw new Error(`Laden von ${name} fehlgeschlagen: HTTP ${res.status}`);
  }
  return res.json();
}

/** Lädt und validiert den aktuellen Stand. Wirft bei Netz-/Format-Fehlern. */
export async function loadCurrent(signal?: AbortSignal): Promise<CurrentData> {
  return validateCurrent(await fetchJson("current.json", signal));
}

/** Lädt und validiert die Historie. Wirft bei Netz-/Format-Fehlern. */
export async function loadHistory(signal?: AbortSignal): Promise<HistoryData> {
  return validateHistory(await fetchJson("history.json", signal));
}
