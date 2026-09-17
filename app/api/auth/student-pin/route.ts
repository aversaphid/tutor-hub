import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StudentPinLoginSchema } from "@/lib/validations";
import {
  checkPinRateLimit,
  recordFailedPinAttempt,
  resetPinRateLimit,
} from "@/lib/rate-limiter";
import { createAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = StudentPinLoginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { tuteeId, pin } = parseResult.data;

    // Rate limiting check
    const rateLimitCheck = checkPinRateLimit(tuteeId);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: rateLimitCheck.error,
          lockedMinutesRemaining: rateLimitCheck.lockedMinutesRemaining,
        },
        { status: 429 }
      );
    }

    // Query student from DB (Parameterized query via Prisma prevents SQL injection)
    const student = await prisma.user.findFirst({
      where: {
        id: tuteeId,
        role: "TUTEE",
        active: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    // Verify PIN
    if (student.pin !== pin) {
      const failResult = recordFailedPinAttempt(tuteeId);
      return NextResponse.json(
        {
          error: failResult.error,
          remainingAttempts: failResult.remainingAttempts,
          lockedMinutesRemaining: failResult.lockedMinutesRemaining,
        },
        { status: 401 }
      );
    }

    // PIN is correct, reset rate limit
    resetPinRateLimit(tuteeId);

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
