import { computeTrend } from "../data/domain/trend";
import {
  describeContext,
  type DistributionContext,
} from "../data/domain/context";
import { deltaToYesterday, type YesterdayDelta } from "../data/domain/compare";
import { waterTendency, type WaterTendency } from "../data/domain/watertrend";
import { warmestWaterWindow, type WarmWindow } from "../data/domain/diurnal";
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
  /** Differenz zum Wert vor ~24 h (gleiche Uhrzeit), oder null. */
  yesterday: YesterdayDelta | null;
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
  /** Grobe Tendenz der Wassertemperatur (Schätzung aus der Luft-Vorhersage). */
  waterTendency: WaterTendency;
  /** Typisches Tagesfenster der höchsten Wassertemperatur (Beobachtung), oder null. */
  warmWindow: WarmWindow | null;
}

function average(values: number[]): number | null {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  return finite.reduce((a, b) => a + b, 0) / finite.length;
}

export function present(
  current: CurrentData,
  history: HistoryData,
  now: Date = new Date(),
): DashboardVM {
  const metrics: MetricVM[] = METRIC_KEYS.map((key) => {
    const reading = current.measurements[key];
    return {
      key,
      reading,
      trend: computeTrend(history.series[key]),
      yesterday: reading
        ? deltaToYesterday(
            history.series[key],
            reading.value,
            Date.parse(reading.t),
          )
        : null,
    };
  });

  const flowReading = current.measurements.flow;
  const flowContext = flowReading
    ? describeContext(history.series.flow, flowReading.value)
    : null;

  // Wassertemperatur-Tendenz: jüngste Luft (letzte 24 h) vs. Vorhersage-Luft (Tage).
  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  const recentAir = average(
    history.series.airTemp
      .filter((p) => Date.parse(p.t) >= dayAgo)
      .map((p) => p.v),
  );
  const forecastAir = average(
    current.forecast.flatMap((d) =>
      [d.tMax, d.tMin].filter((v): v is number => v !== null),
    ),
  );

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
    waterTendency: waterTendency(recentAir, forecastAir),
    warmWindow: warmestWaterWindow(history.series.waterTemp, now),
  };
}
