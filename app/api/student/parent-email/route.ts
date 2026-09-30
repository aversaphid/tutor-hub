import { NextResponse } from "next/server";
import { getCurrentUser, clearUserCache } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ParentEmailSchema = z.object({
  parentEmail: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "TUTEE") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ParentEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid parent email format." },
        { status: 400 }
      );
    }

    const emailValue =
      parsed.data.parentEmail && parsed.data.parentEmail.trim()
        ? parsed.data.parentEmail.trim().toLowerCase()
        : null;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { parentEmail: emailValue },
      select: {
        id: true,
        name: true,
        parentEmail: true,
      },
    });

    clearUserCache(user.id);

    return NextResponse.json({
      success: true,
      parentEmail: updated.parentEmail,
      message: "Parent contact email saved successfully!",
    });
  } catch (err) {
    console.error("Student parent email update error:", err);
    return NextResponse.json(
      { error: "Failed to update parent contact email." },
      { status: 500 }
    );
  }
}
