interface RateLimitEntry {
  attempts: number;
  lockedUntil?: number;
  lastAttempt: number;
}

// In-memory trackers for rate limiting
const pinAttempts = new Map<string, RateLimitEntry>();
const pinIpAttempts = new Map<string, RateLimitEntry>();
const passwordAttempts = new Map<string, RateLimitEntry>();
const passwordAccountAttempts = new Map<string, RateLimitEntry>();
const magicKeyAttempts = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const MAX_IP_PIN_ATTEMPTS = 10;
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
    cleanup(pinIpAttempts);
    cleanup(passwordAttempts);
    cleanup(passwordAccountAttempts);
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

// Student PIN Rate Limiting (Single-key)
export function checkPinRateLimit(key: string): RateLimitResult {
  return checkGenericRateLimit(pinAttempts, key, MAX_ATTEMPTS);
}

export function recordFailedPinAttempt(key: string): RateLimitResult {
  return recordGenericFailedAttempt(pinAttempts, key, MAX_ATTEMPTS, "PIN attempt");
}

export function resetPinRateLimit(key: string): void {
  pinAttempts.delete(key);
}

// Student PIN Rate Limiting (Dual-Tier: IP-level + Student Key)
export function checkDualPinRateLimit(ip: string, tuteeId?: string): RateLimitResult {
  // Check IP-wide limit first (defense against distributed enumeration across multiple student profiles)
  const ipCheck = checkGenericRateLimit(
    pinIpAttempts,
    ip,
    MAX_IP_PIN_ATTEMPTS,
    "Too many failed PIN attempts from this network. Access locked for 15 minutes."
  );
  if (!ipCheck.allowed) {
    return ipCheck;
  }

  // Check student-specific attempt limit
  const studentKey = `${ip}:${tuteeId || "direct"}`;
  const studentCheck = checkGenericRateLimit(pinAttempts, studentKey, MAX_ATTEMPTS);
  if (!studentCheck.allowed) {
    return studentCheck;
  }

  return {
    allowed: true,
    remainingAttempts: Math.min(ipCheck.remainingAttempts, studentCheck.remainingAttempts),
  };
}

export function recordFailedDualPinAttempt(ip: string, tuteeId?: string): RateLimitResult {
  // Record on IP tracker
  const ipFail = recordGenericFailedAttempt(
    pinIpAttempts,
    ip,
    MAX_IP_PIN_ATTEMPTS,
    "network PIN attempt"
  );

  // Record on student-specific tracker
  const studentKey = `${ip}:${tuteeId || "direct"}`;
  const studentFail = recordGenericFailedAttempt(
    pinAttempts,
    studentKey,
    MAX_ATTEMPTS,
    "PIN attempt"
  );

  // If student is locked or IP is locked, return the locked state
  if (!studentFail.allowed) {
    return studentFail;
  }
  if (!ipFail.allowed) {
    return ipFail;
  }

  return {
    allowed: true,
    remainingAttempts: Math.min(ipFail.remainingAttempts, studentFail.remainingAttempts),
    error: studentFail.error,
  };
}

export function resetDualPinRateLimit(ip: string, tuteeId?: string): void {
  const studentKey = `${ip}:${tuteeId || "direct"}`;
  pinAttempts.delete(studentKey);
}

// Password Login Rate Limiting (Single-key)
export function checkPasswordRateLimit(key: string): RateLimitResult {
  return checkGenericRateLimit(passwordAttempts, key, MAX_ATTEMPTS, "Too many failed login attempts. Account access temporarily locked for security.");
}

export function recordFailedPasswordAttempt(key: string): RateLimitResult {
  return recordGenericFailedAttempt(passwordAttempts, key, MAX_ATTEMPTS, "login attempt");
}

export function resetPasswordRateLimit(key: string): void {
  passwordAttempts.delete(key);
}

// Password Login Rate Limiting (Dual-Tier: IP network + Account Identifier)
export function checkDualPasswordRateLimit(ip: string, identifier?: string): RateLimitResult {
  const ipCheck = checkGenericRateLimit(
    passwordAttempts,
    ip,
    MAX_ATTEMPTS,
    "Too many failed login attempts from this network. Access temporarily locked for 15 minutes."
  );
  if (!ipCheck.allowed) {
    return ipCheck;
  }

  if (identifier) {
    const accountKey = identifier.toLowerCase().trim();
    const accountCheck = checkGenericRateLimit(
      passwordAccountAttempts,
      accountKey,
      MAX_ATTEMPTS,
      `Too many failed login attempts for account "${identifier}". Access temporarily locked for 15 minutes to protect your account.`
    );
    if (!accountCheck.allowed) {
      return accountCheck;
    }
    return {
      allowed: true,
      remainingAttempts: Math.min(ipCheck.remainingAttempts, accountCheck.remainingAttempts),
    };
  }

  return ipCheck;
}

export function recordFailedDualPasswordAttempt(ip: string, identifier?: string): RateLimitResult {
  const ipFail = recordGenericFailedAttempt(passwordAttempts, ip, MAX_ATTEMPTS, "login attempt");
  if (identifier) {
    const accountKey = identifier.toLowerCase().trim();
    const accountFail = recordGenericFailedAttempt(
      passwordAccountAttempts,
      accountKey,
      MAX_ATTEMPTS,
      "login attempt"
    );
    if (!accountFail.allowed) {
      return accountFail;
    }
  }
  return ipFail;
}

export function resetDualPasswordRateLimit(ip: string, identifier?: string): void {
  passwordAttempts.delete(ip);
  if (identifier) {
    passwordAccountAttempts.delete(identifier.toLowerCase().trim());
  }
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

