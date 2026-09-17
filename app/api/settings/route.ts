import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "subwaySurfersEnabled" },
    });

    const enabled = setting ? setting.value === "true" : true;

    return NextResponse.json({
      subwaySurfersEnabled: enabled,
    });
  } catch (error) {
    console.error("Failed to load public settings:", error);
    // Graceful fallback to enabled so site continues working
    return NextResponse.json({
      subwaySurfersEnabled: true,
    });
  }
}
