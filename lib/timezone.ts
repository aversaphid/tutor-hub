/**
 * Timezone utilities for Europe/London (UK)
 *
 * Ensures all lesson scheduling, recurring bookings, tutor unavailabilities,
 * push reminders, and calendar synchronization preserve wall-clock time
 * across Daylight Saving Time (BST <-> GMT) transitions.
 */

export const UK_TIMEZONE = "Europe/London";

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Extracts wall-clock date and time components in a given timezone.
 */
export function getZonedParts(date: Date, timeZone = UK_TIMEZONE): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      map[p.type] = parseInt(p.value, 10);
    }
  }

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour === 24 ? 0 : map.hour,
    minute: map.minute,
    second: map.second,
  };
}

/**
 * Converts wall-clock year/month/day/hour/minute/second in the specified timezone
 * into the corresponding exact UTC Date.
 */
export function zonedTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  second: number = 0,
  timeZone = UK_TIMEZONE
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const parts = getZonedParts(utcGuess, timeZone);
  const targetAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  const offset = targetAsUtc - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offset);
}

/**
 * Advances a Date by a specific number of calendar days while strictly preserving
 * the local wall-clock time in the given timezone (default: Europe/London).
 *
 * Example:
 * - A lesson on Wednesday at 17:10 BST (+1 week across the autumn DST switch)
 *   will produce the following Wednesday at 17:10 GMT (not 16:10).
 * - A lesson in March (+1 week across spring DST switch)
 *   will produce the following week at 17:10 BST (not 18:10).
 */
export function addDaysPreservingWallClock(
  date: Date,
  days: number,
  timeZone = UK_TIMEZONE
): Date {
  const parts = getZonedParts(date, timeZone);

  // Advance calendar date in UTC representation
  const advancedDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days, parts.hour, parts.minute, parts.second)
  );

  return zonedTimeToUtc(
    advancedDate.getUTCFullYear(),
    advancedDate.getUTCMonth() + 1,
    advancedDate.getUTCDate(),
    parts.hour,
    parts.minute,
    parts.second,
    timeZone
  );
}

/**
 * Formats a Date into a locale time string strictly in Europe/London time.
 * Prevents servers running in UTC (like Deno Deploy) from displaying UTC times during BST.
 */
export function formatLondonTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: UK_TIMEZONE,
    ...options,
  });
}

/**
 * Formats a Date into a locale date string strictly in Europe/London time.
 */
export function formatLondonDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    timeZone: UK_TIMEZONE,
    ...options,
  });
}
