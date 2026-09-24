import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MagicKeySchema } from "@/lib/validations";
import { createAuthToken, setAuthCookie } from "@/lib/auth";
import {
  getClientIp,
  checkMagicKeyRateLimit,
  recordFailedMagicKeyAttempt,
  resetMagicKeyRateLimit,
} from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimitCheck = checkMagicKeyRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: rateLimitCheck.error,
          lockedMinutesRemaining: rateLimitCheck.lockedMinutesRemaining,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parseResult = MagicKeySchema.safeParse(body?.key);

    if (!parseResult.success) {
      recordFailedMagicKeyAttempt(ip);
      return NextResponse.json(
        { error: "Invalid magic key format." },
        { status: 400 }
      );
    }

    const key = parseResult.data;

    const student = await prisma.user.findUnique({
      where: { magicKey: key },
    });

    if (!student || !student.active || student.role !== "TUTEE") {
      const fail = recordFailedMagicKeyAttempt(ip);
      return NextResponse.json(
        { error: "Magic link is invalid or expired.", remainingAttempts: fail.remainingAttempts },
        { status: 404 }
      );
    }

    resetMagicKeyRateLimit(ip);

    const token = createAuthToken({ id: student.id, role: student.role });
    const response = NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        magicKey: student.magicKey,
      },
    });

    setAuthCookie(response, token, student.role);

    return response;
  } catch (err) {
    console.error("Magic link auth error:", err);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
