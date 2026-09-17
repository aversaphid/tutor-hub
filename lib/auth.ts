import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
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

// Encode simple secure token (base64 JSON signed or hashed in prod)
export function createAuthToken(user: { id: string; role: string }): string {
  const payload = {
    sub: user.id,
    role: user.role,
    iat: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function parseAuthToken(token: string): { sub: string; role: string } | null {
  try {
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
