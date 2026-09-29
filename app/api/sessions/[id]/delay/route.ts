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
    const now = new Date();
    const nowMs = now.getTime();

    // Calculate new start time:
    // If the lesson is scheduled or in progress, delaying by delayMinutes extends from scheduled start.
    // E.g., if scheduled start is 5:00 PM, and 2 mins have elapsed (now is 5:02 PM),
    // delaying by 5 minutes results in 5:05 PM (which is 3 mins from the moment clicked).
    // If scheduledStartTime + delayMinutes is already in the past (e.g., 7 mins elapsed and delayed by 5 mins),
    // the new start time is set to now + delayMinutes so it is always in the future.
    const scheduledStartMs = session.scheduledStartTime.getTime();
    const prospectiveStartMs = scheduledStartMs + delayMinutes * 60 * 1000;

    let newStart: Date;
    let addedDelay: number;

    if (prospectiveStartMs > nowMs) {
      newStart = new Date(prospectiveStartMs);
      addedDelay = delayMinutes;
    } else {
      newStart = new Date(nowMs + delayMinutes * 60 * 1000);
      addedDelay = Math.max(
        delayMinutes,
        Math.ceil((newStart.getTime() - scheduledStartMs) / (60 * 1000))
      );
    }

    const durationMs =
      session.scheduledEndTime.getTime() - session.scheduledStartTime.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);
    const newDelayTotal = session.delayMinutes + addedDelay;

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
