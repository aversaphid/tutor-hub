import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/web-push";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, body } = await req.json().catch(() => ({}));

    const result = await sendPushToUser(user.id, {
      title: title || "LB Maths Tuition",
      body: body || "🔔 If you can see this, your notifications are working!",
      url: user.role === "TUTEE" ? "/student" : "/tutor",
    });

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    console.error("[Push Test] Error:", err);
    return NextResponse.json(
      { error: "Failed to send test push notification" },
      { status: 500 }
    );
  }
}
