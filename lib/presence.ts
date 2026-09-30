export interface PresenceEntry {
  connections: number;
  lastSeenAt: number;
  role?: string;
  name?: string;
}

interface GlobalWithPresence {
  __tutorHubPresence?: Map<string, PresenceEntry>;
}

const globalStore = globalThis as unknown as GlobalWithPresence;

if (!globalStore.__tutorHubPresence) {
  globalStore.__tutorHubPresence = new Map<string, PresenceEntry>();
}

const presenceMap = globalStore.__tutorHubPresence;

// Considered online if active SSE connection OR seen within 45 seconds
export const PRESENCE_TIMEOUT_MS = 45_000;

export function recordUserConnected(
  userId: string,
  meta?: { role?: string; name?: string }
): { wasOnline: boolean } {
  if (!userId) return { wasOnline: false };
  const wasOnline = isUserOnline(userId);
  const existing = presenceMap.get(userId) || { connections: 0, lastSeenAt: Date.now() };
  existing.connections = Math.max(0, existing.connections) + 1;
  existing.lastSeenAt = Date.now();
  if (meta?.role) existing.role = meta.role;
  if (meta?.name) existing.name = meta.name;
  presenceMap.set(userId, existing);
  return { wasOnline };
}

export function recordUserDisconnected(userId: string): { isStillOnline: boolean } {
  if (!userId) return { isStillOnline: false };
  const existing = presenceMap.get(userId);
  if (!existing) return { isStillOnline: false };
  existing.connections = Math.max(0, existing.connections - 1);
  if (existing.connections === 0) {
    existing.lastSeenAt = 0;
  }
  presenceMap.set(userId, existing);
  return { isStillOnline: isUserOnline(userId) };
}

export function recordUserHeartbeat(
  userId: string,
  meta?: { role?: string; name?: string }
): { wasOnline: boolean } {
  if (!userId) return { wasOnline: false };
  const wasOnline = isUserOnline(userId);
  const existing = presenceMap.get(userId) || { connections: 0, lastSeenAt: Date.now() };
  existing.lastSeenAt = Date.now();
  if (meta?.role) existing.role = meta.role;
  if (meta?.name) existing.name = meta.name;
  presenceMap.set(userId, existing);
  return { wasOnline };
}

export function recordUserLeave(userId: string) {
  if (!userId) return;
  const existing = presenceMap.get(userId);
  if (existing) {
    existing.connections = 0;
    existing.lastSeenAt = 0;
    presenceMap.set(userId, existing);
  }
}

export function isUserOnline(userId: string, thresholdMs = PRESENCE_TIMEOUT_MS): boolean {
  if (!userId) return false;
  const existing = presenceMap.get(userId);
  if (!existing) return false;
  if (existing.connections > 0) return true;
  return Date.now() - existing.lastSeenAt < thresholdMs;
}

export function getAllOnlineUserIds(thresholdMs = PRESENCE_TIMEOUT_MS): string[] {
  const now = Date.now();
  const online: string[] = [];
  for (const [userId, record] of presenceMap.entries()) {
    if (record.connections > 0 || now - record.lastSeenAt < thresholdMs) {
      online.push(userId);
    }
  }
  return online;
}

// Clear all for unit testing
export function _resetPresenceForTesting() {
  presenceMap.clear();
}
