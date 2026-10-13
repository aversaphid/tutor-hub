import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Public VAPID key getter
export async function GET() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    "BJdTbAtKYOQu6AlJbtqMd8a7SBtQUqlHu7dyyjtCo7eahepsCWrIIFMTmXDRwNW9AFi3RdNj76bhPUcnPBOL7Fw";

  return NextResponse.json({ publicKey });
}

// Subscribe endpoint
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Invalid push subscription object" },
        { status: 400 }
      );
    }

    // Upsert subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        userId: user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Push API] Subscribe error:", err);
    return NextResponse.json(
      { error: "Failed to save push subscription" },
      { status: 500 }
    );
  }
}

// Unsubscribe endpoint
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Push API] Unsubscribe error:", err);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
