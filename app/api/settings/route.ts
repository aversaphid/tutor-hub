import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCachedSubwaySurfersSetting,
  setCachedSubwaySurfersSetting,
  getCachedBillingDurationMode,
  setCachedBillingDurationMode,
} from "@/lib/settings-cache";
import { DEFAULT_BILLING_DURATION_MODE, BillingDurationMode } from "@/lib/billing";

import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    let enabled = getCachedSubwaySurfersSetting();
    let billingMode = getCachedBillingDurationMode();

    if (enabled === null || billingMode === null) {
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: { in: ["subwaySurfersEnabled", "billingDurationMode"] },
        },
      });

      const subwaySetting = settings.find((s) => s.key === "subwaySurfersEnabled");
      const billingSetting = settings.find((s) => s.key === "billingDurationMode");

      enabled = subwaySetting ? subwaySetting.value === "true" : true;
      billingMode = (billingSetting?.value as BillingDurationMode) || DEFAULT_BILLING_DURATION_MODE;

      setCachedSubwaySurfersSetting(enabled);
      setCachedBillingDurationMode(billingMode);
    }

    const etag = `"${crypto.createHash("md5").update(`subway:${enabled}:billing:${billingMode}`).digest("hex")}"`;
    const ifNoneMatch = request.headers.get("if-none-match");

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      });
    }

    return NextResponse.json(
      {
        subwaySurfersEnabled: enabled,
        billingDurationMode: billingMode,
      },
      {
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
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
