import { prisma } from "../lib/prisma";
import {
  getStorageUsageStats,
  ensureStorageHeadroom,
  FileAttachment,
  MAX_STORAGE_CAPACITY_BYTES,
  EMERGENCY_HEADROOM_TRIGGER_BYTES,
  TARGET_SAFE_HEADROOM_BYTES,
  parseAttachments,
} from "../lib/storage";

async function run() {
  console.log("=== VERIFY STORAGE USAGE STATS & EMERGENCY HEADROOM AUTO-TRIMMER ===");

  // 1. Test live stats calculation
  const initialStats = await getStorageUsageStats(prisma);
  console.log("1. Initial storage stats:", {
    usedBytes: initialStats.usedBytes,
    formattedUsed: initialStats.formattedUsed,
    usedPercent: initialStats.usedPercent,
    fileCount: initialStats.fileCount,
    isEmergency: initialStats.isEmergencyThresholdReached,
  });

  if (typeof initialStats.usedPercent !== "number" || initialStats.maxBytes !== MAX_STORAGE_CAPACITY_BYTES) {
    throw new Error("Invalid stats calculation format");
  }

  // Find or create test users
  let tutor = await prisma.user.findFirst({ where: { role: "TUTOR" } });
  let tutee = await prisma.user.findFirst({ where: { role: "TUTEE" } });

  if (!tutor) {
    tutor = await prisma.user.create({
      data: {
        email: "test-headroom-tutor@example.com",
        name: "Headroom Tutor",
        passwordHash: "hash",
        role: "TUTOR",
      },
    });
  }

  if (!tutee) {
    tutee = await prisma.user.create({
      data: {
        email: "test-headroom-tutee@example.com",
        name: "Headroom Student",
        passwordHash: "hash",
        role: "TUTEE",
      },
    });
  }

  const testSessionId = `test-headroom-${Date.now()}`;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Create mock attachments:
  // - Oldest file: uploaded 15 days ago (unexpired under 21 days), 100 MB
  // - Middle file: uploaded 10 days ago (unexpired), 100 MB
  // - Young file: uploaded 1 day ago (unexpired), 50 MB
  const mockOldest: FileAttachment = {
    id: "att-oldest-15d",
    name: "ancient_homework.pdf",
    size: 100 * 1024 * 1024, // 100 MB
    type: "application/pdf",
    path: `sessions/${testSessionId}/att-oldest-15d-ancient_homework.pdf`,
    uploadedAt: now - 15 * dayMs,
  };

  const mockMiddle: FileAttachment = {
    id: "att-middle-10d",
    name: "mid_homework.pdf",
    size: 100 * 1024 * 1024, // 100 MB
    type: "application/pdf",
    path: `sessions/${testSessionId}/att-middle-10d-mid_homework.pdf`,
    uploadedAt: now - 10 * dayMs,
  };

  const mockYoungest: FileAttachment = {
    id: "att-young-1d",
    name: "recent_homework.pdf",
    size: 50 * 1024 * 1024, // 50 MB
    type: "application/pdf",
    path: `sessions/${testSessionId}/att-young-1d-recent_homework.pdf`,
    uploadedAt: now - 1 * dayMs,
  };

  const createdSession = await prisma.session.create({
    data: {
      id: testSessionId,
      tutorId: tutor.id,
      tuteeId: tutee.id,
      scheduledStartTime: new Date(),
      scheduledEndTime: new Date(Date.now() + 3600000),
      status: "COMPLETED",
      attachments: JSON.stringify([mockOldest, mockMiddle, mockYoungest]),
    },
  });

  console.log("2. Created test session with 3 large mock attachments totaling 250 MB");

  // Verify stats reflect these files
  const afterMockStats = await getStorageUsageStats(prisma);
  console.log("3. Refreshed stats with mock session:", {
    usedBytes: afterMockStats.usedBytes,
    formattedUsed: afterMockStats.formattedUsed,
    fileCount: afterMockStats.fileCount,
  });

  if (afterMockStats.fileCount < 3) {
    throw new Error("File count did not include mock files");
  }

  // 4. Test normal headroom check (small incoming file: 5 MB)
  const normalCheck = await ensureStorageHeadroom(5 * 1024 * 1024, prisma);
  console.log("4. Normal headroom check (5 MB incoming):", normalCheck);
  if (normalCheck.triggered) {
    throw new Error("Headroom check should NOT trigger when usage is below 850 MB");
  }

  // 5. Test emergency headroom auto-trimmer
  // Simulate huge incoming file that would push projected usage above EMERGENCY_HEADROOM_TRIGGER_BYTES (850 MB)
  // e.g. incoming file of 700 MB
  const incomingHugeBytes = 700 * 1024 * 1024;
  console.log("5. Testing emergency headroom check with projected usage exceeding 850 MB...");

  const emergencyResult = await ensureStorageHeadroom(incomingHugeBytes, prisma);
  console.log("6. Emergency auto-trimmer result:", emergencyResult);

  if (!emergencyResult.triggered) {
    throw new Error("Expected auto-trimmer to trigger for projected usage > 850 MB");
  }

  if (emergencyResult.emergencyTrimmed === 0) {
    throw new Error("Expected oldest files to be trimmed to restore headroom");
  }

  // Check which attachments remain on the test session
  const updatedSession = await prisma.session.findUnique({
    where: { id: testSessionId },
    select: { attachments: true },
  });

  const remainingAttachments = parseAttachments(updatedSession?.attachments);
  console.log("7. Remaining attachments on session after FIFO trim:", remainingAttachments.map((a) => a.name));

  // The oldest file should have been trimmed first!
  const hasOldest = remainingAttachments.some((a) => a.id === mockOldest.id);
  const hasYoungest = remainingAttachments.some((a) => a.id === mockYoungest.id);

  console.log("8. Oldest file pruned?", !hasOldest, "| Youngest file preserved?", hasYoungest);
  if (hasOldest && !hasYoungest) {
    throw new Error("FIFO trimming order violated: oldest file was not pruned first");
  }

  // Clean up test session
  await prisma.session.delete({
    where: { id: testSessionId },
  });

  console.log("9. Cleaned up test session.");
  console.log("=== ALL STORAGE HEADROOM & USAGE TESTS PASSED ===");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
