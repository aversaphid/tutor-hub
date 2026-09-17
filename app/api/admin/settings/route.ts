import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "HEAD_TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "subwaySurfersEnabled" },
    });

    return NextResponse.json({
      subwaySurfersEnabled: setting ? setting.value === "true" : true,
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
    const { subwaySurfersEnabled } = body;

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

    return NextResponse.json({
      success: true,
      subwaySurfersEnabled: updated.value === "true",
    });
  } catch (error) {
    console.error("Failed to update admin settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
