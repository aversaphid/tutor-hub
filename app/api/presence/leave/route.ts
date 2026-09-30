import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordUserLeave } from "@/lib/presence";
import { broadcastPresenceUpdate } from "@/lib/sse-bus";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    recordUserLeave(user.id);
    broadcastPresenceUpdate({ userId: user.id, online: false });
  }

  return NextResponse.json({ success: true });
}
