import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  parseAttachments,
  createSignedDownloadUrl,
  deleteFilesFromStorage,
  isAttachmentExpired,
  getDaysRemaining,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/sessions/[id]/attachments/[attachmentId]
 * Generates a short-lived (15 min) signed download URL from Supabase Storage.
 * Strictly verifies that the requester is the student, tutor, or admin.
 * Checks 21-day rolling retention and deletes file if expired.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id, attachmentId } = await params;
    const { searchParams } = new URL(request.url);
    const magicKey = searchParams.get("key");
    const shouldRedirect = searchParams.get("redirect") === "true";

    const session = await prisma.session.findUnique({
      where: { id },
      select: {
        id: true,
        tutorId: true,
        tuteeId: true,
        attachments: true,
        tutee: {
          select: { magicKey: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const isStudentWithKey = Boolean(
      magicKey && session.tutee?.magicKey && magicKey === session.tutee.magicKey
    );
    const isSessionParticipant = Boolean(
      user &&
        (user.role === "HEAD_TUTOR" ||
          user.id === session.tutorId ||
          user.id === session.tuteeId)
    );

    if (!user && !isStudentWithKey) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isSessionParticipant && !isStudentWithKey) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const allAttachments = parseAttachments(session.attachments);
    const attachment = allAttachments.find((att) => att.id === attachmentId);

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    }

    // 21-Day Rollover Expiration Check
    if (isAttachmentExpired(attachment)) {
      // Purge expired file from storage & database
      await deleteFilesFromStorage([attachment.path]);
      const remaining = allAttachments.filter((att) => att.id !== attachmentId);
      await prisma.session.update({
        where: { id },
        data: {
          attachments: remaining.length > 0 ? JSON.stringify(remaining) : null,
        },
      });

      return NextResponse.json(
        { error: "This attachment has expired (21-day retention period ended)." },
        { status: 410 }
      );
    }

    // Generate signed download URL (valid for 15 minutes = 900s)
    const { downloadUrl, error } = await createSignedDownloadUrl(attachment.path, 900);

    if (!downloadUrl) {
      return NextResponse.json(
        { error: error || "Could not generate secure download link." },
        { status: 502 }
      );
    }

    if (shouldRedirect) {
      return NextResponse.redirect(downloadUrl, 302);
    }

    return NextResponse.json({
      downloadUrl,
      attachment: {
        ...attachment,
        daysRemaining: getDaysRemaining(attachment),
      },
    });
  } catch (err: any) {
    console.error("GET attachment signed URL error:", err);
    return NextResponse.json(
      { error: "Failed to generate download link." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]/attachments/[attachmentId]
 * Deletes an attachment from Supabase Storage and removes it from the Session record.
 * Allowed for the session tutor or HEAD_TUTOR.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id, attachmentId } = await params;

    const session = await prisma.session.findUnique({
      where: { id },
      select: {
        id: true,
        tutorId: true,
        attachments: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (user.role !== "HEAD_TUTOR" && user.id !== session.tutorId) {
      return NextResponse.json(
        { error: "Forbidden. Only the tutor or admin can delete attachments." },
        { status: 403 }
      );
    }

    const allAttachments = parseAttachments(session.attachments);
    const attachment = allAttachments.find((att) => att.id === attachmentId);

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    }

    // Delete from Supabase Storage
    await deleteFilesFromStorage([attachment.path]);

    // Update session record
    const updatedList = allAttachments.filter((att) => att.id !== attachmentId);
    await prisma.session.update({
      where: { id },
      data: {
        attachments: updatedList.length > 0 ? JSON.stringify(updatedList) : null,
      },
    });

    // Broadcast SSE update
    try {
      const { broadcastSessionUpdate } = await import("@/lib/sse-bus");
      broadcastSessionUpdate({
        type: "STATUS_UPDATED",
        sessionId: id,
        timestamp: Date.now(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      attachments: updatedList.map((att) => ({
        ...att,
        daysRemaining: getDaysRemaining(att),
      })),
    });
  } catch (err: any) {
    console.error("DELETE attachment error:", err);
    return NextResponse.json(
      { error: "Failed to delete attachment." },
      { status: 500 }
    );
  }
}
