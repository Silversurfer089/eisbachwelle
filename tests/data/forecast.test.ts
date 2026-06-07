import { describe, it, expect } from "vitest";
import { validateCurrent } from "../../src/data/loader";

const base = {
  fetchedAt: "2026-06-07T12:00:00Z",
  sources: {},
  measurements: {},
};

describe("validateCurrent – Vorhersage", () => {
  it("liefert leere Vorhersage, wenn keine vorhanden", () => {
    expect(validateCurrent(base).forecast).toEqual([]);
  });

  it("parst gültige Vorhersagetage", () => {
    const c = validateCurrent({
      ...base,
      forecast: [
        {
          date: "2026-06-08",
          tMax: 27.4,
          tMin: 13.8,
          precip: 0.1,
          precipProb: 40,
          code: 61,
        },
      ],
    });
    expect(c.forecast).toHaveLength(1);
    expect(c.forecast[0]!.tMax).toBe(27.4);
    expect(c.forecast[0]!.code).toBe(61);
  });

  it("setzt fehlende/ungültige Felder auf null, ohne zu werfen", () => {
    const c = validateCurrent({
      ...base,
      forecast: [{ date: "2026-06-08", tMax: "warm", precip: null }],
    });
    expect(c.forecast[0]).toEqual({
      date: "2026-06-08",
      tMax: null,
      tMin: null,
      precip: null,
      precipProb: null,
      code: null,
    });
  });

  it("verwirft Einträge ohne gültiges Datum", () => {
    const c = validateCurrent({
      ...base,
      forecast: [{ tMax: 20 }, "kaputt", { date: "2026-06-09", tMax: 21 }],
    });
    expect(c.forecast).toHaveLength(1);
    expect(c.forecast[0]!.date).toBe("2026-06-09");
  });
});
