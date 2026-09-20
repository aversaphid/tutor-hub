import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Returns list of active students for authenticated staff
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "HEAD_TUTOR" && user.role !== "TUTOR")) {
      return NextResponse.json({ error: "Unauthorized. Staff access required." }, { status: 401 });
    }

    const students = await prisma.user.findMany({
      where: {
        role: "TUTEE",
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ students });
  } catch (err) {
    console.error("Failed to load students:", err);
    return NextResponse.json(
      { error: "Failed to load students" },
      { status: 500 }
    );
  }
}
