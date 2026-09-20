import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./prisma";

export const AUTH_COOKIE_NAME = "th_auth_token";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  role: "HEAD_TUTOR" | "TUTOR" | "TUTEE";
  magicKey: string | null;
}

const SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === "production"
    ? (() => {
        throw new Error("[Auth] Critical: SESSION_SECRET is not defined in production environment.");
      })()
    : "dev_fallback_session_secret_lb_maths_tuition_hub_32_chars");

// Encode cryptographically signed secure token with expiration
export function createAuthToken(user: { id: string; role: string }, expiresInSeconds?: number): string {
  const now = Date.now();
  const defaultTtlSeconds = user.role === "TUTEE" ? 24 * 3600 : 7 * 24 * 3600;
  const ttlMs = (expiresInSeconds || defaultTtlSeconds) * 1000;

  const payload = {
    sub: user.id,
    role: user.role,
    iat: now,
    exp: now + ttlMs,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function parseAuthToken(token: string): { sub: string; role: string; exp?: number } | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    // Strictly require payload.signature format
    if (parts.length !== 2) return null;

    const [data, signature] = parts;
    const expected = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
    if (signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }

    const json = Buffer.from(data, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (!parsed.sub || !parsed.role) return null;

    // Verify token expiration
    if (parsed.exp && typeof parsed.exp === "number" && Date.now() > parsed.exp) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

interface CachedUser {
  user: SessionUser;
  expiresAt: number;
}

const userCache = new Map<string, CachedUser>();
const USER_CACHE_TTL_MS = 30_000; // 30 seconds cache TTL to eliminate DB queries during polling

export function clearUserCache(userId?: string) {
  if (userId) {
    userCache.delete(userId);
  } else {
    userCache.clear();
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const parsed = parseAuthToken(token);
    if (!parsed) return null;

    const now = Date.now();
    const cached = userCache.get(parsed.sub);
    if (cached && cached.expiresAt > now) {
      return cached.user;
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.sub, active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        magicKey: true,
      },
    });

    if (user) {
      userCache.set(parsed.sub, {
        user,
        expiresAt: now + USER_CACHE_TTL_MS,
      });
    } else {
      userCache.delete(parsed.sub);
    }

    return user;
  } catch {
    return null;
  }
}
