#!/usr/bin/env python3
"""Erzeugt die PWA-Icons (PNG) aus reiner Standardbibliothek – kein Browser, keine
externen Abhängigkeiten. Motiv: „Bullauge"-Roundel (Porthole) mit Wasser, passend zum
gewählten Logo (Variante B). Außenring + feiner Innenring + Nieten + zwei Wellen.

Aufruf:  python3 scripts/make_icons.py
Ausgabe: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png

Reproduzierbar im Repo gehalten, damit die Icons jederzeit neu erzeugbar sind.
Koordinaten-Referenz: 120er-Raster (wie favicon.svg), über `scale` auf die Zielgröße
abgebildet; maskable nutzt mehr Rand (kleinerer `scale`) für die Safe-Zone.
"""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

BG = (0x0E, 0x14, 0x18)
TEAL = (0x2D, 0xD4, 0xBF)
WARM = (0xF5, 0xA0, 0x5A)
DIM = (0x9F, 0xB0, 0xB9)


def make_icon(size: int, fit: float) -> bytes:
    buf = [[BG for _ in range(size)] for _ in range(size)]
    cx = cy = size / 2.0
    s = (size / 120.0) * fit  # Skala vom 120er-Raster auf Zielgröße

    r_out, t_out = 54 * s, 3.5 * s  # Außenring (Mittenradius / Halbdicke)
    r_in, t_in = 44 * s, 1.0 * s  # feiner Innenring
    r_clip = 42 * s  # Wasser-Begrenzung
    r_riv, rr = 50 * s, 2.4 * s  # Nieten-Bahn / Nieten-Radius
    amp, lam = 6 * s, 56 * s  # Wellen-Amplitude / -Länge

    def blend(x: int, y: int, color, a: float) -> None:
        if a <= 0:
            return
        a = min(1.0, a)
        d = buf[y][x]
        buf[y][x] = tuple(round(dc + (sc - dc) * a) for dc, sc in zip(d, color))

    def wave_y(x: float, y0_120: float) -> float:
        return y0_120 * s + math.sin((x - cx) / lam * 2 * math.pi) * amp

    # Flächen: Wasserfüllung + Ringe in einem Durchlauf.
    for y in range(size):
        for x in range(size):
            dist = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if dist < r_clip + 1:
                if (y + 0.5) > wave_y(x + 0.5, 66):
                    cov = min(1.0, r_clip - dist + 0.5)
                    blend(x, y, TEAL, 0.16 * cov)
            dro = abs(dist - r_out)
            if dro < t_out + 0.7:
                blend(x, y, TEAL, min(1.0, t_out + 0.5 - dro))
            dri = abs(dist - r_in)
            if dri < t_in + 0.7:
                blend(x, y, DIM, 0.5 * min(1.0, t_in + 0.5 - dri))

    # Nieten.
    for k in range(12):
        a = k * math.pi / 6
        rx, ry = cx + r_riv * math.cos(a), cy + r_riv * math.sin(a)
        for y in range(max(0, int(ry - rr - 1)), min(size, int(ry + rr + 2))):
            for x in range(max(0, int(rx - rr - 1)), min(size, int(rx + rr + 2))):
                d = math.hypot(x + 0.5 - rx, y + 0.5 - ry)
                blend(x, y, TEAL, min(1.0, rr + 0.5 - d))

    # Wellenlinien (im Bullauge), teal über bernstein.
    def draw_wave(y0_120: float, color, half: float) -> None:
        for x in range(size):
            wy = wave_y(x + 0.5, y0_120)
            for y in range(max(0, int(wy - half - 1)), min(size, int(wy + half + 2))):
                if math.hypot(x + 0.5 - cx, y + 0.5 - cy) > r_clip:
                    continue
                blend(x, y, color, min(1.0, half + 0.5 - abs(y + 0.5 - wy)))

    draw_wave(66, TEAL, 2.5 * s)
    draw_wave(52, WARM, 1.75 * s)

    raw = bytearray()
    for row in buf:
        raw.append(0)
        for r, g, b in row:
            raw += bytes((r, g, b))
    return _png(size, size, bytes(raw))


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
    (OUT / "icon-192.png").write_bytes(make_icon(192, 0.96))
    (OUT / "icon-512.png").write_bytes(make_icon(512, 0.96))
    # Maskable: kleinerer fit → mehr Rand für die Safe-Zone.
    (OUT / "icon-maskable-512.png").write_bytes(make_icon(512, 0.74))
    print("Icons geschrieben nach", OUT)


if __name__ == "__main__":
    main()
