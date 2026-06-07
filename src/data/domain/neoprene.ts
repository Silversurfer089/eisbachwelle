// Faktische Neopren-Orientierung aus der Wassertemperatur (gängige Surf-Faustregel).
// Bewusst nur eine Orientierung – keine Sicherheits- oder Kälteschutz-Garantie.

export type WetsuitClass = "boardshorts" | "w32" | "w43" | "w54" | "winter";

/**
 * Ordnet eine Wassertemperatur (°C) einer üblichen Neopren-Empfehlung zu.
 * Liefert null bei nicht-endlichen Werten.
 */
export function wetsuitClass(tempC: number): WetsuitClass | null {
  if (!Number.isFinite(tempC)) return null;
  if (tempC >= 20) return "boardshorts";
  if (tempC >= 16) return "w32";
  if (tempC >= 12) return "w43";
  if (tempC >= 8) return "w54";
  return "winter";
}
