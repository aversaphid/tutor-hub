import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifyPassword, hashPassword, clearUserCache, createAuthToken, setAuthCookie } from "@/lib/auth";
import { checkPasswordRateLimit, recordFailedPasswordAttempt, resetPasswordRateLimit } from "@/lib/rate-limiter";
import { z } from "zod";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(5, "New password must be at least 5 characters"),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = ChangePasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parseResult.data;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser || !dbUser.passwordHash) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const rateLimitKey = `pwd-change:${user.id}`;
    const rateCheck = checkPasswordRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: rateCheck.error || "Too many failed attempts. Please wait 15 minutes." },
        { status: 429 }
      );
    }

    const isMatch = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!isMatch) {
      const fail = recordFailedPasswordAttempt(rateLimitKey);
      return NextResponse.json(
        { error: fail.error || "Incorrect current password. Please try again." },
        { status: 400 }
      );
    }

    resetPasswordRateLimit(rateLimitKey);

    const newHash = await hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 },
      },
      select: { id: true, role: true, tokenVersion: true },
    });

    clearUserCache(user.id);

    const response = NextResponse.json({
      success: true,
      message: "Password changed successfully!",
    });

    const refreshedToken = createAuthToken({
      id: updatedUser.id,
      role: updatedUser.role,
      tokenVersion: updatedUser.tokenVersion,
    });
    setAuthCookie(response, refreshedToken, updatedUser.role);

    return response;
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { error: "Failed to update password." },
      { status: 500 }
    );
  }
}
