import { de } from "../i18n/de";
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
    return el("p", { class: "context__trend" }, [de.context.trendUnknown]);
  }
  return el("p", { class: "context__trend" }, [
    `${de.context.trendLead} `,
    el("strong", { class: `trend--${vm.flowTrend}` }, [de.trend[vm.flowTrend]]),
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
    el("h2", { class: "context__title" }, [de.context.title]),
    trendSentence(vm),
  ];

  const ctx = vm.flowContext;
  if (ctx) {
    const p = Math.round(ctx.percentile);
    const days = Math.round(ctx.spanDays);
    children.push(
      el("p", { class: "context__percentile" }, [
        de.context.percentile(p, de.context.daysAgo(days)),
      ]),
      gauge(ctx.percentile),
      el("p", { class: "context__range" }, [
        de.context.rangeLabel(flowAmount(ctx.min), flowAmount(ctx.max)),
      ]),
    );
    if (ctx.spanDays < BUILDING_THRESHOLD_DAYS) {
      children.push(
        el("p", { class: "context__building" }, [de.context.building]),
      );
    }
  } else {
    children.push(
      el("p", { class: "context__insufficient" }, [de.context.insufficient]),
    );
  }

  children.push(el("p", { class: "context__note" }, [de.context.note]));

  return el(
    "section",
    { class: "context", "aria-label": de.context.title },
    children,
  );
}
