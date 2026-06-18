#!/usr/bin/env python3
"""
Eisbach – Vorhersage-Prototyp (Tag-voraus, Tagesmittel).  Stand: 2026-06-18.

Reiner Analyse-/Validierungs-Code. Geht NICHT live, wird vom App-Build nicht
importiert. Zweck: reproduzierbarer Re-Run, sobald mehr Daten da sind
(Ziel >= 4 Wochen Wassertemp, ~Anfang/Mitte Juli 2026), bevor irgendeine
Wassertemp-Vorhersage produktiv gezeigt wird.

Ausfuehren:  python3 scripts/forecast_prototype.py
Abhaengigkeiten: nur numpy (kein sklearn/pandas). Liest die LIVE-Daten vom
data-Branch (nicht die ggf. veraltete public/data-Kopie).

────────────────────────────────────────────────────────────────────────────
VERIFIZIERTE ERKENNTNISSE  (adversarisch geprueft am 2026-06-18, 4 unabhaengige
Auditoren + Synthese; alle Zahlen exakt reproduziert, Pipeline sauber):

  WASSERTEMPERATUR
    • Bestes EHRLICHES Modell = self + airToday  (genau 2 Features, Ridge).
      MAE 0.61 -> 0.36 degC  (Gewinn +0.25). Richtung robust, aber bei n=16
      statistisch noch fragil: unter ehrlicher Forward-Chaining-CV positiv,
      aber n.s.; nach Holm-Mehrfachvergleichskorrektur adj-p ~0.13.
    • Upstream (Puppling/Toelz) bringt NICHTS ueber die Luft hinaus. Der
      fruehere "Upstream hilft"-Befund war ein LEAKAGE-Artefakt des
      optimistischen Features airNext = airTemp(D+1) (perfekte Folgetag-Luft),
      das in Baseline UND Modell steckte. Gegen die ehrliche self+airToday-
      Baseline: dMAE ~ -0.03 (n.s.).  -> pup/toe NICHT verwenden.
    • airNext / airTomorrow ist NICHT produktiv (real nicht verfuegbar). Nur
      als optimistische Obergrenze. Produktiv: echte Open-Meteo-Tagesprognose
      fuer den Zieltag (real fehlerbehaftet -> Skill etwas niedriger).

  PEGEL & ABFLUSS
    • KEIN Modell schlaegt die Persistenz – robust ueber alle Feature-Sets und
      alle lambda. Bootstrap-CIs des Gewinns komplett im Negativen, Forward-CV
      noch schlechter.  -> KEIN Vorhersagemodell bauen. "bleibt ~gleich" + der
      juengste Bereich ist die ehrliche Aussage (regulierter Kanal).

  JULI-TODOs (wenn n waechst):
    1) Forward-Chaining/Expanding-Window-CV als primaeren Massstab (nicht LODO –
       borgt bei autokorrelierten Tagesreihen mit Trend Zukunft).
    2) Signifikanz via Block-Permutation/Bootstrap + Holm-Korrektur (nicht 2*SE).
    3) airToday durch ECHTE Luft-Tagesprognose ersetzen, dann neu evaluieren.
    4) Entscheidungstest fuer Upstream: self+airToday  vs  self+airToday+pup+toe,
       gepaart auf gleichen Tagen. Nur bei korrigiertem positivem Gewinn rein.
────────────────────────────────────────────────────────────────────────────
"""
import urllib.request, json, ssl, datetime as dt
from collections import defaultdict
import numpy as np

BASE = "https://raw.githubusercontent.com/Silversurfer089/eisbachwelle/data/"
# Hinweis: macOS-Framework-Python hat oft keine CA-Certs -> unverifizierter
# Kontext nur fuer diese READ-ONLY-Abfrage oeffentlicher Daten.
_CTX = ssl._create_unverified_context()

# airNext = airTemp(D+1) ist eine OPTIMISTISCHE, real nicht verfuegbare
# "perfekte" Luftvorhersage. Standardmaessig AUS (Leakage). Nur fuer die
# Obergrenzen-Analyse einschaltbar.
USE_OPTIMISTIC_AIRNEXT = False


def fetch(name):
    with urllib.request.urlopen(BASE + name, timeout=30, context=_CTX) as r:
        return json.load(r)


def daily(arch, key, field="mean"):
    return {d: v[field] for d, v in arch.get(key, {}).items()}


def pdate(s):
    return dt.date.fromisoformat(s)


