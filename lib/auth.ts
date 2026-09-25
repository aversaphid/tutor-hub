import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./prisma";

import { NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "th_auth_token";

export function isSecureContext(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.DENO_DEPLOYMENT_ID) ||
    Boolean(process.env.TURSO_DATABASE_URL)
  );
}

export function setAuthCookie(
  response: NextResponse,
  token: string,
  role?: string
): void {
  const maxAge = role === "TUTEE" ? 60 * 60 * 24 : 60 * 60 * 24 * 7;
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.delete(AUTH_COOKIE_NAME);
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

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
  tokenVersion?: number;
}

const SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === "production"
    ? (() => {
        throw new Error("[Auth] Critical: SESSION_SECRET is not defined in production environment.");
      })()
    : "dev_fallback_session_secret_lb_maths_tuition_hub_32_chars");

// Encode cryptographically signed secure token with expiration and tokenVersion
export function createAuthToken(user: { id: string; role: string; tokenVersion?: number }, expiresInSeconds?: number): string {
  const now = Date.now();
  const defaultTtlSeconds = user.role === "TUTEE" ? 24 * 3600 : 7 * 24 * 3600;
  const ttlMs = (expiresInSeconds || defaultTtlSeconds) * 1000;

  const payload = {
    sub: user.id,
    role: user.role,
    tv: user.tokenVersion || 1,
    iat: now,
    exp: now + ttlMs,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function parseAuthToken(token: string): { sub: string; role: string; tv?: number; exp?: number } | null {
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
      if (parsed.tv !== undefined && cached.user.tokenVersion !== undefined && parsed.tv !== cached.user.tokenVersion) {
        userCache.delete(parsed.sub);
      } else {
        return cached.user;
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.sub, active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        magicKey: true,
        tokenVersion: true,
      },
    });

    if (user) {
      // If tokenVersion in token doesn't match active DB tokenVersion, token was revoked
      if (parsed.tv !== undefined && user.tokenVersion !== undefined && parsed.tv !== user.tokenVersion) {
        userCache.delete(parsed.sub);
        return null;
      }

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
