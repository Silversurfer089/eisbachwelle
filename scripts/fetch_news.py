#!/usr/bin/env python3
"""Sammelt Eisbach-relevante Meldungen aus verifizierten RSS-Feeds (Phase 1).

Schreibt ``public/data/news.json``: nur Titel + Datum + Quelle + Link — bewusst
KEINE Beschreibungen/Volltexte (Leistungsschutzrecht: Schlagzeile + Verlinkung
mit Quellenangabe sind unproblematisch, mehr nicht).

Regeln (siehe Nutzer-Anforderungen):

* Nur seriöse, verifizierte Quellen (Feeds am 2026-06-10 geprüft).
* Stichwortfilter — keine Treffer heißt leere Liste; die App blendet die
  Sektion dann komplett aus ("keine Neuigkeiten = keine Neuigkeiten").
* Einträge älter als ``MAX_AGE_DAYS`` fliegen raus.
* Kein Instagram, keine Werbung, nur Standardbibliothek.

Selbstdrosselung: Läuft der Cron alle 15 Minuten, prüft das Skript zuerst das
``generatedAt`` der bestehenden Datei und beendet sich, wenn sie jünger als
``MIN_INTERVAL_H`` Stunden ist (Feeds nicht hämmern; News brauchen kein 15-Min-Update).
"""

from __future__ import annotations

import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"
NEWS_PATH = OUT_DIR / "news.json"

# Verifizierte Feeds (Stand 2026-06-10). Reihenfolge = Anzeigename.
FEEDS: list[tuple[str, str]] = [
    ("Rathaus Umschau", "https://ru.muenchen.de/rss"),
    ("IGSM", "https://www.igsm.info/feed/"),
    ("SZ München", "https://rss.sueddeutsche.de/rss/Muenchen"),
    ("Merkur München", "https://www.merkur.de/lokales/muenchen/rssfeed.rdf"),
]

# Filter auf Titel + Beschreibung (Beschreibung wird NICHT gespeichert).
KEYWORDS = ("eisbach", "surfwelle", "flusssurf", "surfen in münchen")

MAX_AGE_DAYS = 180
MAX_ITEMS = 12
MIN_INTERVAL_H = 20
TIMEOUT_S = 20
USER_AGENT = "eisbachwelle-pwa/1.0 (nicht-kommerziell; News-Feed Phase 1)"


def log(msg: str) -> None:
    print(f"[fetch_news] {msg}", file=sys.stderr)


def to_iso_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
        return resp.read()


def load_existing() -> tuple[list[dict], datetime | None]:
    if not NEWS_PATH.exists():
        return [], None
    try:
        doc = json.loads(NEWS_PATH.read_text(encoding="utf-8"))
        gen = doc.get("generatedAt")
        gen_dt = (
            datetime.fromisoformat(gen.replace("Z", "+00:00"))
            if isinstance(gen, str)
            else None
        )
        items = doc.get("items")
        return (items if isinstance(items, list) else []), gen_dt
    except (ValueError, TypeError, AttributeError) as exc:
        log(f"WARNUNG: news.json unlesbar ({exc!r}), starte leer.")
        return [], None


def parse_feed(source: str, raw: bytes, now: datetime) -> list[dict]:
    """RSS 2.0 → relevante Items (Titel/Link/Datum). Fehlertolerant pro Feed."""
    root = ET.fromstring(raw)
    out: list[dict] = []
    for it in root.findall(".//item"):
        title = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        desc = it.findtext("description") or ""
        if not title or not link.startswith("https://"):
            continue
        haystack = f"{title} {desc}".lower()
        if not any(k in haystack for k in KEYWORDS):
            continue
        try:
            pub = parsedate_to_datetime((it.findtext("pubDate") or "").strip())
            if pub.tzinfo is None:
                pub = pub.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            pub = now  # Feeds ohne Datum: konservativ "jetzt"
        out.append({"t": to_iso_utc(pub), "title": title, "source": source, "url": link})
    return out


def build() -> None:
    now = datetime.now(timezone.utc)
    existing, gen_dt = load_existing()

    if gen_dt is not None and now - gen_dt < timedelta(hours=MIN_INTERVAL_H):
        log(f"news.json ist jünger als {MIN_INTERVAL_H} h — übersprungen.")
        return

    items: dict[str, dict] = {
        i["url"]: i
        for i in existing
        if isinstance(i, dict) and isinstance(i.get("url"), str)
    }
    for source, url in FEEDS:
        try:
            for item in parse_feed(source, http_get(url), now):
                items[item["url"]] = item  # frische Treffer gewinnen (dedupe per URL)
        except Exception as exc:  # noqa: BLE001 — ein kaputter Feed stoppt nicht den Rest
            log(f"FEHLER bei Feed {source}: {exc!r}")

    cutoff = now - timedelta(days=MAX_AGE_DAYS)
    fresh = sorted(
        (i for i in items.values() if i["t"] >= to_iso_utc(cutoff)),
        key=lambda i: i["t"],
        reverse=True,
    )[:MAX_ITEMS]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    NEWS_PATH.write_text(
        json.dumps(
            {"generatedAt": to_iso_utc(now), "items": fresh},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n",
        encoding="utf-8",
    )
    log(f"OK. {len(fresh)} relevante Meldungen.")


if __name__ == "__main__":
    build()
