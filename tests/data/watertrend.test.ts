import { describe, it, expect } from "vitest";
import { waterTendency } from "../../src/data/domain/watertrend";

describe("waterTendency", () => {
  // --- Grundfälle ---
  it("rising bei klar wärmerer Luft-Vorhersage", () => {
    expect(waterTendency(15, 19)).toBe("rising");
  });

  it("falling bei klar kälterer Luft-Vorhersage", () => {
    expect(waterTendency(20, 16)).toBe("falling");
  });

  it("steady bei kleiner Änderung unter Schwelle", () => {
    expect(waterTendency(17, 18)).toBe("steady");
    expect(waterTendency(18, 17)).toBe("steady");
    expect(waterTendency(15, 15)).toBe("steady");
  });

  // --- Grenzwerte der Standardschwelle (2.5 °C) ---
  it("rising bei delta = genau +2.5 (inklusive Schwelle)", () => {
    expect(waterTendency(10, 12.5)).toBe("rising");
  });

  it("falling bei delta = genau -2.5 (inklusive Schwelle)", () => {
    expect(waterTendency(12.5, 10)).toBe("falling");
  });

  it("steady bei delta knapp unter +2.5", () => {
    expect(waterTendency(10, 12.4999)).toBe("steady");
  });

  it("steady bei delta knapp über -2.5", () => {
    expect(waterTendency(12.4999, 10)).toBe("steady");
  });

  // --- Ungültige Eingaben ---
  it("unknown bei null-Werten", () => {
    expect(waterTendency(null, 18)).toBe("unknown");
    expect(waterTendency(17, null)).toBe("unknown");
    expect(waterTendency(null, null)).toBe("unknown");
  });

  it("unknown bei NaN", () => {
    expect(waterTendency(NaN, 18)).toBe("unknown");
    expect(waterTendency(17, NaN)).toBe("unknown");
    expect(waterTendency(NaN, NaN)).toBe("unknown");
  });

  it("unknown bei Infinity", () => {
    expect(waterTendency(Infinity, 18)).toBe("unknown");
    expect(waterTendency(17, -Infinity)).toBe("unknown");
  });

  // --- Negative Temperaturen (Winterbetrieb) ---
  it("rising bei negativen Temperaturen mit klarer Luft-Erwärmung", () => {
    expect(waterTendency(-5, -1)).toBe("rising"); // delta +4
  });

  it("falling bei negativen Temperaturen mit klarer Luft-Abkühlung", () => {
    expect(waterTendency(-1, -5)).toBe("falling"); // delta -4
  });

  it("steady bei negativen Temperaturen unter Schwelle", () => {
    expect(waterTendency(-3, -2)).toBe("steady"); // delta +1
  });

  // --- Benutzerdefinierte Schwelle ---
  it("rising mit niedrigerer Schwelle (1 °C)", () => {
    expect(waterTendency(17, 18.2, 1)).toBe("rising");
  });

  it("steady mit höherer Schwelle (5 °C) bei sonst klarer Änderung", () => {
    expect(waterTendency(15, 18, 5)).toBe("steady"); // delta +3, unter 5
  });

  it("falling bei delta genau gleich negativer Schwelle", () => {
    expect(waterTendency(20, 17, 3)).toBe("falling"); // delta -3 = -threshold
  });

  it("rising bei delta genau gleich positiver Schwelle", () => {
    expect(waterTendency(17, 20, 3)).toBe("rising"); // delta +3 = threshold
  });
});
