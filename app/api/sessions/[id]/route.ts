import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UpdateSessionSchema } from "@/lib/validations";
import { detectSessionConflict } from "@/lib/conflict-detector";
import { logSessionAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        tutor: { select: { id: true, name: true, email: true } },
        tutee: { select: { id: true, name: true, magicKey: true } },
        auditLogs: {
          orderBy: { timestamp: "desc" },
          include: { actor: { select: { name: true, role: true } } },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({ session });
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
    const existing = await prisma.session.findUnique({ where: { id } });
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
    let auditAction: any = "TEAMS_LINK_UPDATED";
    let auditDetails = "";

    const targetTutorId = (updates.tutorId && user.role === "HEAD_TUTOR") ? updates.tutorId : existing.tutorId;

    // Check if times or tutor changed
    if (updates.scheduledStartTime || updates.scheduledEndTime || (updates.tutorId && updates.tutorId !== existing.tutorId)) {
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
      auditDetails = `Session adjusted: ${newStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${newEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    if (updates.teamsMeetingUrl !== undefined) {
      updateData.teamsMeetingUrl = updates.teamsMeetingUrl || null;
      if (!auditDetails) {
        auditAction = "TEAMS_LINK_UPDATED";
        auditDetails = updates.teamsMeetingUrl
          ? "Teams meeting link updated."
          : "Teams meeting link cleared.";
      }
    }

    if (user.role === "TUTEE") {
      if (existing.tuteeId !== user.id) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      if (updates.tuteeConfirmed !== undefined) {
        updateData.tuteeConfirmed = updates.tuteeConfirmed;
        auditAction = "CONFIRMATION_UPDATED";
        auditDetails = `Student ${user.name} confirmed attendance.`;
      }
    } else {
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.tutorId !== undefined && user.role === "HEAD_TUTOR" && !updateData.tutorId) {
        updateData.tutorId = updates.tutorId;
      }
      if (updates.tutorPaid !== undefined && user.role === "HEAD_TUTOR") {
        updateData.tutorPaid = updates.tutorPaid;
        updateData.tutorPaidAt = updates.tutorPaid ? new Date() : null;
        auditAction = updates.tutorPaid ? "TUTOR_PAID" : "TUTOR_UNPAID";
        auditDetails = updates.tutorPaid ? "Tutor payout marked as PAID by Admin." : "Tutor payout marked as NOT PAID by Admin.";
      }
      if (updates.adminReminder !== undefined && user.role === "HEAD_TUTOR") {
        updateData.adminReminder = updates.adminReminder ? updates.adminReminder.trim() : null;
        auditAction = "REMINDER_UPDATED";
        auditDetails = updateData.adminReminder
          ? `Personal admin reminder updated: "${updateData.adminReminder}"`
          : "Personal admin reminder cleared.";
      }
      if (updates.tutorConfirmed !== undefined) {
        updateData.tutorConfirmed = updates.tutorConfirmed;
        auditAction = "CONFIRMATION_UPDATED";
        auditDetails = `Tutor attendance marked as ${updates.tutorConfirmed ? "CONFIRMED" : "UNCONFIRMED"} by ${user.name}.`;
      }
      if (updates.tuteeConfirmed !== undefined && user.role === "HEAD_TUTOR") {
        updateData.tuteeConfirmed = updates.tuteeConfirmed;
        auditAction = "CONFIRMATION_UPDATED";
        auditDetails = `Student attendance marked as ${updates.tuteeConfirmed ? "CONFIRMED" : "UNCONFIRMED"} by Admin.`;
      }
      if (updates.feedbackCovered !== undefined) updateData.feedbackCovered = updates.feedbackCovered;
      if (updates.feedbackRating !== undefined) updateData.feedbackRating = updates.feedbackRating;
      if (updates.feedbackNotes !== undefined) updateData.feedbackNotes = updates.feedbackNotes;
    }

    const updated = await prisma.session.update({
      where: { id },
      data: updateData,
      include: {
        tutor: { select: { id: true, name: true } },
        tutee: { select: { id: true, name: true } },
      },
    });

    await logSessionAudit({
      sessionId: id,
      actorId: user.id,
      action: auditAction,
      details: auditDetails || `Session updated by ${user.name}`,
    });

    return NextResponse.json({ success: true, session: updated });
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
    if (!user || user.role !== "HEAD_TUTOR") {
      return NextResponse.json(
        { error: "Unauthorized. Only the admin can delete lessons." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    // Delete associated audit logs first
    await prisma.auditLog.deleteMany({ where: { sessionId: id } });
    await prisma.session.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Session deleted successfully." });
  } catch (err) {
    console.error("Session delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete session." },
      { status: 500 }
    );
  }
}

