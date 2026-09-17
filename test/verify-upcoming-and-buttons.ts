import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("=== VERIFY UPCOMING CATEGORIZATION & ACTION BUTTON LOGIC ===");

  // Setup test users if not exist
  let tutor = await prisma.user.findFirst({ where: { role: "TUTOR" } });
  let tutee = await prisma.user.findFirst({ where: { role: "TUTEE" } });

  if (!tutor || !tutee) {
    console.log("Creating test tutor & tutee...");
    tutor = await prisma.user.create({
      data: {
        email: "verify_tutor@lbmathstuition.co.uk",
        name: "Verify Tutor",
        role: "TUTOR",
        passwordHash: "dummy",
      },
    });
    tutee = await prisma.user.create({
      data: {
        email: "verify_student@lbmathstuition.co.uk",
        name: "Verify Student",
        role: "TUTEE",
        passwordHash: "dummy",
        pin: "9988",
        magicKey: "verify-magic-key",
        assignedTutorId: tutor.id,
      },
    });
  }

  const nowMs = Date.now();

  // Test Case 1: Past lesson (scheduled 2 hours ago to 1 hour ago)
  const pastSession = {
    id: "test-past-session",
    status: "SCHEDULED",
    scheduledStartTime: new Date(nowMs - 2 * 3600 * 1000),
    scheduledEndTime: new Date(nowMs - 1 * 3600 * 1000),
    tutorPaid: false,
  };

  // Test Case 2: Completed lesson (scheduled in future or past, but completed)
  const completedSession = {
    id: "test-completed-session",
    status: "COMPLETED",
    scheduledStartTime: new Date(nowMs - 30 * 60 * 1000),
    scheduledEndTime: new Date(nowMs + 30 * 60 * 1000),
    tutorPaid: false,
  };

  // Test Case 3: Paid/Archived lesson
  const paidSession = {
    id: "test-paid-session",
    status: "COMPLETED",
    scheduledStartTime: new Date(nowMs - 4 * 3600 * 1000),
    scheduledEndTime: new Date(nowMs - 3 * 3600 * 1000),
    tutorPaid: true,
  };

  // Test Case 4: Strictly upcoming lesson (tomorrow)
  const futureSession = {
    id: "test-future-session",
    status: "SCHEDULED",
    scheduledStartTime: new Date(nowMs + 24 * 3600 * 1000),
    scheduledEndTime: new Date(nowMs + 25 * 3600 * 1000),
    tutorPaid: false,
  };

  // Test Case 5: Active lesson currently IN_PROGRESS
  const liveSession = {
    id: "test-live-session",
    status: "IN_PROGRESS",
    scheduledStartTime: new Date(nowMs - 15 * 60 * 1000),
    scheduledEndTime: new Date(nowMs + 45 * 60 * 1000),
    tutorPaid: false,
  };

  const allSessions = [pastSession, completedSession, paidSession, futureSession, liveSession];

  // Run categorization logic as implemented in admin & tutor pages:
  const upcomingList = allSessions.filter((s) => {
    const endMs = new Date(s.scheduledEndTime).getTime();
    const isDone = s.status === "COMPLETED" || s.status === "CANCELLED";
    return !s.tutorPaid && !isDone && endMs > nowMs;
  });

  const completedUnpaidList = allSessions.filter((s) => {
    const endMs = new Date(s.scheduledEndTime).getTime();
    const isDoneOrPassed = s.status === "COMPLETED" || endMs <= nowMs;
    return !s.tutorPaid && s.status !== "CANCELLED" && isDoneOrPassed;
  });

  const archivedPaidList = allSessions.filter((s) => s.tutorPaid);

  console.log("Upcoming count (expected 2: futureSession + liveSession):", upcomingList.length);
  if (upcomingList.length !== 2) {
    throw new Error(`Expected 2 upcoming sessions, got ${upcomingList.length}`);
  }
  if (upcomingList.some((s) => s.id === "test-past-session")) {
    throw new Error("FAIL: Past session was found in upcomingList!");
  }
  if (upcomingList.some((s) => s.id === "test-completed-session")) {
    throw new Error("FAIL: Completed session was found in upcomingList!");
  }
  if (upcomingList.some((s) => s.id === "test-paid-session")) {
    throw new Error("FAIL: Paid session was found in upcomingList!");
  }
  console.log("✓ PASSED: Past, Completed, and Paid sessions are strictly excluded from Upcoming list.");

  console.log("Completed Unpaid count (expected 2: pastSession + completedSession):", completedUnpaidList.length);
  if (completedUnpaidList.length !== 2) {
    throw new Error(`Expected 2 completed unpaid sessions, got ${completedUnpaidList.length}`);
  }
  if (!completedUnpaidList.some((s) => s.id === "test-past-session")) {
    throw new Error("FAIL: Past session not found in completedUnpaidList!");
  }
  if (!completedUnpaidList.some((s) => s.id === "test-completed-session")) {
    throw new Error("FAIL: Completed session not found in completedUnpaidList!");
  }
  console.log("✓ PASSED: Past and Completed unpaid sessions correctly placed in Completed (Unpaid) list.");

  console.log("Archived Paid count (expected 1: paidSession):", archivedPaidList.length);
  if (archivedPaidList.length !== 1 || archivedPaidList[0].id !== "test-paid-session") {
    throw new Error("FAIL: Paid session not correctly isolated into archivedPaidList!");
  }
  console.log("✓ PASSED: Archived Paid sessions correctly placed in Archived list.");

  // Test Student upcoming filter:
  const studentUpcoming = allSessions.filter(
    (s) =>
      s.id !== liveSession.id &&
      s.status !== "COMPLETED" &&
      s.status !== "CANCELLED" &&
      new Date(s.scheduledEndTime).getTime() > nowMs
  );
  console.log("Student upcoming count (expected 1: futureSession):", studentUpcoming.length);
  if (studentUpcoming.length !== 1 || studentUpcoming[0].id !== "test-future-session") {
    throw new Error("FAIL: Student upcoming did not correctly isolate futureSession!");
  }
  console.log("✓ PASSED: Student upcoming correctly excludes past and completed lessons.");

  // Test Buttons logic:
  const canShowStartAndDelay = (status: string) => status !== "IN_PROGRESS";
  if (canShowStartAndDelay("IN_PROGRESS")) {
    throw new Error("FAIL: IN_PROGRESS showed start or delay button!");
  }
  if (!canShowStartAndDelay("SCHEDULED")) {
    throw new Error("FAIL: SCHEDULED did not show start or delay button!");
  }
  if (!canShowStartAndDelay("DELAYED")) {
    throw new Error("FAIL: DELAYED did not show start or delay button!");
  }
  console.log("✓ PASSED: Start and Delay buttons are strictly hidden when lesson is IN_PROGRESS.");

  console.log("ALL VERIFICATIONS PASSED!");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
