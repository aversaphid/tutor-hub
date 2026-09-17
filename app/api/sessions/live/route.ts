import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const tuteeId = searchParams.get("tuteeId");
    const tutorId = searchParams.get("tutorId");

    let session = null;
    const now = new Date();

    const include = {
      tutor: { select: { id: true, name: true, email: true } },
      tutee: { select: { id: true, name: true, pin: true, magicKey: true } },
    };

    if (sessionId) {
      session = await prisma.session.findUnique({
        where: { id: sessionId },
        include,
      });
    } else {
      let baseWhere: any = {};

      if (tuteeId) {
        baseWhere = { tuteeId };
      } else if (tutorId) {
        baseWhere = {
          OR: [
            { tutorId },
            { tutee: { assignedTutorId: tutorId } },
          ],
        };
      } else {
        const { getCurrentUser } = await import("@/lib/auth");
        const user = await getCurrentUser();
        if (user?.role === "TUTOR") {
          baseWhere = {
            OR: [
              { tutorId: user.id },
              { tutee: { assignedTutorId: user.id } },
            ],
          };
        } else if (user?.role === "HEAD_TUTOR") {
          baseWhere = {};
        }
      }

      // Priority 1: Any lesson currently IN_PROGRESS whose end time hasn't long passed (within 2h)
      session = await prisma.session.findFirst({
        where: {
          ...baseWhere,
          status: "IN_PROGRESS",
          scheduledEndTime: { gt: new Date(Date.now() - 2 * 3600 * 1000) },
        },
        include,
        orderBy: { scheduledStartTime: "asc" },
      });

      // Priority 2: Next upcoming scheduled/delayed lesson whose end time hasn't passed
      if (!session) {
        session = await prisma.session.findFirst({
          where: {
            ...baseWhere,
            status: { in: ["SCHEDULED", "DELAYED"] },
            scheduledEndTime: { gt: now },
          },
          include,
          orderBy: { scheduledStartTime: "asc" },
        });
      }
    }

    return NextResponse.json({
      serverTime: now.toISOString(),
      session,
    });
  } catch (err) {
    console.error("Live session polling error:", err);
    return NextResponse.json(
      { error: "Failed to fetch live session." },
      { status: 500 }
    );
  }
}
