import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CreateSessionSchema } from "@/lib/validations";
import { detectSessionConflict } from "@/lib/conflict-detector";
import { logSessionAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get("tutorId");
    const tuteeId = searchParams.get("tuteeId");
    const status = searchParams.get("status");

    const where: any = {};

    if (user.role === "TUTEE") {
      // Students can ONLY ever view their own sessions
      where.tuteeId = user.id;
    } else if (user.role === "TUTOR") {
      // Tutors can only view their own sessions or sessions of students assigned to them
      where.OR = [
        { tutorId: user.id },
        { tutee: { assignedTutorId: user.id } },
      ];
      if (status) where.status = status;
    } else if (user.role === "HEAD_TUTOR") {
      // Admin can filter by tutor or student
      if (tutorId) where.tutorId = tutorId;
      if (tuteeId) where.tuteeId = tuteeId;
    } else {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (status && user.role !== "TUTOR") {
      where.status = status;
    }

    const isStudent = user.role === "TUTEE";

    const sessions = await prisma.session.findMany({
      where,
      include: {
        tutor: { select: { id: true, name: true, email: true } },
        tutee: {
          select: {
            id: true,
            name: true,
            // Only expose PIN and magicKey to Tutors and Admins for student assistance
            pin: !isStudent,
            magicKey: !isStudent,
            assignedTutorId: true,
          },
        },
        auditLogs: isStudent
          ? false
          : {
              take: 5,
              orderBy: { timestamp: "desc" },
              include: { actor: { select: { name: true, role: true } } },
            },
      },
      orderBy: { scheduledStartTime: "asc" },
    });

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("Sessions GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch sessions." },
      { status: 500 }
    );
  }
}

// ONLY Admin can schedule lessons
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "HEAD_TUTOR") {
      return NextResponse.json(
        { error: "Unauthorized. Only the admin can schedule lessons." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = CreateSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const {
      title,
      tutorId,
      tuteeId,
      scheduledStartTime,
      scheduledEndTime,
      teamsMeetingUrl,
      notes,
      adminReminder,
      tutorConfirmed,
      tuteeConfirmed,
    } = parseResult.data;

    const start = new Date(scheduledStartTime);
    const end = new Date(scheduledEndTime);

    // Conflict detection engine
    const conflict = await detectSessionConflict({
      tutorId,
      tuteeId,
      startTime: start,
      endTime: end,
    });

    if (conflict.hasConflict) {
      return NextResponse.json(
        { error: conflict.reason, conflict: true },
        { status: 409 }
      );
    }

    // Lookup student name for clean default title if omitted
    const student = await prisma.user.findUnique({
      where: { id: tuteeId },
      select: { name: true },
    });

    const finalTitle = title?.trim() || `${student?.name || "Student"} - Maths Lesson`;

    const session = await prisma.session.create({
      data: {
        title: finalTitle,
        tutorId,
        tuteeId,
        scheduledStartTime: start,
        scheduledEndTime: end,
        teamsMeetingUrl: teamsMeetingUrl || null,
        notes: notes || null,
        adminReminder: adminReminder ? adminReminder.trim() : null,
        tutorConfirmed: tutorConfirmed ?? false,
        tuteeConfirmed: tuteeConfirmed ?? false,
        status: "SCHEDULED",
      },
      include: {
        tutor: { select: { id: true, name: true, email: true } },
        tutee: { select: { id: true, name: true, pin: true, magicKey: true } },
      },
    });

    await logSessionAudit({
      sessionId: session.id,
      actorId: user.id,
      action: "CREATED",
      details: `Lesson scheduled by Admin.`,
    });

    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (err) {
    console.error("Session creation error:", err);
    return NextResponse.json(
      { error: "Failed to create session." },
      { status: 500 }
    );
  }
}
