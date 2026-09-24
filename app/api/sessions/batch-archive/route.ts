import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { BatchArchiveSessionsSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "HEAD_TUTOR") {
      return NextResponse.json(
        { error: "Unauthorized. Only administrators can batch archive paid lessons." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = BatchArchiveSessionsSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { startDate, endDate, sessionIds } = parseResult.data;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const where: any = {
      tutorPaid: false,
      status: { not: "CANCELLED" },
    };

    if (sessionIds && sessionIds.length > 0) {
      where.id = { in: sessionIds };
    } else {
      where.scheduledStartTime = { gte: start };
      where.scheduledEndTime = { lte: end };
    }

    // Find all matching unpaid lessons with tutor & student pay info
    const sessionsToArchive = await prisma.session.findMany({
      where,
      select: {
        id: true,
        title: true,
        scheduledStartTime: true,
        studentPay: true,
        tutorPay: true,
        tutee: {
          select: {
            name: true,
            studentPay: true,
            tutorPay: true,
          },
        },
      },
    });

    if (sessionsToArchive.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        totalPayout: 0,
        message: "No unpaid completed lessons found in the selected date range.",
      });
    }

    const ids = sessionsToArchive.map((s) => s.id);
    const totalPayout = sessionsToArchive.reduce(
      (sum, s) => sum + (s.tutorPay ?? s.tutee?.tutorPay ?? 0),
      0
    );

    const now = new Date();

    // Batch update to mark tutorPaid = true, tutorPaidAt = now, and snapshot rates to freeze historical records
    await prisma.$transaction(
      sessionsToArchive.map((s) =>
        prisma.session.update({
          where: { id: s.id },
          data: {
            tutorPaid: true,
            tutorPaidAt: now,
            studentPay: s.studentPay ?? s.tutee?.studentPay ?? null,
            tutorPay: s.tutorPay ?? s.tutee?.tutorPay ?? null,
          },
        })
      )
    );

    // Create an audit log record for each session
    try {
      await prisma.auditLog.createMany({
        data: ids.map((sessionId) => ({
          sessionId,
          actorId: user.id,
          action: "TUTOR_PAID",
          details: `Batch marked as PAID by Admin. Date range: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.`,
        })),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      count: ids.length,
      totalPayout,
      message: `Successfully moved ${ids.length} lesson${
        ids.length === 1 ? "" : "s"
      } to Archived (Total payout: £${totalPayout.toFixed(2)}).`,
    });
  } catch (err) {
    console.error("Batch archive error:", err);
    return NextResponse.json(
      { error: "Failed to batch archive lessons." },
      { status: 500 }
    );
  }
}
