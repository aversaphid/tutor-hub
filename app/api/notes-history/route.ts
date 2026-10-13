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

    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get("studentId");

    let targetStudentId = studentIdParam;

    // Authorization checks:
    if (user.role === "TUTEE") {
      // Students can ONLY ever view their own notes history
      targetStudentId = user.id;
    } else if (user.role === "TUTOR") {
      if (!targetStudentId) {
        return NextResponse.json(
          { error: "studentId query parameter is required for tutors." },
          { status: 400 }
        );
      }

      // Tutors can only view notes for students they tutor or who are assigned to them
      const student = await prisma.user.findUnique({
        where: { id: targetStudentId },
        select: { id: true, name: true, assignedTutorId: true },
      });

      if (!student) {
        return NextResponse.json({ error: "Student not found." }, { status: 404 });
      }

      const hasTaught = await prisma.session.findFirst({
        where: {
          tuteeId: targetStudentId,
          tutorId: user.id,
        },
        select: { id: true },
      });

      const isAssigned = student.assignedTutorId === user.id;

      if (!isAssigned && !hasTaught) {
        return NextResponse.json(
          { error: "Forbidden. You are not assigned to this student." },
          { status: 403 }
        );
      }
    } else if (user.role === "HEAD_TUTOR") {
      // Admins can view any student, but must provide studentId
      if (!targetStudentId) {
        return NextResponse.json(
          { error: "studentId query parameter is required for admins." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Fetch student info
    const studentInfo = await prisma.user.findUnique({
      where: { id: targetStudentId },
      select: { id: true, name: true, email: true, parentEmail: true },
    });

    if (!studentInfo) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const isStaff = user.role === "TUTOR" || user.role === "HEAD_TUTOR";

    // Fetch sessions that have feedbackNotes or feedbackCovered or admin notes (for staff)
    const rawSessions = await prisma.session.findMany({
      where: {
        tuteeId: targetStudentId,
        status: { not: "CANCELLED" },
        OR: [
          { feedbackNotes: { not: null } },
          { feedbackCovered: { not: null } },
          ...(isStaff ? [{ notes: { not: null } }, { adminReminder: { not: null } }] : []),
        ],
      },
      select: {
        id: true,
        title: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        actualStartTime: true,
        actualEndTime: true,
        status: true,
        feedbackCovered: true,
        feedbackNotes: true,
        studentTopic: true,
        notes: true,
        adminReminder: true,
        tutor: {
          select: {
            id: true,
            name: true,
          },
        },
        tutee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        scheduledStartTime: "desc",
      },
    });

    // Filter to entries that have non-empty notes or feedback (and strip admin fields for students)
    const history = rawSessions
      .filter((s) => {
        const hasNotes = Boolean(s.feedbackNotes && s.feedbackNotes.trim().length > 0);
        const hasCovered = Boolean(s.feedbackCovered && s.feedbackCovered.trim().length > 0);
        const hasAdminNotes = isStaff && Boolean(s.notes && s.notes.trim().length > 0);
        const hasAdminReminder = isStaff && Boolean(s.adminReminder && s.adminReminder.trim().length > 0);
        return hasNotes || hasCovered || hasAdminNotes || hasAdminReminder;
      })
      .map((s) => {
        if (!isStaff) {
          // Strictly strip admin fields for students
          const { notes, adminReminder, ...studentSafe } = s;
          return studentSafe;
        }
        return s;
      });

    return NextResponse.json({
      student: studentInfo,
      history,
      isStaff,
      totalCount: history.length,
    });
  } catch (error) {
    console.error("Error fetching notes history:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes history." },
      { status: 500 }
    );
  }
}
