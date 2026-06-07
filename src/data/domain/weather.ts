// Bildet einen WMO-Wettercode (Open-Meteo) auf eine grobe Kategorie ab.
// Reine Zuordnung – Beschriftung und Symbol liegen in der UI/i18n.

export type WeatherKey =
  | "clear"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "storm"
  | "unknown";

export function weatherKey(code: number | null): WeatherKey {
  if (code === null || !Number.isFinite(code)) return "unknown";
  if (code === 0) return "clear";
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "unknown";
}
