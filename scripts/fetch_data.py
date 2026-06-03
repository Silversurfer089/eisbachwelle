#!/usr/bin/env python3
"""Holt Eisbach-Quelldaten und schreibt normalisiertes JSON.

PLATZHALTER (M1): Die echte Implementierung (verifizierte Endpunkte für HND/GKD/
Open-Meteo, Parsing, Normalisierung, Historie-Fortschreibung) folgt in M3, nachdem
die Endpunkte in M2 verifiziert und in DECISIONS.md dokumentiert wurden.

Bis dahin tut dieses Skript bewusst nichts, außer den Aufruf zu protokollieren.
"""

from __future__ import annotations

import sys


def main() -> int:
    print(
        "fetch_data.py ist noch ein Platzhalter (M1). "
        "Echte Datenbeschaffung kommt in M3.",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
