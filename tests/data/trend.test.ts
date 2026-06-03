import { describe, it, expect } from "vitest";
import { computeTrend } from "../../src/data/domain/trend";
import type { SeriesPoint } from "../../src/data/model";

// Hilfsfunktion: erzeugt Punkte mit Minuten-Abstand, aufsteigend.
function points(values: number[], stepMin = 60): SeriesPoint[] {
  const base = Date.parse("2026-06-03T00:00:00Z");
  return values.map((v, i) => ({
    t: new Date(base + i * stepMin * 60_000).toISOString(),
    v,
  }));
}

describe("computeTrend", () => {
  it("liefert 'unknown' bei zu wenigen Punkten", () => {
    expect(computeTrend([])).toBe("unknown");
    expect(computeTrend(points([5]))).toBe("unknown");
  });

  it("erkennt steigenden Verlauf", () => {
    expect(computeTrend(points([10, 11, 12, 14]))).toBe("rising");
  });

  it("erkennt fallenden Verlauf", () => {
    expect(computeTrend(points([14, 13, 12, 10]))).toBe("falling");
  });

  it("erkennt stabilen Verlauf (kleine Schwankung unter Schwelle)", () => {
    // 22,3 -> 22,4: ~0,4 % Änderung, unter 5 % Schwelle
    expect(computeTrend(points([22.3, 22.4, 22.3, 22.4]))).toBe("stable");
  });

  it("ist robust gegen unsortierte Eingaben (sortiert intern)", () => {
    const p = points([10, 11, 12, 14]);
    const shuffled = [p[2]!, p[0]!, p[3]!, p[1]!];
    expect(computeTrend(shuffled)).toBe("rising");
  });

  it("respektiert das Lookback-Fenster (ältere Punkte außerhalb zählen nicht)", () => {
    // Werte stündlich; mit 90-Min-Lookback zählen nur die letzten ~2 Punkte.
    const p = points([1, 2, 100, 101]); // letzte beiden fast gleich
    expect(computeTrend(p, { lookbackMs: 90 * 60_000 })).toBe("stable");
  });

  it("behandelt Referenzwert 0 ohne Division durch null", () => {
    expect(computeTrend(points([0, 0, 0, 1]))).toBe("rising");
    expect(computeTrend(points([0, 0, 0, 0]))).toBe("stable");
  });
});
