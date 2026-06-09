import type { Strings } from "./de";

// English strings. Must mirror the shape of `Strings` (see de.ts).

export const en: Strings = {
  appName: "Eisbach Wave",
  location: "Himmelreichbrücke · English Garden, Munich",

  metric: {
    flow: { label: "Discharge", hint: "Most important value for the wave" },
    level: { label: "Water level", hint: "" },
    waterTemp: { label: "Water temperature", hint: "" },
    airTemp: { label: "Air temperature", hint: "" },
  },

  trend: {
    rising: "rising",
    falling: "falling",
    stable: "steady",
    unknown: "no trend",
  },

  yesterday: {
    same: "≈ same as yesterday",
    delta: (signed: string) => `${signed} vs. yesterday`,
  },

  waterEstimate: {
    prefix: "Water trend",
    estimate: "estimate",
    rising: "likely rising",
    falling: "likely falling",
    steady: "little change",
    unknown: "",
  },

  neoprene: {
    prefix: "Wetsuit",
    boardshorts: "boardshorts or thin",
    w32: "3/2 suit",
    w43: "4/3 suit",
    w54: "5/4 + boots",
    winter: "5/4 with hood",
  },

  share: {
    action: "Share",
    title: "Eisbach Wave, Munich",
    copied: "Copied to clipboard.",
    line: (flow: string, level: string, water: string) =>
      `Eisbach Wave: discharge ${flow}, level ${level}, water ${water}.`,
  },

  about: {
    summary: "About & sources",
    what: "Non-commercial community project for the Eisbach wave. No tracking, no ads, no accounts.",
    sourcesTitle: "Data sources",
    sourceLfu: "Bavarian State Office for the Environment (LfU) – licence CC BY 4.0",
    sourceHnd: "Bavarian Flood Information Service (HND)",
    sourceGkd: "Bavarian Hydrological Service (GKD)",
    sourceMeteo: "Open-Meteo (weather)",
    methodTitle: "About the ranking",
    method:
      "The percentile ranking is derived purely from the data collected so far and is only a rough orientation – not a quality, suitability or safety judgement.",
    sourceCode: "Source code (GitHub)",
    repoUrl: "https://github.com/Silversurfer089/eisbachwellle",
  },

  status: {
    updatedPrefix: "Updated:",
    stale: "Data outdated",
    staleHint:
      "No fresh values could be loaded. Showing the last known reading.",
    offline: "Offline – last known reading",
    noData: "No data available",
    loadError: "Could not load data.",
    loading: "Loading data …",
    noValue: "—",
    measuredAt: "measured",
    retry: "Try again",
  },

  update: {
    available: "New version available.",
    action: "Update",
    offlineReady: "App available offline.",
  },

  context: {
    title: "Ranking",
    amount: {
      low: "Currently rather little water",
      mid: "Currently a normal level",
      high: "Currently rather a lot of water",
    },
    trendLead: "Discharge has recently been",
    trendUnknown: "Too few values for a short-term trend right now.",
    percentile: (p: number, daysLabel: string) =>
      `Currently higher than about ${p}% of readings ${daysLabel}.`,
    rangeLabel: (lo: string, hi: string) => `Range so far: ${lo} – ${hi}`,
    note: "Orientation from the data collected so far – not a quality, suitability or safety judgement.",
    building:
      "The data base is still growing; the ranking will become more meaningful over time.",
    insufficient:
      "Not enough history yet for a solid ranking. It appears once enough readings have been collected.",
    daysAgo: (n: number) =>
      n >= 1 ? `over the last ~${n} days` : "over the last hours",
  },

  history: {
    title: "History",
    metricGroupLabel: "Choose metric",
    rangeGroupLabel: "Choose period",
    ranges: {
      "24h": "24 h",
      "7d": "7 days",
      "30d": "30 days",
    },
    empty: "Not enough data for this period yet.",
    chartLabel: (metric: string, range: string) =>
      `History chart ${metric}, period ${range}`,
    latest: "latest",
    stats: (avg: string, min: string, max: string) =>
      `Avg ${avg}  ·  min ${min}  ·  max ${max}`,
  },

  forecast: {
    title: "Forecast",
    hourlyLabel: "Hourly trend",
    curveLabel: "Temperature trend",
    now: "Now",
    sourceNote: "Air temperature & precipitation · Open-Meteo",
    waterNote:
      "There is no reliable daily forecast for discharge or level – the channel is regulated and very stable in the short term. The water-temperature trend on the card is only a rough estimate from the air forecast.",
    today: "Today",
    tomorrow: "Tomorrow",
    tempRange: (max: string, min: string) => `${max}° / ${min}°`,
    precip: (mm: string, prob: string) => `${mm} mm · ${prob}%`,
    weather: {
      clear: "Clear",
      cloudy: "Cloudy",
      fog: "Fog",
      rain: "Rain",
      snow: "Snow",
      storm: "Thunderstorm",
      unknown: "—",
    },
  },

  community: {
    title: "Community status",
    noVotes: "No reports yet",
    voteCount: (n: number) => `${n} ${n === 1 ? "report" : "reports"}`,
    lastVote: (rel: string) => `last ${rel}`,
    voteBtnLabel: "Report now",
    thanks: "Thanks for your report!",
    cooldown: "You already reported – next report in an hour.",
    error: "Could not save report.",
    status: {
      good: "Running well",
      okay: "Running, but moderate",
      poor: "Not running",
      closed: "Out of service",
    },
    statusHint: {
      good: "Wave is up, worth it",
      okay: "Wave is up, but not ideal",
      poor: "No surfing possible",
      closed: "Bachausker / city intervention",
    },
    disclaimer:
      "Community reports from surfers on-site. Not a substitute for your own judgement.",
  },

  sourcesLabel: "Data sources",
  attribution:
    "Data source: Bavarian State Office for the Environment, www.lfu.bayern.de (HND/GKD · CC BY 4.0). Weather: Open-Meteo.",
  disclaimer:
    "Non-commercial community project. No warranty – not an official statement, no safety or suitability claim.",
};
