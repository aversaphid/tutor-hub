import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getCurrentUser } from "@/lib/auth";

import { sanitizeSessionForRole } from "@/lib/session-sanitizer";

export const dynamic = "force-dynamic";

let lastLiveAutoStartCheck = 0;
const LIVE_AUTO_START_INTERVAL_MS = 10_000;

async function checkAndAutoStartSessions() {
  const nowMs = Date.now();
  if (nowMs - lastLiveAutoStartCheck < LIVE_AUTO_START_INTERVAL_MS) {
    return;
  }
  lastLiveAutoStartCheck = nowMs;
  const now = new Date();
  try {
    // Auto-start any scheduled or delayed lessons that have reached their scheduled start time
    const started = await prisma.session.updateMany({
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

    if (started.count > 0) {
      try {
        const { broadcastSessionUpdate } = await import("@/lib/sse-bus");
        broadcastSessionUpdate({
          type: "STATUS_UPDATED",
          status: "IN_PROGRESS",
          timestamp: Date.now(),
        });
      } catch {}
    }

    // Auto-resolve abandoned/zombie sessions (>3 hours past scheduledEndTime still marked IN_PROGRESS)
    const resolved = await prisma.session.updateMany({
      where: {
        status: "IN_PROGRESS",
        scheduledEndTime: { lt: new Date(now.getTime() - 3 * 3600 * 1000) },
      },
      data: {
        status: "COMPLETED",
      },
    });

    if (resolved.count > 0) {
      try {
        const { broadcastSessionUpdate } = await import("@/lib/sse-bus");
        broadcastSessionUpdate({
          type: "STATUS_UPDATED",
          status: "COMPLETED",
          timestamp: Date.now(),
        });
      } catch {}
    }
  } catch (e) {
    console.error("Auto-start/auto-resolve sessions error in /api/sessions/live:", e);
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const tuteeId = searchParams.get("tuteeId");
    const tutorId = searchParams.get("tutorId");

    let session = null;
    const now = new Date();

    // Auto-start any scheduled or delayed lessons throttled to once every 60s
    await checkAndAutoStartSessions();

    const isStudent = user.role === "TUTEE";
    const include = {
      tutor: { select: { id: true, name: true, email: true } },
      tutee: {
        select: {
          id: true,
          name: true,
          pin: !isStudent,
          magicKey: !isStudent,
        },
      },
    };

    let baseWhere: any = {};

    if (user.role === "TUTEE") {
      baseWhere = { tuteeId: user.id };
    } else if (user.role === "TUTOR") {
      baseWhere = {
        OR: [
          { tutorId: user.id },
          { tutee: { assignedTutorId: user.id } },
        ],
      };
    } else if (user.role === "HEAD_TUTOR") {
      if (tuteeId) baseWhere.tuteeId = tuteeId;
      if (tutorId) baseWhere.tutorId = tutorId;
    } else {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (sessionId) {
      session = await prisma.session.findFirst({
        where: { id: sessionId, ...baseWhere },
        include,
      });
    } else {
      // Priority 1: Any lesson currently in its active scheduled window (start <= now && now < end)
      session = await prisma.session.findFirst({
        where: {
          ...baseWhere,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          scheduledStartTime: { lte: now },
          scheduledEndTime: { gt: now },
        },
        include,
        orderBy: { scheduledStartTime: "desc" },
      });

      // Priority 2: Next upcoming scheduled/delayed lesson whose end time hasn't passed
      if (!session) {
        session = await prisma.session.findFirst({
          where: {
            ...baseWhere,
            status: { in: ["SCHEDULED", "DELAYED"] },
            scheduledEndTime: { gt: now },
          },
          include,
          orderBy: { scheduledStartTime: "asc" },
        });
      }

      // Priority 3: Fallback to recent uncompleted IN_PROGRESS lesson whose end time passed within 2h
      if (!session) {
        session = await prisma.session.findFirst({
          where: {
            ...baseWhere,
            status: "IN_PROGRESS",
            scheduledEndTime: { gt: new Date(Date.now() - 2 * 3600 * 1000) },
          },
          include,
          orderBy: { scheduledStartTime: "desc" },
        });
      }
    }

    return NextResponse.json({
      serverTime: now.toISOString(),
      session: sanitizeSessionForRole(session, user.role),
    });
  } catch (err) {
    console.error("Live session polling error:", err);
    return NextResponse.json(
      { error: "Failed to fetch live session." },
      { status: 500 }
    );
  }
}
