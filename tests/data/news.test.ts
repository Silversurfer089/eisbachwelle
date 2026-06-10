import { describe, it, expect } from "vitest";
import { freshNews } from "../../src/data/domain/news";
import type { NewsItem } from "../../src/data/model";

const NOW = new Date("2026-06-10T12:00:00Z");

function item(daysAgo: number, title = "Eisbach-Meldung"): NewsItem {
  return {
    t: new Date(NOW.getTime() - daysAgo * 86_400_000)
      .toISOString()
      .replace(".000Z", "Z"),
    title,
    source: "IGSM",
    url: `https://www.igsm.info/${title}-${daysAgo}/`,
  };
}

describe("freshNews", () => {
  it("leere Liste bleibt leer", () => {
    expect(freshNews([], NOW)).toEqual([]);
  });

  it("filtert Einträge älter als 30 Tage", () => {
    const out = freshNews([item(10), item(29), item(31), item(400)], NOW);
    expect(out).toHaveLength(2);
  });

  it("sortiert neueste zuerst", () => {
    const out = freshNews([item(20), item(5), item(28)], NOW);
    expect(out.map((i) => i.t)).toEqual(
      [item(5).t, item(20).t, item(28).t].map(String),
    );
  });

  it("begrenzt auf maximal 6 Einträge", () => {
    const out = freshNews(
      [1, 2, 3, 4, 5, 6, 7, 8].map((d) => item(d)),
      NOW,
    );
    expect(out).toHaveLength(6);
  });

  it("verwirft Einträge mit nicht-https-URL oder kaputtem Datum", () => {
    const bad1 = { ...item(2), url: "http://unsicher.example/" };
    const bad2 = { ...item(3), t: "kein-datum" };
    const bad3 = { ...item(4), url: "javascript:alert(1)" };
    expect(freshNews([bad1, bad2, bad3, item(1)], NOW)).toHaveLength(1);
  });

  it("verwirft Einträge aus der Zukunft (kaputte Feed-Daten)", () => {
    expect(freshNews([item(-3)], NOW)).toHaveLength(0);
  });
});
