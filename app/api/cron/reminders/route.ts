import { NextResponse } from "next/server";
import { checkAndSendUpcomingLessonReminders } from "@/lib/lesson-reminders";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/reminders
 * Executes the upcoming lesson reminder engine.
 * Can be called by Deno.cron, external schedulers (UptimeRobot, cron-job.org),
 * or client heartbeats.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const result = await checkAndSendUpcomingLessonReminders();

    return NextResponse.json({
      success: true,
      sentCount: result.sentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Cron reminders endpoint error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to run reminder engine" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
