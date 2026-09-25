import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StudentPinLoginSchema } from "@/lib/validations";
import {
  getClientIp,
  checkDualPinRateLimit,
  recordFailedDualPinAttempt,
  resetDualPinRateLimit,
} from "@/lib/rate-limiter";
import { createAuthToken, setAuthCookie } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const parseResult = StudentPinLoginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { tuteeId, pin } = parseResult.data;

    // Dual-tier rate limiting check (IP network tier + Student key tier)
    const rateLimitCheck = checkDualPinRateLimit(ip, tuteeId);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: rateLimitCheck.error,
          lockedMinutesRemaining: rateLimitCheck.lockedMinutesRemaining,
        },
        { status: 429 }
      );
    }

    // Query student from DB by tuteeId (if provided) or directly by unique PIN
    const student = tuteeId
      ? await prisma.user.findFirst({
          where: {
            id: tuteeId,
            role: "TUTEE",
            active: true,
          },
        })
      : await prisma.user.findFirst({
          where: {
            pin,
            role: "TUTEE",
            active: true,
          },
        });

    const isPinValid = Boolean(
      student &&
      student.pin &&
      student.pin.length === pin.length &&
      crypto.timingSafeEqual(Buffer.from(student.pin), Buffer.from(pin))
    );

    if (!student || !isPinValid) {
      const failResult = recordFailedDualPinAttempt(ip, tuteeId);
      return NextResponse.json(
        {
          error: failResult.error || "Incorrect PIN.",
          remainingAttempts: failResult.remainingAttempts,
          lockedMinutesRemaining: failResult.lockedMinutesRemaining,
        },
        { status: 401 }
      );
    }

    // PIN is correct, reset rate limit
    resetDualPinRateLimit(ip, tuteeId);

    const token = createAuthToken({ id: student.id, role: student.role, tokenVersion: student.tokenVersion });
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
    console.error("Student PIN login error:", err);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
