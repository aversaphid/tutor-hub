import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
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

    // 1. Query student from DB by tuteeId (if provided) or directly by unique PIN
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

    // 2. Check authoritative database lock state for the student
    if (student?.pinLockedUntil) {
      const lockTime = new Date(student.pinLockedUntil).getTime();
      const now = Date.now();
      if (lockTime > now) {
        const remainingMinutes = Math.max(1, Math.ceil((lockTime - now) / 60000));
        return NextResponse.json(
          {
            error: `Account PIN locked for ${remainingMinutes} minute${
              remainingMinutes > 1 ? "s" : ""
            } due to repeated failed attempts. Please contact your tutor or admin to unlock it.`,
            lockedMinutesRemaining: remainingMinutes,
            isPinLocked: true,
          },
          { status: 429 }
        );
      } else {
        // Lockout expired, reset counters in DB and in-memory
        await prisma.user.update({
          where: { id: student.id },
          data: { failedPinAttempts: 0, pinLockedUntil: null },
        });
        resetDualPinRateLimit(ip, student.id);
      }
    }

    // 3. Dual-tier network rate limiting check (IP network tier + Student key tier)
    // If student is known and verified unlocked in DB, in-memory student rate limit is synced
    const rateLimitCheck = checkDualPinRateLimit(ip, tuteeId);
    if (!rateLimitCheck.allowed && (!student || (student.failedPinAttempts || 0) >= 5)) {
      return NextResponse.json(
        {
          error: rateLimitCheck.error,
          lockedMinutesRemaining: rateLimitCheck.lockedMinutesRemaining,
          isPinLocked: true,
        },
        { status: 429 }
      );
    }


    const isPinValid = Boolean(
      student &&
      student.pin &&
      student.pin.length === pin.length &&
      crypto.timingSafeEqual(Buffer.from(student.pin), Buffer.from(pin))
    );

    if (!student || !isPinValid) {
      const failResult = recordFailedDualPinAttempt(ip, tuteeId);

      // If student is known (e.g. via tuteeId), persist failed attempt & lock state in DB
      if (student) {
        const attempts = (student.failedPinAttempts || 0) + 1;
        const isLocked = attempts >= 5;
        const pinLockedUntil = isLocked ? new Date(Date.now() + 15 * 60 * 1000) : null;

        await prisma.user.update({
          where: { id: student.id },
          data: {
            failedPinAttempts: attempts,
            pinLockedUntil,
          },
        });

        if (isLocked) {
          return NextResponse.json(
            {
              error:
                "Maximum failed PIN attempts exceeded (5). Account locked for 15 minutes. Please contact your tutor or admin to unlock it.",
              remainingAttempts: 0,
              lockedMinutesRemaining: 15,
              isPinLocked: true,
            },
            { status: 429 }
          );
        }

        const remaining = Math.max(0, 5 - attempts);
        return NextResponse.json(
          {
            error: `Incorrect PIN. ${remaining} attempt${
              remaining === 1 ? "" : "s"
            } remaining before temporary 15-minute lock.`,
            remainingAttempts: remaining,
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          error: failResult.error || "Incorrect PIN.",
          remainingAttempts: failResult.remainingAttempts,
          lockedMinutesRemaining: failResult.lockedMinutesRemaining,
        },
        { status: 401 }
      );
    }

    // PIN is correct: reset DB lock & in-memory rate limit
    if (student.failedPinAttempts > 0 || student.pinLockedUntil) {
      await prisma.user.update({
        where: { id: student.id },
        data: { failedPinAttempts: 0, pinLockedUntil: null },
      });
    }
    resetDualPinRateLimit(ip, student.id);

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
