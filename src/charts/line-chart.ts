import {
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";
import { dtf, nfmt } from "../ui/format";

// Nur die wirklich genutzten Chart.js-Bausteine registrieren → kleineres Bundle.
// Bewusst KEIN Datums-Adapter: Die X-Achse ist linear (ms-Zeitstempel), Tick- und
// Tooltip-Beschriftung formatieren wir selbst via Intl. Spart die date-fns-Dependency.
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Filler,
  Tooltip,
);

export interface ChartPoint {
  x: number; // Zeit in ms seit Epoch
  y: number;
}

export type RangeMode = "24h" | "7d" | "30d";

function tickLabel(ms: number, mode: RangeMode): string {
  return mode === "24h"
    ? dtf({
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
      }).format(ms)
    : dtf({
        day: "2-digit",
        month: "2-digit",
        timeZone: "Europe/Berlin",
      }).format(ms);
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export interface LineChart {
  update(
    points: ChartPoint[],
    color: string,
    mode: RangeMode,
    unit: string,
  ): void;
  destroy(): void;
}

export function createLineChart(canvas: HTMLCanvasElement): LineChart {
  let mode: RangeMode = "24h";
  let unit = "";

  const config: ChartConfiguration<"line"> = {
    type: "line",
    data: {
      datasets: [
        {
          data: [],
          borderColor: cssVar("--water") || "#2dd4bf",
          borderWidth: 2,
          fill: true,
          pointRadius: 0,
          pointHitRadius: 12,
          tension: 0.45,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          type: "linear",
          grid: { display: false },
          ticks: {
            color: cssVar("--text-faint") || "#6f818b",
            maxRotation: 0,
            autoSkipPadding: 24,
            callback: (value) => tickLabel(Number(value), mode),
          },
        },
        y: {
          grid: { color: "rgba(127,145,155,0.16)" },
          ticks: { color: cssVar("--text-faint") || "#6f818b" },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) =>
              dtf({
                dateStyle: "short",
                timeStyle: "short",
                timeZone: "Europe/Berlin",
              }).format(Number(items[0]?.parsed.x)),
            label: (item) =>
              `${nfmt({ maximumFractionDigits: 2 }).format(Number(item.parsed.y))} ${unit}`,
          },
        },
      },
    },
  };

  const chart = new Chart(canvas, config);

  return {
    update(points, color, nextMode, nextUnit) {
      mode = nextMode;
      unit = nextUnit;
      const ds = chart.data.datasets[0]!;
      ds.data = points;
      ds.borderColor = color;
      ds.backgroundColor = hexToFill(color);
      chart.update();
    },
    destroy() {
      chart.destroy();
    },
  };
}

/** Erzeugt eine sehr leichte Flächenfüllung aus der Linienfarbe. */
function hexToFill(color: string): string {
  // Funktioniert für #rrggbb; bei anderen Formaten ohne Füllung.
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return "rgba(45,212,191,0.12)";
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},0.12)`;
}
