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

    if (session.status === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Cannot delay a lesson that has already started." },
        { status: 400 }
      );
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

    // Shift start and end times by the delay
    const newDelayTotal = session.delayMinutes + delayMinutes;
    const newStart = new Date(
      session.scheduledStartTime.getTime() + delayMinutes * 60 * 1000
    );
    const newEnd = new Date(
      session.scheduledEndTime.getTime() + delayMinutes * 60 * 1000
    );

    const updated = await prisma.session.update({
      where: { id },
      data: {
        delayMinutes: newDelayTotal,
        scheduledStartTime: newStart,
        scheduledEndTime: newEnd,
        status: "DELAYED",
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
