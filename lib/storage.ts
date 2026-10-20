import { getEnv } from "./env";
import { PrismaClient } from "@prisma/client";

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  uploadedAt: number; // Unix timestamp in ms
}

// 21-day (3-week) rolling retention policy
export const RETENTION_DAYS = 21;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per file limit

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/msword", // .doc
]);

export function getStorageConfig() {
  const url = (getEnv("SUPABASE_URL") || "").replace(/\/+$/, "").replace(/\/rest\/v1\/?$/, "");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || "";
  const bucket = getEnv("SUPABASE_STORAGE_BUCKET") || "homework-attachments";

  return {
    url,
    serviceKey,
    bucket,
    isConfigured: Boolean(url && serviceKey),
  };
}

export function parseAttachments(rawJson?: string | null): FileAttachment[] {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && typeof item.id === "string" && typeof item.path === "string");
    }
  } catch {}
  return [];
}

export function isAttachmentExpired(attachment: FileAttachment): boolean {
  if (!attachment || !attachment.uploadedAt) return false;
  return Date.now() - attachment.uploadedAt > RETENTION_MS;
}

export function getDaysRemaining(attachment: FileAttachment): number {
  if (!attachment || !attachment.uploadedAt) return RETENTION_DAYS;
  const elapsed = Date.now() - attachment.uploadedAt;
  const remainingMs = RETENTION_MS - elapsed;
  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Upload a file directly to Supabase Storage using native REST API.
 */
export async function uploadAttachmentToStorage(
  filePath: string,
  fileBytes: ArrayBuffer | Uint8Array,
  mimeType: string
): Promise<{ success: boolean; error?: string }> {
  const { url, serviceKey, bucket, isConfigured } = getStorageConfig();
  if (!isConfigured) {
    return { success: false, error: "Storage credentials not configured in environment." };
  }

  try {
    const uploadUrl = `${url}/storage/v1/object/${bucket}/${encodeURIComponent(filePath).replace(/%2F/g, "/")}`;
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": mimeType || "application/octet-stream",
        "x-upsert": "true",
      },
      body: fileBytes as unknown as BodyInit,
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Upload failed: ${res.status} ${errText}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Storage upload exception." };
  }
}

/**
 * Generate a private, short-lived signed download URL (valid for 15 minutes).
 */
export async function createSignedDownloadUrl(
  filePath: string,
  expiresInSeconds: number = 900
): Promise<{ downloadUrl: string | null; error?: string }> {
  const { url, serviceKey, bucket, isConfigured } = getStorageConfig();
  if (!isConfigured) {
    return { downloadUrl: null, error: "Storage not configured." };
  }

  try {
    const signEndpoint = `${url}/storage/v1/object/sign/${bucket}/${encodeURIComponent(filePath).replace(/%2F/g, "/")}`;
    const res = await fetch(signEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { downloadUrl: null, error: `Failed to sign URL: ${errText}` };
    }

    const data = await res.json();
    if (data?.signedURL) {
      const fullUrl = data.signedURL.startsWith("http")
        ? data.signedURL
        : `${url}/storage/v1${data.signedURL}`;
      return { downloadUrl: fullUrl };
    }

    return { downloadUrl: null, error: "Missing signedURL in response." };
  } catch (err: any) {
    return { downloadUrl: null, error: err?.message || "Signed URL generation failed." };
  }
}

/**
 * Delete a file or batch of files from Supabase Storage.
 */
export async function deleteFilesFromStorage(
  filePaths: string[]
): Promise<{ success: boolean; error?: string }> {
  const { url, serviceKey, bucket, isConfigured } = getStorageConfig();
  if (!isConfigured || filePaths.length === 0) {
    return { success: true };
  }

  try {
    const deleteEndpoint = `${url}/storage/v1/object/${bucket}`;
    const res = await fetch(deleteEndpoint, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: filePaths }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Storage deletion failed." };
  }
}

/**
 * 21-Day Rollover Cleaner:
 * Finds attachments older than 21 days across all sessions, purges them from Supabase Storage,
 * and updates session records.
 */
export async function cleanupExpiredAttachments(
  prisma: PrismaClient
): Promise<{ deletedCount: number }> {
  let deletedCount = 0;
  try {
    const sessions = await prisma.session.findMany({
      where: {
        attachments: { not: null },
      },
      select: {
        id: true,
        attachments: true,
      },
    });

    const now = Date.now();
    const pathsToDelete: string[] = [];

    for (const session of sessions) {
      const currentList = parseAttachments(session.attachments);
      if (currentList.length === 0) continue;

      const unexpired = currentList.filter((att) => {
        const isExpired = now - att.uploadedAt > RETENTION_MS;
        if (isExpired) {
          pathsToDelete.push(att.path);
          deletedCount++;
        }
        return !isExpired;
      });

      // If any attachment expired in this session, update database
      if (unexpired.length !== currentList.length) {
        await prisma.session.update({
          where: { id: session.id },
          data: {
            attachments: unexpired.length > 0 ? JSON.stringify(unexpired) : null,
          },
        });
      }
    }

    if (pathsToDelete.length > 0) {
      console.log(`[Storage Cleanup] Deleting ${pathsToDelete.length} expired attachments (>21 days)...`);
      await deleteFilesFromStorage(pathsToDelete);
    }
  } catch (err) {
    console.error("[Storage Cleanup Error]:", err);
  }

  return { deletedCount };
}
