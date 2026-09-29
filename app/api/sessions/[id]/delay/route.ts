import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { DelaySessionSchema } from "@/lib/validations";
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
        { error: "Cannot delay a lesson that is already completed or cancelled." },
        { status: 400 }
      );
    }

    if (user.role === "TUTOR" && session.tutorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. You can only delay your own sessions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = DelaySessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { delayMinutes, reason } = parseResult.data;

    // Calculate new start time by adding delayMinutes directly to the intended scheduled start time
    const currentStart = new Date(session.scheduledStartTime);
    currentStart.setSeconds(0, 0);

    const newStart = new Date(currentStart.getTime() + delayMinutes * 60 * 1000);
    newStart.setSeconds(0, 0);

    const durationMs =
      session.scheduledEndTime.getTime() - session.scheduledStartTime.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);
    newEnd.setSeconds(0, 0);

    const newDelayTotal = session.delayMinutes + delayMinutes;

    const updated = await prisma.session.update({
      where: { id },
      data: {
        delayMinutes: newDelayTotal,
        delayReason: reason?.trim() || null,
        scheduledStartTime: newStart,
        scheduledEndTime: newEnd,
        status: "DELAYED",
        actualStartTime: null,
      },
      include: {
        tutor: { select: { name: true } },
        tutee: { select: { name: true } },
      },
    });

    // Write audit log
    const detailText = `Delayed by ${delayMinutes} min${
      delayMinutes > 1 ? "s" : ""
    }${reason ? ` (${reason})` : ""}. Total delay: ${newDelayTotal} min. New start: ${newStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    await logSessionAudit({
      sessionId: id,
      actorId: user.id,
      action: "DELAYED",
      details: detailText,
    });

    try {
      const { broadcastSessionUpdate } = await import("@/lib/sse-bus");
      broadcastSessionUpdate({ type: "SESSION_DELAYED", sessionId: id });
    } catch {}

    return NextResponse.json({
      success: true,
      session: updated,
      message: `Session successfully delayed by ${delayMinutes} minutes.`,
    });
  } catch (err) {
    console.error("Delay session error:", err);
    return NextResponse.json(
      { error: "Failed to delay session." },
      { status: 500 }
    );
  }
}
