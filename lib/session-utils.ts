/**
 * Resolves the primary active/live session from a list of sessions:
 * 1. Highest priority: Any session whose scheduled window encompasses now (start <= now && now < end)
 *    and has not been marked COMPLETED or CANCELLED.
 * 2. Next priority: The earliest upcoming scheduled or delayed lesson whose scheduledEndTime hasn't passed (end > now).
 * 3. Fallback priority: Recent uncompleted IN_PROGRESS lesson from the past 2 hours (end > now - 2h).
 */
export function resolveActiveSession<T extends Record<string, any>>(
  sessions: T[],
  nowMs: number = Date.now()
): T | null {
  if (!sessions || sessions.length === 0) return null;

  // 1. Ongoing session whose scheduled window encompasses now
  const ongoing = sessions.filter((s) => {
    if (s.status === "COMPLETED" || s.status === "CANCELLED") return false;
    const startMs = new Date(s.scheduledStartTime).getTime();
    const endMs = new Date(s.scheduledEndTime).getTime();
    return startMs <= nowMs && nowMs < endMs;
  });

  if (ongoing.length > 0) {
    // If multiple overlap, pick the one that started most recently
    return ongoing.sort(
      (a, b) =>
        new Date(b.scheduledStartTime).getTime() -
        new Date(a.scheduledStartTime).getTime()
    )[0];
  }

  // 2. Upcoming scheduled or delayed lesson starting in the future (or with future end time)
  const upcoming = sessions.filter((s) => {
    if (s.status === "COMPLETED" || s.status === "CANCELLED") return false;
    const endMs = new Date(s.scheduledEndTime).getTime();
    return endMs > nowMs;
  });

  if (upcoming.length > 0) {
    return upcoming.sort(
      (a, b) =>
        new Date(a.scheduledStartTime).getTime() -
        new Date(b.scheduledStartTime).getTime()
    )[0];
  }

  // 3. Fallback: recent uncompleted session within the last 2 hours
  const recentInProgress = sessions.filter((s) => {
    if (s.status !== "IN_PROGRESS") return false;
    const endMs = new Date(s.scheduledEndTime).getTime();
    return endMs > nowMs - 2 * 3600 * 1000;
  });

  if (recentInProgress.length > 0) {
    return recentInProgress.sort(
      (a, b) =>
        new Date(b.scheduledEndTime).getTime() -
        new Date(a.scheduledEndTime).getTime()
    )[0];
  }

  return null;
}
