import { describe, it, expect } from "vitest";
import { validateCurrent, validateHistory } from "../../src/data/loader";
import { METRIC_KEYS } from "../../src/data/model";
import currentSample from "../fixtures/current.sample.json";
import historySample from "../fixtures/history.sample.json";

// Verträgt der TS-Loader exakt das, was der Cron (scripts/fetch_data.py) produziert?
// Die Fixtures wurden aus echtem Cron-Output abgeleitet. Bricht dieser Test, ist der
// Vertrag zwischen Datenbeschaffung und App verletzt.

describe("Cron→Loader-Vertrag", () => {
  it("validateCurrent akzeptiert echtes current.json-Format", () => {
    const c = validateCurrent(currentSample);
    expect(typeof c.fetchedAt).toBe("string");
    for (const key of METRIC_KEYS) {
      const r = c.measurements[key];
      if (r) {
        expect(Number.isFinite(r.value)).toBe(true);
        expect(r.unit.length).toBeGreaterThan(0);
        expect(Number.isNaN(Date.parse(r.t))).toBe(false);
      }
    }
  });

  it("validateHistory akzeptiert echtes history.json-Format", () => {
    const h = validateHistory(historySample);
    expect(typeof h.generatedAt).toBe("string");
    for (const key of METRIC_KEYS) {
      expect(Array.isArray(h.series[key])).toBe(true);
    }
  });
});
