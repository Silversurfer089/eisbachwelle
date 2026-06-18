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

  // Must match the lookbackMs default in src/data/domain/trend.ts (3 h).
  trendWindow: "3 hrs",

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
    sourceLfu:
      "Bavarian State Office for the Environment (LfU) – licence CC BY 4.0",
    sourceHnd: "Bavarian Flood Information Service (HND)",
    sourceGkd: "Bavarian Hydrological Service (GKD)",
    sourceMeteo: "Open-Meteo (weather)",
    methodTitle: "About the ranking",
    method:
      "The percentile ranking is derived purely from the data collected so far and is only a rough orientation – not a quality, suitability or safety judgement.",
    sourceCode: "Source code (GitHub)",
    repoUrl: "https://github.com/Silversurfer089/eisbachwelle",
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
    trendLead: "Over the last 3 hours, discharge has been",
    trendUnknown: "Too few values for a short-term trend right now.",
    waveNote:
      "The readings alone don't tell you whether the wave rides well – the community status is the best indicator.",
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
    title: "Weather Forecast",
    hourlyLabel: "Hourly trend",
    curveLabel: "Temperature trend",
    now: "Now",
    sourceNote: "Air temperature & precipitation · Open-Meteo",
    waterNote:
      "There is no reliable daily forecast for discharge or level – the channel is regulated and very stable in the short term. The water-temperature trend is only a rough estimate from the air forecast.",
    outlookTitle: "Water outlook",
    outlookPending:
      "A concrete daily forecast (°C) will follow once the model is validated with enough data.",
    bestTime: (start: number, end: number) =>
      `Water temperature has recently peaked around ${start}:00–${end}:00 (observed pattern, not a forecast).`,
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

  news: {
    title: "News",
    note: "Collected automatically from official and community sources – links go to the original source.",
  },

  anatomy: {
    summary: "How the wave forms",
    diagramLabel: "Schematic longitudinal section of the Eisbach wave",
    flowDirection: "Flow direction",
    intro:
      "Below Prinzregentenstraße the Eisbach emerges from two outlets and shoots over a stone step: the water there is fast and shallow. Where it meets the deeper, slower water beyond, the flow flips abruptly – a hydraulic jump. At the surface the water rolls back against the current: the standing wave that people surf.",
    legend: [
      "Outlet below Prinzregentenstraße: two inflows feed the wave – how the water is split between them shapes the wave.",
      "Stone step: the water accelerates down the sloping bed (supercritical flow – fast and shallow).",
      "Gravel bank: sediment on the bed supports the wave. When it is missing – as after the canal cleanout in October 2025 – the wave collapses; today coarse gravel helps out.",
      "Standing wave (hydraulic jump): roughly half a metre high; at the surface the roller turns back against the current.",
      "Baffle blocks (1970s): concrete blocks on the bed take energy out of the water and calm the flow.",
      "Tailwater: beyond the wave the stream runs deep and slow (subcritical) – this water level also feeds back into the wave's shape.",
    ],
    historyTitle: "Canal cleanout & recent history",
    history1:
      "For the annual “Bachauskehr” the stream is drained for cleaning and maintenance. After the cleanout in October 2025 the wave did not rebuild – presumably too much sediment had been removed.",
    history2:
      "Surfers used to stabilise the wave with wooden planks on ropes (and at times a metal rail); from around 2005 natural sediment took over. Surfing has been permitted again since 8 May 2026; the city is stabilising the bed with coarse gravel, and Munich University of Applied Sciences is researching a permanently stable wave structure.",
    disclaimer:
      "Schematic illustration, not to scale. Compiled from public sources (as of June 2026):",
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
