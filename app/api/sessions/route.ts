import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { getCurrentUser } from "@/lib/auth";
import { CreateSessionSchema } from "@/lib/validations";
import { detectSessionConflict } from "@/lib/conflict-detector";
import { logSessionAudit } from "@/lib/audit";
import { sanitizeSessionsForRole } from "@/lib/session-sanitizer";
import crypto from "crypto";

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
    const activeOnly = searchParams.get("active") === "true";

    // Auto-start any scheduled or delayed lessons that have reached their scheduled start time
    const now = new Date();
    try {
      await prisma.session.updateMany({
        where: {
          status: { in: ["SCHEDULED", "DELAYED"] },
          scheduledStartTime: { lte: now },
          scheduledEndTime: { gt: now },
        },
        data: {
          status: "IN_PROGRESS",
          actualStartTime: now,
        },
      });

      // Auto-resolve abandoned/zombie sessions (>3 hours past scheduledEndTime still marked IN_PROGRESS)
      await prisma.session.updateMany({
        where: {
          status: "IN_PROGRESS",
          scheduledEndTime: { lt: new Date(now.getTime() - 3 * 3600 * 1000) },
        },
        data: {
          status: "COMPLETED",
        },
      });
    } catch (e) {
      console.error("Auto-start/auto-resolve sessions error in /api/sessions:", e);
    }

    const where: any = {};

    if (user.role === "TUTEE") {
      // Students can ONLY ever view their own sessions
      where.tuteeId = user.id;
      // Optimize: student lobby only needs active/upcoming sessions and recent cancelled (last 7 days)
      if (activeOnly || !status) {
        where.scheduledEndTime = {
          gte: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        };
      }
    } else if (user.role === "TUTOR") {
      // Tutors can view sessions where they are the tutor OR sessions of their assigned students
      const tutorFilter: any[] = [
        { tutorId: user.id },
        { tutee: { assignedTutorId: user.id } },
      ];
      if (tuteeId) {
        where.AND = [
          { OR: tutorFilter },
          { tuteeId },
        ];
      } else if (tutorId) {
        where.AND = [
          { OR: tutorFilter },
          { tutorId },
        ];
      } else {
        where.OR = tutorFilter;
      }
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
            // Only expose PIN and magicKey to Tutors/Admins, and restrict studentPay strictly to Head Admin
            pin: !isStudent,
            magicKey: !isStudent,
            assignedTutorId: true,
            studentPay: user.role === "HEAD_TUTOR",
            tutorPay: !isStudent,
          },
        },
      },
      orderBy: { scheduledStartTime: "asc" },
    });

    const sanitizedSessions = sanitizeSessionsForRole(sessions, user.role);

    // Compute lightweight ETag for cache validation
    const etagSeed = sanitizedSessions
      .map((s) => `${s.id}-${new Date(s.updatedAt).getTime()}`)
      .join(":");
    const etag = `"${crypto.createHash("md5").update(etagSeed).digest("hex")}"`;

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache",
        },
      });
    }

    return NextResponse.json(
      { sessions: sanitizedSessions },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
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
      unlockEarlyMinutes = 5,
      notes,
      adminReminder,
      tutorConfirmed,
      tuteeConfirmed,
      repeatWeeks = 1,
      repeatIntervalWeeks = 1,
      allowOverlap = false,
    } = parseResult.data;

    const baseStart = new Date(scheduledStartTime);
    const baseEnd = new Date(scheduledEndTime);
    const durationMs = baseEnd.getTime() - baseStart.getTime();

    const weeksToSchedule = Math.max(1, Math.min(repeatWeeks, 12));
    const intervalDays = Math.max(1, Math.min(repeatIntervalWeeks, 4)) * 7;

    // Lookup student name for clean default title if omitted
    const student = await prisma.user.findUnique({
      where: { id: tuteeId },
      select: { name: true },
    });
    const finalTitle = title?.trim() || `${student?.name || "Student"} - Maths Lesson`;

    // 1. Conflict detection engine across all scheduled sessions (unless explicitly overridden)
    if (!allowOverlap) {
      for (let w = 0; w < weeksToSchedule; w++) {
        const sessionStart = new Date(baseStart.getTime() + w * intervalDays * 24 * 3600 * 1000);
        const sessionEnd = new Date(sessionStart.getTime() + durationMs);

        const conflict = await detectSessionConflict({
          tutorId,
          tuteeId,
          startTime: sessionStart,
          endTime: sessionEnd,
        });

        if (conflict.hasConflict) {
          const sessionLabel = weeksToSchedule > 1 ? ` (Session ${w + 1} - ${sessionStart.toLocaleDateString([], { month: "short", day: "numeric" })})` : "";
          return NextResponse.json(
            { error: `${conflict.reason}${sessionLabel}`, conflict: true },
            { status: 409 }
          );
        }
      }
    }

    // 2. Create the sessions
    const createdSessions = [];
    for (let w = 0; w < weeksToSchedule; w++) {
      const sessionStart = new Date(baseStart.getTime() + w * intervalDays * 24 * 3600 * 1000);
      const sessionEnd = new Date(sessionStart.getTime() + durationMs);

      const session = await prisma.session.create({
        data: {
          title: finalTitle,
          tutorId,
          tuteeId,
          scheduledStartTime: sessionStart,
          scheduledEndTime: sessionEnd,
          teamsMeetingUrl: teamsMeetingUrl || null,
          unlockEarlyMinutes,
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
        details: weeksToSchedule > 1
          ? `Recurring ${repeatIntervalWeeks === 2 ? "biweekly" : "weekly"} lesson (session ${w + 1} of ${weeksToSchedule}) scheduled by Admin.`
          : `Lesson scheduled by Admin.`,
      });

      createdSessions.push(session);
    }

    return NextResponse.json({
      success: true,
      session: createdSessions[0],
      sessions: createdSessions,
      count: createdSessions.length,
      message: weeksToSchedule > 1
        ? `Successfully scheduled ${weeksToSchedule} ${repeatIntervalWeeks === 2 ? "biweekly" : "weekly"} lessons!`
        : "Lesson scheduled successfully!",
    }, { status: 201 });
  } catch (err) {
    console.error("Session creation error:", err);
    return NextResponse.json(
      { error: "Failed to create session." },
      { status: 500 }
    );
  }
}
