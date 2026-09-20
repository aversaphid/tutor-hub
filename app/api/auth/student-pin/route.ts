import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StudentPinLoginSchema } from "@/lib/validations";
import {
  getClientIp,
  checkPinRateLimit,
  recordFailedPinAttempt,
  resetPinRateLimit,
} from "@/lib/rate-limiter";
import { createAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
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
    const rateLimitKey = `${ip}:${tuteeId || "direct"}`;

    // Rate limiting check
    const rateLimitCheck = checkPinRateLimit(rateLimitKey);
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
      const failResult = recordFailedPinAttempt(rateLimitKey);
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
    resetPinRateLimit(rateLimitKey);

    const token = createAuthToken({ id: student.id, role: student.role });
    const response = NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        magicKey: student.magicKey,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (err) {
    console.error("Student PIN login error:", err);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
