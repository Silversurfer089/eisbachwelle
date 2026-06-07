#!/usr/bin/env python3
"""Holt Eisbach-Quelldaten und schreibt normalisiertes JSON für die statische PWA.

Erzeugt zwei Dateien unter ``public/data/``:

* ``current.json``  – aktueller Stand je Messgröße (Abfluss, Pegel, Wasser-/Lufttemp.)
* ``history.json``  – kompakte, ausgedünnte Zeitreihen (bis 30 Tage) je Messgröße

Quellen (verifiziert, siehe DECISIONS.md, Stand 2026-06-03):

* GKD Bayern ``/messwerte`` – frische 15-Min-Werte (Pegel/Abfluss/Wassertemperatur)
* HND Bayern ``/tabelle``   – ~6 Tage stündlich (Pegel/Abfluss) → Historie-Backfill
* Open-Meteo                 – Lufttemperatur (aktuell + 7 Tage stündlich)

Designprinzipien:

* **Nur Standardbibliothek** – der Cron braucht keine zusätzlichen Dependencies.
* **Resilient** – fällt eine Quelle aus, wird diese Messgröße ``null`` bzw. übersprungen;
  der Lauf bricht nicht ab und überschreibt vorhandene gute Historie nicht.
* **Idempotent** – HND/Open-Meteo-Historie wird bei jedem Lauf neu gemerged (dedupe
  über Zeitstempel); verpasste Läufe heilen sich dadurch von selbst, ohne Sonderlogik.
* **Anti-Corruption-Layer** – dieses Skript ist die einzige Stelle, die die Rohformate
  (deutsches Komma, lokale Zeit) kennt. Ändert eine Quelle ihr Format, bricht nur hier.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

# --------------------------------------------------------------------------- #
# Konfiguration
# --------------------------------------------------------------------------- #

PEGEL_ID = "16515005"
BERLIN = ZoneInfo("Europe/Berlin")  # GKD/HND-Zeitstempel sind lokale Zeit (DST-bewusst)

# Koordinaten der Himmelreichbrücke (Eisbach, Englischer Garten)
LAT, LON = 48.144, 11.586

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"

USER_AGENT = (
    "eisbachwelle-pwa/0.1 (+https://github.com; nicht-kommerziell, ~alle 15 Min)"
)
TIMEOUT = 30

UNITS = {"flow": "m³/s", "level": "cm", "waterTemp": "°C", "airTemp": "°C"}
SOURCES = {
    "flow": "HND / GKD Bayern",
    "level": "HND / GKD Bayern",
    "waterTemp": "GKD Bayern",
    "airTemp": "Open-Meteo",
}

GKD_THEMA = {"level": "wasserstand", "flow": "abfluss", "waterTemp": "wassertemperatur"}
HND_METHODE = {"level": "wasserstand", "flow": "abfluss"}

# Ausdünnung der Historie: (max. Alter, minimaler Abstand zwischen Punkten)
THINNING = [
    (timedelta(hours=24), timedelta(minutes=15)),
    (timedelta(days=7), timedelta(hours=1)),
    (timedelta(days=30), timedelta(hours=6)),
]
MAX_AGE = timedelta(days=30)


# --------------------------------------------------------------------------- #
# Hilfsfunktionen
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class Point:
    """Ein Messpunkt mit UTC-Zeit und Wert."""

    t: str  # ISO 8601 UTC, z. B. "2026-06-03T13:00:00Z"
    v: float


def log(msg: str) -> None:
    print(f"[fetch_data] {msg}", file=sys.stderr)


def http_get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:  # noqa: S310 (https only)
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def parse_de_number(raw: str) -> float | None:
    """'22,3' -> 22.3 ; leere/Platzhalterwerte -> None."""
    s = raw.strip().replace("\xa0", "").replace(".", "").replace(",", ".")
    if not re.fullmatch(r"-?\d+(\.\d+)?", s):
        return None
    return float(s)


def parse_de_datetime(raw: str) -> str | None:
    """'DD.MM.YYYY HH:MM' (lokale Zeit Europe/Berlin) -> ISO 8601 UTC."""
    try:
        naive = datetime.strptime(raw.strip(), "%d.%m.%Y %H:%M")
    except ValueError:
        return None
    local = naive.replace(tzinfo=BERLIN)
    return to_iso_utc(local.astimezone(timezone.utc))


def to_iso_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def write_json(path: Path, doc: dict) -> None:
    path.write_text(
        json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


_ROW_RE = re.compile(
    r"<td[^>]*>\s*(\d{2}\.\d{2}\.\d{4}\s+\d{1,2}:\d{2})\s*</td>\s*"
    r"<td[^>]*>\s*([^<]*?)\s*</td>",
)


def parse_html_table(html: str) -> list[Point]:
    """Extrahiert (Zeit, Wert)-Paare aus einer GKD-/HND-Messwerttabelle."""
    points: list[Point] = []
    for raw_t, raw_v in _ROW_RE.findall(html):
        iso = parse_de_datetime(raw_t)
        val = parse_de_number(raw_v)
        if iso is not None and val is not None:
            points.append(Point(iso, val))
    return points


# --------------------------------------------------------------------------- #
# Quellen-Adapter
# --------------------------------------------------------------------------- #


def fetch_gkd(metric: str) -> list[Point]:
    # /messwerte/tabelle liefert ~6 Tage in 15-Min-Auflösung (≈651 Werte) – auch für
    # Wassertemperatur. Das ist zugleich Aktuellwert (jüngste Zeile) und Historie-Backfill.
    thema = GKD_THEMA[metric]
    url = (
        f"https://www.gkd.bayern.de/de/fluesse/{thema}/bayern/"
        f"muenchen-himmelreichbruecke-{PEGEL_ID}/messwerte/tabelle"
    )
    return parse_html_table(http_get(url))


def fetch_hnd(metric: str) -> list[Point]:
    methode = HND_METHODE[metric]
    url = (
        f"https://www.hnd.bayern.de/pegel/isar/"
        f"muenchen-himmelreichbruecke-{PEGEL_ID}/tabelle?methode={methode}"
    )
    return parse_html_table(http_get(url))


def fetch_open_meteo() -> tuple[Point | None, list[Point]]:
    """Liefert (aktueller Punkt, stündliche Historie) der Lufttemperatur."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}"
        "&current=temperature_2m&hourly=temperature_2m"
        "&past_days=7&forecast_days=1&timezone=UTC"
    )
    data = json.loads(http_get(url))

    current: Point | None = None
    cur = data.get("current")
    if isinstance(cur, dict):
        t, v = cur.get("time"), cur.get("temperature_2m")
        if isinstance(t, str) and isinstance(v, (int, float)):
            # Open-Meteo "time" in UTC ohne Suffix -> normalisieren
            current = Point(_iso_minutes_to_utc(t), float(v))

    history: list[Point] = []
    hourly = data.get("hourly", {})
    times, temps = hourly.get("time", []), hourly.get("temperature_2m", [])
    now = datetime.now(timezone.utc)
    for t, v in zip(times, temps):
        if not isinstance(t, str) or not isinstance(v, (int, float)):
            continue
        iso = _iso_minutes_to_utc(t)
        if datetime.fromisoformat(iso.replace("Z", "+00:00")) <= now:
            history.append(Point(iso, float(v)))  # keine Zukunftswerte
    return current, history


