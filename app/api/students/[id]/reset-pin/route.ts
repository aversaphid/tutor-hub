import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { resetStudentPinRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (currentUser.role !== "HEAD_TUTOR" && currentUser.role !== "TUTOR") {
      return NextResponse.json(
        { error: "Forbidden. Only tutors and administrators can reset student PIN locks." },
        { status: 403 }
      );
    }

    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        assignedTutorId: true,
        pinLockedUntil: true,
        failedPinAttempts: true,
      },
    });

    if (!student || student.role !== "TUTEE") {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    // If regular tutor, ensure the student is assigned to them or has lessons with them
    if (currentUser.role === "TUTOR") {
      const isAssigned = student.assignedTutorId === currentUser.id;
      if (!isAssigned) {
        const hasSession = await prisma.session.findFirst({
          where: {
            tutorId: currentUser.id,
            tuteeId: student.id,
          },
        });
        if (!hasSession) {
          return NextResponse.json(
            { error: "You are not authorized to reset the PIN lock for this student." },
            { status: 403 }
          );
        }
      }
    }

    // Reset lock in database
    await prisma.user.update({
      where: { id: student.id },
      data: {
        pinLockedUntil: null,
        failedPinAttempts: 0,
      },
    });

    // Reset all in-memory rate limiting entries for this student
    resetStudentPinRateLimit(student.id);

    console.log(
      `[PIN Lockout] ${
        currentUser.role === "HEAD_TUTOR" ? "Admin" : "Tutor"
      } ${currentUser.name} reset PIN lock for student ${student.name} (${student.id}).`
    );

    return NextResponse.json({
      success: true,
      message: `PIN lock successfully reset for ${student.name}. They can now log in with their PIN immediately.`,
      student: {
        id: student.id,
        name: student.name,
        pinLockedUntil: null,
        failedPinAttempts: 0,
      },
    });
  } catch (err) {
    console.error("Reset student PIN lock error:", err);
    return NextResponse.json(
      { error: "Failed to reset student PIN lock." },
      { status: 500 }
    );
  }
}
