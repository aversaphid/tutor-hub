import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCachedSubwaySurfersSetting,
  setCachedSubwaySurfersSetting,
} from "@/lib/settings-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cached = getCachedSubwaySurfersSetting();
    if (cached !== null) {
      return NextResponse.json(
        { subwaySurfersEnabled: cached },
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: "subwaySurfersEnabled" },
    });

    const enabled = setting ? setting.value === "true" : true;
    setCachedSubwaySurfersSetting(enabled);

    return NextResponse.json(
      { subwaySurfersEnabled: enabled },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load public settings:", error);
    // Graceful fallback to enabled so site continues working
    return NextResponse.json({
      subwaySurfersEnabled: true,
    });
  }
}
