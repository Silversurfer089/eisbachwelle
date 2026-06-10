import { t } from "../i18n";
import { el } from "./dom";

// Aufklappbare Sektion "Wie die Welle entsteht": schematischer Längsschnitt
// (statisches Inline-SVG, Farben via CSS-Klassen) + nummerierte Legende.
// Reine Darstellung aus recherchierten, verlinkten Quellen — kein Messwert,
// keine Geschäftslogik. Markup ist statisch + i18n-Strings → kein XSS-Risiko.

const SOURCES: ReadonlyArray<[string, string]> = [
  ["Wikipedia: Eisbach (Isar)", "https://de.wikipedia.org/wiki/Eisbach_(Isar)"],
  [
    "HSU Hamburg: Modellversuch zur Eisbachwelle",
    "https://www.hsu-hh.de/modellversuch-zur-beruehmten-muenchener-eisbachwelle",
  ],
  [
    "Landeshauptstadt München: Eisbachwelle",
    "https://stadt.muenchen.de/news/eisbachwelle-aktueller-stand.html",
  ],
  ["eisbachwelle.de", "https://www.eisbachwelle.de/"],
];

/** Nummerierter Kreis-Marker im SVG (Position = Bestandteil der Grafik). */
function marker(n: number, x: number, y: number): string {
  return (
    `<circle class="wv__marker" cx="${x}" cy="${y}" r="11"/>` +
    `<text class="wv__marker-num" x="${x}" y="${y + 4}" text-anchor="middle">${n}</text>`
  );
}

function diagramSvg(): string {
  // Geometrie (viewBox 720×330), Fließrichtung links → rechts:
  // Brücke/Auslass | Steinstufe (Schussstrecke) | Kiesbank + Welle | Störsteine | Unterwasser
  const bed =
    "M0,158 L170,158 L250,240 L310,240 " + // Tunnelsohle + Steinstufe
    "C330,236 358,228 375,206 C392,226 420,233 440,236 " + // Kiesbank
    "L720,234"; // Unterwasser-Sohle
  const surface =
    "M58,118 L170,121 L252,220 L322,219 " + // Schussstrecke (flach, schnell)
    "C338,217 352,212 362,200 C372,186 379,160 390,155 " + // Wellenfront
    "C397,153 402,164 408,172 C416,181 424,185 436,187 L478,188 L720,184"; // Unterwasser

  return (
    `<svg class="wv" viewBox="0 0 720 330" role="img" aria-label="${t.anatomy.diagramLabel}">` +
    `<defs>` +
    `<marker id="wvAh" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">` +
    `<path d="M0,0 L8,4 L0,8 Z"/>` +
    `</marker>` +
    `</defs>` +
    // Untergrund + Sohle
    `<path class="wv__ground" d="${bed} L720,318 L0,318 Z"/>` +
    // Wasserkörper (Oberfläche → Sohle)
    `<path class="wv__water" d="${surface} L720,234 L440,236 C420,233 392,226 375,206 C358,228 330,236 310,240 L250,240 L170,158 L58,158 Z"/>` +
    `<path class="wv__surface" d="${surface}"/>` +
    // Kiesbank (auf der Sohle, unter der Welle)
    `<path class="wv__gravel" d="M310,240 C330,236 358,228 375,206 C392,226 420,233 440,236 Z"/>` +
    `<circle class="wv__grit" cx="352" cy="230" r="2.5"/>` +
    `<circle class="wv__grit" cx="370" cy="220" r="3"/>` +
    `<circle class="wv__grit" cx="386" cy="228" r="2.5"/>` +
    `<circle class="wv__grit" cx="402" cy="232" r="2"/>` +
    // Brücke + Auslass (zwei Zuläufe münden hier)
    `<rect class="wv__bridge" x="0" y="24" width="152" height="44" rx="3"/>` +
    `<path class="wv__tunnel" d="M58,158 L58,98 Q58,70 88,70 L152,70 L152,158 Z"/>` +
    `<text class="wv__label" x="12" y="52">Prinzregentenstr.</text>` +
    // Deckwalze: Rückströmung an der Wellenkrone
    `<path class="wv__curl" d="M400,149 C392,135 374,137 369,151" marker-end="url(#wvAh)"/>` +
    `<circle class="wv__foam" cx="406" cy="166" r="4"/>` +
    `<circle class="wv__foam" cx="416" cy="174" r="3"/>` +
    `<circle class="wv__foam" cx="396" cy="172" r="2.5"/>` +
    // Strömungspfeile: schnell (lang) → langsam (kurz)
    `<line class="wv__arrow" x1="74" y1="138" x2="138" y2="138" marker-end="url(#wvAh)"/>` +
    `<line class="wv__arrow" x1="262" y1="230" x2="306" y2="230" marker-end="url(#wvAh)"/>` +
    `<line class="wv__arrow" x1="560" y1="210" x2="596" y2="210" marker-end="url(#wvAh)"/>` +
    // Störsteine (Betonblöcke, 1970er)
    `<rect class="wv__block" x="492" y="206" width="32" height="28" rx="4"/>` +
    `<rect class="wv__block" x="560" y="212" width="26" height="22" rx="4"/>` +
    // Fließrichtung (oben rechts)
    `<line class="wv__arrow" x1="540" y1="42" x2="622" y2="42" marker-end="url(#wvAh)"/>` +
    `<text class="wv__label" x="540" y="28">${t.anatomy.flowDirection}</text>` +
    // Nummerierte Marker (Legende darunter)
    marker(1, 104, 92) +
    marker(2, 222, 252) +
    marker(3, 377, 230) +
    marker(4, 424, 140) +
    marker(5, 508, 192) +
    marker(6, 650, 164) +
    `</svg>`
  );
}

/** Aufklappbare "Wie die Welle entsteht"-Sektion (statisch, i18n-abhängig). */
export function renderWaveAnatomy(): HTMLElement {
  const a = t.anatomy;

  const figure = el("figure", { class: "wv-wrap" });
  figure.innerHTML = diagramSvg();

  const legend = el(
    "ol",
    { class: "wv-legend" },
    a.legend.map((item) => el("li", {}, [item])),
  );

  const sources = el(
    "ul",
    { class: "about__list" },
    SOURCES.map(([label, href]) =>
      el("li", {}, [
        el("a", { href, target: "_blank", rel: "noopener noreferrer" }, [
          label,
        ]),
      ]),
    ),
  );

  return el("details", { class: "about anatomy" }, [
    el("summary", { class: "about__summary" }, [a.summary]),
    el("div", { class: "about__body" }, [
      el("p", {}, [a.intro]),
      figure,
      legend,
      el("h3", { class: "about__h" }, [a.historyTitle]),
      el("p", {}, [a.history1]),
      el("p", {}, [a.history2]),
      el("p", { class: "wv-disclaimer" }, [a.disclaimer]),
      sources,
    ]),
  ]);
}
