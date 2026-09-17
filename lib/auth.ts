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

const FALLBACK_SECRET = crypto.randomBytes(32).toString("hex");
const SECRET = process.env.SESSION_SECRET || process.env.TURSO_AUTH_TOKEN || FALLBACK_SECRET;

// Encode cryptographically signed secure token
export function createAuthToken(user: { id: string; role: string }): string {
  const payload = {
    sub: user.id,
    role: user.role,
    iat: Date.now(),
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function parseAuthToken(token: string): { sub: string; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length === 2) {
      const [data, signature] = parts;
      const expected = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
      if (signature.length !== expected.length) return null;
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return null;
      }
      const json = Buffer.from(data, "base64url").toString("utf-8");
      const parsed = JSON.parse(json);
      if (!parsed.sub || !parsed.role) return null;
      return parsed;
    }

    // Fallback for transition from legacy unsigned tokens
    const json = Buffer.from(token, "base64").toString("utf-8");
    const parsed = JSON.parse(json);
    if (!parsed.sub || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const parsed = parseAuthToken(token);
    if (!parsed) return null;

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

    return user;
  } catch {
    return null;
  }
}
