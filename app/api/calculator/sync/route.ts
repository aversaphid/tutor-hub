import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { broadcastCalculatorAction } from "@/lib/sse-bus";

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
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to broadcast calculator action" },
      { status: 500 }
    );
  }
}