def _iso_minutes_to_utc(t: str) -> str:
    """'2026-06-03T13:00' (UTC) -> '2026-06-03T13:00:00Z'."""
    dt = datetime.fromisoformat(t).replace(tzinfo=timezone.utc)
    return to_iso_utc(dt)


def fetch_forecast() -> list[dict]:
    """Tagesvorhersage (Open-Meteo) für Luft + Niederschlag, 3 Tage, lokale Tagesgrenzen.

    Bewusst nur seriös vorhersagbare Größen – keine Wasser-/Abfluss-Prognose.
    """
    url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}"
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,"
        "precipitation_probability_max,weathercode"
        "&forecast_days=3&timezone=Europe%2FBerlin"
    )
    daily = json.loads(http_get(url)).get("daily", {})
    times = daily.get("time", [])

    def col(key: str, i: int):
        arr = daily.get(key, [])
        v = arr[i] if i < len(arr) else None
        return v if isinstance(v, (int, float)) else None

    out: list[dict] = []
    for i, d in enumerate(times):
        if isinstance(d, str):
            out.append(
                {
                    "date": d,
                    "tMax": col("temperature_2m_max", i),
                    "tMin": col("temperature_2m_min", i),
                    "precip": col("precipitation_sum", i),
                    "precipProb": col("precipitation_probability_max", i),
                    "code": col("weathercode", i),
                }
            )
    return out


def safe(label: str, fn):  # type: ignore[no-untyped-def]
    """Führt einen Fetch aus; bei Fehler wird geloggt und ein Default geliefert."""
    try:
        return fn()
    except (urllib.error.URLError, ValueError, KeyError, TimeoutError) as exc:
        log(f"FEHLER bei {label}: {exc!r}")
        return None


# --------------------------------------------------------------------------- #
# Historie: Merge & Ausdünnung
# --------------------------------------------------------------------------- #


def merge_points(existing: list[Point], fresh: list[Point]) -> list[Point]:
    """Vereinigt zwei Punktlisten, dedupliziert über Zeitstempel, sortiert."""
    by_time: dict[str, float] = {p.t: p.v for p in existing}
    for p in fresh:
        by_time[p.t] = p.v  # frische Werte gewinnen
    return [Point(t, by_time[t]) for t in sorted(by_time)]


