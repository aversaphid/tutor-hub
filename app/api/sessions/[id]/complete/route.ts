import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logSessionAudit } from "@/lib/audit";
import { z } from "zod";

const TutorCompleteSessionSchema = z.object({
  feedbackCovered: z.string().trim().min(2, "Please specify what was covered in the lesson"),
  feedbackRating: z.number().int().min(1, "Please rate how the lesson went overall (1-5 stars)").max(5),
  feedbackNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const user = await getCurrentUser();

    if (!user || (user.role !== "TUTOR" && user.role !== "HEAD_TUTOR")) {
      return NextResponse.json(
        { error: "Unauthorized. Only tutors and administrators can complete lessons and submit lesson reports." },
        { status: 403 }
      );
    }

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        tutee: { select: { id: true, name: true, assignedTutorId: true } },
        tutor: { select: { id: true, name: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    // Permission check for regular tutors
    if (
      user.role === "TUTOR" &&
      session.tutorId !== user.id &&
      session.tutee.assignedTutorId !== user.id
    ) {
      return NextResponse.json(
        { error: "Forbidden. You can only complete lessons assigned to you." },
        { status: 403 }
      );
    }

    // Lock check: Once marked as paid by admin, report cannot be edited
    if (session.tutorPaid) {
      return NextResponse.json(
        { error: "This lesson has been marked as paid by the administrator and its report can no longer be edited." },
        { status: 403 }
      );
    }

    // Prepare or validate tutor completion report
    let feedbackCovered = body.feedbackCovered;
    let feedbackRating = body.feedbackRating;
    let feedbackNotes = body.feedbackNotes;

    if (user.role === "HEAD_TUTOR") {
      feedbackCovered = body.feedbackCovered?.trim() || session.feedbackCovered || "Marked completed by administrator";
      feedbackRating = typeof body.feedbackRating === "number" ? Math.max(1, Math.min(5, body.feedbackRating)) : (session.feedbackRating || 5);
      feedbackNotes = body.feedbackNotes !== undefined ? (body.feedbackNotes?.trim() || null) : (session.feedbackNotes || null);
    } else {
      const parseResult = TutorCompleteSessionSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: parseResult.error.issues[0]?.message || "Please provide what was covered and a 1-5 star rating." },
          { status: 400 }
        );
      }
      feedbackCovered = parseResult.data.feedbackCovered;
      feedbackRating = parseResult.data.feedbackRating;
      feedbackNotes = parseResult.data.feedbackNotes;
    }
    const isEdit = session.status === "COMPLETED" || Boolean(session.feedbackCovered);
    const now = new Date();

    const updated = await prisma.session.update({
      where: { id },
      data: {
        status: "COMPLETED",
        actualEndTime: session.actualEndTime || now,
        feedbackCovered,
        feedbackRating,
        feedbackNotes: feedbackNotes || null,
        feedbackSubmittedAt: now,
      },
      include: {
        tutor: { select: { id: true, name: true, email: true } },
        tutee: { select: { id: true, name: true } },
      },
    });

    await logSessionAudit({
      sessionId: id,
      actorId: user.id,
      action: isEdit ? "REPORT_EDITED" : "COMPLETED",
      details: isEdit
        ? `Lesson report updated by Tutor ${user.name}. Rating: ${feedbackRating}/5 stars. Covered: "${feedbackCovered}".`
        : `Lesson completed by Tutor ${user.name}. Rating: ${feedbackRating}/5 stars. Covered: "${feedbackCovered}".`,
    });

    return NextResponse.json({
      success: true,
      session: updated,
      message: isEdit ? "Lesson report updated." : "Lesson report saved and marked as completed.",
    });
  } catch (err) {
    console.error("Tutor complete session error:", err);
    return NextResponse.json(
      { error: "Failed to submit lesson completion report." },
      { status: 500 }
    );
  }
}
