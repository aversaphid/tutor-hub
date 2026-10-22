import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  FileAttachment,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  parseAttachments,
  uploadAttachmentToStorage,
  getDaysRemaining,
  isAttachmentExpired,
  cleanupExpiredAttachments,
  ensureStorageHeadroom,
} from "@/lib/storage";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "docx",
  "doc",
  "xlsx",
]);

/**
 * GET /api/sessions/[id]/attachments
 * Lists all valid, unexpired attachments for the session.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const magicKey = searchParams.get("key");

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
    const validAttachments = allAttachments
      .filter((att) => !isAttachmentExpired(att))
      .map((att) => ({
        ...att,
        daysRemaining: getDaysRemaining(att),
      }));

    return NextResponse.json({
      attachments: validAttachments,
      totalCount: validAttachments.length,
    });
  } catch (err: any) {
    console.error("GET attachments error:", err);
    return NextResponse.json(
      { error: "Failed to fetch attachments." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[id]/attachments
 * Handles multipart file upload to Supabase Storage and records attachment metadata on the Session.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;

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

    // Only session tutor or HEAD_TUTOR can upload homework files
    if (user.role !== "HEAD_TUTOR" && user.id !== session.tutorId) {
      return NextResponse.json(
        { error: "Forbidden. Only the tutor or admin can upload homework attachments." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    // Support single file ("file") or multiple files ("files" or multiple "file" entries)
    const rawFiles = [
      ...formData.getAll("files"),
      ...formData.getAll("file"),
    ];
    const files = rawFiles.filter(
      (f): f is File => f instanceof File && f.size > 0
    );

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No file provided in form data." },
        { status: 400 }
      );
    }

    // Validate size and extensions for all files
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `File "${file.name}" exceeds 10 MB size limit. Please upload a smaller file.`,
          },
          { status: 400 }
        );
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const isAllowedMime = ALLOWED_MIME_TYPES.has(file.type);
      const isAllowedExt = ALLOWED_EXTENSIONS.has(extension);

      if (!isAllowedMime && !isAllowedExt) {
        return NextResponse.json(
          {
            error: `Unsupported file type for "${file.name}". Supported types: PDF, Images (PNG, JPG, WebP), Word (.docx, .doc), and Excel (.xlsx).`,
          },
          { status: 400 }
        );
      }
    }

    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

    // Emergency Headroom Auto-Trimmer: Ensure sufficient headroom before writing to Supabase
    await ensureStorageHeadroom(totalBytes, prisma);

    const newAttachments: FileAttachment[] = [];

    // Upload each file to Supabase Storage
    for (const file of files) {
      const fileBytes = await file.arrayBuffer();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const attachmentId = crypto.randomUUID();
      const storagePath = `sessions/${id}/${attachmentId}-${sanitizedName}`;

      const uploadResult = await uploadAttachmentToStorage(
        storagePath,
        fileBytes,
        file.type || "application/octet-stream"
      );

      if (!uploadResult.success) {
        return NextResponse.json(
          { error: uploadResult.error || `Failed to upload "${file.name}" to storage.` },
          { status: 502 }
        );
      }

      newAttachments.push({
        id: attachmentId,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        path: storagePath,
        uploadedAt: Date.now(),
      });
    }

    // Re-fetch latest session attachments to prevent stale reads
    const latestSession = await prisma.session.findUnique({
      where: { id },
      select: { attachments: true },
    });

    const existingList = parseAttachments(
      latestSession?.attachments || session.attachments
    ).filter((att) => !isAttachmentExpired(att));
    const updatedList = [...existingList, ...newAttachments];

    await prisma.session.update({
      where: { id },
      data: {
        attachments: JSON.stringify(updatedList),
      },
    });

    // Broadcast SSE update so connected participants see the new attachment instantly
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
      attachment:
        newAttachments.length === 1
          ? {
              ...newAttachments[0],
              daysRemaining: getDaysRemaining(newAttachments[0]),
            }
          : undefined,
      addedAttachments: newAttachments.map((att) => ({
        ...att,
        daysRemaining: getDaysRemaining(att),
      })),
      attachments: updatedList.map((att) => ({
        ...att,
        daysRemaining: getDaysRemaining(att),
      })),
    });
  } catch (err: any) {
    console.error("POST attachment upload error:", err);
    return NextResponse.json(
      { error: err?.message || "File upload failed." },
      { status: 500 }
    );
  }
}
