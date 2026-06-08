import { de, type Strings } from "./de";
import { en } from "./en";

export type Lang = "de" | "en";

const STORE_KEY = "eisbach-lang";

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved === "de" || saved === "en") return saved;
  } catch {
    /* localStorage evtl. blockiert */
  }
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "de";
}

let current: Lang = detect();

/** Aktive Strings. Live-Binding: wird bei setLang() neu zugewiesen. */
export let t: Strings = current === "en" ? en : de;

export function getLang(): Lang {
  return current;
}

/** Intl-Locale für Zahlen/Datum passend zur aktiven Sprache. */
export function locale(): string {
  return current === "en" ? "en-GB" : "de-DE";
}

const listeners = new Set<() => void>();

/** Registriert einen Callback, der nach jedem Sprachwechsel läuft. */
export function onLangChange(cb: () => void): void {
  listeners.add(cb);
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  t = lang === "en" ? en : de;
  try {
    localStorage.setItem(STORE_KEY, lang);
  } catch {
    /* ignorieren */
  }
  document.documentElement.lang = lang;
  for (const cb of listeners) cb();
}

// Anfangszustand auf <html lang> spiegeln.
document.documentElement.lang = current;
