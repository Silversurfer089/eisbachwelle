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

  neoprene: {
    prefix: "Neopren",
    boardshorts: "Boardshorts oder dünn",
    w32: "3/2-Anzug",
    w43: "4/3-Anzug",
    w54: "5/4 + Schuhe",
    winter: "5/4 mit Haube",
  },

  share: {
    action: "Teilen",
    title: "Eisbachwelle München",
    copied: "In die Zwischenablage kopiert.",
    line: (flow: string, level: string, water: string) =>
      `Eisbachwelle: Abfluss ${flow}, Pegel ${level}, Wasser ${water}.`,
  },

  about: {
    summary: "Über & Quellen",
    what: "Nicht-kommerzielles Community-Projekt für die Eisbachwelle. Kein Tracking, keine Werbung, keine Accounts.",
    sourcesTitle: "Datenquellen",
    sourceHnd: "Hochwassernachrichtendienst Bayern (HND)",
    sourceGkd: "Gewässerkundlicher Dienst Bayern (GKD)",
    sourceMeteo: "Open-Meteo (Wetter)",
    methodTitle: "Zur Einordnung",
    method:
      "Die Perzentil-Einordnung leitet sich rein aus den bisher gesammelten Messwerten ab und ist nur eine Orientierung – kein Qualitäts-, Eignungs- oder Sicherheitsurteil.",
    crowdTitle: "Andrang am Spot",
    crowdText:
      "Wie voll es gerade ist und die üblichen Stoßzeiten zeigt Google Maps:",
    crowdLink: "Andrang in Google Maps ansehen",
    crowdUrl:
      "https://www.google.com/maps/search/?api=1&query=Eisbachwelle%2C+M%C3%BCnchen",
    sourceCode: "Quellcode (GitHub)",
    repoUrl: "https://github.com/Silversurfer089/eisbachwellle",
  },

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

  update: {
    available: "Neue Version verfügbar.",
    action: "Aktualisieren",
    offlineReady: "App ist offline verfügbar.",
  },

  context: {
    title: "Einordnung",
    trendLead: "Der Abfluss ist zuletzt",
    trendUnknown: "Zum aktuellen Kurzzeit-Trend liegen zu wenige Werte vor.",
    // p = gerundeter Perzentilrang, days = abgedeckte Tage
    percentile: (p: number, daysLabel: string) =>
      `Aktuell höher als rund ${p} % der Messwerte ${daysLabel}.`,
    rangeLabel: (lo: string, hi: string) => `Bisheriger Bereich: ${lo} – ${hi}`,
    note: "Orientierung aus den bisher erfassten Daten – kein Qualitäts-, Eignungs- oder Sicherheitsurteil.",
    building:
      "Die Datenbasis wächst noch; die Einordnung wird mit der Zeit aussagekräftiger.",
    insufficient:
      "Noch zu wenig Verlaufsdaten für eine belastbare Einordnung. Sie entsteht, sobald genügend Messwerte gesammelt sind.",
    daysAgo: (n: number) =>
      n >= 1 ? `der letzten ~${n} Tage` : "der letzten Stunden",
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
    stats: (avg: string, min: string, max: string) =>
      `Ø ${avg}  ·  min ${min}  ·  max ${max}`,
  },

  sourcesLabel: "Datenquellen",
  attribution:
    "Pegel/Abfluss: Hochwassernachrichtendienst Bayern (HND) & Gewässerkundlicher Dienst Bayern (GKD). Wetter: Open-Meteo.",
  disclaimer:
    "Nicht-kommerzielles Community-Projekt. Ohne Gewähr – keine amtliche Auskunft, keine Sicherheits- oder Eignungsaussage.",
} as const;

export type Strings = typeof de;
