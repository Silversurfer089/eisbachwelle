import { de } from "../i18n/de";
import { wetsuitClass } from "../data/domain/neoprene";
import { weatherKey } from "../data/domain/weather";
import type { ForecastDay } from "../data/model";
import { formatAbsolute, formatRelative, formatValue } from "./format";
import { el, svgIcon } from "./dom";
import { trendIcon, weatherIcon } from "./icons";
import type { DashboardVM, MetricVM } from "./present";

const tempFmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const mmFmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const weekdayFmt = new Intl.DateTimeFormat("de-DE", { weekday: "short" });

// Reine Render-Schicht: baut aus dem View-Model DOM-Knoten. Keine Datenbeschaffung,
// keine Trend-/Stale-Berechnung (passiert im Presenter / in der Domäne).

const SHARE_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v13"/><path d="m7 8 5-5 5 5"/></svg>`;

function neopreneHint(m: MetricVM): HTMLElement | null {
  if (m.key !== "waterTemp" || !m.reading) return null;
  const cls = wetsuitClass(m.reading.value);
  if (!cls) return null;
  return el("p", { class: "card__hint card__hint--neo" }, [
    `${de.neoprene.prefix}: ${de.neoprene[cls]}`,
  ]);
}

function buildShareText(vm: DashboardVM): string {
  const r = (key: MetricVM["key"]) =>
    vm.metrics.find((m) => m.key === key)?.reading ?? null;
  const fmt = (key: MetricVM["key"]) => {
    const reading = r(key);
    return reading
      ? `${formatValue(reading.value, key)} ${reading.unit}`
      : de.status.noValue;
  };
  return de.share.line(fmt("flow"), fmt("level"), fmt("waterTemp"));
}

function shareButton(vm: DashboardVM): HTMLElement {
  const btn = el(
    "button",
    { class: "share", type: "button", "aria-label": de.share.action },
    [
      svgIcon(SHARE_ICON),
      el("span", { class: "share__label" }, [de.share.action]),
    ],
  );
  btn.addEventListener("click", () => {
    const text = buildShareText(vm);
    const url = location.href;
    const nav = navigator as Navigator & {
      share?: (d: {
        title: string;
        text: string;
        url: string;
      }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      void nav.share({ title: de.share.title, text, url }).catch(() => {});
    } else if (navigator.clipboard) {
      void navigator.clipboard.writeText(`${text} ${url}`).then(() => {
        const label = btn.querySelector(".share__label");
        if (label) {
          const prev = label.textContent;
          label.textContent = de.share.copied;
          window.setTimeout(() => (label.textContent = prev), 1600);
        }
      });
    }
  });
  return btn;
}

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

  const neo = neopreneHint(m);
  if (neo) children.push(neo);

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

function dayLabel(dateStr: string, now: Date): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return de.forecast.today;
  if (diff === 1) return de.forecast.tomorrow;
  return weekdayFmt.format(d);
}

function forecastDay(d: ForecastDay, now: Date): HTMLElement {
  const key = weatherKey(d.code);
  const temp =
    d.tMax !== null && d.tMin !== null
      ? de.forecast.tempRange(tempFmt.format(d.tMax), tempFmt.format(d.tMin))
      : de.status.noValue;
  const children: HTMLElement[] = [
    el("p", { class: "fc-day__name" }, [dayLabel(d.date, now)]),
    svgIcon(weatherIcon(key), de.forecast.weather[key]),
    el("p", { class: "fc-day__temp" }, [temp]),
  ];
  if (d.precip !== null && d.precipProb !== null) {
    children.push(
      el("p", { class: "fc-day__precip" }, [
        de.forecast.precip(
          mmFmt.format(d.precip),
          tempFmt.format(d.precipProb),
        ),
      ]),
    );
  }
  return el(
    "article",
    {
      class: "fc-day",
      "aria-label": `${dayLabel(d.date, now)}: ${de.forecast.weather[key]}, ${temp}`,
    },
    children,
  );
}

/** Vorhersage (Luft + Niederschlag). Null, wenn keine Vorhersage vorliegt. */
export function renderForecast(
  vm: DashboardVM,
  now: Date = new Date(),
): HTMLElement | null {
  if (vm.forecast.length === 0) return null;
  return el("section", { class: "forecast", "aria-label": de.forecast.title }, [
    el("h2", { class: "forecast__title" }, [de.forecast.title]),
    el(
      "div",
      { class: "forecast__grid" },
      vm.forecast.map((d) => forecastDay(d, now)),
    ),
    el("p", { class: "forecast__source" }, [de.forecast.sourceNote]),
    el("p", { class: "forecast__waternote" }, [de.forecast.waterNote]),
  ]);
}

/** Live-Teil (Kopf + Karten). Wird bei jeder Aktualisierung neu gerendert. */
export function renderDashboard(
  vm: DashboardVM,
  now: Date = new Date(),
): HTMLElement {
  const logo = document.createElement("img");
  logo.src = `${import.meta.env.BASE_URL}favicon.svg`;
  logo.alt = "";
  logo.className = "app-logo";
  logo.width = 44;
  logo.height = 44;

  const header = el("header", { class: "app-header" }, [
    el("div", { class: "app-brand" }, [
      logo,
      el("div", { class: "app-brand__text" }, [
        el("h1", { class: "app-title" }, [de.appName]),
        el("p", { class: "app-location" }, [de.location]),
      ]),
      shareButton(vm),
    ]),
    statusLine(vm, now),
  ]);

  const grid = el(
    "section",
    { class: "grid", "aria-label": de.appName },
    vm.metrics.map((m) => metricCard(m, now)),
  );

  const children: HTMLElement[] = [header, grid];
  const forecast = renderForecast(vm, now);
  if (forecast) children.push(forecast);

  return el("div", { class: "dashboard" }, children);
}

function extLink(href: string, text: string): HTMLElement {
  return el("a", { href, target: "_blank", rel: "noopener noreferrer" }, [
    text,
  ]);
}

/** Aufklappbarer Über-/Quellen-Bereich inkl. Andrang-Link (Google Maps). */
export function renderAbout(): HTMLElement {
  const a = de.about;
  return el("details", { class: "about" }, [
    el("summary", { class: "about__summary" }, [a.summary]),
    el("div", { class: "about__body" }, [
      el("p", {}, [a.what]),

      el("h3", { class: "about__h" }, [a.crowdTitle]),
      el("p", {}, [a.crowdText]),
      el("p", {}, [extLink(a.crowdUrl, `${a.crowdLink} ↗`)]),

      el("h3", { class: "about__h" }, [a.sourcesTitle]),
      el("ul", { class: "about__list" }, [
        el("li", {}, [
          extLink(
            "https://www.hnd.bayern.de/pegel/isar/muenchen-himmelreichbruecke-16515005",
            a.sourceHnd,
          ),
        ]),
        el("li", {}, [extLink("https://www.gkd.bayern.de", a.sourceGkd)]),
        el("li", {}, [extLink("https://open-meteo.com", a.sourceMeteo)]),
      ]),

      el("h3", { class: "about__h" }, [a.methodTitle]),
      el("p", {}, [a.method]),

      el("p", {}, [extLink(a.repoUrl, `${a.sourceCode} ↗`)]),
    ]),
  ]);
}

/** Statischer Fuß mit Quellen-Attribution und Disclaimer. */
export function renderFooter(): HTMLElement {
  return el("footer", { class: "app-footer" }, [
    el("p", { class: "attribution" }, [de.attribution]),
    el("p", { class: "disclaimer" }, [de.disclaimer]),
  ]);
}
