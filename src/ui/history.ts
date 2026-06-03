import type { LineChart, RangeMode } from "../charts/line-chart";
import { METRIC_KEYS, METRIC_UNIT } from "../data/model";
import type { HistoryData, MetricKey } from "../data/model";
import { de } from "../i18n/de";
import { formatValue } from "./format";
import { el } from "./dom";

// Stateful, persistente Verlaufs-Komponente: wird einmal erzeugt und über update()
// mit neuen Daten versorgt, ohne den Chart neu aufzubauen (erhält die Tab-Auswahl).

const RANGE_MS: Record<RangeMode, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};
const RANGE_ORDER: RangeMode[] = ["24h", "7d", "30d"];

const METRIC_COLOR_VAR: Record<MetricKey, string> = {
  flow: "--water",
  level: "--cool",
  waterTemp: "--warm",
  airTemp: "--neutral",
};

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
    { class: "tabs", role: "group", "aria-label": de.history.metricGroupLabel },
    METRIC_KEYS.map((key) => {
      const btn = el(
        "button",
        {
          class: "tab",
          type: "button",
          "aria-pressed": String(key === selMetric),
        },
        [de.metric[key].label],
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
    { class: "tabs", role: "group", "aria-label": de.history.rangeGroupLabel },
    RANGE_ORDER.map((mode) => {
      const btn = el(
        "button",
        {
          class: "tab",
          type: "button",
          "aria-pressed": String(mode === selRange),
        },
        [de.history.ranges[mode]],
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
    de.history.empty,
  ]);
  const chartWrap = el("div", { class: "chart-wrap" }, [canvas, emptyMsg]);

  const element = el(
    "section",
    { class: "history", "aria-label": de.history.title },
    [
      el("h2", { class: "history__title" }, [de.history.title]),
      metricTabs,
      rangeTabs,
      chartWrap,
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

    canvas.setAttribute(
      "aria-label",
      hasData
        ? `${de.history.chartLabel(de.metric[selMetric].label, de.history.ranges[selRange])}, zuletzt ${formatValue(points[points.length - 1]!.y, selMetric)} ${METRIC_UNIT[selMetric]}`
        : de.history.empty,
    );

    if (!hasData) return;
    const color = cssVar(METRIC_COLOR_VAR[selMetric], "#2dd4bf");
    void withChart((c) =>
      c.update(points, color, selRange, METRIC_UNIT[selMetric]),
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
