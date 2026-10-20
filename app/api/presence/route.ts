import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllOnlineUserIds, recordUserHeartbeat, isUserOnline } from "@/lib/presence";
import { broadcastPresenceUpdate } from "@/lib/sse-bus";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { onlineUserIds: getAllOnlineUserIds() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wasOnline = isUserOnline(user.id);
  recordUserHeartbeat(user.id, { role: user.role, name: user.name });

  if (!wasOnline) {
    broadcastPresenceUpdate({ userId: user.id, online: true });
  }

  // Check and dispatch upcoming lesson 15m push notifications in the background
  try {
    const { checkAndSendUpcomingLessonReminders } = await import("@/lib/lesson-reminders");
    checkAndSendUpcomingLessonReminders().catch(() => {});
  } catch {}

  return NextResponse.json({ success: true, online: true });
}
