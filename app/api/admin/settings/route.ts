import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  getCachedSubwaySurfersSetting,
  setCachedSubwaySurfersSetting,
  getCachedBillingDurationMode,
  setCachedBillingDurationMode,
  invalidateSettingsCache,
} from "@/lib/settings-cache";
import { DEFAULT_BILLING_DURATION_MODE, BillingDurationMode } from "@/lib/billing";
import { getStorageUsageStats } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "HEAD_TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const storageUsage = await getStorageUsageStats(prisma);
    const cachedSubway = getCachedSubwaySurfersSetting();
    const cachedBilling = getCachedBillingDurationMode();

    if (cachedSubway !== null && cachedBilling !== null) {
      return NextResponse.json({
        subwaySurfersEnabled: cachedSubway,
        billingDurationMode: cachedBilling,
        storageUsage,
      });
    }

    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ["subwaySurfersEnabled", "billingDurationMode"] },
      },
    });

    const subwaySetting = settings.find((s) => s.key === "subwaySurfersEnabled");
    const billingSetting = settings.find((s) => s.key === "billingDurationMode");

    const subwaySurfersEnabled = subwaySetting ? subwaySetting.value === "true" : true;
    const billingDurationMode =
      (billingSetting?.value as BillingDurationMode) || DEFAULT_BILLING_DURATION_MODE;

    setCachedSubwaySurfersSetting(subwaySurfersEnabled);
    setCachedBillingDurationMode(billingDurationMode);

    return NextResponse.json({
      subwaySurfersEnabled,
      billingDurationMode,
      storageUsage,
    });
  } catch (error) {
    console.error("Failed to fetch admin settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "HEAD_TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { subwaySurfersEnabled, billingDurationMode } = body;

    const responseData: Record<string, any> = { success: true };

    if (subwaySurfersEnabled !== undefined) {
      if (typeof subwaySurfersEnabled !== "boolean") {
        return NextResponse.json(
          { error: "subwaySurfersEnabled must be a boolean" },
          { status: 400 }
        );
      }
      const updated = await prisma.systemSetting.upsert({
        where: { key: "subwaySurfersEnabled" },
        update: { value: String(subwaySurfersEnabled) },
        create: {
          key: "subwaySurfersEnabled",
          value: String(subwaySurfersEnabled),
        },
      });
      responseData.subwaySurfersEnabled = updated.value === "true";
    }

    if (billingDurationMode !== undefined) {
      if (billingDurationMode !== "ROUND_NEAREST_HOUR" && billingDurationMode !== "PROPORTIONAL") {
        return NextResponse.json(
          { error: "billingDurationMode must be either 'ROUND_NEAREST_HOUR' or 'PROPORTIONAL'" },
          { status: 400 }
        );
      }
      const updated = await prisma.systemSetting.upsert({
        where: { key: "billingDurationMode" },
        update: { value: billingDurationMode },
        create: {
          key: "billingDurationMode",
          value: billingDurationMode,
        },
      });
      responseData.billingDurationMode = updated.value;
    }

    invalidateSettingsCache();

    try {
      const { broadcastSessionUpdate } = await import("@/lib/sse-bus");
      broadcastSessionUpdate({
        type: "SETTINGS_UPDATED",
        timestamp: Date.now(),
      });
    } catch {}

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Failed to update admin settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
