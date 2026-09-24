import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UpdateSessionSchema } from "@/lib/validations";
import { detectSessionConflict } from "@/lib/conflict-detector";
import { logSessionAudit } from "@/lib/audit";
import { sanitizeSessionForRole } from "@/lib/session-sanitizer";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const isStudent = user.role === "TUTEE";

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        tutor: { select: { id: true, name: true, email: true } },
        tutee: {
          select: {
            id: true,
            name: true,
            magicKey: !isStudent,
            assignedTutorId: true,
          },
        },
        auditLogs: isStudent
          ? false
          : {
            orderBy: { timestamp: "desc" },
            include: { actor: { select: { name: true, role: true } } },
          },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    // Permission check
    if (user.role === "TUTEE" && session.tuteeId !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (
      user.role === "TUTOR" &&
      session.tutorId !== user.id &&
      session.tutee.assignedTutorId !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ session: sanitizeSessionForRole(session, user.role) });
  } catch (err) {
    console.error("Session GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch session." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.session.findUnique({
      where: { id },
      include: {
        tutee: { select: { studentPay: true, tutorPay: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    // Permission check: only Head Tutor or assigned Tutor can edit
    if (user.role === "TUTOR" && existing.tutorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. You can only edit your own sessions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = UpdateSessionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const updates = parseResult.data;
    const updateData: any = {};
    const auditDetailsList: string[] = [];
    let auditAction: any = "REPORT_EDITED";

    const targetTutorId = (updates.tutorId && user.role === "HEAD_TUTOR") ? updates.tutorId : existing.tutorId;

    // Check if times or tutor changed
    if (updates.scheduledStartTime || updates.scheduledEndTime || (updates.tutorId && updates.tutorId !== existing.tutorId)) {
      if ((updates.scheduledStartTime || updates.scheduledEndTime) && user.role !== "HEAD_TUTOR") {
        return NextResponse.json(
          { error: "Forbidden. Tutors are not permitted to reschedule lessons. Please contact the Head Tutor." },
          { status: 403 }
        );
      }

      const newStart = updates.scheduledStartTime
        ? new Date(updates.scheduledStartTime)
        : existing.scheduledStartTime;
      const newEnd = updates.scheduledEndTime
        ? new Date(updates.scheduledEndTime)
        : existing.scheduledEndTime;

      // Conflict validation
      const conflict = await detectSessionConflict({
        tutorId: targetTutorId,
        tuteeId: existing.tuteeId,
        startTime: newStart,
        endTime: newEnd,
        excludeSessionId: existing.id,
      });

      if (conflict.hasConflict) {
        return NextResponse.json(
          { error: conflict.reason, conflict: true },
          { status: 409 }
        );
      }

      updateData.scheduledStartTime = newStart;
      updateData.scheduledEndTime = newEnd;
      if (updates.tutorId && user.role === "HEAD_TUTOR") {
        updateData.tutorId = updates.tutorId;
      }
      auditAction = "RESCHEDULED";
      auditDetailsList.push(`Session adjusted: ${newStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${newEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    }

    if (updates.teamsMeetingUrl !== undefined) {
      updateData.teamsMeetingUrl = updates.teamsMeetingUrl || null;
      auditDetailsList.push(
        updates.teamsMeetingUrl
          ? "Teams meeting link updated."
          : "Teams meeting link cleared."
      );
      if (auditAction === "REPORT_EDITED") auditAction = "TEAMS_LINK_UPDATED";
    }

    if (user.role === "TUTEE") {
      if (existing.tuteeId !== user.id) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      // Note: Attendance confirmations can only be updated by the Admin as personal reminders
    } else {
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.unlockEarlyMinutes !== undefined) updateData.unlockEarlyMinutes = updates.unlockEarlyMinutes;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.status !== undefined) {
        updateData.status = updates.status;
        if (updates.status === "CANCELLED") {
          auditAction = "CANCELLED";
          auditDetailsList.push(
            updates.notes
              ? `Lesson cancelled. Reason: ${updates.notes}`
              : "Lesson cancelled by tutor/admin."
          );
        } else {
          auditDetailsList.push(`Status changed to ${updates.status}`);
        }
      }
      if (updates.tutorId !== undefined && user.role === "HEAD_TUTOR" && !updateData.tutorId) {
        updateData.tutorId = updates.tutorId;
      }
      if (updates.tutorPaid !== undefined && user.role === "HEAD_TUTOR") {
        updateData.tutorPaid = updates.tutorPaid;
        updateData.tutorPaidAt = updates.tutorPaid ? new Date() : null;
        if (updates.tutorPaid) {
          // Permanently snapshot studentPay and tutorPay on the session at archive time to protect historical records
          updateData.studentPay = existing.studentPay ?? existing.tutee?.studentPay ?? null;
          updateData.tutorPay = existing.tutorPay ?? existing.tutee?.tutorPay ?? null;
        } else {
          // Unarchiving reverts to dynamic live rates
          updateData.studentPay = null;
          updateData.tutorPay = null;
        }
        auditAction = updates.tutorPaid ? "TUTOR_PAID" : "TUTOR_UNPAID";
        auditDetailsList.push(
          updates.tutorPaid
            ? "Tutor payout marked as PAID by Admin."
            : "Tutor payout marked as NOT PAID by Admin."
        );
      }
      if (updates.adminReminder !== undefined && user.role === "HEAD_TUTOR") {
        updateData.adminReminder = updates.adminReminder ? updates.adminReminder.trim() : null;
        auditAction = "REMINDER_UPDATED";
        auditDetailsList.push(
          updateData.adminReminder
            ? `Personal admin reminder updated: "${updateData.adminReminder}"`
            : "Personal admin reminder cleared."
        );
      }
      // Attendance confirmations: ONLY admin can toggle as personal reminders
      if (user.role === "HEAD_TUTOR") {
        if (updates.tutorConfirmed !== undefined) {
          updateData.tutorConfirmed = updates.tutorConfirmed;
          auditAction = "CONFIRMATION_UPDATED";
          auditDetailsList.push(`Tutor attendance marked as ${updates.tutorConfirmed ? "CONFIRMED" : "UNCONFIRMED"} by Admin.`);
        }
        if (updates.tuteeConfirmed !== undefined) {
          updateData.tuteeConfirmed = updates.tuteeConfirmed;
          auditAction = "CONFIRMATION_UPDATED";
          auditDetailsList.push(`Student attendance marked as ${updates.tuteeConfirmed ? "CONFIRMED" : "UNCONFIRMED"} by Admin.`);
        }
      }
      if (updates.feedbackCovered !== undefined) updateData.feedbackCovered = updates.feedbackCovered;
      if (updates.feedbackRating !== undefined) updateData.feedbackRating = updates.feedbackRating;
      if (updates.feedbackNotes !== undefined) updateData.feedbackNotes = updates.feedbackNotes;
      if (
        updates.feedbackCovered !== undefined ||
        updates.feedbackRating !== undefined ||
        updates.feedbackNotes !== undefined
      ) {
        auditDetailsList.push("Lesson report feedback updated.");
      }
    }

    const updated = await prisma.session.update({
      where: { id },
      data: updateData,
      include: {
        tutor: { select: { id: true, name: true } },
        tutee: { select: { id: true, name: true } },
      },
    });

    const auditDetails = auditDetailsList.join("; ") || `Session updated by ${user.name}`;
    await logSessionAudit({
      sessionId: id,
      actorId: user.id,
      action: auditAction,
      details: auditDetails,
    });

    return NextResponse.json({
      success: true,
      session: sanitizeSessionForRole(updated, user.role),
    });
  } catch (err) {
    console.error("Session update error:", err);
    return NextResponse.json(
      { error: "Failed to update session." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const isAllowed =
      user.role === "HEAD_TUTOR" ||
      (user.role === "TUTOR" && existing.tutorId === user.id);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Unauthorized. Only the admin or assigned tutor can delete this lesson." },
        { status: 403 }
      );
    }

    // Delete associated audit logs first
    await prisma.auditLog.deleteMany({ where: { sessionId: id } });
    await prisma.session.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Lesson deleted successfully." });
  } catch (err) {
    console.error("Session delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete session." },
      { status: 500 }
    );
  }
}

