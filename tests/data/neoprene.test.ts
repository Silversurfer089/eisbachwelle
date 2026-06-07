import { describe, it, expect } from "vitest";
import { wetsuitClass } from "../../src/data/domain/neoprene";

describe("wetsuitClass", () => {
  it("ordnet typische Temperaturen korrekt zu", () => {
    expect(wetsuitClass(22)).toBe("boardshorts");
    expect(wetsuitClass(20)).toBe("boardshorts");
    expect(wetsuitClass(17)).toBe("w32");
    expect(wetsuitClass(16)).toBe("w32");
    expect(wetsuitClass(14)).toBe("w43");
    expect(wetsuitClass(12)).toBe("w43");
    expect(wetsuitClass(9)).toBe("w54");
    expect(wetsuitClass(8)).toBe("w54");
    expect(wetsuitClass(5)).toBe("winter");
  });

  it("liefert null bei nicht-endlichen Werten", () => {
    expect(wetsuitClass(NaN)).toBeNull();
    expect(wetsuitClass(Infinity)).toBeNull();
  });
});
