import { describe, it, expect } from "vitest";
import { warmestWaterWindow } from "../../src/data/domain/diurnal";
import type { SeriesPoint } from "../../src/data/model";

// Fixe "Jetzt"-Zeit im Sommer (Berlin = UTC+2): 10.06.2026 12:00 Berlin.
const NOW = new Date("2026-06-10T10:00:00Z");

/** Erzeugt `days` Tage stündlicher Werte mit Tagesgang-Peak um `peakBerlin` Uhr. */
function diurnalSeries(days: number, peakBerlin: number): SeriesPoint[] {
  const pts: SeriesPoint[] = [];
  for (let d = 1; d <= days; d++) {
    for (let h = 0; h < 24; h++) {
      // Berlin-Stunde h liegt im Juni bei UTC h-2.
      const t = new Date(NOW.getTime() - d * 86_400_000);
      t.setUTCHours((h - 2 + 24) % 24, 0, 0, 0);
      // Cosinus-Tagesgang: Maximum bei peakBerlin, Amplitude 2 °C um 15 °C.
      const v = 15 + 2 * Math.cos(((h - peakBerlin) / 24) * 2 * Math.PI);
      pts.push({ t: t.toISOString().replace(".000Z", "Z"), v });
    }
  }
  return pts;
}

describe("warmestWaterWindow", () => {
  it("null bei leerer Reihe", () => {
    expect(warmestWaterWindow([], NOW)).toBeNull();
  });

  it("null bei zu wenigen Tagen", () => {
    // 1 UTC-Tag streut über 2 Berlin-Daten — unter der Mindestbasis von 3 Tagen.
    expect(warmestWaterWindow(diurnalSeries(1, 18), NOW)).toBeNull();
  });

  it("null bei zu geringer Stunden-Abdeckung (nur Vormittagswerte)", () => {
    const morningOnly = diurnalSeries(7, 18).filter((p) => {
      const h = new Date(Date.parse(p.t)).getUTCHours();
      return h >= 6 && h <= 10;
    });
    expect(warmestWaterWindow(morningOnly, NOW)).toBeNull();
  });

  it("findet das Abend-Maximum (Peak 18 Uhr Berlin)", () => {
    const w = warmestWaterWindow(diurnalSeries(7, 18), NOW);
    expect(w).not.toBeNull();
    // Peak-Stunde muss im Fenster [start, end) liegen.
    expect(w!.startHour).toBeLessThanOrEqual(18);
    expect(w!.endHour).toBeGreaterThan(18);
  });

  it("findet ein Nachmittags-Maximum (Peak 15 Uhr Berlin)", () => {
    const w = warmestWaterWindow(diurnalSeries(5, 15), NOW);
    expect(w).not.toBeNull();
    expect(w!.startHour).toBeLessThanOrEqual(15);
    expect(w!.endHour).toBeGreaterThan(15);
  });

  it("Fenster ist kompakt (höchstens 6 Stunden breit)", () => {
    const w = warmestWaterWindow(diurnalSeries(7, 18), NOW)!;
    expect(w.endHour - w.startHour).toBeGreaterThanOrEqual(1);
    expect(w.endHour - w.startHour).toBeLessThanOrEqual(6);
  });

  it("ignoriert Werte, die älter als 14 Tage sind", () => {
    // Nur alte Daten → keine Aussage.
    const old = diurnalSeries(7, 18).map((p) => ({
      t: new Date(Date.parse(p.t) - 20 * 86_400_000)
        .toISOString()
        .replace(".000Z", "Z"),
      v: p.v,
    }));
    expect(warmestWaterWindow(old, NOW)).toBeNull();
  });
});
