#!/usr/bin/env python3
"""Erzeugt die PWA-Icons (PNG) aus reiner Standardbibliothek – kein Browser, keine
externen Abhängigkeiten. Motiv: dunkler Hintergrund + zwei Wellen (Teal + Bernstein),
passend zum App-Design.

Aufruf:  python3 scripts/make_icons.py
Ausgabe: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png

Reproduzierbar im Repo gehalten, damit die Icons jederzeit neu erzeugbar sind.
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


def blend(dst: tuple[int, int, int], src: tuple[int, int, int], a: float):
    return tuple(round(d + (s - d) * a) for d, s in zip(dst, src))


def make_icon(size: int, pad_frac: float) -> bytes:
    # Pixelpuffer mit Hintergrund füllen.
    px = [[BG for _ in range(size)] for _ in range(size)]

    m = size * pad_frac
    w = size - 2 * m
    base_y = size * 0.6
    amp = w * 0.11
    lam = w / 1.5

    def draw_wave(y_off: float, color, half_w: float):
        # Für jede Spalte die Wellen-Y bestimmen und eine weiche vertikale Linie zeichnen.
        for ix in range(size):
            x = ix + 0.5
            if x < m or x > size - m:
                continue
            y = base_y + y_off + math.sin((x - m) / lam * 2 * math.pi) * amp
            lo = int(math.floor(y - half_w - 1))
            hi = int(math.ceil(y + half_w + 1))
            for iy in range(max(0, lo), min(size, hi)):
                d = abs((iy + 0.5) - y)
                # weicher Rand (1 px Antialiasing)
                a = max(0.0, min(1.0, (half_w + 0.5 - d)))
                if a > 0:
                    px[iy][ix] = blend(px[iy][ix], color, a)

    draw_wave(amp * 1.05, TEAL, size * 0.038)
    draw_wave(-amp * 0.95, WARM, size * 0.028)

    # PNG (RGB, 8-bit) kodieren.
    raw = bytearray()
    for row in px:
        raw.append(0)  # Filtertyp 0
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
    (OUT / "icon-192.png").write_bytes(make_icon(192, 0.16))
    (OUT / "icon-512.png").write_bytes(make_icon(512, 0.16))
    # Maskable: mehr Rand, damit das Motiv in der Sicherheitszone bleibt.
    (OUT / "icon-maskable-512.png").write_bytes(make_icon(512, 0.26))
    print("Icons geschrieben nach", OUT)


if __name__ == "__main__":
    main()