def thin(points: list[Point], now: datetime) -> list[Point]:
    """Dünnt die Reihe aus: feiner für junge, gröber für alte Werte; >30 d verwerfen."""
    kept: list[Point] = []
    last_kept: datetime | None = None
    for p in sorted(points, key=lambda x: x.t):
        dt = datetime.fromisoformat(p.t.replace("Z", "+00:00"))
        age = now - dt
        if age > MAX_AGE:
            continue
        min_gap = next((gap for limit, gap in THINNING if age <= limit), THINNING[-1][1])
        if last_kept is None or (dt - last_kept) >= min_gap:
            kept.append(p)
            last_kept = dt
    # Jüngsten Punkt immer behalten (für korrekten Aktuellbezug der Charts)
    if points and (not kept or kept[-1].t != max(p.t for p in points)):
        newest = max(points, key=lambda x: x.t)
        if not kept or kept[-1].t != newest.t:
            kept.append(newest)
    return kept


# --------------------------------------------------------------------------- #
# Hauptlogik
# --------------------------------------------------------------------------- #


def load_existing_history() -> dict[str, list[Point]]:
    path = OUT_DIR / "history.json"
    if not path.exists():
        return {m: [] for m in UNITS}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        series = data.get("series", {})
        out: dict[str, list[Point]] = {}
        for m in UNITS:
            raw = series.get(m, [])
            out[m] = [
                Point(p["t"], float(p["v"]))
                for p in raw
                if isinstance(p, dict) and "t" in p and "v" in p
            ]
        return out
    except (ValueError, KeyError, TypeError) as exc:
        log(f"WARNUNG: history.json unlesbar ({exc!r}), starte leer.")
        return {m: [] for m in UNITS}


def build() -> None:
    now = datetime.now(timezone.utc)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    history = load_existing_history()
    current: dict[str, dict | None] = {m: None for m in UNITS}

    # --- Wasser-Metriken: GKD /messwerte/tabelle (6 d, 15-Min) als Hauptquelle für
    #     Aktuellwert UND Historie; HND nur als Fallback für Abfluss/Pegel, falls GKD ausfällt.
    def set_current(metric: str, newest: Point) -> None:
        current[metric] = {"value": newest.v, "unit": UNITS[metric], "t": newest.t}

    for metric in ("flow", "level", "waterTemp"):
        gkd = safe(f"GKD {metric}", lambda metric=metric: fetch_gkd(metric)) or []
        if gkd:
            set_current(metric, max(gkd, key=lambda p: p.t))
            history[metric] = merge_points(history[metric], gkd)
        elif metric in HND_METHODE:  # GKD aus -> HND-Fallback (stündlich, ~6 d)
            hnd = safe(f"HND {metric}", lambda metric=metric: fetch_hnd(metric)) or []
            if hnd:
                history[metric] = merge_points(history[metric], hnd)
                set_current(metric, max(hnd, key=lambda p: p.t))

    # --- Lufttemperatur: Open-Meteo ---
    om = safe("Open-Meteo", fetch_open_meteo)
    if om is not None:
        cur_pt, hist = om
        if cur_pt is not None:
            current["airTemp"] = {
                "value": cur_pt.v,
                "unit": UNITS["airTemp"],
                "t": cur_pt.t,
            }
        if hist:
            history["airTemp"] = merge_points(history["airTemp"], hist)

    # --- Vorhersage (Luft + Niederschlag) ---
    forecast = safe("Open-Meteo Vorhersage", fetch_forecast) or []

    # --- Ausdünnen & schreiben ---
    thinned = {m: thin(pts, now) for m, pts in history.items()}

    history_doc = {
        "generatedAt": to_iso_utc(now),
        "series": {
            m: [{"t": p.t, "v": p.v} for p in pts] for m, pts in thinned.items()
        },
    }
    write_json(OUT_DIR / "history.json", history_doc)

    # Resilienz: Lieferte dieser Lauf KEINEN einzigen Aktuellwert (alle Quellen aus),
    # überschreiben wir ein vorhandenes gutes current.json NICHT mit lauter null.
    # Die App erkennt das Alter selbst (isStale) und zeigt den letzten Stand an.
    current_path = OUT_DIR / "current.json"
    if all(v is None for v in current.values()) and current_path.exists():
        log("Keine frischen Aktuellwerte — bestehendes current.json bleibt erhalten.")
    else:
        write_json(
            current_path,
            {
                "fetchedAt": to_iso_utc(now),
                "sources": SOURCES,
                "measurements": current,
                "forecast": forecast,
            },
        )

    avail = [m for m, v in current.items() if v is not None]
    counts = {m: len(p) for m, p in thinned.items()}
    log(f"OK. Aktuell verfügbar: {avail}. Historie-Punkte: {counts}")


if __name__ == "__main__":
    build()
