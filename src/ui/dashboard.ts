import { de } from "../i18n/de";
import { formatAbsolute, formatRelative, formatValue } from "./format";
import { el, svgIcon } from "./dom";
import { trendIcon } from "./icons";
import type { DashboardVM, MetricVM } from "./present";

// Reine Render-Schicht: baut aus dem View-Model DOM-Knoten. Keine Datenbeschaffung,
// keine Trend-/Stale-Berechnung (passiert im Presenter / in der Domäne).

function metricCard(m: MetricVM, now: Date): HTMLElement {
  const meta = de.metric[m.key];
  const isPrimary = m.key === "flow";
  const classes = ["card"];
  if (isPrimary) classes.push("card--primary");

  const children: HTMLElement[] = [
    el("h2", { class: "card__label" }, [meta.label]),
  ];

  if (m.reading) {
    children.push(
      el("p", { class: "card__value" }, [
        el("span", { class: "card__number" }, [
          formatValue(m.reading.value, m.key),
        ]),
        el("span", { class: "card__unit" }, [m.reading.unit]),
      ]),
    );

    const trendText = de.trend[m.trend];
    children.push(
      el("p", { class: `card__trend trend--${m.trend}` }, [
        svgIcon(trendIcon(m.trend)),
        el("span", {}, [trendText]),
      ]),
    );

    children.push(
      el(
        "p",
        {
          class: "card__time",
          title: `${de.status.measuredAt} ${formatAbsolute(m.reading.t)}`,
        },
        [`${de.status.measuredAt} ${formatRelative(m.reading.t, now)}`],
      ),
    );
  } else {
    children.push(
      el("p", { class: "card__value card__value--empty" }, [
        el("span", { class: "card__number" }, [de.status.noValue]),
      ]),
      el("p", { class: "card__time" }, [de.status.noData]),
    );
  }

  if (meta.hint) {
    children.push(el("p", { class: "card__hint" }, [meta.hint]));
  }

  const ariaLabel = m.reading
    ? `${meta.label}: ${formatValue(m.reading.value, m.key)} ${m.reading.unit}, ${de.trend[m.trend]}, ${de.status.measuredAt} ${formatRelative(m.reading.t, now)}`
    : `${meta.label}: ${de.status.noData}`;

  return el(
    "article",
    {
      class: classes.join(" "),
      "data-metric": m.key,
      role: "group",
      "aria-label": ariaLabel,
    },
    children,
  );
}

function statusLine(vm: DashboardVM, now: Date): HTMLElement {
  const children: HTMLElement[] = [];

  if (vm.freshestAt) {
    children.push(
      el(
        "span",
        {
          class: "status__stamp",
          title: formatAbsolute(vm.freshestAt),
        },
        [`${de.status.updatedPrefix} ${formatRelative(vm.freshestAt, now)}`],
      ),
    );
  }

  if (vm.stale) {
    children.push(
      el(
        "span",
        {
          class: "badge badge--stale",
          role: "status",
          title: de.status.staleHint,
        },
        [de.status.stale],
      ),
    );
  }

  return el("div", { class: "status" }, children);
}

export function renderDashboard(
  vm: DashboardVM,
  now: Date = new Date(),
): HTMLElement {
  const header = el("header", { class: "app-header" }, [
    el("h1", { class: "app-title" }, [de.appName]),
    el("p", { class: "app-location" }, [de.location]),
    statusLine(vm, now),
  ]);

  const grid = el(
    "section",
    { class: "grid", "aria-label": de.appName },
    vm.metrics.map((m) => metricCard(m, now)),
  );

  const footer = el("footer", { class: "app-footer" }, [
    el("p", { class: "attribution" }, [de.attribution]),
    el("p", { class: "disclaimer" }, [de.disclaimer]),
  ]);

  return el("div", { class: "app-shell" }, [header, grid, footer]);
}
