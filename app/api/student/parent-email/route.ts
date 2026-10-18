import { NextResponse } from "next/server";
import { getCurrentUser, clearUserCache } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateMultiEmails, normalizeMultiEmails } from "@/lib/email-utils";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "TUTEE") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const rawInput = body.parentEmail !== undefined ? body.parentEmail : null;

    if (rawInput && typeof rawInput === "string" && rawInput.trim()) {
      const validation = validateMultiEmails(rawInput);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || "Please provide valid email address(es)." },
          { status: 400 }
        );
      }
    }

    const emailValue = normalizeMultiEmails(rawInput);

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
