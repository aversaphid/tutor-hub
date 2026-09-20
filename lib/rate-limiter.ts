interface RateLimitEntry {
  attempts: number;
  lockedUntil?: number;
  lastAttempt: number;
}

// In-memory trackers for rate limiting
const pinAttempts = new Map<string, RateLimitEntry>();
const passwordAttempts = new Map<string, RateLimitEntry>();
const magicKeyAttempts = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// Periodic cleanup of expired entries every 10 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const cleanup = (map: Map<string, RateLimitEntry>) => {
      for (const [key, entry] of map.entries()) {
        if (entry.lockedUntil && entry.lockedUntil < now && now - entry.lastAttempt > LOCKOUT_MS) {
          map.delete(key);
        } else if (!entry.lockedUntil && now - entry.lastAttempt > LOCKOUT_MS) {
          map.delete(key);
        }
      }
    };
    cleanup(pinAttempts);
    cleanup(passwordAttempts);
    cleanup(magicKeyAttempts);
  }, 10 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockedMinutesRemaining?: number;
  error?: string;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "127.0.0.1";
}

function checkGenericRateLimit(
  map: Map<string, RateLimitEntry>,
  key: string,
  maxAttempts = MAX_ATTEMPTS,
  customLockMsg?: string
): RateLimitResult {
  const now = Date.now();
  const entry = map.get(key);

  if (!entry) {
    return { allowed: true, remainingAttempts: maxAttempts };
  }

  // Check if locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingMs = entry.lockedUntil - now;
    const minutes = Math.ceil(remainingMs / 60000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedMinutesRemaining: minutes,
      error:
        customLockMsg ||
        `Too many failed attempts. Access locked for ${minutes} minute${
          minutes > 1 ? "s" : ""
        } to protect account security.`,
    };
  }

  // Lockout expired, reset
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    map.delete(key);
    return { allowed: true, remainingAttempts: maxAttempts };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, maxAttempts - entry.attempts),
  };
}

function recordGenericFailedAttempt(
  map: Map<string, RateLimitEntry>,
  key: string,
  maxAttempts = MAX_ATTEMPTS,
  itemLabel = "attempt"
): RateLimitResult {
  const now = Date.now();
  const entry = map.get(key) || { attempts: 0, lastAttempt: now };

  entry.attempts += 1;
  entry.lastAttempt = now;

  if (entry.attempts >= maxAttempts) {
    entry.lockedUntil = now + LOCKOUT_MS;
    map.set(key, entry);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedMinutesRemaining: 15,
      error: `Maximum failed ${itemLabel}s exceeded (${maxAttempts}). Locked for 15 minutes to prevent brute-force attacks.`,
    };
  }

  map.set(key, entry);
  const remaining = maxAttempts - entry.attempts;
  return {
    allowed: true,
    remainingAttempts: remaining,
    error: `Incorrect credentials. ${remaining} ${itemLabel}${
      remaining === 1 ? "" : "s"
    } remaining before temporary 15-minute lock.`,
  };
}

// Student PIN Rate Limiting
export function checkPinRateLimit(key: string): RateLimitResult {
  return checkGenericRateLimit(pinAttempts, key, MAX_ATTEMPTS);
}

export function recordFailedPinAttempt(key: string): RateLimitResult {
  return recordGenericFailedAttempt(pinAttempts, key, MAX_ATTEMPTS, "PIN attempt");
}

export function resetPinRateLimit(key: string): void {
  pinAttempts.delete(key);
}

// Password Login Rate Limiting
export function checkPasswordRateLimit(key: string): RateLimitResult {
  return checkGenericRateLimit(passwordAttempts, key, MAX_ATTEMPTS, "Too many failed login attempts. Account access temporarily locked for security.");
}

export function recordFailedPasswordAttempt(key: string): RateLimitResult {
  return recordGenericFailedAttempt(passwordAttempts, key, MAX_ATTEMPTS, "login attempt");
}

export function resetPasswordRateLimit(key: string): void {
  passwordAttempts.delete(key);
}

// Magic Key Rate Limiting
export function checkMagicKeyRateLimit(key: string): RateLimitResult {
  return checkGenericRateLimit(magicKeyAttempts, key, 10, "Too many invalid magic key attempts. Access locked for 15 minutes.");
}

export function recordFailedMagicKeyAttempt(key: string): RateLimitResult {
  return recordGenericFailedAttempt(magicKeyAttempts, key, 10, "magic key attempt");
}

export function resetMagicKeyRateLimit(key: string): void {
  magicKeyAttempts.delete(key);
}

