/**
 * Formats a tutor or user name:
 * - Capitalizes the first letter of each word (e.g., 'luke' -> 'Luke', 'john smith' -> 'John Smith')
 * - Replaces any legacy 'Admin' label for Luke with 'Luke'
 */
export function formatTutorName(name?: string | null): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === "admin") return "Luke";
  return trimmed
    .split(/\s+/)
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

/**
 * Formats a numeric currency amount in GBP (£).
 * Returns placeholder "—" if null or undefined.
 */
export function formatCurrency(amount?: number | null, fallback = "—"): string {
  if (amount === null || amount === undefined || isNaN(amount)) return fallback;
  return `£${amount.toFixed(2)}`;
}

/**
 * 5-minute interval time options across 24 hours: "00:00", "00:05", ..., "23:55".
 */
export const TIME_OPTIONS_5MIN: string[] = [];
for (let h = 0; h < 24; h++) {
  const hh = String(h).padStart(2, "0");
  for (let m = 0; m < 60; m += 5) {
    const mm = String(m).padStart(2, "0");
    TIME_OPTIONS_5MIN.push(`${hh}:${mm}`);
  }
}

/**
 * Helper to add minutes to an "HH:mm" time string, returning "HH:mm" clamped to 23:55.
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  if (!timeStr || !timeStr.includes(":")) return "10:00";
  const [h, m] = timeStr.split(":").map(Number);
  const totalMins = Math.max(0, Math.min(23 * 60 + 55, h * 60 + m + minutesToAdd));
  const newH = Math.floor(totalMins / 60);
  const newM = Math.floor((totalMins % 60) / 5) * 5;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

