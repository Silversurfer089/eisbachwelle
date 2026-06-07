import { computeTrend } from "../data/domain/trend";
import {
  describeContext,
  type DistributionContext,
} from "../data/domain/context";
import { freshestTimestamp, isStale } from "../data/loader";
import { METRIC_KEYS } from "../data/model";
import type {
  CurrentData,
  ForecastDay,
  ForecastHour,
  HistoryData,
  MetricKey,
  Reading,
  Trend,
} from "../data/model";

// Presenter: verbindet Rohdaten + Domänenlogik zu einem darstellbaren View-Model.
// Enthält bewusst KEINE DOM-/UI-Details — nur Daten für die Render-Schicht.

export interface MetricVM {
  key: MetricKey;
  reading: Reading | null;
  trend: Trend;
}

export interface DashboardVM {
  metrics: MetricVM[];
  fetchedAt: string;
  freshestAt: string | null;
  stale: boolean;
  sources: Record<string, string>;
  /** Trend des Abflusses (Hauptgröße) – bequemer Direktzugriff fürs Einordnungs-Panel. */
  flowTrend: Trend;
  /** Einordnung des aktuellen Abflusses in die bisherige Historie, oder null. */
  flowContext: DistributionContext | null;
  /** Tagesvorhersage (Luft + Niederschlag), kann leer sein. */
  forecast: ForecastDay[];
  /** Stündliche Vorhersage (nächste ~48 h), kann leer sein. */
  forecastHourly: ForecastHour[];
}

export function present(
  current: CurrentData,
  history: HistoryData,
  now: Date = new Date(),
): DashboardVM {
  const metrics: MetricVM[] = METRIC_KEYS.map((key) => ({
    key,
    reading: current.measurements[key],
    trend: computeTrend(history.series[key]),
  }));

  const flowReading = current.measurements.flow;
  const flowContext = flowReading
    ? describeContext(history.series.flow, flowReading.value)
    : null;

  return {
    metrics,
    fetchedAt: current.fetchedAt,
    freshestAt: freshestTimestamp(current),
    stale: isStale(current, now),
    sources: current.sources,
    flowTrend: metrics.find((m) => m.key === "flow")?.trend ?? "unknown",
    flowContext,
    forecast: current.forecast,
    forecastHourly: current.forecastHourly,
  };
}
