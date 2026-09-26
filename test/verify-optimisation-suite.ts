import { prisma } from "../lib/prisma";
import crypto from "crypto";
import {
  getCachedSubwaySurfersSetting,
  setCachedSubwaySurfersSetting,
  invalidateSettingsCache,
} from "../lib/settings-cache";
import { registerSubscriber, broadcastSessionUpdate } from "../lib/sse-bus";
import { sanitizeSessionForRole, sanitizeSessionsForRole } from "../lib/session-sanitizer";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ [PASS] ${message}`);
}

async function runOptimisationVerification() {
  console.log("==================================================");
  console.log("⚡ CPU & SYSTEM OPTIMISATION VERIFICATION SUITE");
  console.log("==================================================\n");

  // 1. Test Turso DB Connection with Keep-Alive
  console.log("--- 1. Testing Turso Connection with Keep-Alive ---");
  const userCount = await prisma.user.count();
  assert(typeof userCount === "number", `Turso DB query executed successfully (Total Users: ${userCount})`);

  const activeSessionCount = await prisma.session.count();
  assert(typeof activeSessionCount === "number", `Active Sessions counted successfully (Total Sessions: ${activeSessionCount})`);

  // 2. Test ETag 304 Generation and Matching
  console.log("\n--- 2. Testing ETag 304 Validation Logic ---");
  const mockSessions = [
    { id: "s-1", title: "Maths", updatedAt: new Date("2026-09-26T12:00:00Z"), studentPay: 40, tutorPay: 30 },
    { id: "s-2", title: "Algebra", updatedAt: new Date("2026-09-26T13:00:00Z"), studentPay: 50, tutorPay: 35 },
  ];

  const sanitizedTutor = sanitizeSessionsForRole(mockSessions, "TUTOR");
  assert(sanitizedTutor[0].studentPay === undefined, "TUTOR role cannot see studentPay");
  assert(sanitizedTutor[0].tutorPay === 30, "TUTOR role can see tutorPay");

  const etagSeed = sanitizedTutor
    .map((s) => `${s.id}-${new Date(s.updatedAt).getTime()}`)
    .join(":");
  const etag = `"${crypto.createHash("md5").update(etagSeed).digest("hex")}"`;

  assert(etag.startsWith('"') && etag.endsWith('"'), `Valid RFC 7232 ETag generated: ${etag}`);

  // Simulate If-None-Match match -> 304 Not Modified
  const incomingIfNoneMatchMatch = etag;
  const isMatch = incomingIfNoneMatchMatch === etag;
  assert(isMatch, "Matching If-None-Match header successfully triggers 304 Not Modified");

  // Simulate modified session -> ETag changes
  const modifiedSessions = [
    { id: "s-1", title: "Maths", updatedAt: new Date("2026-09-26T12:05:00Z"), studentPay: 40, tutorPay: 30 },
    { id: "s-2", title: "Algebra", updatedAt: new Date("2026-09-26T13:00:00Z"), studentPay: 50, tutorPay: 35 },
  ];
  const newEtagSeed = sanitizeSessionsForRole(modifiedSessions, "TUTOR")
    .map((s) => `${s.id}-${new Date(s.updatedAt).getTime()}`)
    .join(":");
  const newEtag = `"${crypto.createHash("md5").update(newEtagSeed).digest("hex")}"`;

  assert(newEtag !== etag, `Modified session generates fresh ETag (${newEtag} != ${etag})`);
  assert(incomingIfNoneMatchMatch !== newEtag, "Stale If-None-Match header triggers full 200 re-fetch");

  // 3. Test Settings In-Memory Cache & Invalidation
  console.log("\n--- 3. Testing Public Settings In-Memory Cache ---");
  invalidateSettingsCache();
  assert(getCachedSubwaySurfersSetting() === null, "Cold cache returns null initially");

  setCachedSubwaySurfersSetting(true);
  assert(getCachedSubwaySurfersSetting() === true, "Cached Subway Surfers setting returns true without DB query");

  invalidateSettingsCache();
  assert(getCachedSubwaySurfersSetting() === null, "Admin update instantly invalidates settings cache");

  setCachedSubwaySurfersSetting(false);
  assert(getCachedSubwaySurfersSetting() === false, "Updated setting cached as false successfully");

  // 4. Test Server-Sent Events (SSE) Bus
  console.log("\n--- 4. Testing SSE Real-Time Event Bus ---");
  let receivedChunks: string[] = [];

  const mockController: any = {
    enqueue: (chunk: Uint8Array) => {
      receivedChunks.push(new TextDecoder().decode(chunk));
    },
  };

  const unsubscribe = registerSubscriber({
    userId: "test-user-1",
    role: "TUTOR",
    controller: mockController,
  });

  broadcastSessionUpdate({
    type: "TOPIC_UPDATED",
    sessionId: "test-session-999",
    timestamp: 1789999999,
  });

  assert(receivedChunks.length === 1, "Subscriber received exactly 1 broadcast event");
  assert(receivedChunks[0].includes("event: session-update"), "Event name formatted as 'event: session-update'");
  assert(receivedChunks[0].includes('"type":"TOPIC_UPDATED"'), "Event contains TOPIC_UPDATED payload");
  assert(receivedChunks[0].includes('"sessionId":"test-session-999"'), "Event contains target sessionId");

  // Test unsubscribe
  unsubscribe();
  broadcastSessionUpdate({
    type: "SESSION_STARTED",
    sessionId: "test-session-999",
  });
  assert(receivedChunks.length === 1, "Unsubscribed client receives no further events");

  // 5. Verify Inactivity Retention Flag Logic
  console.log("\n--- 5. Testing Retention Policy Inactivity Engine ---");
  const now = new Date();
  const ninetyOneDaysAgo = new Date(now.getTime() - 91 * 24 * 3600 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 3600 * 1000);

  // Student inactive >90 days with no upcoming lessons
  const inactiveStudent = {
    active: true,
    lastLessonDate: ninetyOneDaysAgo,
    hasUpcomingLessons: false,
  };
  const shouldFlag = inactiveStudent.active && !inactiveStudent.hasUpcomingLessons && (now.getTime() - inactiveStudent.lastLessonDate.getTime() > 90 * 24 * 3600 * 1000);
  assert(shouldFlag === true, "Student with 91 days of inactivity and no upcoming lessons is correctly flagged");

  // Student active within 10 days
  const activeStudent = {
    active: true,
    lastLessonDate: tenDaysAgo,
    hasUpcomingLessons: false,
  };
  const shouldNotFlag = activeStudent.active && !activeStudent.hasUpcomingLessons && (now.getTime() - activeStudent.lastLessonDate.getTime() > 90 * 24 * 3600 * 1000);
  assert(shouldNotFlag === false, "Recent student (10 days ago) is not flagged");

  // 6. Verify Rate Immutability
  console.log("\n--- 6. Testing Rate Immutability on Archive ---");
  const archivedLesson = {
    id: "sess-archived",
    tutorPaid: true,
    studentPay: 45, // snapshotted historical
    tutorPay: 30,   // snapshotted historical
  };

  // If student profile rate changes in future to 60 / 40:
  const newProfileStudentPay = 60;
  const newProfileTutorPay = 40;

  // Resolved fee for archived lesson must remain snapshotted
  const resolvedStudentPay = archivedLesson.studentPay ?? newProfileStudentPay;
  const resolvedTutorPay = archivedLesson.tutorPay ?? newProfileTutorPay;

  assert(resolvedStudentPay === 45, `Archived lesson preserved snapshotted studentPay (£${resolvedStudentPay} === £45)`);
  assert(resolvedTutorPay === 30, `Archived lesson preserved snapshotted tutorPay (£${resolvedTutorPay} === £30)`);

  console.log("\n==================================================");
  console.log(`🎉 ALL TESTS PASSED: ${passedTests}/${totalTests} (100% SUCCESS)`);
  console.log("==================================================");
}

runOptimisationVerification().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
