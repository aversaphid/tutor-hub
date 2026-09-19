import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (user.role === "TUTEE") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestedTutorId = searchParams.get("tutorId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = {};

    if (user.role === "HEAD_TUTOR") {
      if (requestedTutorId) {
        where.tutorId = requestedTutorId;
      }
    } else {
      // Regular tutors can only see their own unavailability blocks
      where.tutorId = user.id;
    }

    if (from || to) {
      where.AND = [];
      if (from) {
        where.AND.push({ endTime: { gte: new Date(from) } });
      }
      if (to) {
        where.AND.push({ startTime: { lte: new Date(to) } });
      }
    }

    const unavailabilities = await (prisma as any).tutorUnavailability.findMany({
      where,
      include: {
        tutor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ unavailabilities });
  } catch (error) {
    console.error("Error fetching tutor unavailability:", error);
    return NextResponse.json(
      { error: "Failed to fetch unavailability records." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (user.role === "TUTEE") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await request.json();
    const { tutorId, startTime, endTime, type = "BUSY", reason, repeatWeeks } = body;

    const targetTutors: { id: string; name: string }[] = [];
    if (user.role === "HEAD_TUTOR" && (tutorId === "ALL" || body.tutorId === "ALL")) {
      const allActiveTutors = await prisma.user.findMany({
        where: { role: { in: ["TUTOR", "HEAD_TUTOR"] }, active: true },
        select: { id: true, name: true },
      });
      targetTutors.push(...allActiveTutors);
    } else {
      const singleId = user.role === "HEAD_TUTOR" && tutorId ? tutorId : user.id;
      targetTutors.push({ id: singleId, name: user.name || "Tutor" });
    }

    // Action: Copy all hourly unavailabilities from one week to target week
    if (body.action === "copy-week") {
      const { sourceMonday, targetMonday } = body;
      if (!sourceMonday || !targetMonday) {
        return NextResponse.json(
          { error: "sourceMonday and targetMonday are required." },
          { status: 400 }
        );
      }
      const srcStart = new Date(sourceMonday);
      const srcEnd = new Date(srcStart.getTime() + 7 * 24 * 3600 * 1000);
      const tgtStart = new Date(targetMonday);
      const diffMs = tgtStart.getTime() - srcStart.getTime();

      let totalCreated = 0;
      let totalSkipped = 0;

      for (const tutor of targetTutors) {
        const sourceBlocks = await (prisma as any).tutorUnavailability.findMany({
          where: {
            tutorId: tutor.id,
            type: "BUSY",
            startTime: { gte: srcStart, lt: srcEnd },
          },
        });

        for (const block of sourceBlocks) {
          const newStart = new Date(new Date(block.startTime).getTime() + diffMs);
          const newEnd = new Date(new Date(block.endTime).getTime() + diffMs);

          const conflictSession = await prisma.session.findFirst({
            where: {
              tutorId: tutor.id,
              status: { in: ["SCHEDULED", "DELAYED", "IN_PROGRESS"] },
              scheduledStartTime: { lt: newEnd },
              scheduledEndTime: { gt: newStart },
            },
          });

          const existingBlock = await (prisma as any).tutorUnavailability.findFirst({
            where: {
              tutorId: tutor.id,
              startTime: newStart,
              endTime: newEnd,
            },
          });

          if (conflictSession || existingBlock) {
            totalSkipped++;
            continue;
          }

          await (prisma as any).tutorUnavailability.create({
            data: {
              tutorId: tutor.id,
              startTime: newStart,
              endTime: newEnd,
              type: "BUSY",
              reason: block.reason,
            },
          });
          totalCreated++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Copied ${totalCreated} blackout block(s) to target week across ${targetTutors.length} tutor(s).${totalSkipped > 0 ? ` (${totalSkipped} skipped due to clashes or duplicates).` : ""}`,
        createdCount: totalCreated,
        skippedCount: totalSkipped,
      });
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "Start time and end time are required." },
        { status: 400 }
      );
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format provided." },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End time must be strictly after start time." },
        { status: 400 }
      );
    }

    const repeatCount =
      type === "BUSY" && repeatWeeks
        ? Math.min(12, Math.max(0, parseInt(String(repeatWeeks), 10)))
        : 0;

    const createdRecords = [];
    const skippedWeeks = [];
    const skippedConflicts: string[] = [];

    for (const tutor of targetTutors) {
      for (let w = 0; w <= repeatCount; w++) {
        const wStartDate = new Date(startDate.getTime() + w * 7 * 24 * 3600 * 1000);
        const wEndDate = new Date(endDate.getTime() + w * 7 * 24 * 3600 * 1000);

        // Safety check: Are there any scheduled active lessons during this requested period?
        const overlappingSessions = await prisma.session.findMany({
          where: {
            tutorId: tutor.id,
            status: { in: ["SCHEDULED", "DELAYED", "IN_PROGRESS"] },
            scheduledStartTime: { lt: wEndDate },
            scheduledEndTime: { gt: wStartDate },
          },
          include: {
            tutee: { select: { name: true } },
          },
        });

        if (overlappingSessions.length > 0) {
          if (targetTutors.length === 1 && w === 0) {
            const details = overlappingSessions
              .map(
                (s) =>
                  `${s.tutee.name} (${new Date(s.scheduledStartTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })})`
              )
              .join(", ");

            return NextResponse.json(
              {
                error: `Cannot set unavailable: there are ${overlappingSessions.length} active lesson(s) booked during this period (${details}). Please reschedule or cancel them first.`,
              },
              { status: 400 }
            );
          }
          skippedConflicts.push(`${tutor.name}`);
          skippedWeeks.push(w);
          continue;
        }

        const record = await (prisma as any).tutorUnavailability.create({
          data: {
            tutorId: tutor.id,
            startTime: wStartDate,
            endTime: wEndDate,
            type: type === "HOLIDAY" ? "HOLIDAY" : "BUSY",
            reason: reason?.trim() || null,
          },
          include: {
            tutor: {
              select: { id: true, name: true },
            },
          },
        });
        createdRecords.push(record);
      }
    }

    const isAllTutors = targetTutors.length > 1;
    const message = isAllTutors
      ? `Set unavailability across all ${targetTutors.length} tutors (${createdRecords.length} block(s) created).${skippedConflicts.length > 0 ? ` (${skippedConflicts.length} clash(es) skipped).` : ""}`
      : repeatCount > 0
      ? `Created ${createdRecords.length} recurring blackout blocks across ${repeatCount + 1} weeks!${skippedWeeks.length > 0 ? ` (${skippedWeeks.length} weeks skipped due to existing lessons).` : ""}`
      : undefined;

    return NextResponse.json(
      {
        unavailability: createdRecords[0],
        createdCount: createdRecords.length,
        message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating tutor unavailability:", error);
    return NextResponse.json(
      { error: "Failed to create unavailability block." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (user.role === "TUTEE") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required." }, { status: 400 });
    }

    const record = await (prisma as any).tutorUnavailability.findUnique({
      where: { id },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    // Tutors can only delete their own blocks
    if (user.role !== "HEAD_TUTOR" && record.tutorId !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own unavailability blocks." },
        { status: 403 }
      );
    }

    await (prisma as any).tutorUnavailability.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tutor unavailability:", error);
    return NextResponse.json(
      { error: "Failed to delete unavailability block." },
      { status: 500 }
    );
  }
}