def shift(s, n):
    return (pdate(s) + dt.timedelta(days=n)).isoformat()


def build(S, target_key, feat_specs):
    """Paare (Tag D -> D+1). Liefert (dayD, [feats], target@D+1, persistenz=target@D)."""
    rows = []
    for d in sorted(S[target_key]):
        dn = shift(d, 1)
        yt, y0 = S[target_key].get(dn), S[target_key].get(d)
        if yt is None or y0 is None:
            continue
        feats, ok = [], True
        for _, f in feat_specs:
            val = f(d)
            if val is None:
                ok = False
                break
            feats.append(val)
        if ok:
            rows.append((d, feats, yt, y0))
    return rows


def _ridge_predict(Xtr, ytr, xte, lam):
    """z-Standardisierung mit Trainings-Statistik, Intercept unbestraft."""
    mu, sd = Xtr.mean(0), Xtr.std(0)
    sd[sd == 0] = 1
    Xtr, xte = (Xtr - mu) / sd, (xte - mu) / sd
    Xtr1 = np.hstack([np.ones((len(Xtr), 1)), Xtr])
    xte1 = np.hstack([[1.0], xte[0]])
    k = Xtr1.shape[1]
    R = lam * np.eye(k)
    R[0, 0] = 0
    beta = np.linalg.solve(Xtr1.T @ Xtr1 + R, Xtr1.T @ ytr)
    return xte1 @ beta


def lodo(rows, lam=1.0):
    """Leave-one-day-out. Bequem, aber bei autokorrelierten Reihen optimistisch."""
    X = np.array([r[1] for r in rows], float)
    y = np.array([r[2] for r in rows], float)
    n = len(y)
    pred = np.array([_ridge_predict(X[np.arange(n) != i], y[np.arange(n) != i],
                                    X[i:i + 1].copy(), lam) for i in range(n)])
    return np.abs(pred - y)


def forward(rows, lam=1.0, min_train=8):
    """Ehrliche Forward-Chaining-CV (Expanding Window): nur Vergangenheit trainieren."""
    rows = sorted(rows, key=lambda r: r[0])
    X = np.array([r[1] for r in rows], float)
    y = np.array([r[2] for r in rows], float)
    err, perr = [], []
    for i in range(min_train, len(rows)):
        p = _ridge_predict(X[:i], y[:i], X[i:i + 1].copy(), lam)
        err.append(abs(p - y[i]))
        perr.append(abs(rows[i][3] - y[i]))
    return np.array(err), np.array(perr)


def persist_err(rows):
    return np.array([abs(r[2] - r[3]) for r in rows])


def paired(model_err, base_err):
    d = base_err - model_err          # >0 => Modell besser
    md = d.mean()
    se = d.std(ddof=1) / np.sqrt(len(d)) if len(d) > 1 else float("nan")
    sig = "SIG" if abs(md) > 2 * se else "n.s."
    return md, se, sig


