import { describe, it, expect } from "vitest";
import { percentileRank } from "../../src/data/domain/percentile";

describe("percentileRank", () => {
  it("liefert null bei leerer Verteilung", () => {
    expect(percentileRank([], 5)).toBeNull();
  });

  it("Median einer symmetrischen Verteilung liegt bei ~50 %", () => {
    const vals = [1, 2, 3, 4, 5];
    expect(percentileRank(vals, 3)).toBeCloseTo(50, 5);
  });

  it("Minimum/Maximum liegen an den Rändern", () => {
    const vals = [10, 20, 30, 40];
    expect(percentileRank(vals, 5)).toBe(0);
    expect(percentileRank(vals, 50)).toBe(100);
  });

  it("zählt gleiche Werte zur Hälfte (Standard-Perzentilrang)", () => {
    const vals = [10, 10, 10, 10];
    expect(percentileRank(vals, 10)).toBeCloseTo(50, 5);
  });

  it("ordnet einen hohen Wert korrekt ein", () => {
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // 8 liegt über 7 von 10 Werten, einer ist gleich -> (7 + 0.5)/10 = 75 %
    expect(percentileRank(vals, 8)).toBeCloseTo(75, 5);
  });

  it("ignoriert NaN/Infinity in der Verteilung", () => {
    const vals = [1, 2, NaN, Infinity, 3];
    expect(percentileRank(vals, 2)).toBeCloseTo(50, 5);
  });
});
