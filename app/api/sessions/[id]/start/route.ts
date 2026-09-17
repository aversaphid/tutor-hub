import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logSessionAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "HEAD_TUTOR" && user.role !== "TUTOR")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const session = await prisma.session.findUnique({ where: { id } });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (user.role === "TUTOR" && session.tutorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. You can only start your own sessions." },
        { status: 403 }
      );
    }

    const now = new Date();
    const isEarly = now < session.scheduledStartTime;

    const updated = await prisma.session.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        actualStartTime: now,
      },
      include: {
        tutor: { select: { name: true } },
        tutee: { select: { name: true } },
      },
    });

    await logSessionAudit({
      sessionId: id,
      actorId: user.id,
      action: isEarly ? "STARTED_EARLY" : "STARTED_EARLY",
      details: isEarly
        ? `Tutor started session early at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
        : `Tutor started session at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
    });

    return NextResponse.json({
      success: true,
      session: updated,
      message: "Session is now in progress!",
    });
  } catch (err) {
    console.error("Start session error:", err);
    return NextResponse.json(
      { error: "Failed to start session." },
      { status: 500 }
    );
  }
}
