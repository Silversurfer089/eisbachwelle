import { describe, it, expect, vi, afterEach } from "vitest";
import { loadCurrent, loadHistory } from "../../src/data/source";

const validCurrent = {
  fetchedAt: "2026-06-03T13:00:00Z",
  sources: { water: "GKD Bayern" },
  measurements: {
    flow: { value: 22.3, unit: "m³/s", t: "2026-06-03T13:00:00Z" },
  },
};

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("source", () => {
  it("loadCurrent liefert validierte Daten bei HTTP 200", async () => {
    mockFetch(200, validCurrent);
    const c = await loadCurrent();
    expect(c.measurements.flow?.value).toBe(22.3);
  });

  it("loadCurrent wirft bei HTTP-Fehler", async () => {
    mockFetch(503, "");
    await expect(loadCurrent()).rejects.toThrow(/HTTP 503/);
  });

  it("loadCurrent wirft bei kaputtem Format", async () => {
    mockFetch(200, { nonsense: true });
    await expect(loadCurrent()).rejects.toThrow();
  });

  it("loadHistory liefert validierte Historie", async () => {
    mockFetch(200, {
      generatedAt: "2026-06-03T13:00:00Z",
      series: { flow: [{ t: "2026-06-03T12:00:00Z", v: 22.3 }] },
    });
    const h = await loadHistory();
    expect(h.series.flow).toHaveLength(1);
  });
});
