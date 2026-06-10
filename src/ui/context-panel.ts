import { t } from "../i18n";
import { METRIC_UNIT } from "../data/model";
import { el } from "./dom";
import { formatValue } from "./format";
import type { DashboardVM } from "./present";

// Reine Render-Schicht für die "Einordnung": kurzer Trend-Satz + Perzentil-Gauge.
// Alle Aussagen sind als Orientierung gekennzeichnet (kein Qualitätsurteil).

const BUILDING_THRESHOLD_DAYS = 25; // unter ~25 Tagen: Hinweis "Datenbasis wächst"

function flowAmount(value: number): string {
  return `${formatValue(value, "flow")} ${METRIC_UNIT.flow}`;
}

function trendSentence(vm: DashboardVM): HTMLElement {
  if (vm.flowTrend === "unknown") {
    return el("p", { class: "context__trend" }, [t.context.trendUnknown]);
  }
  return el("p", { class: "context__trend" }, [
    `${t.context.trendLead} `,
    el("strong", { class: `trend--${vm.flowTrend}` }, [t.trend[vm.flowTrend]]),
    ".",
  ]);
}

function gauge(percentile: number): HTMLElement {
  const p = Math.max(0, Math.min(100, percentile));
  const fill = el("div", { class: "gauge__fill" });
  fill.style.width = `${p}%`;
  const marker = el("div", { class: "gauge__marker" });
  marker.style.left = `${p}%`;
  return el(
    "div",
    {
      class: "gauge",
      role: "img",
      "aria-label": `${Math.round(p)} Prozent im bisher erfassten Bereich`,
    },
    [el("div", { class: "gauge__track" }, [fill, marker])],
  );
}

export function renderContextPanel(vm: DashboardVM): HTMLElement {
  const children: HTMLElement[] = [
    el("h2", { class: "context__title" }, [t.context.title]),
  ];

  if (vm.flowContext) {
    const p = vm.flowContext.percentile;
    const band = p < 33 ? "low" : p < 67 ? "mid" : "high";
    children.push(
      el("p", { class: "context__amount" }, [t.context.amount[band]]),
    );
  }
  children.push(trendSentence(vm));

  const ctx = vm.flowContext;
  if (ctx) {
    const p = Math.round(ctx.percentile);
    const days = Math.round(ctx.spanDays);
    children.push(
      el("p", { class: "context__percentile" }, [
        t.context.percentile(p, t.context.daysAgo(days)),
      ]),
      gauge(ctx.percentile),
      el("p", { class: "context__range" }, [
        t.context.rangeLabel(flowAmount(ctx.min), flowAmount(ctx.max)),
      ]),
    );
    if (ctx.spanDays < BUILDING_THRESHOLD_DAYS) {
      children.push(
        el("p", { class: "context__building" }, [t.context.building]),
      );
    }
  } else {
    children.push(
      el("p", { class: "context__insufficient" }, [t.context.insufficient]),
    );
  }

  children.push(
    el("p", { class: "context__note" }, [t.context.waveNote]),
    el("p", { class: "context__note" }, [t.context.note]),
  );

  return el(
    "section",
    { class: "context", "aria-label": t.context.title },
    children,
  );
}
