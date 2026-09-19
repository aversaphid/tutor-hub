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
    const { tutorId, startTime, endTime, type = "BUSY", reason } = body;

    const targetTutorId =
      user.role === "HEAD_TUTOR" && tutorId ? tutorId : user.id;

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

    // Safety check: Are there any scheduled active lessons during this requested period?
    const overlappingSessions = await prisma.session.findMany({
      where: {
        tutorId: targetTutorId,
        status: { in: ["SCHEDULED", "DELAYED", "IN_PROGRESS"] },
        scheduledStartTime: { lt: endDate },
        scheduledEndTime: { gt: startDate },
      },
      include: {
        tutee: { select: { name: true } },
      },
    });

    if (overlappingSessions.length > 0) {
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

    const record = await (prisma as any).tutorUnavailability.create({
      data: {
        tutorId: targetTutorId,
        startTime: startDate,
        endTime: endDate,
        type: type === "HOLIDAY" ? "HOLIDAY" : "BUSY",
        reason: reason?.trim() || null,
      },
      include: {
        tutor: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ unavailability: record }, { status: 201 });
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
