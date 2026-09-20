import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "HEAD_TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [users, sessions, unavailabilities, systemSettings, resources] = await Promise.all([
      prisma.user.findMany(),
      prisma.session.findMany(),
      prisma.tutorUnavailability.findMany(),
      prisma.systemSetting.findMany(),
      prisma.resource.findMany(),
    ]);

    // Sanitize users: strip sensitive password hashes from export
    const sanitizedUsers = users.map(({ passwordHash, ...safeUser }) => safeUser);

    const backupPayload = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      platform: "LB Maths Tuition Hub",
      exportedBy: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      counts: {
        users: sanitizedUsers.length,
        sessions: sessions.length,
        unavailabilities: unavailabilities.length,
        systemSettings: systemSettings.length,
        resources: resources.length,
      },
      data: {
        users: sanitizedUsers,
        sessions,
        unavailabilities,
        systemSettings,
        resources,
      },
    };

    const dateSlug = new Date().toISOString().slice(0, 10);
    const timeSlug = new Date().toTimeString().slice(0, 8).replace(/:/g, "-");
    const filename = `lbmaths-backup-${dateSlug}-${timeSlug}.json`;

    return new Response(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Backup export failed:", error);
    return NextResponse.json({ error: "Failed to generate system backup" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "HEAD_TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = body.action || "restore"; // "validate" or "restore"

    // Extract backup data whether direct or wrapped in data
    const payload = body.backup || body;
    const data = payload.data || payload;

    const rawUsers: any[] = data.users || [];
    const rawSessions: any[] = data.sessions || [];
    const rawUnavailabilities: any[] = data.unavailabilities || [];
    const rawSystemSettings: any[] = data.systemSettings || [];
    const rawResources: any[] = data.resources || [];

    if (!Array.isArray(rawUsers) || !Array.isArray(rawSessions)) {
      return NextResponse.json(
        { error: "Invalid backup file structure: missing users or sessions array." },
        { status: 400 }
      );
    }

    const summary = {
      exportDate: payload.exportDate || "Unknown",
      version: payload.version || "1.0",
      counts: {
        users: rawUsers.length,
        sessions: rawSessions.length,
        unavailabilities: rawUnavailabilities.length,
        systemSettings: rawSystemSettings.length,
        resources: rawResources.length,
      },
    };

    // If validation / preview only
    if (action === "validate") {
      return NextResponse.json({
        valid: true,
        summary,
      });
    }

    // Perform database restoration
    let restoredUsersCount = 0;
    let restoredSessionsCount = 0;
    let restoredUnavailabilitiesCount = 0;
    let restoredSettingsCount = 0;
    let restoredResourcesCount = 0;

    // 1. Pass 1: Upsert Users without foreign key to assignedTutor to prevent self/cyclic constraint violations
    for (const u of rawUsers) {
      if (!u.id || !u.name || !u.role) continue;
      await prisma.user.upsert({
        where: { id: u.id },
        create: {
          id: u.id,
          name: u.name,
          email: u.email || null,
          role: u.role,
          passwordHash: u.passwordHash || null,
          pin: u.pin || null,
          magicKey: u.magicKey || null,
          active: u.active !== false,
          studentPay: u.studentPay !== undefined ? u.studentPay : null,
          tutorPay: u.tutorPay !== undefined ? u.tutorPay : null,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
        },
        update: {
          name: u.name,
          email: u.email || null,
          role: u.role,
          passwordHash: u.passwordHash !== undefined ? u.passwordHash : undefined,
          pin: u.pin !== undefined ? u.pin : undefined,
          magicKey: u.magicKey !== undefined ? u.magicKey : undefined,
          active: u.active !== false,
          studentPay: u.studentPay !== undefined ? u.studentPay : null,
          tutorPay: u.tutorPay !== undefined ? u.tutorPay : null,
        },
      });
      restoredUsersCount++;
    }

    // Pass 2: Re-link assignedTutorId now that all users exist
    for (const u of rawUsers) {
      if (u.id && u.assignedTutorId) {
        try {
          await prisma.user.update({
            where: { id: u.id },
            data: { assignedTutorId: u.assignedTutorId },
          });
        } catch {
          // Ignore if assigned tutor was deleted or invalid
        }
      }
    }

    // 2. Upsert System Settings
    for (const s of rawSystemSettings) {
      if (!s.key) continue;
      await prisma.systemSetting.upsert({
        where: { key: s.key },
        create: {
          key: s.key,
          value: String(s.value),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
        },
        update: {
          value: String(s.value),
        },
      });
      restoredSettingsCount++;
    }

    // 3. Upsert Resources
    for (const r of rawResources) {
      if (!r.id || !r.title || !r.url || !r.createdById) continue;
      try {
        await prisma.resource.upsert({
          where: { id: r.id },
          create: {
            id: r.id,
            title: r.title,
            url: r.url,
            description: r.description || null,
            category: r.category || "General",
            createdById: r.createdById,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
            updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
          },
          update: {
            title: r.title,
            url: r.url,
            description: r.description || null,
            category: r.category || "General",
          },
        });
        restoredResourcesCount++;
      } catch {
        // Skip orphaned resources if creator doesn't exist
      }
    }

    // 4. Upsert Tutor Unavailabilities
    for (const un of rawUnavailabilities) {
      if (!un.id || !un.tutorId || !un.startTime || !un.endTime) continue;
      try {
        await prisma.tutorUnavailability.upsert({
          where: { id: un.id },
          create: {
            id: un.id,
            tutorId: un.tutorId,
            startTime: new Date(un.startTime),
            endTime: new Date(un.endTime),
            type: un.type || "BUSY",
            reason: un.reason || null,
            createdAt: un.createdAt ? new Date(un.createdAt) : new Date(),
          },
          update: {
            startTime: new Date(un.startTime),
            endTime: new Date(un.endTime),
            type: un.type || "BUSY",
            reason: un.reason || null,
          },
        });
        restoredUnavailabilitiesCount++;
      } catch {
        // Skip if tutor doesn't exist
      }
    }

    // 5. Upsert Sessions
    for (const ses of rawSessions) {
      if (!ses.id || !ses.tutorId || !ses.tuteeId || !ses.scheduledStartTime || !ses.scheduledEndTime) continue;
      try {
        await prisma.session.upsert({
          where: { id: ses.id },
          create: {
            id: ses.id,
            title: ses.title || "Maths Lesson",
            tutorId: ses.tutorId,
            tuteeId: ses.tuteeId,
            scheduledStartTime: new Date(ses.scheduledStartTime),
            scheduledEndTime: new Date(ses.scheduledEndTime),
            actualStartTime: ses.actualStartTime ? new Date(ses.actualStartTime) : null,
            actualEndTime: ses.actualEndTime ? new Date(ses.actualEndTime) : null,
            status: ses.status || "SCHEDULED",
            delayMinutes: Number(ses.delayMinutes || 0),
            delayReason: ses.delayReason || null,
            teamsMeetingUrl: ses.teamsMeetingUrl || null,
            unlockEarlyMinutes: Number(ses.unlockEarlyMinutes || 5),
            notes: ses.notes || null,
            adminReminder: ses.adminReminder || null,
            tutorConfirmed: Boolean(ses.tutorConfirmed),
            tuteeConfirmed: Boolean(ses.tuteeConfirmed),
            tutorPaid: Boolean(ses.tutorPaid),
            tutorPaidAt: ses.tutorPaidAt ? new Date(ses.tutorPaidAt) : null,
            feedbackCovered: ses.feedbackCovered || null,
            feedbackRating: ses.feedbackRating !== undefined && ses.feedbackRating !== null ? Number(ses.feedbackRating) : null,
            feedbackNotes: ses.feedbackNotes || null,
            feedbackSubmittedAt: ses.feedbackSubmittedAt ? new Date(ses.feedbackSubmittedAt) : null,
            createdAt: ses.createdAt ? new Date(ses.createdAt) : new Date(),
            updatedAt: ses.updatedAt ? new Date(ses.updatedAt) : new Date(),
          },
          update: {
            title: ses.title || "Maths Lesson",
            tutorId: ses.tutorId,
            tuteeId: ses.tuteeId,
            scheduledStartTime: new Date(ses.scheduledStartTime),
            scheduledEndTime: new Date(ses.scheduledEndTime),
            actualStartTime: ses.actualStartTime ? new Date(ses.actualStartTime) : null,
            actualEndTime: ses.actualEndTime ? new Date(ses.actualEndTime) : null,
            status: ses.status || "SCHEDULED",
            delayMinutes: Number(ses.delayMinutes || 0),
            delayReason: ses.delayReason || null,
            teamsMeetingUrl: ses.teamsMeetingUrl || null,
            unlockEarlyMinutes: Number(ses.unlockEarlyMinutes || 5),
            notes: ses.notes || null,
            adminReminder: ses.adminReminder || null,
            tutorConfirmed: Boolean(ses.tutorConfirmed),
            tuteeConfirmed: Boolean(ses.tuteeConfirmed),
            tutorPaid: Boolean(ses.tutorPaid),
            tutorPaidAt: ses.tutorPaidAt ? new Date(ses.tutorPaidAt) : null,
            feedbackCovered: ses.feedbackCovered || null,
            feedbackRating: ses.feedbackRating !== undefined && ses.feedbackRating !== null ? Number(ses.feedbackRating) : null,
            feedbackNotes: ses.feedbackNotes || null,
            feedbackSubmittedAt: ses.feedbackSubmittedAt ? new Date(ses.feedbackSubmittedAt) : null,
          },
        });
        restoredSessionsCount++;
      } catch (err) {
        console.error("Failed to restore session", ses.id, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "System backup restored successfully.",
      restored: {
        users: restoredUsersCount,
        sessions: restoredSessionsCount,
        unavailabilities: restoredUnavailabilitiesCount,
        systemSettings: restoredSettingsCount,
        resources: restoredResourcesCount,
      },
    });
  } catch (error) {
    console.error("Restore failed:", error);
    return NextResponse.json({ error: "Failed to restore system backup: invalid JSON format or database error" }, { status: 500 });
  }
}
