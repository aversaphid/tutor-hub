import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const TopicSchema = z.object({
  studentTopic: z.string().trim().max(300).nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    // Only the student (tutee) for this session can set the topic
    if (user.role !== "TUTEE" || existing.tuteeId !== user.id) {
      return NextResponse.json({ error: "Forbidden. Only the student can set the topic." }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = TopicSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const updated = await prisma.session.update({
      where: { id },
      data: { studentTopic: parseResult.data.studentTopic || null },
    });

    return NextResponse.json({ success: true, studentTopic: updated.studentTopic });
  } catch (err) {
    console.error("Topic PATCH error:", err);
    return NextResponse.json({ error: "Failed to update topic." }, { status: 500 });
  }
}
