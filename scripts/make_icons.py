#!/usr/bin/env python3
"""Erzeugt die PWA-Icons (PNG) aus reiner Standardbibliothek – kein Browser, keine
externen Abhängigkeiten. Motiv: „Karo-Welle" – exakt die Vektorvorlage aus
public/favicon.svg (asymmetrische Welle, Türkis/Creme-Schachbrett, Creme-Kontur,
nachtblauer Grund).

Aufruf:  python3 scripts/make_icons.py
Ausgabe: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png

Technik: Der Bézier-Pfad (512er-Koordinaten, identisch zum SVG) wird zu einem Polygon
geglättet, per Scanline mit dem Schachbrett gefüllt und entlang der Kontur mit cremefarbenen
Kreisscheiben „gestrichelt" (entspricht der zentrierten SVG-Kontur). Supersampling glättet
die Kanten. Das Schachbrett wird im 512er-Raster bestimmt → größenunabhängig identisch.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

# Farben exakt wie favicon.svg
BG = (0x1A, 0x1A, 0x2E)  # Nachtblau
TURQ = (0x15, 0xC2, 0xB8)  # Türkis
CREAM = (0xFF, 0xF4, 0xE0)  # Creme

CELL = 64.0  # Schachbrett-Kante im 512er-Raster (SVG-Pattern 128/2)
STROKE = 14.0  # Konturbreite im 512er-Raster
SS = 3  # Supersampling


def _cubic(p0, p1, p2, p3, n=40):
    pts = []
    for k in range(1, n + 1):  # ersten Punkt überspringen (Anschluss)
        t = k / n
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def _polygon() -> list[tuple[float, float]]:
    # M92 366 L92 300 C..270 206 C..340 164 C..420 300 L420 366 Z
    poly: list[tuple[float, float]] = [(92, 366), (92, 300)]
    poly += _cubic((92, 300), (176, 300), (220, 268), (270, 206))
    poly += _cubic((270, 206), (296, 174), (314, 164), (340, 164))
    poly += _cubic((340, 164), (388, 164), (416, 212), (420, 300))
    poly.append((420, 366))
    return poly


def _checker(x: float, y: float):
    i = int(x // CELL)
    j = int(y // CELL)
    return TURQ if (i + j) % 2 == 0 else CREAM


def make_icon(size: int, fit: float) -> bytes:
    hi = size * SS
    a = fit * (hi / 512.0)  # linearer Maßstab 512-Raum -> Geräte-Pixel
    b = (256.0 - 256.0 * fit) * (hi / 512.0)  # Zentrierungs-Offset (Mitte 256)

    def tf(p):
        return (p[0] * a + b, p[1] * a + b)

    poly = [tf(p) for p in _polygon()]
    n = len(poly)
    edges = [(poly[k], poly[(k + 1) % n]) for k in range(n)]

    buf = [[BG for _ in range(hi)] for _ in range(hi)]

    # 1) Schachbrett-Füllung per Scanline.
    ys = [p[1] for p in poly]
    for py in range(max(0, int(min(ys))), min(hi, int(max(ys)) + 1)):
        yc = py + 0.5
        xs = []
        for (x1, y1), (x2, y2) in edges:
            if (y1 <= yc < y2) or (y2 <= yc < y1):
                xs.append(x1 + (yc - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            for px in range(max(0, int(xs[k])), min(hi, int(xs[k + 1]) + 1)):
                if xs[k] <= px + 0.5 <= xs[k + 1]:
                    x512 = (px + 0.5 - b) / a
                    y512 = (yc - b) / a
                    buf[py][px] = _checker(x512, y512)

    # 2) Creme-Kontur: entlang der Polygonkante Kreisscheiben stempeln (zentriert).
    r = STROKE / 2.0 * a
    r2 = r * r
    for (x1, y1), (x2, y2) in edges:
        seg = max(1, int((((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5) / max(1.0, r)))
        for t in range(seg + 1):
            cx = x1 + (x2 - x1) * t / seg
            cy = y1 + (y2 - y1) * t / seg
            for py in range(max(0, int(cy - r)), min(hi, int(cy + r) + 1)):
                dy = py + 0.5 - cy
                for px in range(max(0, int(cx - r)), min(hi, int(cx + r) + 1)):
                    dx = px + 0.5 - cx
                    if dx * dx + dy * dy <= r2:
                        buf[py][px] = CREAM

    # 3) Box-Downsampling.
    out = bytearray()
    inv = 1.0 / (SS * SS)
    for y in range(size):
        out.append(0)
        for x in range(size):
            r0 = g0 = b0 = 0
            for dy in range(SS):
                row = buf[y * SS + dy]
                for dx in range(SS):
                    pr, pg, pb = row[x * SS + dx]
                    r0 += pr
                    g0 += pg
                    b0 += pb
            out += bytes((round(r0 * inv), round(g0 * inv), round(b0 * inv)))
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
    (OUT / "icon-maskable-512.png").write_bytes(make_icon(512, 0.80))
    print("Icons geschrieben nach", OUT)


if __name__ == "__main__":
    main()
