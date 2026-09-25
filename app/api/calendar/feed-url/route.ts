import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryKey = searchParams.get("key");

    let user = await getCurrentUser();
    if (!user && queryKey) {
      user = await prisma.user.findFirst({
        where: { magicKey: queryKey, active: true },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    let magicKey = user.magicKey;

    // Lazily assign a secure magicKey if the user doesn't have one yet
    if (!magicKey) {
      magicKey = crypto.randomBytes(16).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: { magicKey },
      });
    }

    const host = request.headers.get("host") || "lbmathstuition.co.uk";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const httpsUrl = `${protocol}://${host}/api/calendar/subscribe?key=${magicKey}`;
    const webcalUrl = `webcal://${host}/api/calendar/subscribe?key=${magicKey}`;
    const googleCalendarUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

    return NextResponse.json({
      magicKey,
      webcalUrl,
      httpsUrl,
      googleCalendarUrl,
    });
  } catch (err) {
    console.error("Calendar feed-url error:", err);
    return NextResponse.json(
      { error: "Failed to generate calendar feed URL." },
      { status: 500 }
    );
  }
}
