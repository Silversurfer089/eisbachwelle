import { t, getLang, setLang } from "../i18n";
import { wetsuitClass } from "../data/domain/neoprene";
import { weatherKey } from "../data/domain/weather";
import type { ForecastDay, ForecastHour } from "../data/model";
import {
  dtf,
  formatAbsolute,
  formatRelative,
  formatValue,
  nfmt,
} from "./format";
import { el, svgIcon } from "./dom";
import { trendIcon, weatherIcon } from "./icons";
import { renderTempCurve } from "./temp-curve";
import type { DashboardVM, MetricVM } from "./present";

// Reine Render-Schicht: baut aus dem View-Model DOM-Knoten. Keine Datenbeschaffung,
// keine Trend-/Stale-Berechnung (passiert im Presenter / in der Domäne).

const SHARE_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v13"/><path d="m7 8 5-5 5 5"/></svg>`;

function neopreneHint(m: MetricVM): HTMLElement | null {
  if (m.key !== "waterTemp" || !m.reading) return null;
  const cls = wetsuitClass(m.reading.value);
  if (!cls) return null;
  return el("p", { class: "card__hint card__hint--neo" }, [
    `${t.neoprene.prefix}: ${t.neoprene[cls]}`,
  ]);
}

function yesterdayLine(m: MetricVM): HTMLElement | null {
  if (!m.reading || !m.yesterday) return null;
  const absFmt = formatValue(Math.abs(m.yesterday.delta), m.key);
  // Triviale Differenz (≈ gestern) ausblenden – reduziert Rauschen auf den Karten.
  if (absFmt === formatValue(0, m.key)) return null;
  return el("p", { class: "card__yday" }, [
    t.yesterday.delta(
      `${m.yesterday.delta > 0 ? "+" : "−"}${absFmt} ${m.reading.unit}`,
    ),
  ]);
}

function langButton(): HTMLElement {
  const other = getLang() === "de" ? "en" : "de";
  const btn = el(
    "button",
    {
      class: "lang",
      type: "button",
      "aria-label":
        other === "en" ? "Switch to English" : "Auf Deutsch umschalten",
    },
    [other.toUpperCase()],
  );
  btn.addEventListener("click", () => setLang(other));
  return btn;
}

function buildShareText(vm: DashboardVM): string {
  const r = (key: MetricVM["key"]) =>
    vm.metrics.find((m) => m.key === key)?.reading ?? null;
  const fmt = (key: MetricVM["key"]) => {
    const reading = r(key);
    return reading
      ? `${formatValue(reading.value, key)} ${reading.unit}`
      : t.status.noValue;
  };
  return t.share.line(fmt("flow"), fmt("level"), fmt("waterTemp"));
}

function shareButton(vm: DashboardVM): HTMLElement {
  const btn = el(
    "button",
    { class: "share", type: "button", "aria-label": t.share.action },
    [
      svgIcon(SHARE_ICON),
      el("span", { class: "share__label" }, [t.share.action]),
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
      void nav.share({ title: t.share.title, text, url }).catch(() => {});
    } else if (navigator.clipboard) {
      void navigator.clipboard.writeText(`${text} ${url}`).then(() => {
        const label = btn.querySelector(".share__label");
        if (label) {
          const prev = label.textContent;
          label.textContent = t.share.copied;
          window.setTimeout(() => (label.textContent = prev), 1600);
        }
      });
    }
  });
  return btn;
}

function metricCard(m: MetricVM, now: Date): HTMLElement {
  const meta = t.metric[m.key];
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

    const trendText = t.trend[m.trend];
    children.push(
      el("p", { class: `card__trend trend--${m.trend}` }, [
        svgIcon(trendIcon(m.trend)),
        el("span", {}, [trendText]),
        // Zeitfenster des Trends sichtbar machen ("stabil" allein sagt nichts).
        ...(m.trend !== "unknown"
          ? [
              el("span", { class: "card__trend-window" }, [
                `· ${t.trendWindow}`,
              ]),
            ]
          : []),
      ]),
    );

    children.push(
      el(
        "p",
        {
          class: "card__time",
          title: `${t.status.measuredAt} ${formatAbsolute(m.reading.t)}`,
        },
        [`${t.status.measuredAt} ${formatRelative(m.reading.t, now)}`],
      ),
    );
  } else {
    children.push(
      el("p", { class: "card__value card__value--empty" }, [
        el("span", { class: "card__number" }, [t.status.noValue]),
      ]),
      el("p", { class: "card__time" }, [t.status.noData]),
    );
  }

  if (meta.hint) {
    children.push(el("p", { class: "card__hint" }, [meta.hint]));
  }

  const yday = yesterdayLine(m);
  if (yday) children.push(yday);

  const neo = neopreneHint(m);
  if (neo) children.push(neo);

  const ariaLabel = m.reading
    ? `${meta.label}: ${formatValue(m.reading.value, m.key)} ${m.reading.unit}, ${t.trend[m.trend]}, ${t.status.measuredAt} ${formatRelative(m.reading.t, now)}`
    : `${meta.label}: ${t.status.noData}`;

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
        [`${t.status.updatedPrefix} ${formatRelative(vm.freshestAt, now)}`],
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
          title: t.status.staleHint,
        },
        [t.status.stale],
      ),
    );
  }

  return el("div", { class: "status" }, children);
}

