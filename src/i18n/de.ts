import type { MetricKey, Trend } from "../data/model";

// Alle sichtbaren Zeichenketten zentral. Englisch lässt sich später als zweite
// Datei (en.ts) mit gleichem Schlüsselsatz ergänzen.

export const de = {
  appName: "Eisbachwelle",
  location: "Himmelreichbrücke · Englischer Garten, München",

  metric: {
    flow: { label: "Abfluss", hint: "Wichtigster Wert für die Welle" },
    level: { label: "Wasserstand", hint: "" },
    waterTemp: { label: "Wassertemperatur", hint: "" },
    airTemp: { label: "Lufttemperatur", hint: "" },
  } satisfies Record<MetricKey, { label: string; hint: string }>,

  trend: {
    rising: "steigend",
    falling: "fallend",
    stable: "stabil",
    unknown: "keine Trendangabe",
  } satisfies Record<Trend, string>,

  status: {
    updatedPrefix: "Stand:",
    stale: "Daten veraltet",
    staleHint:
      "Es konnten keine frischen Werte geladen werden. Angezeigt wird der letzte bekannte Stand.",
    offline: "Offline – letzter bekannter Stand",
    noData: "Keine Daten verfügbar",
    loadError: "Daten konnten nicht geladen werden.",
    loading: "Daten werden geladen …",
    noValue: "—",
    measuredAt: "gemessen",
    retry: "Erneut versuchen",
  },

  history: {
    title: "Verlauf",
    metricGroupLabel: "Messgröße wählen",
    rangeGroupLabel: "Zeitraum wählen",
    ranges: {
      "24h": "24 Std.",
      "7d": "7 Tage",
      "30d": "30 Tage",
    },
    empty: "Für diesen Zeitraum liegen noch nicht genug Daten vor.",
    chartLabel: (metric: string, range: string) =>
      `Verlaufsdiagramm ${metric}, Zeitraum ${range}`,
  },

  sourcesLabel: "Datenquellen",
  attribution:
    "Pegel/Abfluss: Hochwassernachrichtendienst Bayern (HND) & Gewässerkundlicher Dienst Bayern (GKD). Wetter: Open-Meteo.",
  disclaimer:
    "Nicht-kommerzielles Community-Projekt. Ohne Gewähr – keine amtliche Auskunft, keine Sicherheits- oder Eignungsaussage.",
} as const;

export type Strings = typeof de;
