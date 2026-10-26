import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { broadcastCalculatorAction } from "@/lib/sse-bus";
import { prisma } from "@/lib/prisma";

interface CachedSessionParticipants {
  tutorId: string;
  tuteeId: string;
  expiresAt: number;
}

const sessionParticipantsCache = new Map<string, CachedSessionParticipants>();
const SESSION_PARTICIPANTS_CACHE_TTL_MS = 10 * 60_000; // 10-minute in-memory cache

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();

    const allowedActions = new Set([
      "BUTTON",
      "NAV",
      "SYNC_TOGGLE",
      "FULL_STATE",
      "CURSOR_MOVE",
      "CURSOR_CLICK",
      "CURSOR_LEAVE",
    ]);

    if (!body.actionType || !allowedActions.has(body.actionType)) {
      return NextResponse.json({ error: "Invalid actionType." }, { status: 400 });
    }

    // Authoritative identity derived from cryptographically verified user session
    const senderId = user.id;
    const senderName = user.name;
    const senderRole = user.role;

    let targetUserIds: string[] | undefined = undefined;

    // Strictly validate lesson session and isolate recipients to participants of this specific lesson
    if (body.sessionId && body.sessionId !== "live-demo" && body.sessionId !== "admin-demo") {
      const now = Date.now();
      let session = sessionParticipantsCache.get(body.sessionId);

      if (!session || session.expiresAt <= now) {
        const dbSession = await prisma.session.findUnique({
          where: { id: body.sessionId },
          select: { id: true, tutorId: true, tuteeId: true },
        });

        if (!dbSession) {
          return NextResponse.json({ error: "Session not found." }, { status: 404 });
        }

        session = {
          tutorId: dbSession.tutorId,
          tuteeId: dbSession.tuteeId,
          expiresAt: now + SESSION_PARTICIPANTS_CACHE_TTL_MS,
        };
        sessionParticipantsCache.set(body.sessionId, session);
      }

      const isParticipant =
        senderId === session.tutorId ||
        senderId === session.tuteeId ||
        user.role === "HEAD_TUTOR";

      if (!isParticipant) {
        return NextResponse.json(
          { error: "Forbidden: You are not a participant in this lesson session." },
          { status: 403 }
        );
      }

      // Restrict broadcast exclusively to the tutor/admin and the student in this lesson
      targetUserIds = [session.tutorId, session.tuteeId];
      if (user.role === "HEAD_TUTOR" && !targetUserIds.includes(senderId)) {
        targetUserIds.push(senderId);
      }
    } else if (body.sessionId === "live-demo" || body.sessionId === "admin-demo") {
      // Demo / idle calculators must not broadcast to any other connected users
      targetUserIds = [senderId];
    }

    // Validate and clamp cursor coordinates to valid [0, 100] % range
    let cursorPos = undefined;
    if (
      body.cursorPos &&
      typeof body.cursorPos.x === "number" &&
      typeof body.cursorPos.y === "number" &&
      !isNaN(body.cursorPos.x) &&
      !isNaN(body.cursorPos.y)
    ) {
      cursorPos = {
        x: Math.min(100, Math.max(0, Number(body.cursorPos.x.toFixed(1)))),
        y: Math.min(100, Math.max(0, Number(body.cursorPos.y.toFixed(1)))),
      };
    }

    broadcastCalculatorAction({
      sessionId: body.sessionId || "live-demo",
      senderId,
      senderName,
      senderRole,
      actionType: body.actionType,
      actionValue: typeof body.actionValue === "string" ? body.actionValue.slice(0, 32) : undefined,
      fullState: body.fullState,
      cursorPos,
      isSynced: Boolean(body.isSynced),
      timestamp: Date.now(),
      targetUserIds,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to broadcast calculator action" },
      { status: 500 }
    );
  }
}