// Heutiges Datum in Europe/Berlin als "YYYY-MM-DD" (en-CA liefert dieses Format).
const berlinDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dayLabel(dateStr: string, now: Date): string {
  // Vorhersage-Daten sind Berlin-Tage → auch "heute" in Berlin bestimmen,
  // nicht in der Gerätezeitzone (sonst kippt das Label z. B. abends in den USA).
  const target = Date.parse(dateStr);
  if (!Number.isFinite(target)) return dateStr;
  const today = Date.parse(berlinDate.format(now));
  const diff = Math.round((target - today) / 86_400_000);
  if (diff === 0) return t.forecast.today;
  if (diff === 1) return t.forecast.tomorrow;
  return dtf({ weekday: "short", timeZone: "Europe/Berlin" }).format(
    new Date(`${dateStr}T12:00:00Z`),
  );
}

function forecastDay(d: ForecastDay, now: Date): HTMLElement {
  const key = weatherKey(d.code);
  const temp =
    d.tMax !== null && d.tMin !== null
      ? t.forecast.tempRange(
          nfmt({ maximumFractionDigits: 0 }).format(d.tMax),
          nfmt({ maximumFractionDigits: 0 }).format(d.tMin),
        )
      : t.status.noValue;
  const children: HTMLElement[] = [
    el("p", { class: "fc-day__name" }, [dayLabel(d.date, now)]),
    svgIcon(weatherIcon(key), t.forecast.weather[key]),
    el("p", { class: "fc-day__temp" }, [temp]),
  ];
  if (d.precip !== null && d.precipProb !== null) {
    children.push(
      el("p", { class: "fc-day__precip" }, [
        t.forecast.precip(
          nfmt({ maximumFractionDigits: 1 }).format(d.precip),
          nfmt({ maximumFractionDigits: 0 }).format(d.precipProb),
        ),
      ]),
    );
  }
  return el(
    "article",
    {
      class: "fc-day",
      "aria-label": `${dayLabel(d.date, now)}: ${t.forecast.weather[key]}, ${temp}`,
    },
    children,
  );
}

