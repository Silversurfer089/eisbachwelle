import { describe, it, expect } from "vitest";
import { waterTendency } from "../../src/data/domain/watertrend";

describe("waterTendency", () => {
  it("steigt bei klar wärmerer Luft-Vorhersage", () => {
    expect(waterTendency(15, 19)).toBe("rising");
  });

  it("fällt bei klar kälterer Luft-Vorhersage", () => {
    expect(waterTendency(20, 16)).toBe("falling");
  });

  it("bleibt 'steady' bei kleiner Änderung (unter Schwelle)", () => {
    expect(waterTendency(17, 18)).toBe("steady");
    expect(waterTendency(18, 17)).toBe("steady");
  });

  it("liefert 'unknown' bei fehlenden/ungültigen Werten", () => {
    expect(waterTendency(null, 18)).toBe("unknown");
    expect(waterTendency(17, null)).toBe("unknown");
    expect(waterTendency(NaN, 18)).toBe("unknown");
  });

  it("respektiert eine eigene Schwelle", () => {
    expect(waterTendency(17, 18.2, 1)).toBe("rising");
  });
});
