# DECISIONS.md — Entscheidungs-Log

Jede wichtige Entscheidung in 1–2 Sätzen mit Begründung. Neueste oben.

## Architektur & Stack

- **Rein statische PWA, kein Server.** Erfüllt die Leitplanken „kostenlos" und „wartungsarm";
  läuft auf GitHub Pages ohne laufende Infrastruktur.
- **Vanilla TypeScript statt Framework.** Vermeidet Framework-Churn (Migrationen) und hält das
  Bundle klein; die UI-Komplexität (ein Dashboard + Charts) rechtfertigt kein React/Vue/Svelte.
- **Vite als Build-Tool** (aktuell auf Version 8 gepinnt). Schnell, stabil, erstklassiges
  PWA-Plugin, kein Lock-in. Zum Setup-Zeitpunkt jeweils neueste stabile Majorversion gewählt.
- **TypeScript strict** (inkl. `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`):
  fängt Datenfehler früh, wichtig beim Parsen externer, unsicherer Quellen.
- **Chart.js 4 für Diagramme.** Lange etabliert, aktiv gepflegt, gute Types, akzeptables Bundle;
  Alternative (D3) wäre mächtiger, aber deutlich mehr Eigenpflege.
- **Plain CSS + Custom Properties statt Tailwind.** Kein Upgrade-Zyklus, volle Kontrolle,
  null zusätzliche Build-Abhängigkeit.
- **Vitest für Tests.** Vite-nativ, zero-config, schnell; jsdom für den Dashboard-Smoke-Test.
- **Dependencies exakt gepinnt** (keine Range-Operatoren): reproduzierbare Builds, keine
  überraschenden Migrationen.

## Daten-Beschaffung

- **Serverlos via GitHub Actions Cron (geplant: alle 15 Min)** statt Live-Fetch im Browser.
  Gründe: (1) HND/GKD setzen keine CORS-Header für Browser-Zugriff; (2) keine laufende
  Server-/Proxy-Infrastruktur nötig; (3) die App bleibt rein statisch. Der Cron holt die
  Quellen, normalisiert sie zu kleinem JSON und committet es ins Repo. Die PWA liest nur
  dieses JSON (gleiche Origin → kein CORS).
  - Free-Tier-Budget: ~96 Läufe/Tag × ~0,3 Min ≈ 870 Min/Monat < 2000 Min Limit. Tragfähig.
  - Fallback (falls Cron nicht reicht): schlanker Cloudflare-Worker-Proxy (Free-Tier). Wird
    nur erwogen, wenn der Cron-Weg an Nutzungsbedingungen oder Technik scheitert.
- **Adapter-Schicht.** Quellenzugriff ist im Cron-Skript bzw. `loader.ts` gekapselt; die UI
  kennt nur das interne Modell. Formatänderungen einer Quelle brechen nur den Adapter.

## Verifizierte Endpunkte

**Verifiziert am 2026-06-03** durch direkte HTTP-Abrufe (curl) und Parsing der Antworten.
HND/GKD bieten keine dokumentierte JSON-API; genutzt werden öffentlich erreichbare
HTML-Tabellen-Endpunkte (GET, ohne Login, ohne Formular). Alle drei liefern HTTP 200.

### 1. GKD `/messwerte` — frische Aktuellwerte (15-Min, letzte ~2 h)

Liefert eine HTML-Tabelle der jüngsten ~7 Viertelstundenwerte. **Quelle für die
Aktuellwerte** von Abfluss, Wasserstand und (nur hier verfügbar) Wassertemperatur.

```
https://www.gkd.bayern.de/de/fluesse/{thema}/bayern/muenchen-himmelreichbruecke-16515005/messwerte
  {thema} ∈ { wasserstand | abfluss | wassertemperatur }
```

- Format: `<td>DD.MM.YYYY HH:MM</td><td class="center">WERT</td>`
- Einheiten/Beispielwerte: Wasserstand `144` cm · Abfluss `22,3` m³/s · Wassertemp `16,3` °C
- **Dezimaltrennzeichen ist Komma** (`22,3`) → im Cron zu Punkt normalisieren.
- `?beginn=DD.MM.YYYY&ende=DD.MM.YYYY` existiert, ändert aber nur die Grafik, **nicht** die
  Tabelle (bleibt bei ~7 Zeilen). Daher nicht zum Backfill nutzbar.
