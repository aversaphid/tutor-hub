import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { getCurrentUser, hashPassword, clearUserCache } from "@/lib/auth";
import {
  CreateUserSchema,
  ReassignStudentSchema,
  UpdateStudentSchema,
  AdminUpdateUserPasswordSchema,
} from "@/lib/validations";
import crypto from "crypto";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "HEAD_TUTOR" && user.role !== "TUTOR")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    // If Head Tutor (Admin): returns all users
    if (user.role === "HEAD_TUTOR") {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          pin: true,
          magicKey: true,
          active: true,
          createdAt: true,
          assignedTutorId: true,
          studentPay: true,
          tutorPay: true,
          assignedTutor: {
            select: { id: true, name: true, email: true },
          },
          assignedStudents: {
            select: { id: true, name: true, pin: true, magicKey: true },
          },
          _count: {
            select: {
              tutorSessions: true,
              tuteeSessions: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      });

      return NextResponse.json({ users });
    }

    // If regular Tutor: return their assigned students with PIN & magicKey
    const tutorWithStudents = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        assignedStudents: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            assignedTutorId: true,
            pin: true,
            magicKey: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      users: tutorWithStudents?.assignedStudents || [],
    });
  } catch (err) {
    console.error("Admin users GET error:", err);
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
  }
}

