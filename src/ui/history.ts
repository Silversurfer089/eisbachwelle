import type { LineChart, RangeMode } from "../charts/line-chart";
import { METRIC_KEYS, METRIC_UNIT } from "../data/model";
import type { HistoryData, MetricKey } from "../data/model";
import { t } from "../i18n";
import { formatValue } from "./format";
import { el } from "./dom";

// Stateful, persistente Verlaufs-Komponente: wird einmal erzeugt und über update()
// mit neuen Daten versorgt, ohne den Chart neu aufzubauen (erhält die Tab-Auswahl).

const RANGE_MS: Record<RangeMode, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};
const RANGE_ORDER: RangeMode[] = ["24h", "7d"];

const METRIC_COLOR_VAR: Record<MetricKey, string> = {
  flow: "--water",
  level: "--cool",
  waterTemp: "--warm",
  airTemp: "--neutral",
};

// Kurvenaufbereitung NUR für die Chart-Linie.
// Ø/min/max werden aus den Rohwerten berechnet – keine Datenverfälschung.
//
// Strategie:
//   24h → Glättung (w=2, 5 Punkte à 15 Min = 75 Min Fenster)
//   7d  → Downsampling auf 2h-Durchschnitte, dann w=4 (9 × 2h = 18h-Fenster)
//
// Downsampling fasst je N Messpunkte zu einem Durchschnitt zusammen; das
// entfernt physikalisches Rauschen der 15-Min-GKD-Daten ohne den Trend zu
// verfälschen und reduziert die Punktzahl von ~672 auf ~84 (7 d).

const BUCKET_MS: Record<RangeMode, number> = {
  "24h": 0,                    // kein Downsampling
  "7d": 2 * 60 * 60_000,       // 2h-Buckets (~84 Punkte statt 672)
  "30d": 2 * 60 * 60_000,      // 2h-Buckets (Fallback, Tab nicht mehr angezeigt)
};
const SMOOTH_W: Record<RangeMode, number> = { "24h": 2, "7d": 4, "30d": 4 };

function downsample(
  pts: { x: number; y: number }[],
  bucketMs: number,
): { x: number; y: number }[] {
  if (bucketMs === 0 || pts.length === 0) return pts;
  const buckets = new Map<number, number[]>();
  for (const p of pts) {
    const key = Math.floor(p.x / bucketMs) * bucketMs;
    const arr = buckets.get(key) ?? [];
    arr.push(p.y);
    buckets.set(key, arr);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([x, ys]) => ({
      x: x + bucketMs / 2,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
    }));
}

function smooth(
  pts: { x: number; y: number }[],
  mode: RangeMode,
): { x: number; y: number }[] {
  const w = SMOOTH_W[mode];
  if (pts.length < 2 * w + 1) return pts;
  return pts.map((p, i) => {
    let sum = 0;
    let n = 0;
    for (
      let k = Math.max(0, i - w);
      k <= Math.min(pts.length - 1, i + w);
      k++
    ) {
      sum += pts[k]!.y;
      n++;
    }
    return { x: p.x, y: sum / n };
  });
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

export interface HistorySection {
  element: HTMLElement;
  update(history: HistoryData): void;
}

export function createHistorySection(): HistorySection {
  let selMetric: MetricKey = "flow";
  let selRange: RangeMode = "24h";
  let data: HistoryData | null = null;
  let chart: LineChart | null = null;
  // Chart.js (~60 KB gzip) wird erst bei Bedarf nachgeladen → schneller Erststart.
  let chartLoading: Promise<LineChart> | null = null;

  const metricButtons = new Map<MetricKey, HTMLButtonElement>();
  const rangeButtons = new Map<RangeMode, HTMLButtonElement>();

  const metricTabs = el(
    "div",
    { class: "tabs", role: "group", "aria-label": t.history.metricGroupLabel },
    METRIC_KEYS.map((key) => {
      const btn = el(
        "button",
        {
          class: "tab",
          type: "button",
          "aria-pressed": String(key === selMetric),
        },
        [t.metric[key].label],
      );
      btn.addEventListener("click", () => {
        selMetric = key;
        syncPressed();
        redraw();
      });
      metricButtons.set(key, btn);
      return btn;
    }),
  );

  const rangeTabs = el(
    "div",
    { class: "tabs", role: "group", "aria-label": t.history.rangeGroupLabel },
    RANGE_ORDER.map((mode) => {
      const btn = el(
        "button",
        {
          class: "tab",
          type: "button",
          "aria-pressed": String(mode === selRange),
        },
        [t.history.ranges[mode]],
      );
      btn.addEventListener("click", () => {
        selRange = mode;
        syncPressed();
        redraw();
      });
      rangeButtons.set(mode, btn);
      return btn;
    }),
  );

  const canvas = el("canvas", { class: "chart" });
  const emptyMsg = el("p", { class: "chart-empty", hidden: "" }, [
    t.history.empty,
  ]);
  const chartWrap = el("div", { class: "chart-wrap" }, [canvas, emptyMsg]);
  const stats = el("p", { class: "chart-stats", hidden: "" });

  const element = el(
    "section",
    { class: "history", "aria-label": t.history.title },
    [
      el("h2", { class: "history__title" }, [t.history.title]),
      metricTabs,
      rangeTabs,
      chartWrap,
      stats,
    ],
  );

  function syncPressed(): void {
    for (const [key, btn] of metricButtons)
      btn.setAttribute("aria-pressed", String(key === selMetric));
    for (const [mode, btn] of rangeButtons)
      btn.setAttribute("aria-pressed", String(mode === selRange));
  }

  function redraw(): void {
    if (!data) return;

    const cutoff = Date.now() - RANGE_MS[selRange];
    const points = data.series[selMetric]
      .map((p) => ({ x: Date.parse(p.t), y: p.v }))
      .filter((p) => Number.isFinite(p.x) && p.x >= cutoff);

    const hasData = points.length >= 2;
    canvas.hidden = !hasData;
    emptyMsg.hidden = hasData;

    // Statistik-Zeile (Ø · min · max) für die aktuelle Auswahl.
    stats.hidden = !hasData;
    if (hasData) {
      const ys = points.map((p) => p.y);
      const unit = METRIC_UNIT[selMetric];
      const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
      const fmt = (v: number) => `${formatValue(v, selMetric)} ${unit}`;
      stats.textContent = t.history.stats(
        fmt(mean),
        fmt(Math.min(...ys)),
        fmt(Math.max(...ys)),
      );
    }

    canvas.setAttribute(
      "aria-label",
      hasData
        ? `${t.history.chartLabel(t.metric[selMetric].label, t.history.ranges[selRange])}, ${t.history.latest} ${formatValue(points[points.length - 1]!.y, selMetric)} ${METRIC_UNIT[selMetric]}`
        : t.history.empty,
    );

    if (!hasData) return;
    const color = cssVar(METRIC_COLOR_VAR[selMetric], "#2dd4bf");
    const chartPts = smooth(
      downsample(points, BUCKET_MS[selRange]),
      selRange,
    );
    void withChart((c) =>
      c.update(chartPts, color, selRange, METRIC_UNIT[selMetric]),
    );
  }

  async function withChart(fn: (c: LineChart) => void): Promise<void> {
    if (!chart) {
      if (!chartLoading) {
        chartLoading = import("../charts/line-chart").then((m) =>
          m.createLineChart(canvas),
        );
      }
      chart = await chartLoading;
    }
    fn(chart);
  }

  return {
    element,
    update(history: HistoryData): void {
      data = history;
      redraw();
    },
  };
}
