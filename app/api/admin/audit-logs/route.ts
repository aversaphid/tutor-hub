import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "HEAD_TUTOR") {
      return NextResponse.json(
        { error: "Unauthorized. Head Tutor access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const action = searchParams.get("action");

    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (action) where.action = action;

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, role: true, email: true } },
        session: {
          select: {
            id: true,
            title: true,
            tutor: { select: { name: true } },
            tutee: { select: { name: true } },
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    return NextResponse.json({ auditLogs });
  } catch (err) {
    console.error("Audit logs GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch audit logs." },
      { status: 500 }
    );
  }
}

// Clear all audit logs (Head Tutor only)
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "HEAD_TUTOR") {
      return NextResponse.json(
        { error: "Unauthorized. Head Tutor access required." },
        { status: 403 }
      );
    }

    const { count } = await prisma.auditLog.deleteMany({});

    return NextResponse.json({
      success: true,
      count,
      message: `Successfully cleared ${count} activity log entries.`,
    });
  } catch (err) {
    console.error("Clear audit logs error:", err);
    return NextResponse.json(
      { error: "Failed to clear audit logs." },
      { status: 500 }
    );
  }
}

