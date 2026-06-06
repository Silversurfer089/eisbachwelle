#!/usr/bin/env python3
"""Erzeugt die PWA-Icons (PNG) aus reiner Standardbibliothek – kein Browser, keine
externen Abhängigkeiten. Motiv: „Karo-Welle" – eine Wellen-/Zeltform, gefüllt mit einem
Türkis/Creme-Schachbrett, auf dunklem Grund. Identisch zu public/favicon.svg.

Aufruf:  python3 scripts/make_icons.py
Ausgabe: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png

Technik: Die Wellenform (Bézier-Pfad im 120er-Raster, wie im SVG) wird zu einem Polygon
geglättet, per Scanline gefüllt und mit Supersampling kantengeglättet. Das Schachbrett
wird im 120er-Raster bestimmt, damit es größenunabhängig identisch aussieht.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

BG = (0x0E, 0x14, 0x18)
TEAL = (0x2D, 0xD4, 0xBF)
CREAM = (0xEE, 0xF1, 0xE6)

CELL = 12.0  # Schachbrett-Kantenlänge im 120er-Raster (wie SVG-Pattern 24/2)
SS = 3  # Supersampling-Faktor für Kantenglättung

# Wellen-/Zeltform als Pfadsegmente im 120er-Raster (identisch zu favicon.svg):
#   M12 86  C30 78,40 50,50 40  Q60 31 70 40  C80 50,90 78,108 86  Z
_CUBICS = [
    ((12, 86), (30, 78), (40, 50), (50, 40)),
    ((70, 40), (80, 50), (90, 78), (108, 86)),
]
_QUADS = [((50, 40), (60, 31), (70, 40))]


def _cubic(p0, p1, p2, p3, n=24):
    pts = []
    for k in range(n + 1):
        t = k / n
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def _quad(p0, p1, p2, n=18):
    pts = []
    for k in range(n + 1):
        t = k / n
        u = 1 - t
        x = u**2 * p0[0] + 2 * u * t * p1[0] + t**2 * p2[0]
        y = u**2 * p0[1] + 2 * u * t * p1[1] + t**2 * p2[1]
        pts.append((x, y))
    return pts


def _polygon() -> list[tuple[float, float]]:
    poly: list[tuple[float, float]] = []
    poly += _cubic(*_CUBICS[0])
    poly += _quad(*_QUADS[0])
    poly += _cubic(*_CUBICS[1])
    return poly  # implizit geschlossen (Scanline schließt zum Start)


def _checker(gx: float, gy: float):
    i = int(gx // CELL)
    j = int(gy // CELL)
    return CREAM if (i + j) % 2 == 0 else TEAL


def make_icon(size: int, fit: float) -> bytes:
    hi = size * SS
    s = (hi / 120.0) * fit
    off = hi / 2.0 - 60.0 * s  # zentriert (Formmitte liegt bei 60,60 im Raster)

    # Polygon in Hi-Res-Pixelkoordinaten.
    poly = [(x * s + off, y * s + off) for (x, y) in _polygon()]
    n = len(poly)
    edges = [(poly[k], poly[(k + 1) % n]) for k in range(n)]

    # Hi-Res-Puffer mit Hintergrund füllen.
    buf = [[BG for _ in range(hi)] for _ in range(hi)]

    ymin = max(0, int(min(p[1] for p in poly)))
    ymax = min(hi, int(max(p[1] for p in poly)) + 1)
    for py in range(ymin, ymax):
        yc = py + 0.5
        xs = []
        for (x1, y1), (x2, y2) in edges:
            if (y1 <= yc < y2) or (y2 <= yc < y1):
                xs.append(x1 + (yc - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for a in range(0, len(xs) - 1, 2):
            x_start = max(0, int(xs[a]))
            x_end = min(hi, int(xs[a + 1]) + 1)
            for px in range(x_start, x_end):
                if xs[a] <= px + 0.5 <= xs[a + 1]:
                    gx = (px + 0.5 - off) / s
                    gy = (yc - off) / s
                    buf[py][px] = _checker(gx, gy)

    # Box-Downsampling auf Zielgröße (Kantenglättung).
    out = bytearray()
    inv = 1.0 / (SS * SS)
    for y in range(size):
        out.append(0)  # PNG-Filter 0
        for x in range(size):
            r = g = b = 0
            for dy in range(SS):
                row = buf[y * SS + dy]
                for dx in range(SS):
                    pr, pg, pb = row[x * SS + dx]
                    r += pr
                    g += pg
                    b += pb
            out += bytes((round(r * inv), round(g * inv), round(b * inv)))
    return _png(size, size, bytes(out))


def _chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def _png(width: int, height: int, raw: bytes) -> bytes:
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (
        sig
        + _chunk(b"IHDR", ihdr)
        + _chunk(b"IDAT", zlib.compress(raw, 9))
        + _chunk(b"IEND", b"")
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "icon-192.png").write_bytes(make_icon(192, 1.0))
    (OUT / "icon-512.png").write_bytes(make_icon(512, 1.0))
    # Maskable: kleinerer fit → mehr Rand für die Safe-Zone.
    (OUT / "icon-maskable-512.png").write_bytes(make_icon(512, 0.78))
    print("Icons geschrieben nach", OUT)


if __name__ == "__main__":
    main()
