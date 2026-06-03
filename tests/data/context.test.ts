import { describe, it, expect } from "vitest";
import { describeContext } from "../../src/data/domain/context";
import type { SeriesPoint } from "../../src/data/model";

function series(values: number[], stepMin = 60): SeriesPoint[] {
  const base = Date.parse("2026-05-01T00:00:00Z");
  return values.map((v, i) => ({
    t: new Date(base + i * stepMin * 60_000).toISOString(),
    v,
  }));
}

describe("describeContext", () => {
  it("liefert null bei zu kleiner Datenbasis", () => {
    expect(describeContext(series([1, 2, 3]), 2, 24)).toBeNull();
  });

  it("berechnet Perzentil, Min/Max und Zeitspanne", () => {
    const values = Array.from({ length: 48 }, (_, i) => i + 1); // 1..48, stündlich
    const ctx = describeContext(series(values), 36, 24);
    expect(ctx).not.toBeNull();
    expect(ctx!.count).toBe(48);
    expect(ctx!.min).toBe(1);
    expect(ctx!.max).toBe(48);
    expect(ctx!.spanDays).toBeCloseTo(47 / 24, 2); // 47 Stundenschritte
    // 36 liegt über 35 von 48 Werten, einer gleich -> (35 + 0.5)/48*100 ≈ 73,96 %
    expect(ctx!.percentile).toBeCloseTo(73.96, 1);
  });

  it("liefert null bei nicht-endlichem aktuellem Wert", () => {
    const values = Array.from({ length: 30 }, (_, i) => i);
    expect(describeContext(series(values), NaN)).toBeNull();
  });

  it("ignoriert nicht-endliche Werte in der Verteilung", () => {
    const values = [...Array.from({ length: 30 }, (_, i) => i + 1), Infinity];
    const ctx = describeContext(series(values), 15, 24);
    expect(ctx!.count).toBe(30); // Infinity ausgeschlossen
    expect(Number.isFinite(ctx!.max)).toBe(true);
  });
});
