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

// Supabase Free Tier bucket limit is 1 GB
export const MAX_STORAGE_CAPACITY_BYTES = 1024 * 1024 * 1024; // 1 GB (1,073,741,824 bytes)
export const EMERGENCY_HEADROOM_TRIGGER_BYTES = 850 * 1024 * 1024; // 850 MB (~83% threshold)
export const TARGET_SAFE_HEADROOM_BYTES = 750 * 1024 * 1024; // 750 MB target after trim

export interface StorageUsageStats {
  usedBytes: number;
  maxBytes: number;
  availableBytes: number;
  usedPercent: number; // e.g. 4.2
  fileCount: number;
  formattedUsed: string; // e.g. "45.2 MB"
  formattedMax: string; // "1.0 GB"
  formattedAvailable: string; // e.g. "978.8 MB"
  isEmergencyThresholdReached: boolean;
  emergencyThresholdBytes: number;
  emergencyThresholdPercent: number;
}

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
): Promise<{ deletedCount: number; freedBytes: number }> {
  let deletedCount = 0;
  let freedBytes = 0;
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
          freedBytes += Number(att.size) || 0;
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

  return { deletedCount, freedBytes };
}

/**
 * Get current storage usage statistics across all active homework attachments.
 */
export async function getStorageUsageStats(
  prisma: PrismaClient
): Promise<StorageUsageStats> {
  const sessions = await prisma.session.findMany({
    where: { attachments: { not: null } },
    select: { attachments: true },
  });

  let totalBytes = 0;
  let fileCount = 0;

  for (const session of sessions) {
    const list = parseAttachments(session.attachments);
    for (const att of list) {
      if (!isAttachmentExpired(att)) {
        totalBytes += Number(att.size) || 0;
        fileCount++;
      }
    }
  }

  const maxBytes = MAX_STORAGE_CAPACITY_BYTES;
  const availableBytes = Math.max(0, maxBytes - totalBytes);
  const usedPercent = Math.min(100, Math.round((totalBytes / maxBytes) * 1000) / 10);
  const emergencyThresholdPercent = Math.round((EMERGENCY_HEADROOM_TRIGGER_BYTES / maxBytes) * 100);

  return {
    usedBytes: totalBytes,
    maxBytes,
    availableBytes,
    usedPercent,
    fileCount,
    formattedUsed: formatAttachmentSize(totalBytes),
    formattedMax: formatAttachmentSize(maxBytes),
    formattedAvailable: formatAttachmentSize(availableBytes),
    isEmergencyThresholdReached: totalBytes >= EMERGENCY_HEADROOM_TRIGGER_BYTES,
    emergencyThresholdBytes: EMERGENCY_HEADROOM_TRIGGER_BYTES,
    emergencyThresholdPercent,
  };
}

/**
 * Emergency Headroom Auto-Trimmer:
 * Ensures there is sufficient storage capacity before uploading new files.
 * If total storage usage + incoming file size exceeds EMERGENCY_HEADROOM_TRIGGER_BYTES (850 MB),
 * it first purges any naturally expired files (>21 days).
 * If headroom is still needed, it prunes the oldest attachments across all sessions (FIFO by uploadedAt)
 * until usage drops back down to safe headroom level (TARGET_SAFE_HEADROOM_BYTES = 750 MB).
 */
