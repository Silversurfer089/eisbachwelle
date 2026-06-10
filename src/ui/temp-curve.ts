import type { ForecastHour } from "../data/model";
import { t } from "../i18n";
import { dtf } from "./format";

// Glatte Temperatur-Kurve der Vorhersage als leichtes Inline-SVG (kein Chart.js).
// Catmull-Rom-Glättung; nur Zahlen ins Markup → kein XSS. Farben kommen via CSS-Klassen.

const W = 360;
const H = 132;
const PAD = { l: 8, r: 8, t: 26, b: 22 };

// Locale-unabhängige Stundenzahl (nur für die Mitternachts-Logik, nicht zur Anzeige).
const berlinHour = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  hour12: false,
  timeZone: "Europe/Berlin",
});

function smoothPath(pts: ReadonlyArray<[number, number]>): string {
  if (pts.length < 2) return "";
  let d = `M ${r(pts[0]![0])} ${r(pts[0]![1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(p2[0])} ${r(p2[1])}`;
  }
  return d;
}

function r(n: number): number {
  return Math.round(n * 10) / 10;
}

function xTickLabel(ms: number, isFirst: boolean): string {
  if (isFirst) return t.forecast.now;
  const hour = Number(berlinHour.format(ms));
  // Nahe Mitternacht: Wochentag statt Uhrzeit (Tageswechsel sichtbar machen).
  if (hour <= 1 || hour >= 23) {
    return dtf({ weekday: "short", timeZone: "Europe/Berlin" }).format(ms);
  }
  return dtf({ hour: "2-digit", timeZone: "Europe/Berlin" })
    .format(ms)
    .replace(/\s?Uhr/, "");
}

/** Glatte Temperatur-Kurve für die nächsten ~48 h. Null, wenn zu wenige Werte. */
export function renderTempCurve(
  hours: ForecastHour[],
  now: Date,
): HTMLElement | null {
  const nowMs = now.getTime();
  const data = hours
    .map((h) => ({ ms: Date.parse(h.t), v: h.temp }))
    .filter(
      (h): h is { ms: number; v: number } =>
        Number.isFinite(h.ms) && h.v !== null && h.ms >= nowMs - 3_600_000,
    );
  if (data.length < 3) return null;

  const temps = data.map((d) => d.v);
  let lo = Math.min(...temps);
  let hi = Math.max(...temps);
  if (hi - lo < 1) {
    hi += 0.5;
    lo -= 0.5;
  }

  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const xAt = (i: number) => PAD.l + (i / (data.length - 1)) * innerW;
  const yAt = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * innerH;

  const pts: [number, number][] = data.map((d, i) => [xAt(i), yAt(d.v)]);
  const line = smoothPath(pts);
  const area = `${line} L ${r(pts[pts.length - 1]![0])} ${H - PAD.b} L ${r(pts[0]![0])} ${H - PAD.b} Z`;

  // Min-/Max-Marker (Labels stets oberhalb des Punkts → keine Kollision mit X-Achse).
  const maxIdx = temps.indexOf(Math.max(...temps));
  const minIdx = temps.indexOf(Math.min(...temps));
  const marker = (idx: number) => {
    const [x, y] = pts[idx]!;
    const anchor =
      x < PAD.l + 22 ? "start" : x > W - PAD.r - 22 ? "end" : "middle";
    return (
      `<circle class="tc__dot" cx="${r(x)}" cy="${r(y)}" r="3"/>` +
      `<text class="tc__lbl" x="${r(x)}" y="${r(y - 9)}" text-anchor="${anchor}">${Math.round(data[idx]!.v)}°</text>`
    );
  };

  // X-Achsen-Labels an gleichmäßigen Positionen.
  const tickIdx = [0, 0.25, 0.5, 0.75, 1].map((f) =>
    Math.round(f * (data.length - 1)),
  );
  const xLabels = tickIdx
    .map((idx, k) => {
      const anchor =
        k === 0 ? "start" : k === tickIdx.length - 1 ? "end" : "middle";
      return `<text class="tc__x" x="${r(xAt(idx))}" y="${H - 6}" text-anchor="${anchor}">${xTickLabel(data[idx]!.ms, idx === 0)}</text>`;
    })
    .join("");

  const svg =
    `<svg class="tempcurve" viewBox="0 0 ${W} ${H}" role="img" ` +
    `aria-label="${t.forecast.curveLabel}, ${Math.round(data[0]!.v)}° – ${Math.round(hi)}°">` +
    `<path class="tc__area" d="${area}"/>` +
    `<path class="tc__line" d="${line}"/>` +
    marker(maxIdx) +
    marker(minIdx) +
    xLabels +
    `</svg>`;

  const fig = document.createElement("figure");
  fig.className = "tempcurve-wrap";
  fig.innerHTML = svg;

  // Hover-Tooltip: Crosshair + Wertanzeige (mousemove + touchmove)
  const crosshair = document.createElement("div");
  crosshair.className = "tc__crosshair";
  crosshair.hidden = true;
  const tooltip = document.createElement("div");
  tooltip.className = "tc__tooltip";
  tooltip.hidden = true;
  fig.appendChild(crosshair);
  fig.appendChild(tooltip);

  const svgEl = fig.querySelector("svg")!;

  function showAt(clientX: number): void {
    const rect = svgEl.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    const idx = Math.max(
      0,
      Math.min(
        data.length - 1,
        Math.round(((relX - PAD.l) / innerW) * (data.length - 1)),
      ),
    );
    const pct = (xAt(idx) / W) * 100;
    crosshair.style.left = `${pct}%`;
    crosshair.hidden = false;

    const d = data[idx]!;
    const timeStr =
      idx === 0
        ? t.forecast.now
        : dtf({ weekday: "short", hour: "2-digit", timeZone: "Europe/Berlin" })
            .format(d.ms)
            .replace(/\s?Uhr/, "");
    tooltip.textContent = `${Math.round(d.v)}° · ${timeStr}`;
    // Anker links/mitte/rechts je nach Position – verhindert Abschneiden am Rand
    tooltip.style.transform =
      idx < data.length * 0.15
        ? "translateX(4px)"
        : idx > data.length * 0.85
          ? "translateX(calc(-100% - 4px))"
          : "translateX(-50%)";
    tooltip.style.left = `${pct}%`;
    tooltip.hidden = false;
  }

  svgEl.addEventListener("mousemove", (e) => { showAt(e.clientX); });
  svgEl.addEventListener(
    "touchmove",
    (e) => { e.preventDefault(); showAt(e.touches[0]!.clientX); },
    { passive: false },
  );
  const hide = () => { crosshair.hidden = true; tooltip.hidden = true; };
  svgEl.addEventListener("mouseleave", hide);
  svgEl.addEventListener("touchend", hide);

  return fig;
}
