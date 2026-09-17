import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MagicKeySchema } from "@/lib/validations";
import { createAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = MagicKeySchema.safeParse(body?.key);

    if (!parseResult.success) {
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
      return NextResponse.json(
        { error: "Magic link is invalid or expired." },
        { status: 404 }
      );
    }

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
    console.error("Magic link auth error:", err);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
