import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { registerSubscriber, broadcastPresenceUpdate } from "@/lib/sse-bus";
import {
  getAllOnlineUserIds,
  recordUserHeartbeat,
  recordUserConnected,
  recordUserDisconnected,
} from "@/lib/presence";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const encoder = new TextEncoder();
    let cleanup: (() => void) | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Register subscriber in the bus
        cleanup = registerSubscriber({
          userId: user.id,
          role: user.role,
          controller,
        });

        // Track presence connection
        const { wasOnline } = recordUserConnected(user.id, { role: user.role, name: user.name });
        if (!wasOnline) {
          broadcastPresenceUpdate({ userId: user.id, online: true });
        }

        // Send initial connection confirmation
        controller.enqueue(
          encoder.encode(
            `event: connected\ndata: ${JSON.stringify({ status: "connected", userId: user.id })}\n\n`
          )
        );

        // Send current presence snapshot of all online users
        controller.enqueue(
          encoder.encode(
            `event: presence-snapshot\ndata: ${JSON.stringify({ onlineUserIds: getAllOnlineUserIds() })}\n\n`
          )
        );

        // Keep-alive heartbeat every 25 seconds to keep proxies and browsers alive
        heartbeatInterval = setInterval(() => {
          try {
            recordUserHeartbeat(user.id, { role: user.role, name: user.name });
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
          }
        }, 25_000);
      },
      cancel() {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (cleanup) cleanup();
        const { isStillOnline } = recordUserDisconnected(user.id);
        if (!isStillOnline) {
          broadcastPresenceUpdate({ userId: user.id, online: false });
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("SSE connection error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
