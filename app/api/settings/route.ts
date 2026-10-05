import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCachedSubwaySurfersSetting,
  setCachedSubwaySurfersSetting,
  getCachedBillingDurationMode,
  setCachedBillingDurationMode,
} from "@/lib/settings-cache";
import { DEFAULT_BILLING_DURATION_MODE, BillingDurationMode } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cachedSubway = getCachedSubwaySurfersSetting();
    const cachedBilling = getCachedBillingDurationMode();

    if (cachedSubway !== null && cachedBilling !== null) {
      return NextResponse.json(
        {
          subwaySurfersEnabled: cachedSubway,
          billingDurationMode: cachedBilling,
        },
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );
    }

    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ["subwaySurfersEnabled", "billingDurationMode"] },
      },
    });

    const subwaySetting = settings.find((s) => s.key === "subwaySurfersEnabled");
    const billingSetting = settings.find((s) => s.key === "billingDurationMode");

    const enabled = subwaySetting ? subwaySetting.value === "true" : true;
    const billingMode = (billingSetting?.value as BillingDurationMode) || DEFAULT_BILLING_DURATION_MODE;

    setCachedSubwaySurfersSetting(enabled);
    setCachedBillingDurationMode(billingMode);

    return NextResponse.json(
      {
        subwaySurfersEnabled: enabled,
        billingDurationMode: billingMode,
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load public settings:", error);
    return NextResponse.json({
      subwaySurfersEnabled: true,
      billingDurationMode: DEFAULT_BILLING_DURATION_MODE,
    });
  }
}
