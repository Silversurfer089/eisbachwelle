import { describe, it, expect } from "vitest";
import { validateCurrent, validateHistory } from "../../src/data/loader";
import { present } from "../../src/ui/present";
import { renderDashboard } from "../../src/ui/dashboard";

// Smoke-Test: Mock-Daten -> Presenter -> DOM. Prüft, dass das Dashboard die
// wichtigsten Werte sichtbar rendert und mit fehlenden Messgrößen umgeht.

const now = new Date("2026-06-03T13:20:00Z");

const current = validateCurrent({
  fetchedAt: "2026-06-03T13:15:00Z",
  sources: { water: "GKD Bayern", air: "Open-Meteo" },
  measurements: {
    flow: { value: 22.3, unit: "m³/s", t: "2026-06-03T13:15:00Z" },
    level: { value: 144, unit: "cm", t: "2026-06-03T13:15:00Z" },
    waterTemp: { value: 16.3, unit: "°C", t: "2026-06-03T13:15:00Z" },
    airTemp: null,
  },
});

const history = validateHistory({
  generatedAt: "2026-06-03T13:15:00Z",
  series: {
    flow: [
      { t: "2026-06-03T11:00:00Z", v: 20.0 },
      { t: "2026-06-03T12:15:00Z", v: 21.2 },
      { t: "2026-06-03T13:15:00Z", v: 22.3 },
    ],
  },
});

describe("Dashboard-Smoke-Test", () => {
  it("rendert die Hauptkennzahl Abfluss mit deutscher Formatierung", () => {
    const root = renderDashboard(present(current, history, now), now);
    const primary = root.querySelector('[data-metric="flow"]');
    expect(primary).not.toBeNull();
    expect(primary!.textContent).toContain("22,3");
    expect(primary!.textContent).toContain("m³/s");
  });

  it("zeigt einen steigenden Trend als Text (nicht nur Farbe)", () => {
    const root = renderDashboard(present(current, history, now), now);
    const trend = root.querySelector('[data-metric="flow"] .card__trend');
    expect(trend?.textContent).toContain("steigend");
    expect(trend?.classList.contains("trend--rising")).toBe(true);
  });

  it("rendert alle vier Messgrößen-Karten", () => {
    const root = renderDashboard(present(current, history, now), now);
    expect(root.querySelectorAll(".card")).toHaveLength(4);
  });

  it("zeigt für fehlende Messgröße einen Platzhalter statt einer Zahl", () => {
    const root = renderDashboard(present(current, history, now), now);
    const air = root.querySelector('[data-metric="airTemp"]');
    expect(air!.textContent).toContain("—");
  });

  it("zeigt kein Stale-Badge bei frischen Daten", () => {
    const root = renderDashboard(present(current, history, now), now);
    expect(root.querySelector(".badge--stale")).toBeNull();
  });

  it("zeigt ein Stale-Badge bei veralteten Daten", () => {
    const late = new Date("2026-06-03T16:30:00Z");
    const root = renderDashboard(present(current, history, late), late);
    expect(root.querySelector(".badge--stale")).not.toBeNull();
  });
});
