import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  cleanupExpiredAttachments,
  ensureStorageHeadroom,
  getStorageUsageStats,
  formatAttachmentSize,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/storage/cleanup
 * Returns live storage statistics.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "HEAD_TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const storageUsage = await getStorageUsageStats(prisma);
    return NextResponse.json({ success: true, storageUsage });
  } catch (error: any) {
    console.error("Failed to fetch storage stats:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve storage stats." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/storage/cleanup
 * Manually executes the 21-day rollover cleaner and ensures headroom, returning
 * count of deleted files, freed space, and refreshed storage stats.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "HEAD_TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Purge standard expired attachments (> 21 days)
    const cleanupResult = await cleanupExpiredAttachments(prisma);

    // 2. Check if emergency headroom auto-trimming is needed
    const headroomResult = await ensureStorageHeadroom(0, prisma);

    // 3. Retrieve refreshed storage metrics
    const storageUsage = await getStorageUsageStats(prisma);

    const totalCleaned = cleanupResult.deletedCount + headroomResult.emergencyTrimmed;
    const totalFreed = cleanupResult.freedBytes + headroomResult.freedBytes;

    return NextResponse.json({
      success: true,
      expiredCleaned: cleanupResult.deletedCount,
      emergencyTrimmed: headroomResult.emergencyTrimmed,
      totalDeleted: totalCleaned,
      freedBytes: totalFreed,
      formattedFreed: formatAttachmentSize(totalFreed),
      storageUsage,
      message:
        totalCleaned > 0
          ? `Successfully purged ${totalCleaned} file${totalCleaned === 1 ? "" : "s"}, freeing ${formatAttachmentSize(totalFreed)}.`
          : "Storage is clean. No expired or excess files found.",
    });
  } catch (error: any) {
    console.error("Storage manual cleanup failed:", error);
    return NextResponse.json(
      { error: error?.message || "Manual storage cleanup failed." },
      { status: 500 }
    );
  }
}