export async function ensureStorageHeadroom(
  incomingSizeBytes: number = 0,
  prisma: PrismaClient
): Promise<{
  triggered: boolean;
  expiredCleaned: number;
  emergencyTrimmed: number;
  freedBytes: number;
}> {
  let expiredCleaned = 0;
  let emergencyTrimmed = 0;
  let freedBytes = 0;

  try {
    // 1. Initial check of current usage
    let stats = await getStorageUsageStats(prisma);
    const projectedUsage = stats.usedBytes + incomingSizeBytes;

    // If within safe limits, nothing to do
    if (projectedUsage < EMERGENCY_HEADROOM_TRIGGER_BYTES) {
      return { triggered: false, expiredCleaned: 0, emergencyTrimmed: 0, freedBytes: 0 };
    }

    console.warn(
      `[Storage Headroom] Projected usage (${formatAttachmentSize(projectedUsage)}) exceeds emergency threshold of ${formatAttachmentSize(EMERGENCY_HEADROOM_TRIGGER_BYTES)}. Triggering auto-trimmer...`
    );

    // 2. Step 1: Clean naturally expired files (>21 days) first
    const expireResult = await cleanupExpiredAttachments(prisma);
    expiredCleaned = expireResult.deletedCount;
    freedBytes += expireResult.freedBytes;

    // Check if cleaning expired files freed enough headroom
    stats = await getStorageUsageStats(prisma);
    if (stats.usedBytes + incomingSizeBytes < EMERGENCY_HEADROOM_TRIGGER_BYTES) {
      console.log(
        `[Storage Headroom] Purged ${expiredCleaned} naturally expired files (${formatAttachmentSize(freedBytes)}). Safe headroom restored.`
      );
      return {
        triggered: true,
        expiredCleaned,
        emergencyTrimmed: 0,
        freedBytes,
      };
    }

    // 3. Step 2: Emergency FIFO Trimming
    // Storage is still above 850 MB even after clearing 21-day expired files!
    // We must prune the oldest files across all sessions until usage drops below TARGET_SAFE_HEADROOM_BYTES (750 MB)
    const sessions = await prisma.session.findMany({
      where: { attachments: { not: null } },
      select: { id: true, attachments: true },
    });

    interface FlatAttachmentItem {
      sessionId: string;
      attachment: FileAttachment;
    }

    const allItems: FlatAttachmentItem[] = [];
    for (const session of sessions) {
      const list = parseAttachments(session.attachments);
      for (const att of list) {
        if (!isAttachmentExpired(att)) {
          allItems.push({ sessionId: session.id, attachment: att });
        }
      }
    }

    // Sort ascending by uploadedAt (oldest first - FIFO)
    allItems.sort((a, b) => (a.attachment.uploadedAt || 0) - (b.attachment.uploadedAt || 0));

    let currentUsed = stats.usedBytes;
    const itemsToDelete: FlatAttachmentItem[] = [];

    for (const item of allItems) {
      // Stop once usage + incoming file fits comfortably below TARGET_SAFE_HEADROOM_BYTES
      if (currentUsed + incomingSizeBytes <= TARGET_SAFE_HEADROOM_BYTES) {
        break;
      }
      itemsToDelete.push(item);
      const size = Number(item.attachment.size) || 0;
      currentUsed -= size;
      freedBytes += size;
      emergencyTrimmed++;
    }

    if (itemsToDelete.length > 0) {
      const pathsToDelete = itemsToDelete.map((i) => i.attachment.path);
      console.warn(
        `[Storage Headroom Emergency Trim] Purging ${itemsToDelete.length} oldest attachments to free ${formatAttachmentSize(freedBytes)}...`
      );

      // Delete physical files from Supabase Storage
      await deleteFilesFromStorage(pathsToDelete);

      // Group deletions by session to update database
      const deletedIdsBySession = new Map<string, Set<string>>();
      for (const item of itemsToDelete) {
        if (!deletedIdsBySession.has(item.sessionId)) {
          deletedIdsBySession.set(item.sessionId, new Set());
        }
        deletedIdsBySession.get(item.sessionId)!.add(item.attachment.id);
      }

      for (const [sessionId, deletedIds] of deletedIdsBySession.entries()) {
        const sessionRecord = sessions.find((s) => s.id === sessionId);
        if (!sessionRecord) continue;
        const currentList = parseAttachments(sessionRecord.attachments);
        const retained = currentList.filter(
          (att) => !deletedIds.has(att.id) && !isAttachmentExpired(att)
        );
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            attachments: retained.length > 0 ? JSON.stringify(retained) : null,
          },
        });
      }
    }

    return {
      triggered: true,
      expiredCleaned,
      emergencyTrimmed,
      freedBytes,
    };
  } catch (err) {
    console.error("[Storage Headroom Error]:", err);
    return {
      triggered: true,
      expiredCleaned,
      emergencyTrimmed,
      freedBytes,
    };
  }
}
