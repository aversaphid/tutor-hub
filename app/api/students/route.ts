import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns list of active students for the student landing picker
// Excludes sensitive fields (PIN, passwords)
export async function GET() {
  try {
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
