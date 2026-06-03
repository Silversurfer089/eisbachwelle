# DECISIONS.md — Entscheidungs-Log

Jede wichtige Entscheidung in 1–2 Sätzen mit Begründung. Neueste oben.

## Architektur & Stack

- **Rein statische PWA, kein Server.** Erfüllt die Leitplanken „kostenlos" und „wartungsarm";
  läuft auf GitHub Pages ohne laufende Infrastruktur.
- **Vanilla TypeScript statt Framework.** Vermeidet Framework-Churn (Migrationen) und hält das
  Bundle klein; die UI-Komplexität (ein Dashboard + Charts) rechtfertigt kein React/Vue/Svelte.
- **Vite 5 als Build-Tool.** Schnell, stabil, erstklassiges PWA-Plugin, kein Lock-in.
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

> ⚠️ **Noch ausstehend (vor GATE 2 / M2).** HND Bayern hat keine offiziell dokumentierte
> JSON-API. Die echten Netzwerk-Requests der Live-Seite und der GKD-CSV-Download werden in M2
> inspiziert und hier mit URL + Antwortformat + Stand-Datum dokumentiert. Nichts wird geraten;
> nicht zweifelsfrei Verifizierbares wird ausdrücklich als unsicher markiert.

| Quelle                      | Zweck            | Endpunkt | Format | Verifiziert am |
| --------------------------- | ---------------- | -------- | ------ | -------------- |
| HND Bayern (Pegel 16515005) | Abfluss, Pegel   | _TBD_    | _TBD_  | _offen_        |
| GKD Bayern                  | Wassertemperatur | _TBD_    | _TBD_  | _offen_        |
| Open-Meteo                  | Lufttemperatur   | _TBD_    | JSON   | _offen_        |

## Hosting & Deploy

- **GitHub Pages.** Cron (GitHub Actions) und Hosting im selben Ökosystem → ein Account,
  kein Routing zwischen Diensten, Auto-Deploy per Git-Push.
- **Keine eigene Domain** (Nutzerwunsch). URL: `https://<user>.github.io/<repo>/`.
  Vite `base` wird im Deploy über `BASE_PATH` gesetzt.

## Lizenz

- **MIT.** Permissiv, macht transparent, dass niemand verdient, lädt zum Mitmachen ein.
