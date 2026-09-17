interface RateLimitEntry {
  attempts: number;
  lockedUntil?: number;
  lastAttempt: number;
}

// In-memory tracker for rate limiting
const pinAttempts = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockedMinutesRemaining?: number;
  error?: string;
}

export function checkPinRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = pinAttempts.get(key);

  if (!entry) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingMs = entry.lockedUntil - now;
    const minutes = Math.ceil(remainingMs / 60000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedMinutesRemaining: minutes,
      error: `Too many failed PIN attempts. Access locked for ${minutes} minute${
        minutes > 1 ? "s" : ""
      } to protect account security.`,
    };
  }

  // Lockout expired, reset
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    pinAttempts.delete(key);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - entry.attempts),
  };
}

export function recordFailedPinAttempt(key: string): RateLimitResult {
  const now = Date.now();
  const entry = pinAttempts.get(key) || { attempts: 0, lastAttempt: now };

  entry.attempts += 1;
  entry.lastAttempt = now;

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    pinAttempts.set(key, entry);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedMinutesRemaining: 15,
      error:
        "Maximum attempts exceeded (5). Account locked for 15 minutes to prevent brute-force attacks.",
    };
  }

  pinAttempts.set(key, entry);
  const remaining = MAX_ATTEMPTS - entry.attempts;
  return {
    allowed: true,
    remainingAttempts: remaining,
    error: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before temporary 15-minute lock.`,
  };
}

export function resetPinRateLimit(key: string): void {
  pinAttempts.delete(key);
}
