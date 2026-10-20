import {
  RETENTION_DAYS,
  RETENTION_MS,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  isAttachmentExpired,
  getDaysRemaining,
  formatAttachmentSize,
  parseAttachments,
  cleanupExpiredAttachments,
  FileAttachment,
} from "../lib/storage";
import { prisma } from "../lib/prisma";

async function runTests() {
  console.log("=== Testing 21-Day Homework Retention & Attachment System ===\n");

  // 1. Verify 21-day retention constants
  console.log("Test 1: Verify 21-Day Policy Constants...");
  if (RETENTION_DAYS !== 21) {
    throw new Error(`Expected RETENTION_DAYS to be 21, got ${RETENTION_DAYS}`);
  }
  const expectedMs = 21 * 24 * 60 * 60 * 1000;
  if (RETENTION_MS !== expectedMs) {
    throw new Error(`Expected RETENTION_MS to be ${expectedMs}, got ${RETENTION_MS}`);
  }
  console.log("  ✅ RETENTION_DAYS = 21 days (3 weeks) verified.");
  console.log(`  ✅ RETENTION_MS = ${RETENTION_MS} ms verified.`);

  // 2. Verify File size limits
  console.log("\nTest 2: Verify File Size Limits...");
  if (MAX_FILE_SIZE_BYTES !== 10 * 1024 * 1024) {
    throw new Error(`Expected MAX_FILE_SIZE_BYTES to be 10MB, got ${MAX_FILE_SIZE_BYTES}`);
  }
  console.log("  ✅ MAX_FILE_SIZE_BYTES = 10 MB limit verified.");

  // 3. Verify Allowed MIME types
  console.log("\nTest 3: Verify Supported File Types...");
  const expectedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  for (const t of expectedTypes) {
    if (!ALLOWED_MIME_TYPES.has(t)) {
      throw new Error(`Missing expected MIME type: ${t}`);
    }
  }
  console.log(`  ✅ All essential MIME types allowed (${ALLOWED_MIME_TYPES.size} types verified).`);

  // 4. Verify 21-Day Rolling Expiration Logic
  console.log("\nTest 4: Verify 21-Day Rolling Expiration Detection...");
  const now = Date.now();

  const freshAttachment: FileAttachment = {
    id: "fresh-1",
    name: "Algebra_Worksheet_Week1.pdf",
    size: 2048576,
    type: "application/pdf",
    path: "sessions/test/fresh.pdf",
    uploadedAt: now - 5 * 24 * 60 * 60 * 1000, // 5 days old
  };

  const nearExpiredAttachment: FileAttachment = {
    id: "near-1",
    name: "Geometry_Homework.png",
    size: 512000,
    type: "image/png",
    path: "sessions/test/near.png",
    uploadedAt: now - 20 * 24 * 60 * 60 * 1000, // 20 days old (1 day left)
  };

  const expiredAttachment: FileAttachment = {
    id: "exp-1",
    name: "Past_Paper_2024.docx",
    size: 1048576,
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    path: "sessions/test/expired.docx",
    uploadedAt: now - 22 * 24 * 60 * 60 * 1000, // 22 days old (>21 days)
  };

  if (isAttachmentExpired(freshAttachment)) {
    throw new Error("Fresh attachment (5 days old) was incorrectly flagged as expired!");
  }
  const freshDaysLeft = getDaysRemaining(freshAttachment);
  if (freshDaysLeft !== 16) {
    throw new Error(`Expected 16 days left for 5-day old attachment, got ${freshDaysLeft}`);
  }
  console.log(`  ✅ Fresh attachment (5 days old): isExpired=false, daysLeft=${freshDaysLeft}`);

  if (isAttachmentExpired(nearExpiredAttachment)) {
    throw new Error("20-day old attachment was prematurely flagged as expired!");
  }
  const nearDaysLeft = getDaysRemaining(nearExpiredAttachment);
  if (nearDaysLeft !== 1) {
    throw new Error(`Expected 1 day left for 20-day old attachment, got ${nearDaysLeft}`);
  }
  console.log(`  ✅ Near-expired attachment (20 days old): isExpired=false, daysLeft=${nearDaysLeft}`);

  if (!isAttachmentExpired(expiredAttachment)) {
    throw new Error("Expired attachment (22 days old) was NOT flagged as expired!");
  }
  const expDaysLeft = getDaysRemaining(expiredAttachment);
  if (expDaysLeft !== 0) {
    throw new Error(`Expected 0 days left for expired attachment, got ${expDaysLeft}`);
  }
  console.log(`  ✅ Expired attachment (22 days old): isExpired=true, daysLeft=0`);

  // 5. Test JSON parsing and formatting
  console.log("\nTest 5: Testing Attachment Formatting & Parsing...");
  if (formatAttachmentSize(500) !== "500 B") throw new Error("formatAttachmentSize error");
  if (formatAttachmentSize(1024) !== "1.0 KB") throw new Error("formatAttachmentSize error");
  if (formatAttachmentSize(1048576) !== "1.0 MB") throw new Error("formatAttachmentSize error");
  console.log("  ✅ Size formatting verified (500 B, 1.0 KB, 1.0 MB).");

  const rawJson = JSON.stringify([freshAttachment, nearExpiredAttachment]);
  const parsed = parseAttachments(rawJson);
  if (parsed.length !== 2 || parsed[0].id !== "fresh-1") {
    throw new Error("Failed to parse attachments JSON");
  }
  if (parseAttachments(null).length !== 0 || parseAttachments("invalid json").length !== 0) {
    throw new Error("Failed to handle null/invalid JSON gracefully");
  }
  console.log("  ✅ Robust JSON parsing verified.");

  // 6. Test Database session attachments update and cleanup
  console.log("\nTest 6: Testing DB Session Attachments & Auto-Cleanup...");
  const testSession = await prisma.session.findFirst({
    select: { id: true, attachments: true },
  });

  if (testSession) {
    const originalAttachments = testSession.attachments;

    // Attach 1 fresh and 1 expired file
    const sampleAttachments = [freshAttachment, expiredAttachment];
    await prisma.session.update({
      where: { id: testSession.id },
      data: { attachments: JSON.stringify(sampleAttachments) },
    });

    const verifySaved = await prisma.session.findUnique({
      where: { id: testSession.id },
      select: { attachments: true },
    });
    const parsedSaved = parseAttachments(verifySaved?.attachments);
    if (parsedSaved.length !== 2) {
      throw new Error("Failed to persist attachments to Session database table.");
    }
    console.log("  ✅ Persisted attachments to Session table successfully.");

    // Run 21-day rollover cleanup
    const cleanupResult = await cleanupExpiredAttachments(prisma);
    console.log(`  ✅ 21-Day cleanup executed. Purged ${cleanupResult.deletedCount} expired files.`);

    const afterCleanup = await prisma.session.findUnique({
      where: { id: testSession.id },
      select: { attachments: true },
    });
    const remainingList = parseAttachments(afterCleanup?.attachments);
    if (remainingList.some((att) => att.id === "exp-1")) {
      throw new Error("Expired attachment was not purged during 21-day rollover!");
    }
    if (!remainingList.some((att) => att.id === "fresh-1")) {
      throw new Error("Fresh attachment was incorrectly purged during 21-day rollover!");
    }
    console.log("  ✅ 21-day rollover successfully kept fresh file and purged expired file.");

    // Restore original state
    await prisma.session.update({
      where: { id: testSession.id },
      data: { attachments: originalAttachments },
    });
    console.log("  ✅ Restored test session state.");
  } else {
    console.log("  ℹ️ No existing sessions in DB to test database cleanup, skipping DB step.");
  }

  console.log("\n🎉 ALL 21-DAY HOMEWORK RETENTION & ATTACHMENT TESTS PASSED!\n");
}

runTests()
  .catch((err) => {
    console.error("❌ Test Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