// Only Admin can create users (Tutors and Students)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "HEAD_TUTOR") {
      return NextResponse.json(
        { error: "Unauthorized. Only the admin can create students and tutors." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = CreateUserSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0]?.message || "Validation error" }, { status: 400 });
    }

    const { name, email, role, password, pin, assignedTutorId, studentPay, tutorPay } = parseResult.data;

    let passwordHash = null;
    let finalPin = null;
    let magicKey = null;

    let finalEmail = email ? email.toLowerCase().trim() : null;

    if (role === "HEAD_TUTOR" || role === "TUTOR") {
      if (!password || password.length < 5) {
        return NextResponse.json({ error: "Password must be at least 5 characters for tutor accounts." }, { status: 400 });
      }
      if (!finalEmail) {
        finalEmail = `${name.trim().toLowerCase().replace(/\s+/g, "")}@lbmathstuition.co.uk`;
      }
      passwordHash = await hashPassword(password);
      if (pin && /^\d{4}$/.test(pin.trim())) {
        const trimmedPin = pin.trim();
        const existingPin = await prisma.user.findFirst({
          where: { pin: trimmedPin, role: "TUTEE" },
        });
        if (existingPin) {
          return NextResponse.json(
            { error: `This 4-digit PIN (${trimmedPin}) is already assigned to another student (${existingPin.name}). Please use a unique PIN.` },
            { status: 409 }
          );
        }
        finalPin = trimmedPin;
      } else {
        // Auto-generate a unique 4-digit PIN
        let candidatePin = "";
        let attempts = 0;
        while (attempts < 50) {
          candidatePin = Math.floor(1000 + Math.random() * 9000).toString();
          const exists = await prisma.user.findFirst({ where: { pin: candidatePin, role: "TUTEE" } });
          if (!exists) break;
          attempts++;
        }
        finalPin = candidatePin;
      }
      const cleanName = name.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "STU";
      const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
      magicKey = `STU-${cleanName}-${randomHex}`;
    }

    if (finalEmail) {
      const existing = await prisma.user.findUnique({ where: { email: finalEmail } });
      if (existing) {
        return NextResponse.json({ error: "A user with this email or username already exists." }, { status: 409 });
      }
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email: finalEmail,
        role,
        passwordHash,
        pin: finalPin,
        magicKey,
        assignedTutorId: role === "TUTEE" ? assignedTutorId || null : null,
        studentPay: role === "TUTEE" ? (studentPay ?? null) : null,
        tutorPay: role === "TUTEE" ? (tutorPay ?? null) : null,
        active: true,
      },
      include: {
        assignedTutor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (err) {
    console.error("Admin create user error:", err);
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}

// Admin updates (reassign student tutor or update user password)
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "HEAD_TUTOR") {
      return NextResponse.json(
        { error: "Unauthorized. Only administrators can update user credentials and assignments." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 0. Active status toggle flow
    if (body.active !== undefined && (body.userId || body.studentId) && body.newPassword === undefined && !body.name && body.studentPay === undefined && body.tutorPay === undefined) {
      const targetId = body.userId || body.studentId;
      const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
      if (!targetUser) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      const newActive = Boolean(body.active);
      if (!newActive && (targetUser.role === "HEAD_TUTOR" || targetUser.email === "luke@lbmathstuition.co.uk")) {
        return NextResponse.json(
          { error: "The primary administrator account cannot be deactivated." },
          { status: 400 }
        );
      }
      const updated = await prisma.user.update({
        where: { id: targetId },
        data: { active: newActive },
      });
      clearUserCache(targetId);
      return NextResponse.json({
        success: true,
        user: updated,
        message:
          targetUser.role === "TUTEE" && !newActive
            ? `${targetUser.name} is now Inactive (Flagged for deletion per Privacy Policy).`
            : `${targetUser.name} is now ${newActive ? "Active" : "Inactive"}.`,
      });
    }

    // 0.2. Direct Cycle Magic Link flow
    if (body.cycleMagicKey && (body.studentId || body.userId) && body.newPassword === undefined && !body.name && body.studentPay === undefined && body.tutorPay === undefined) {
      const targetId = body.studentId || body.userId;
      const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
      if (!targetUser || targetUser.role !== "TUTEE") {
        return NextResponse.json({ error: "Student not found." }, { status: 404 });
      }

      const cleanName = targetUser.name.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "STU";
      const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
      const newMagicKey = `STU-${cleanName}-${randomHex}`;

      const updated = await prisma.user.update({
        where: { id: targetId },
        data: { magicKey: newMagicKey },
      });
      clearUserCache(targetId);

      return NextResponse.json({
        success: true,
        student: updated,
        magicKey: newMagicKey,
        message: `New Magic Link generated for ${targetUser.name}. The previous link is now invalid.`,
      });
    }

    // 1. Password update flow
    if (body.newPassword !== undefined) {
      const parseResult = AdminUpdateUserPasswordSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: parseResult.error.issues[0]?.message || "Validation error" },
          { status: 400 }
        );
      }

      const { userId, newPassword } = parseResult.data;
      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }

      const passwordHash = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      clearUserCache(userId);

      return NextResponse.json({
        success: true,
        message: `Password updated successfully for ${targetUser.name}.`,
      });
    }

    // 2. Student update / reassignment flow
    const parseResult = UpdateStudentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { studentId, assignedTutorId, name, studentPay, tutorPay, pin, active, cycleMagicKey } = parseResult.data;

    // Verify student fee cannot be less than tutor pay against current/new rates
    if (studentPay !== undefined || tutorPay !== undefined) {
      const existingStudent = await prisma.user.findUnique({
        where: { id: studentId, role: "TUTEE" },
        select: { studentPay: true, tutorPay: true },
      });
      if (!existingStudent) {
        return NextResponse.json({ error: "Student not found." }, { status: 404 });
      }
      const effectiveStudentPay = studentPay !== undefined ? studentPay : existingStudent.studentPay;
      const effectiveTutorPay = tutorPay !== undefined ? tutorPay : existingStudent.tutorPay;
      if (
        effectiveStudentPay !== null &&
        effectiveStudentPay !== undefined &&
        effectiveTutorPay !== null &&
        effectiveTutorPay !== undefined &&
        effectiveStudentPay < effectiveTutorPay
      ) {
        return NextResponse.json(
          { error: "Student fee cannot be less than tutor pay." },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (assignedTutorId !== undefined) {
      updateData.assignedTutorId = assignedTutorId || null;
    }
    if (name !== undefined && name.trim()) {
      updateData.name = name.trim();
    }
    if (studentPay !== undefined) {
      updateData.studentPay = studentPay === null ? null : studentPay;
    }
    if (tutorPay !== undefined) {
      updateData.tutorPay = tutorPay === null ? null : tutorPay;
    }
    if (active !== undefined) {
      updateData.active = active;
    }
    if (pin !== undefined) {
      const trimmedPin = pin && pin.trim() ? pin.trim() : null;
      if (trimmedPin) {
        const existingWithPin = await prisma.user.findFirst({
          where: { pin: trimmedPin, role: "TUTEE", id: { not: studentId } },
        });
        if (existingWithPin) {
          return NextResponse.json(
            { error: `This 4-digit PIN (${trimmedPin}) is already assigned to another student (${existingWithPin.name}). PINs must be unique.` },
            { status: 409 }
          );
        }
      }
      updateData.pin = trimmedPin;
    }
    if (cycleMagicKey) {
      const studentTargetName = (name && name.trim()) || (await prisma.user.findUnique({ where: { id: studentId }, select: { name: true } }))?.name || "STU";
      const cleanName = studentTargetName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "STU";
      const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
      updateData.magicKey = `STU-${cleanName}-${randomHex}`;
    }

    const updatedStudent = await prisma.user.update({
      where: { id: studentId, role: "TUTEE" },
      data: updateData,
      include: {
        assignedTutor: { select: { id: true, name: true, email: true } },
      },
    });
    clearUserCache(studentId);

    return NextResponse.json({
      success: true,
      student: updatedStudent,
      message: `Student details updated for ${updatedStudent.name}.`,
    });
  } catch (err) {
    console.error("Admin user PATCH error:", err);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

// Admin delete user (Student or Tutor)
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "HEAD_TUTOR") {
      return NextResponse.json(
        { error: "Unauthorized. Only admin can delete users." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("id");
    if (!userId) {
      try {
        const body = await request.json();
        userId = body.userId || body.id;
      } catch {}
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Protection: do not allow deleting the current logged-in user or the primary admin
    if (targetUser.id === user.id || targetUser.email === "luke@lbmathstuition.co.uk") {
      return NextResponse.json(
        { error: "Cannot delete the primary administrator account." },
        { status: 400 }
      );
    }

    if (targetUser.role === "TUTEE") {
      // 1. Delete audit logs for all sessions involving this student
      const studentSessions = await prisma.session.findMany({
        where: { tuteeId: targetUser.id },
        select: { id: true },
      });
      const sessionIds = studentSessions.map((s) => s.id);
      if (sessionIds.length > 0) {
        await prisma.auditLog.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
      }
      // 2. Delete any audit logs where student was actor
      await prisma.auditLog.deleteMany({ where: { actorId: targetUser.id } });
      // 3. Delete all sessions for this student
      await prisma.session.deleteMany({ where: { tuteeId: targetUser.id } });
      // 4. Delete the student
      await prisma.user.delete({ where: { id: targetUser.id } });
      clearUserCache(targetUser.id);

      return NextResponse.json({
        success: true,
        message: `Student ${targetUser.name} deleted successfully.`,
      });
    }

    if (targetUser.role === "TUTOR" || targetUser.role === "HEAD_TUTOR") {
      // 1. Unassign any students who have this tutor as assignedTutorId
      await prisma.user.updateMany({
        where: { assignedTutorId: targetUser.id },
        data: { assignedTutorId: null },
      });

      // 2. Delete audit logs for all sessions where this tutor was the tutor
      const tutorSessions = await prisma.session.findMany({
        where: { tutorId: targetUser.id },
        select: { id: true },
      });
      const sessionIds = tutorSessions.map((s) => s.id);
      if (sessionIds.length > 0) {
        await prisma.auditLog.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
      }
      // 3. Delete any audit logs where tutor was actor
      await prisma.auditLog.deleteMany({ where: { actorId: targetUser.id } });
      // 4. Delete all sessions for this tutor
      await prisma.session.deleteMany({ where: { tutorId: targetUser.id } });
      // 5. Delete the tutor
      await prisma.user.delete({ where: { id: targetUser.id } });
      clearUserCache(targetUser.id);

      return NextResponse.json({
        success: true,
        message: `Tutor ${targetUser.name} deleted successfully.`,
      });
    }

    return NextResponse.json({ error: "Invalid user role." }, { status: 400 });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}

