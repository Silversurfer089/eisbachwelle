import { describe, it, expect } from "vitest";
import { deltaToYesterday } from "../../src/data/domain/compare";
import type { SeriesPoint } from "../../src/data/model";

const DAY = 24 * 60 * 60 * 1000;
const nowMs = Date.parse("2026-06-07T15:00:00Z");

function p(offsetH: number, v: number): SeriesPoint {
  return { t: new Date(nowMs - offsetH * 3_600_000).toISOString(), v };
}

describe("deltaToYesterday", () => {
  it("findet den Wert von gestern (gleiche Uhrzeit) und rechnet die Differenz", () => {
    const series = [p(48, 20), p(24, 22), p(2, 23)];
    const res = deltaToYesterday(series, 24, nowMs);
    expect(res).not.toBeNull();
    expect(res!.yesterday).toBe(22);
    expect(res!.delta).toBe(2);
  });

  it("nimmt den nächstgelegenen Punkt im Toleranzfenster", () => {
    const series = [p(25, 21.5), p(23, 22.5)]; // beide ~24h, 23h näher
    const res = deltaToYesterday(series, 24, nowMs);
    expect(res!.yesterday).toBe(22.5);
  });

  it("liefert null, wenn kein Punkt nahe ~24 h liegt", () => {
    const series = [p(2, 23), p(5, 22)]; // alles zu jung
    expect(deltaToYesterday(series, 24, nowMs)).toBeNull();
  });

  it("liefert null bei nicht-endlichem Eingang", () => {
    expect(deltaToYesterday([p(24, 22)], NaN, nowMs)).toBeNull();
    expect(deltaToYesterday([p(24, 22)], 24, NaN)).toBeNull();
  });

  it("respektiert die Toleranz (knapp außerhalb -> null)", () => {
    const series = [
      { t: new Date(nowMs - DAY - 3 * 3_600_000).toISOString(), v: 20 },
    ];
    expect(deltaToYesterday(series, 24, nowMs, 2 * 3_600_000)).toBeNull();
  });
});
