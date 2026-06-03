# CLAUDE.md — Kontext & Konventionen

Dieses Dokument richtet sich an KI-Assistenten und Mitwirkende. Es fasst zusammen,
**was** das Projekt ist, **wie** es gebaut/getestet wird und **welche Regeln** gelten.

## Was ist das?

Eine **Progressive Web App (PWA)**, die den Zustand der **Eisbachwelle in München**
(Eisbach, Himmelreichbrücke, Englischer Garten) anzeigt: Abfluss (m³/s), Wasserstand (cm),
Wassertemperatur (°C) und Lufttemperatur (°C) — mit Trend und ehrlicher historischer
Einordnung.

## Leitplanken (nicht verhandelbar)

- **Nicht-kommerziell.** Kein Tracking, keine Analytics, keine Werbung, keine Accounts,
  keine In-App-Käufe. Keine entsprechenden SDKs.
- **Kostenlos & wartungsarm.** Kein eigener Server, keine Datenbank, kein Abo. Rein
  **statische** App auf kostenlosem Hosting (GitHub Pages).
- **Daten ehrlich.** Immer Zeitstempel + Quelle anzeigen. Alte/ausgefallene Daten klar als
  solche kennzeichnen — niemals eine Zahl vortäuschen.
- **Quellen attribuieren.** HND/GKD Bayern und Open-Meteo sichtbar nennen.
- **Wenige, gepinnte Dependencies.** Jede Abhängigkeit ist begründet (siehe DECISIONS.md).

## Tech-Stack

- **Build:** Vite 5 · **Sprache:** TypeScript (strict) · **Framework:** keines (Vanilla TS)
- **Charts:** Chart.js 4 · **PWA:** vite-plugin-pwa (Workbox)
- **Tests:** Vitest (jsdom) · **Lint/Format:** ESLint 9 + Prettier
- **Daten-Cron:** GitHub Actions + Python-Skript (`scripts/fetch_data.py`)
- **Wetter:** Open-Meteo (ohne API-Key)

## Befehle

```bash
npm install        # Dependencies installieren
npm run dev        # Lokaler Dev-Server (http://localhost:5173)
npm run build      # Typecheck + Produktions-Build nach dist/
npm run preview    # Gebautes dist/ lokal servieren
npm test           # Vitest einmalig (CI-Modus)
npm run test:watch # Vitest im Watch-Modus
npm run lint       # ESLint + Prettier-Check
npm run format     # Prettier schreibt Formatierung
```

Daten-Skript (lokal testen):

```bash
python3 scripts/fetch_data.py   # holt Quellen, schreibt public/data/*.json
```

## Architektur & Schichten (strikt getrennt)

```
src/
  data/         Datenschicht — KEINE UI hier.
    model.ts        interne Typen (WaveSnapshot, HistoryFile, Measurement, Trend)
    loader.ts       lädt + validiert current.json / history.json
    domain/         reine Domänenlogik (testbar, ohne DOM)
      trend.ts        Trendberechnung
      percentile.ts   historische Perzentil-Einordnung
  charts/       Chart.js-Wrapper (nimmt fertige Domänendaten entgegen)
  ui/           DOM-Rendering — KEINE Geschäftslogik hier.
  i18n/         alle Strings zentral (de.ts; englisch leicht ergänzbar)
  main.ts       Einstiegspunkt
scripts/        fetch_data.py (Cron-Job)
public/data/    von CI befüllt; lokal Mock-/echte JSON
tests/          Vitest — Schwerpunkt Datenschicht
```

**Regel:** Geschäftslogik nie in UI-Komponenten. Jeder Quellenzugriff ist hinter dem
Adapter (Cron-Skript bzw. `loader.ts`) gekapselt — ändert eine Quelle ihr Format, bricht
nur der Adapter, nie die UI.

## Stil

- **Deutsch** ist Hauptsprache (UI-Strings via i18n). Code-Kommentare deutsch oder englisch.
- Dark Mode als Standard, warmer Outdoor-Charakter (Teal-Akzent + warmer Bernstein/Koralle).
- Trends nie nur über Farbe: immer zusätzlich Icon + Text (Accessibility).

## Wichtige Konventionen

- TypeScript `strict` inkl. `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- Keine erfundenen Endpunkte/APIs/Messwerte. Verifizierte Endpunkte stehen in DECISIONS.md.
- Versionen in `package.json` exakt pinnen (keine `^`/`~`).
- Vor UI-Arbeit: Datenschicht test-first, grüner Testlauf (GATE 2).

## Status

Siehe Task-Liste / README „Roadmap". Aktueller Stand: **M1 (Scaffold)**.
