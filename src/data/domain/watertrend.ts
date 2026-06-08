// Vorsichtige Tendenz-Schätzung der Wassertemperatur aus der Luft-Vorhersage.
//
// Bewusst KEINE °C-Vorhersage: Flusswasser ist thermisch träge und folgt der Luft nur
// gedämpft und verzögert. Wir leiten lediglich eine grobe Richtung ab (steigt/fällt/kaum)
// und kennzeichnen sie in der UI klar als Schätzung. Schwelle bewusst hoch (nur klare
// Luft-Änderungen lösen eine Tendenz aus).

export type WaterTendency = "rising" | "falling" | "steady" | "unknown";

export function waterTendency(
  recentAirAvg: number | null,
  forecastAirAvg: number | null,
  thresholdC = 2.5,
): WaterTendency {
  if (
    recentAirAvg === null ||
    forecastAirAvg === null ||
    !Number.isFinite(recentAirAvg) ||
    !Number.isFinite(forecastAirAvg)
  ) {
    return "unknown";
  }
  const delta = forecastAirAvg - recentAirAvg;
  if (delta >= thresholdC) return "rising";
  if (delta <= -thresholdC) return "falling";
  return "steady";
}
