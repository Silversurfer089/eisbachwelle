import { describe, it, expect } from "vitest";
import {
  validateCurrent,
  validateHistory,
  isStale,
  freshestTimestamp,
} from "../../src/data/loader";

const validCurrent = {
  fetchedAt: "2026-06-03T13:00:00Z",
  sources: { water: "GKD Bayern", air: "Open-Meteo" },
  measurements: {
    flow: { value: 22.3, unit: "m³/s", t: "2026-06-03T13:00:00Z" },
    level: { value: 144, unit: "cm", t: "2026-06-03T13:00:00Z" },
    waterTemp: { value: 16.3, unit: "°C", t: "2026-06-03T13:00:00Z" },
    airTemp: { value: 15.6, unit: "°C", t: "2026-06-03T12:45:00Z" },
  },
};

describe("validateCurrent", () => {
  it("akzeptiert gültige Daten und liefert alle Messgrößen", () => {
    const c = validateCurrent(structuredClone(validCurrent));
    expect(c.fetchedAt).toBe("2026-06-03T13:00:00Z");
    expect(c.measurements.flow?.value).toBe(22.3);
    expect(c.sources.water).toBe("GKD Bayern");
  });

  it("ergänzt fehlende Messgrößen als null", () => {
    const raw = structuredClone(validCurrent) as Record<string, unknown>;
    raw.measurements = {
      flow: validCurrent.measurements.flow,
    };
    const c = validateCurrent(raw);
    expect(c.measurements.flow?.value).toBe(22.3);
    expect(c.measurements.waterTemp).toBeNull();
    expect(c.measurements.airTemp).toBeNull();
  });

  it("akzeptiert explizit null als ausgefallene Messgröße", () => {
    const raw = structuredClone(validCurrent);
    (raw.measurements as Record<string, unknown>).flow = null;
    const c = validateCurrent(raw);
    expect(c.measurements.flow).toBeNull();
  });

  it("wirft bei fehlendem fetchedAt", () => {
    const raw = structuredClone(validCurrent) as Record<string, unknown>;
    delete raw.fetchedAt;
    expect(() => validateCurrent(raw)).toThrow();
  });

  it("wirft bei nicht-numerischem Messwert", () => {
    const raw = structuredClone(validCurrent);
    (raw.measurements.flow as Record<string, unknown>).value = "viel";
    expect(() => validateCurrent(raw)).toThrow();
  });

  it("wirft bei null/primitiver Eingabe", () => {
    expect(() => validateCurrent(null)).toThrow();
    expect(() => validateCurrent(42)).toThrow();
  });
});

describe("freshestTimestamp", () => {
  it("liefert den jüngsten Messzeitstempel", () => {
    const c = validateCurrent(structuredClone(validCurrent));
    expect(freshestTimestamp(c)).toBe("2026-06-03T13:00:00Z");
  });

  it("liefert null, wenn alle Messgrößen fehlen", () => {
    const c = validateCurrent({
      fetchedAt: "2026-06-03T13:00:00Z",
      sources: {},
      measurements: {},
    });
    expect(freshestTimestamp(c)).toBeNull();
  });
});

describe("isStale", () => {
  const c = validateCurrent(structuredClone(validCurrent));

  it("ist frisch innerhalb der Toleranz", () => {
    const now = new Date("2026-06-03T13:20:00Z"); // 20 Min nach jüngstem Wert
    expect(isStale(c, now)).toBe(false);
  });

  it("ist veraltet jenseits der Toleranz", () => {
    const now = new Date("2026-06-03T15:00:00Z"); // 2 h nach jüngstem Wert
    expect(isStale(c, now)).toBe(true);
  });

  it("ist veraltet, wenn keine Messgrößen vorhanden sind", () => {
    const empty = validateCurrent({
      fetchedAt: "2026-06-03T13:00:00Z",
      sources: {},
      measurements: {},
    });
    expect(isStale(empty, new Date("2026-06-03T13:01:00Z"))).toBe(true);
  });
});

describe("validateHistory", () => {
  const validHistory = {
    generatedAt: "2026-06-03T13:00:00Z",
    series: {
      flow: [
        { t: "2026-06-03T11:00:00Z", v: 22.1 },
        { t: "2026-06-03T12:00:00Z", v: 22.3 },
      ],
    },
  };

  it("akzeptiert gültige Historie und sortiert aufsteigend", () => {
    const raw = structuredClone(validHistory);
    raw.series.flow = [
      { t: "2026-06-03T12:00:00Z", v: 22.3 },
      { t: "2026-06-03T11:00:00Z", v: 22.1 },
    ];
    const h = validateHistory(raw);
    expect(h.series.flow.map((p) => p.v)).toEqual([22.1, 22.3]);
    expect(h.series.waterTemp).toEqual([]);
  });

  it("filtert ungültige Punkte heraus statt zu werfen", () => {
    const raw = structuredClone(validHistory) as {
      generatedAt: string;
      series: Record<string, unknown>;
    };
    raw.series.flow = [
      { t: "2026-06-03T11:00:00Z", v: 22.1 },
      { t: "2026-06-03T12:00:00Z", v: "kaputt" },
      { t: "not-a-date", v: 5 },
    ];
    const h = validateHistory(raw);
    expect(h.series.flow).toHaveLength(1);
    expect(h.series.flow[0]!.v).toBe(22.1);
  });

  it("wirft bei fehlendem series-Objekt", () => {
    expect(() => validateHistory({ generatedAt: "x" })).toThrow();
  });
});