def main():
    arch = fetch("archive.json").get("series", {})
    hist = fetch("history.json").get("series", {})
    S = {k: daily(arch, k) for k in
         ["waterTemp", "level", "flow", "airTemp", "upstreamPuppling", "upstreamToelz"]}

    print("=== Datenlage (archive.json, Tagesmittel) ===")
    for k, v in S.items():
        if v:
            ds = sorted(v)
            print(f"  {k:18s} {len(ds):3d} Tage  {ds[0]} .. {ds[-1]}")

    def f_self(key):
        return lambda d: S[key].get(d)

    def f_air_today(d):
        return S["airTemp"].get(d)

    def f_air_next(d):
        return S["airTemp"].get(shift(d, 1))

    def f_up(key):
        return lambda d: S[key].get(d)

    # ── Wassertemperatur: empfohlenes Modell + Entscheidungstest ──────────────
    print("\n=== WASSERTEMPERATUR (degC) ===")
    base = build(S, "waterTemp", [])
    pe = persist_err(base)
    print(f"  Persistenz-Baseline: MAE={pe.mean():.3f}  max={pe.max():.3f}  n={len(pe)}")

    spec_self_air = [("self", f_self("waterTemp")), ("airToday", f_air_today)]
    rows = build(S, "waterTemp", spec_self_air)
    e_lodo = lodo(rows)
    md, se, sig = paired(e_lodo, persist_err(rows))
    print(f"  [EMPFOHLEN self+airToday]  LODO-MAE={e_lodo.mean():.3f}  "
          f"Gewinn vs Persistenz {md:+.3f} +/-{se:.3f} ({sig}, n={len(rows)})")
    fe, fp = forward(rows)
    if len(fe):
        fmd, fse, fsig = paired(fe, fp)
        print(f"  [EMPFOHLEN, Forward-CV]    MAE={fe.mean():.3f} vs Persistenz {fp.mean():.3f}  "
              f"Gewinn {fmd:+.3f} +/-{fse:.3f} ({fsig}, n={len(fe)})  <- ehrlicher Massstab")

    # Entscheidungstest: bringt Upstream etwas UEBER die ehrliche Luft-Baseline?
    spec_up = spec_self_air + [("pup", f_up("upstreamPuppling")), ("toe", f_up("upstreamToelz"))]
    rA, rU = build(S, "waterTemp", spec_self_air), build(S, "waterTemp", spec_up)
    common = {r[0] for r in rA} & {r[0] for r in rU}
    rA = [r for r in rA if r[0] in common]
    rU = [r for r in rU if r[0] in common]
    if rA:
        d = lodo(rA) - lodo(rU)            # >0 => Upstream besser
        md, se = d.mean(), d.std(ddof=1) / np.sqrt(len(d))
        verdict = "Upstream HILFT" if (md > 0 and abs(md) > 2 * se) else "Upstream bringt nichts"
        print(f"  Entscheidungstest Upstream ueber Luft: dMAE {md:+.3f} +/-{se:.3f}  "
              f"-> {verdict} ({'SIG' if abs(md) > 2*se else 'n.s.'}, n={len(rA)})")

    if USE_OPTIMISTIC_AIRNEXT:
        rN = build(S, "waterTemp", [("self", f_self("waterTemp")), ("airNext", f_air_next)])
        en = lodo(rN)
        print(f"  [Obergrenze self+airNext*  (LEAKAGE, nicht produktiv)]  MAE={en.mean():.3f}")

    # ── Pegel & Abfluss: Persistenz schlaegt jedes Modell ─────────────────────
    for key, unit in [("level", "cm"), ("flow", "m3/s")]:
        print(f"\n=== {key.upper()} ({unit}) — Erwartung: Persistenz optimal ===")
        pe = persist_err(build(S, key, []))
        print(f"  Persistenz-Baseline: MAE={pe.mean():.3f}  n={len(pe)}")
        for name, specs in [
            ("self+trend", [("self", f_self(key)),
                            ("trend", lambda d, k=key: None if (S[k].get(d) is None or S[k].get(shift(d, -1)) is None)
                             else S[k][d] - S[k][shift(d, -1)])]),
            ("self+airNext*", [("self", f_self(key)), ("airNext", f_air_next)]),
            ("self+upstream", [("self", f_self(key)), ("pup", f_up("upstreamPuppling")), ("toe", f_up("upstreamToelz"))]),
        ]:
            r = build(S, key, specs)
            if len(r) < 6:
                continue
            md, se, sig = paired(lodo(r), persist_err(r))
            print(f"  [{name:14s}] Gewinn vs Persistenz {md:+.3f} +/-{se:.3f} ({sig}, n={len(r)})  "
                  f"{'-> SCHLECHTER' if md < 0 else ''}")

    # ── Tagesgang Wassertemp (fuer 'waermste Zeit') ───────────────────────────
    buck = defaultdict(list)
    for p in hist.get("waterTemp", []):
        try:
            t = dt.datetime.fromisoformat(p["t"].replace("Z", "+00:00")).astimezone(
                dt.timezone(dt.timedelta(hours=2)))
        except Exception:
            continue
        buck[t.hour].append(p["v"])
    if buck:
        vals = [v for vs in buck.values() for v in vs]
        gm = np.mean(vals)
        hm = {h: np.mean(vs) for h, vs in buck.items()}
        r2 = 1 - sum((v - hm[h]) ** 2 for h, vs in buck.items() for v in vs) / sum((v - gm) ** 2 for v in vals)
        print(f"\n=== TAGESGANG Wassertemp ===\n  R^2(Uhrzeit)={r2:.2f}  waermste ~{max(hm, key=hm.get)}h  "
              f"kaelteste ~{min(hm, key=hm.get)}h  Amplitude {max(hm.values()) - min(hm.values()):.2f} degC")

    print("\nFazit: Wassertemp -> self+airToday (noch nicht produktiv, n zu klein). "
          "Pegel/Abfluss -> kein Modell, Persistenz ist die ehrliche Vorhersage.")


if __name__ == "__main__":
    main()
