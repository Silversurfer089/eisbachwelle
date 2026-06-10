import { describe, it, expect } from "vitest";
import { withCurrentReadings } from "../../src/data/domain/series";
import type { CurrentData, HistoryData } from "../../src/data/model";

function history(lastT = "2026-06-10T11:45:00Z"): HistoryData {
  return {
    generatedAt: "2026-06-10T11:50:00Z",
    series: {
      flow: [
        { t: "2026-06-10T11:30:00Z", v: 24.0 },
        { t: lastT, v: 24.4 },
      ],
      level: [{ t: lastT, v: 144 }],
      waterTemp: [],
      airTemp: [{ t: lastT, v: 21.2 }],
    },
  };
}

function current(flowT: string, flowV = 24.6): CurrentData {
  return {
    fetchedAt: "2026-06-10T12:00:00Z",
    sources: {},
    measurements: {
      flow: { value: flowV, unit: "m³/s", t: flowT },
      level: null,
      waterTemp: { value: 16.5, unit: "°C", t: flowT },
      airTemp: { value: 21.4, unit: "°C", t: "kein-datum" },
    },
    forecast: [],
    forecastHourly: [],
  };
}

describe("withCurrentReadings", () => {
  it("hängt neuere aktuelle Messwerte ans Serienende an", () => {
    const out = withCurrentReadings(history(), current("2026-06-10T12:00:00Z"));
    const flow = out.series.flow;
    expect(flow).toHaveLength(3);
    expect(flow[flow.length - 1]).toEqual({
      t: "2026-06-10T12:00:00Z",
      v: 24.6,
    });
  });

  it("startet eine leere Serie mit dem aktuellen Messwert", () => {
    const out = withCurrentReadings(history(), current("2026-06-10T12:00:00Z"));
    expect(out.series.waterTemp).toEqual([
      { t: "2026-06-10T12:00:00Z", v: 16.5 },
    ]);
  });

  it("hängt nichts an, wenn der aktuelle Wert nicht neuer ist", () => {
    const h = history("2026-06-10T12:00:00Z");
    const out = withCurrentReadings(h, current("2026-06-10T12:00:00Z"));
    expect(out.series.flow).toHaveLength(2);
  });

  it("überspringt fehlende Messwerte und kaputte Zeitstempel", () => {
    const out = withCurrentReadings(history(), current("2026-06-10T12:00:00Z"));
    expect(out.series.level).toHaveLength(1); // null-Reading
    expect(out.series.airTemp).toHaveLength(1); // ungültiges t
  });

  it("gibt bei current=null die Historie unverändert zurück", () => {
    const h = history();
    expect(withCurrentReadings(h, null)).toBe(h);
  });

  it("mutiert die Eingabe-Historie nicht", () => {
    const h = history();
    withCurrentReadings(h, current("2026-06-10T12:00:00Z"));
    expect(h.series.flow).toHaveLength(2);
    expect(h.series.waterTemp).toHaveLength(0);
  });
});