- Korrekte Messstellen-URL via Weiterleitung ermittelbar:
  `https://www.gkd.bayern.de/de/search/go?suche=fluesse.{thema}&id=16515005`

### 2. HND `/tabelle` — Historie-Bootstrap (stündlich, ~6 Tage)

Liefert ~159 **stündliche** Werte (~6 Tage). **Quelle zum Bootstrappen der Abfluss-/
Pegel-Historie.** Keine Wassertemperatur.

```
https://www.hnd.bayern.de/pegel/isar/muenchen-himmelreichbruecke-16515005/tabelle?methode={methode}
  {methode} ∈ { wasserstand | abfluss }
```

- Format: HTML-Tabelle, Zeit `DD.MM.YYYY HH:MM`, Komma-Dezimal (identisch zu GKD).

### 3. Open-Meteo — Lufttemperatur (aktuell + stündliche Historie)

Dokumentierte JSON-API, kein Key. Koordinaten Himmelreichbrücke ~`48.144, 11.586`.

```
Aktuell:   https://api.open-meteo.com/v1/forecast?latitude=48.144&longitude=11.586&current=temperature_2m&timezone=Europe%2FBerlin
Historie:  https://api.open-meteo.com/v1/forecast?latitude=48.144&longitude=11.586&hourly=temperature_2m&past_days=7&forecast_days=1&timezone=UTC
```

- `current.temperature_2m` (°C, 15-Min-Intervall) bzw. `hourly.{time[],temperature_2m[]}`
  (192 Stundenwerte = 7 Tage + heute). Punkt-Dezimal, ISO-Zeit.

### Quellenstrategie (Zusammenfassung)

| Metrik                | Aktuellwert            | Historie-Bootstrap                  |
| --------------------- | ---------------------- | ----------------------------------- |
| Abfluss (m³/s)        | GKD messwerte (15-Min) | HND tabelle (6 d, stündl.)          |
| Wasserstand (cm)      | GKD messwerte (15-Min) | HND tabelle (6 d, stündl.)          |
| Wassertemperatur (°C) | GKD messwerte (15-Min) | _kein Backfill_ → wächst über Zeit  |
| Lufttemperatur (°C)   | Open-Meteo current     | Open-Meteo past_days (7 d, stündl.) |

> **Annahme (zu prüfen):** GKD/HND-Zeitstempel sind **lokale Zeit Europe/Berlin (DST-bewusst)**.
> Begründung: Der jüngste GKD-Wert (`15:00`) deckt sich mit der echten Münchner Wanduhrzeit
> (= Open-Meteo `current` in Europe/Berlin), nicht mit UTC oder fixem MEZ. Der Cron konvertiert
> nach UTC-ISO via `zoneinfo("Europe/Berlin")`. Im Winter (MEZ) erneut gegenprüfen.

> **Nutzungsbedingungen:** HND/GKD-Daten sind amtliche Umweltdaten des Freistaats Bayern
> (LfU). Vor Produktivschaltung sind die Nutzungs-/Lizenzhinweise der Portale zu prüfen und
> die Quelle sichtbar zu attribuieren (in der App + README). Abrufe bleiben sparsam
> (~alle 15 Min). Open-Meteo: Free-Tier, Attribution gemäß deren Bedingungen (CC-BY).

## Hosting & Deploy

- **GitHub Pages.** Cron (GitHub Actions) und Hosting im selben Ökosystem → ein Account,
  kein Routing zwischen Diensten, Auto-Deploy per Git-Push.
- **Keine eigene Domain** (Nutzerwunsch). URL: `https://<user>.github.io/<repo>/`.
  Vite `base` wird im Deploy über `BASE_PATH` gesetzt.

## Lizenz

- **MIT.** Permissiv, macht transparent, dass niemand verdient, lädt zum Mitmachen ein.
