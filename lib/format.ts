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
