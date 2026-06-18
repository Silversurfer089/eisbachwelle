# Vorhersage-Modelle – Stand & Erkenntnisse

Begleitnotiz zu [`forecast_prototype.py`](forecast_prototype.py). Reiner Analyse-Stand,
**nichts davon ist live**. Letzte Validierung: **2026-06-18** (17 Tage Wassertemp-Daten),
adversarisch geprüft (4 unabhängige Auditoren + Synthese, alle Zahlen reproduziert).

## Kurzfassung

| Ziel | Ergebnis | Konsequenz |
|---|---|---|
| **Wassertemperatur** | Modell `self + Luft heute` senkt MAE **0,61 → 0,36 °C**. Signifikanz bei n=16 **fragil** (Forward-CV n.s.; Holm-korrigiert adj-p ~0,13). | Richtige Spezifikation, aber **noch nicht produktiv** – bis ≥4 Wochen warten (~Anfang Juli). |
| **Pegel** | **Kein** Modell schlägt die Persistenz (robust, alle Specs/λ). | **Kein Vorhersagemodell.** „bleibt ~gleich" + Bereich. |
| **Abfluss** | **Kein** Modell schlägt die Persistenz (robust). | **Kein Vorhersagemodell.** dito. |

## Die Leakage-Falle (wichtig, nicht wiederholen)

Ein erster Befund „Upstream (Puppling/Tölz) hilft über die Luft hinaus" war ein
**Artefakt**: Er entstand nur, weil Baseline *und* Modell das optimistische Feature
`airNext = airTemp(D+1)` (perfekte, real nicht verfügbare Folgetag-Luft) enthielten.
Gegen die ehrliche `self+airToday`-Baseline bringt Upstream **dMAE ≈ −0,03 (n.s.)**.
Hohe Roh-Korrelation (Puppling r=0,89) ≠ inkrementeller Vorhersagewert. → **Upstream
gehört nicht ins Modell**, solange das nicht mit echter Luftprognose + Korrektur belegt ist.

## Empfohlene Wassertemp-Spezifikation

`self + airToday` · Ridge (λ=1, fold-weise z-standardisiert, Intercept unbestraft).
Produktiv muss `airToday` durch eine **echte** Open-Meteo-Tagesprognose ersetzt werden
(real fehlerbehaftet → Skill etwas niedriger). Tagesgang separat: wärmste Zeit ~19 Uhr,
kälteste ~10 Uhr, Amplitude ~1,8 °C (für „warme Zeit"-Hinweis).

## To-dos beim Juli-Lauf

1. **Forward-Chaining-CV** als Maßstab (nicht LODO – borgt bei Trend Zukunft).
2. Signifikanz via **Block-Permutation/Bootstrap + Holm**-Korrektur (nicht die 2·SE-Regel).
3. `airToday` → echte Luft-Tagesprognose, dann neu bewerten.
4. Upstream nur aufnehmen, wenn `self+airToday+pup+toe` gegen `self+airToday` **gepaart**
   einen mehrfachvergleichs-korrigierten positiven Gewinn zeigt.
5. Erst dann eine konkrete Grad-Zahl in der App zeigen (Honesty-Leitplanke).