function hourCell(h: ForecastHour, isFirst: boolean): HTMLElement {
  const key = weatherKey(h.code);
  const time = isFirst
    ? t.forecast.now
    : dtf({ hour: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(h.t));
  const children: HTMLElement[] = [
    el("p", { class: "fc-hour__time" }, [time]),
    svgIcon(weatherIcon(key), t.forecast.weather[key]),
    el("p", { class: "fc-hour__temp" }, [
      h.temp !== null
        ? `${nfmt({ maximumFractionDigits: 0 }).format(h.temp)}°`
        : t.status.noValue,
    ]),
  ];
  // Niederschlagsbalken: Höhe = Regenwahrscheinlichkeit.
  const prob = Math.max(0, Math.min(100, h.precipProb ?? 0));
  const bar = el("div", { class: "fc-hour__bar" });
  bar.style.height = `${prob}%`;
  children.push(el("div", { class: "fc-hour__barwrap" }, [bar]));
  children.push(
    el("p", { class: "fc-hour__precip" }, [
      prob > 0 ? `${nfmt({ maximumFractionDigits: 0 }).format(prob)} %` : " ",
    ]),
  );
  return el("div", { class: "fc-hour" }, children);
}

function renderHourly(vm: DashboardVM, now: Date): HTMLElement | null {
  const nowMs = now.getTime();
  const hours = vm.forecastHourly
    .filter((h) => {
      const t = Date.parse(h.t);
      return Number.isFinite(t) && t >= nowMs - 3_600_000;
    })
    .slice(0, 24);
  if (hours.length === 0) return null;
  return el(
    "div",
    {
      class: "fc-hourly",
      role: "group",
      "aria-label": t.forecast.hourlyLabel,
    },
    hours.map((h, i) => hourCell(h, i === 0)),
  );
}

/** Vorhersage (Luft + Niederschlag): Stundenverlauf + Tageskarten. */
export function renderForecast(
  vm: DashboardVM,
  now: Date = new Date(),
): HTMLElement | null {
  if (vm.forecast.length === 0 && vm.forecastHourly.length === 0) return null;

  const children: HTMLElement[] = [
    el("h2", { class: "forecast__title" }, [t.forecast.title]),
  ];

  const curve = renderTempCurve(vm.forecastHourly, now);
  if (curve) children.push(curve);

  const hourly = renderHourly(vm, now);
  if (hourly) children.push(hourly);

  if (vm.forecast.length > 0) {
    children.push(
      el(
        "div",
        { class: "forecast__grid" },
        vm.forecast.map((d) => forecastDay(d, now)),
      ),
    );
  }

  children.push(
    el("p", { class: "forecast__source" }, [t.forecast.sourceNote]),
    renderWaterOutlook(vm),
  );

  return el(
    "section",
    { class: "forecast", "aria-label": t.forecast.title },
    children,
  );
}

/**
 * Konsolidierte, ehrliche "Wasser-Ausblick"-Box: Wassertemperatur-Tendenz +
 * beobachtetes Tagesgang-Fenster + transparenter Hinweis, dass die konkrete
 * Grad-Vorhersage noch validiert wird. Bewusst KEINE °C-Zahl (Honesty-Leitplanke).
 */
function renderWaterOutlook(vm: DashboardVM): HTMLElement {
  const f = t.forecast;
  const children: HTMLElement[] = [
    el("h3", { class: "outlook__title" }, [f.outlookTitle]),
  ];

  if (vm.waterTendency !== "unknown") {
    children.push(
      el("p", { class: "outlook__line" }, [
        el("span", { class: "outlook__label" }, [
          `${t.waterEstimate.prefix}: `,
        ]),
        `${t.waterEstimate[vm.waterTendency]} (${t.waterEstimate.estimate})`,
      ]),
    );
  }

  if (vm.warmWindow) {
    children.push(
      el("p", { class: "outlook__line" }, [
        f.bestTime(vm.warmWindow.startHour, vm.warmWindow.endHour),
      ]),
    );
  }

  children.push(el("p", { class: "outlook__pending" }, [f.outlookPending]));
  children.push(el("p", { class: "outlook__note" }, [f.waterNote]));

  return el("div", { class: "outlook" }, children);
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
        el("h1", { class: "app-title" }, [t.appName]),
        el("p", { class: "app-location" }, [t.location]),
      ]),
      el("div", { class: "app-actions" }, [langButton(), shareButton(vm)]),
    ]),
    statusLine(vm, now),
  ]);

  const grid = el(
    "section",
    { class: "grid", "aria-label": t.appName },
    vm.metrics.map((m) => metricCard(m, now)),
  );

  return el("div", { class: "dashboard" }, [header, grid]);
}

function extLink(href: string, text: string): HTMLElement {
  return el("a", { href, target: "_blank", rel: "noopener noreferrer" }, [
    text,
  ]);
}

/** Aufklappbarer Über-/Quellen-Bereich inkl. Andrang-Link (Google Maps). */
export function renderAbout(): HTMLElement {
  const a = t.about;
  return el("details", { class: "about" }, [
    el("summary", { class: "about__summary" }, [a.summary]),
    el("div", { class: "about__body" }, [
      el("p", {}, [a.what]),

      el("h3", { class: "about__h" }, [a.sourcesTitle]),
      el("ul", { class: "about__list" }, [
        el("li", {}, [extLink("https://www.lfu.bayern.de", a.sourceLfu)]),
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

      el("p", {}, [
        extLink(
          import.meta.env.VITE_REPO_URL ?? a.repoUrl,
          `${a.sourceCode} ↗`,
        ),
      ]),
    ]),
  ]);
}

/** Statischer Fuß mit Quellen-Attribution und Disclaimer. */
export function renderFooter(): HTMLElement {
  return el("footer", { class: "app-footer" }, [
    el("p", { class: "attribution" }, [t.attribution]),
    el("p", { class: "disclaimer" }, [t.disclaimer]),
  ]);
}
