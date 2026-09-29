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

    if (session.status === "COMPLETED" || session.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot reset start time for a lesson that is already completed or cancelled." },
        { status: 400 }
      );
    }

    if (user.role === "TUTOR" && session.tutorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. You can only modify your own sessions." },
        { status: 403 }
      );
    }

    const now = new Date();
    const durationMs =
      session.scheduledEndTime.getTime() - session.scheduledStartTime.getTime();

    // Revert delayMinutes from scheduledStartTime and scheduledEndTime
    let originalStart: Date;
    if (session.delayMinutes > 0) {
      originalStart = new Date(
        session.scheduledStartTime.getTime() - session.delayMinutes * 60 * 1000
      );
    } else {
      originalStart = new Date(session.scheduledStartTime);
    }
    originalStart.setSeconds(0, 0);

    const originalEnd = new Date(originalStart.getTime() + durationMs);
    originalEnd.setSeconds(0, 0);

    // Determine status based on current time and original scheduled window
    let newStatus = session.status;
    let newActualStart = session.actualStartTime;

    if (now < originalStart) {
      newStatus = "SCHEDULED";
      newActualStart = null;
    } else if (now >= originalStart && now < originalEnd) {
      newStatus = "IN_PROGRESS";
      newActualStart = session.actualStartTime || now;
    }

    const updated = await prisma.session.update({
      where: { id },
      data: {
        scheduledStartTime: originalStart,
        scheduledEndTime: originalEnd,
        delayMinutes: 0,
        delayReason: null,
        status: newStatus,
        actualStartTime: newActualStart,
      },
      include: {
        tutor: { select: { name: true } },
        tutee: { select: { name: true } },
      },
    });

    const timeStr = originalStart.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const detailText =
      session.delayMinutes > 0
        ? `Start time reset to original schedule: ${timeStr} (removed ${session.delayMinutes}m delay)`
        : `Start time reset to scheduled time: ${timeStr}`;

    await logSessionAudit({
      sessionId: id,
      actorId: user.id,
      action: "START_TIME_RESET",
      details: detailText,
    });

    try {
      const { broadcastSessionUpdate } = await import("@/lib/sse-bus");
      broadcastSessionUpdate({ type: "SESSION_UPDATED", sessionId: id });
      broadcastSessionUpdate({ type: "STATUS_UPDATED", sessionId: id });
    } catch {}

    return NextResponse.json({
      success: true,
      session: updated,
      message: `Start time successfully reset to ${timeStr}.`,
    });
  } catch (err) {
    console.error("Reset start time error:", err);
    return NextResponse.json(
      { error: "Failed to reset start time." },
      { status: 500 }
    );
  }
}
