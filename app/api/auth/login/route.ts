import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createAuthToken, setAuthCookie } from "@/lib/auth";
import { formatTutorName } from "@/lib/format";
import {
  getClientIp,
  checkDualPasswordRateLimit,
  recordFailedDualPasswordAttempt,
  resetDualPasswordRateLimit,
} from "@/lib/rate-limiter";
import { z } from "zod";

const LoginSchema = z.object({
  username: z.string().trim().optional(),
  email: z.string().trim().optional(),
  name: z.string().trim().optional(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const parseResult = LoginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { username, email, name, password } = parseResult.data;
    const rawIdentifier = (username || name || email || "").trim();

    if (!rawIdentifier) {
      return NextResponse.json(
        { error: "Please enter your name or username." },
        { status: 400 }
      );
    }

    // Dual-tier rate limiting check (IP network tier + Account identifier tier)
    const rateLimitCheck = checkDualPasswordRateLimit(ip, rawIdentifier);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: rateLimitCheck.error,
          lockedMinutesRemaining: rateLimitCheck.lockedMinutesRemaining,
        },
        { status: 429 }
      );
    }

    const lowerIdentifier = rawIdentifier.toLowerCase();
    const normalizedEmail = lowerIdentifier.includes("@")
      ? lowerIdentifier
      : `${lowerIdentifier.replace(/\s+/g, "")}@lbmathstuition.co.uk`;

    // Search by email, normalized domain email, or name
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { email: lowerIdentifier },
          { name: { equals: rawIdentifier } },
          { name: { equals: lowerIdentifier } },
          { name: { equals: formatTutorName(rawIdentifier) } },
        ],
      },
    });

    // Constant-time dummy hash to normalize bcrypt verification latency and prevent timing attacks
    const DUMMY_HASH = "$2b$10$e8kZ1f7kPq4zFqT1qE5wxeV8qM1qJ6uO5iU8wX2zQ1yP4rS5tU6vW";

    if (!user || !user.passwordHash || (!user.active && user.role !== "HEAD_TUTOR")) {
      await verifyPassword(password, DUMMY_HASH);
      const fail = recordFailedDualPasswordAttempt(ip, rawIdentifier);
      return NextResponse.json(
        { error: "Invalid email or password.", remainingAttempts: fail.remainingAttempts },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const fail = recordFailedDualPasswordAttempt(ip, rawIdentifier);
      return NextResponse.json(
        { error: "Invalid email or password.", remainingAttempts: fail.remainingAttempts },
        { status: 401 }
      );
    }

    // Successful login - reset dual rate limit
    resetDualPasswordRateLimit(ip, rawIdentifier);

    const token = createAuthToken({ id: user.id, role: user.role, tokenVersion: user.tokenVersion });
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: formatTutorName(user.name),
        email: user.email,
        role: user.role,
      },
    });

    setAuthCookie(response, token, user.role);

    return response;
  } catch (err: unknown) {
    console.error("[Auth API] Login error:", err);
    return NextResponse.json(
      { error: "An unexpected server error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
