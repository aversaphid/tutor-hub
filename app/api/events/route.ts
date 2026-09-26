import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { registerSubscriber } from "@/lib/sse-bus";

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

        // Send initial connection confirmation
        controller.enqueue(
          encoder.encode(
            `event: connected\ndata: ${JSON.stringify({ status: "connected", userId: user.id })}\n\n`
          )
        );

        // Keep-alive heartbeat every 25 seconds to keep proxies and browsers alive
        heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
          }
        }, 25_000);
      },
      cancel() {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (cleanup) cleanup();
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
