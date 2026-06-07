import { describe, it, expect } from "vitest";
import { weatherKey } from "../../src/data/domain/weather";

describe("weatherKey", () => {
  it("ordnet WMO-Codes den Kategorien zu", () => {
    expect(weatherKey(0)).toBe("clear");
    expect(weatherKey(2)).toBe("cloudy");
    expect(weatherKey(3)).toBe("cloudy");
    expect(weatherKey(45)).toBe("fog");
    expect(weatherKey(61)).toBe("rain");
    expect(weatherKey(80)).toBe("rain");
    expect(weatherKey(71)).toBe("snow");
    expect(weatherKey(86)).toBe("snow");
    expect(weatherKey(95)).toBe("storm");
    expect(weatherKey(99)).toBe("storm");
  });

  it("liefert 'unknown' bei null/ungültig", () => {
    expect(weatherKey(null)).toBe("unknown");
    expect(weatherKey(NaN)).toBe("unknown");
  });
});
