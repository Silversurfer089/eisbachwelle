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
// Warum Ecken entstehen und wie wir sie beseitigen:
//   GKD liefert 15-Min-Werte. Bei 96 Punkten in 24h und ~500px Chartbreite
//   liegen Punkte nur 5px auseinander – kubische Interpolation hat keinen
//   visuellen Raum, weiche Kurven zu zeichnen; das Auge sieht Ecken.
//   Lösung: Downsampling auf deutlich weniger Punkte (Stundenbuckets),
//   dann kubische Monoton-Interpolation (Chart.js) für eckenfreie Kurven.
//   Anschließend glättet ein schmales Moving-Average noch Restoszillationen.
//
//   24h → 1h-Buckets → ~24 Punkte  + w=1 (3-Pkt-MA)
//   7d  → 4h-Buckets → ~42 Punkte  + w=2 (5-Pkt-MA)

const BUCKET_MS: Record<RangeMode, number> = {
  "24h": 60 * 60_000, // 1h-Buckets  (~24 Punkte statt 96)
  "7d": 4 * 60 * 60_000, // 4h-Buckets  (~42 Punkte statt 672)
  "30d": 4 * 60 * 60_000, // 4h-Buckets  (Fallback, Tab nicht mehr angezeigt)
};
const SMOOTH_W: Record<RangeMode, number> = { "24h": 1, "7d": 2, "30d": 2 };

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

// Berechnet alle Mitternachts-Zeitstempel (Europe/Berlin, DST-sicher) im Bereich.
// Gleicher Intl-Rundreise-Ansatz wie toIsoUtc() im Cloudflare-Worker.
function midnightsBerlin(from: number, to: number): number[] {
  const fmt = new Intl.DateTimeFormat("en-u-hc-h23", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const result: number[] = [];
  const seen = new Set<number>();
  let cursor = from + 60_000; // 1 Min nach Start, um `from` selbst zu überspringen
  while (cursor < to) {
    const p = Object.fromEntries(
      fmt.formatToParts(new Date(cursor)).map((x) => [x.type, x.value]),
    );
    const [y, mo, d] = [
      Number(p["year"]),
      Number(p["month"]) - 1,
      Number(p["day"]),
    ];
    // Fallback: 24h weiter falls kein Midnight-Kandidat gefunden wird
    let nextCursor = cursor + 24 * 60 * 60_000;
    for (const off of [2, 1]) {
      const candidate = new Date(Date.UTC(y, mo, d, -off, 0));
      const cp = Object.fromEntries(
        fmt.formatToParts(candidate).map((x) => [x.type, x.value]),
      );
      if (
        Number(cp["hour"]) === 0 &&
        Number(cp["minute"]) === 0 &&
        Number(cp["year"]) === y &&
        Number(cp["month"]) === mo + 1 &&
        Number(cp["day"]) === d
      ) {
        const ms = candidate.getTime();
        // Nächsten Cursor von dieser Mitternacht aus setzen, nicht von cursor.
        // Ohne das würde ein Nachmittags-Cursor (+24h) die NÄCHSTE Mitternacht
        // überspringen, weil er bereits hinter `to` landet.
        nextCursor = ms + 24 * 60 * 60_000;
        if (ms > from && ms < to && !seen.has(ms)) {
          seen.add(ms);
          result.push(ms);
        }
        break;
      }
    }
    cursor = nextCursor;
  }
  return result.sort((a, b) => a - b);
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
    const chartPts = smooth(downsample(points, BUCKET_MS[selRange]), selRange);
    const mids = midnightsBerlin(cutoff, Date.now());
    void withChart((c) =>
      c.update(chartPts, color, selRange, METRIC_UNIT[selMetric], mids),
    );
  }

  async function withChart(fn: (c: LineChart) => void): Promise<void> {
    if (!chart) {
      if (!chartLoading) {
        chartLoading = import("../charts/line-chart").then((m) =>
          m.createLineChart(canvas, t.forecast.now),
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
