# 🌊 Eisbachwelle München

Eine kleine, schnelle **Progressive Web App** für den Live-Zustand der **Eisbachwelle**
(Eisbach an der Himmelreichbrücke, Englischer Garten, München): **Abfluss**, **Wasserstand**,
**Wasser-** und **Lufttemperatur** — mit Trend und ehrlicher historischer Einordnung.

**Nicht-kommerziell. Open Source (MIT). Kein Tracking, keine Werbung, keine Accounts.**
Die App ist für die Community gedacht und verdrängt bestehende Angebote (z. B. eisbachwetter.de)
nicht — sie ergänzt sie.

> Projektstatus: **V1 funktionsfähig** — Dashboard, Verlauf, Einordnung und PWA stehen;
> Datenschicht getestet, serverloser Daten-Cron eingerichtet. Vor dem Produktivbetrieb sind
> nur noch das Deploy (siehe unten) und die Prüfung der Quellen-Nutzungsbedingungen offen.

## Was sie kann (Ziel V1)

1. **Live-Dashboard** — die wichtigsten Werte auf einen Blick, mit Zeitstempel, Quelle und
   klarem Trend (steigend / fallend / stabil).
2. **Verlauf** — Diagramme der letzten 24 h / 7 Tage / 30 Tage.
3. **Trend** — ehrliche Einordnung des aktuellen Abflusses relativ zum typischen Bereich
   (aus historischen Daten abgeleitete Perzentile, als Orientierung gekennzeichnet).

Installierbar auf dem Homescreen (iOS + Android), **offline-fähig** (zeigt den letzten
bekannten Stand mit deutlichem „Stand: …"-Hinweis).

## Woher die Daten kommen

| Größe                            | Quelle                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Abfluss (m³/s), Wasserstand (cm) | **Hochwassernachrichtendienst Bayern (HND)** — Pegel „München Himmelreichbrücke / Eisbach", ID `16515005` |
| Wassertemperatur (°C)            | **Gewässerkundlicher Dienst Bayern (GKD)**                                                                |
| Lufttemperatur (°C)              | **[Open-Meteo](https://open-meteo.com)** (kostenlos, ohne API-Key)                                        |

Die genauen, **verifizierten** Endpunkte und Antwortformate stehen in
[`DECISIONS.md`](./DECISIONS.md).

## Wie der Daten-Cron funktioniert

Es gibt **keinen Server**. Ein geplanter **GitHub-Actions-Job** (alle ~15 Min) führt
`scripts/fetch_data.py` aus: Er ruft die Quellen ab, normalisiert sie zu kompaktem JSON und
committet `public/data/current.json` (letzter Stand) sowie `public/data/history.json`
(ausgedünnte Zeitreihe 24 h / 7 d / 30 d) ins Repo. Die statische PWA liest nur diese Dateien
(gleiche Origin → kein CORS). So entstehen Live-Werte **und** Historie kostenlos und ohne
Datenbank.

## Lokal entwickeln

Voraussetzungen: **Node ≥ 20**, **Python ≥ 3.10**.

```bash
npm install          # Dependencies
npm run dev          # Dev-Server: http://localhost:5173
npm test             # Tests (Datenschicht zuerst)
npm run build        # Produktions-Build nach dist/
npm run preview      # dist/ lokal ansehen
```

Daten-Skript lokal ausführen (schreibt nach `public/data/`):

```bash
python3 scripts/fetch_data.py
```

PWA-Icons neu erzeugen (reine Standardbibliothek, kein Browser nötig):

```bash
python3 scripts/make_icons.py
```

## Deployen (GitHub Pages, kostenlos)

Einmalige Einrichtung (ca. 10 Minuten):

1. **Repo anlegen** (öffentlich) und diesen Ordner pushen:

   ```bash
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

2. **GitHub Pages aktivieren:** Repo → _Settings_ → _Pages_ →
   _Build and deployment_ → _Source_ = **GitHub Actions**.

3. **Actions-Schreibrechte:** Repo → _Settings_ → _Actions_ → _General_ →
   _Workflow permissions_ = **Read and write permissions** (damit der Daten-Cron in den
   `data`-Branch pushen darf).

4. **Erststart der Daten:** Repo → _Actions_ → Workflow **„Fetch Eisbach data"** →
   _Run workflow_. Das erzeugt den `data`-Branch mit `current.json`/`history.json`.
   Danach läuft er automatisch alle 15 Minuten.

5. **App-Deploy:** Bei jedem Push auf `main` baut **„Deploy to GitHub Pages"** die App und
   veröffentlicht sie. Die Seite liegt dann unter `https://<user>.github.io/<repo>/`.

### Wie das ohne laufende Kosten funktioniert

- Der **Daten-Cron** schreibt nur zwei kleine JSON-Dateien in den separaten `data`-Branch
  (kein App-Rebuild). Die App lädt sie per Raw-URL des `data`-Branches.
- Der **App-Deploy** läuft nur bei Code-Änderungen auf `main`.
- Der `BASE_PATH` (z. B. `/<repo>/`) und die Daten-URL werden im Deploy-Workflow automatisch
  aus dem Repo-Namen abgeleitet — es ist nichts manuell einzutragen.

Details und Begründung der Architektur: [`DECISIONS.md`](./DECISIONS.md).

## Mitmachen

Issues und PRs willkommen. Bitte `DECISIONS.md` für den Kontext lesen und Endpunkte nie raten.

## Lizenz

[MIT](./LICENSE) — niemand verdient hieran; nutze und verändere es frei.

## Attribution

Daten: Hochwassernachrichtendienst Bayern (HND) · Gewässerkundlicher Dienst Bayern (GKD) ·
Wetter: Open-Meteo. Nutzungsbedingungen der Quellen werden beachtet (siehe `DECISIONS.md`).
