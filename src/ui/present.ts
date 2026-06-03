import { computeTrend } from "../data/domain/trend";
import { freshestTimestamp, isStale } from "../data/loader";
import { METRIC_KEYS } from "../data/model";
import type {
  CurrentData,
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

  return {
    metrics,
    fetchedAt: current.fetchedAt,
    freshestAt: freshestTimestamp(current),
    stale: isStale(current, now),
    sources: current.sources,
  };
}
