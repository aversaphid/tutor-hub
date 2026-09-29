import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("=== VERIFY RESET START TIME LOGIC ===");

  let tutorUser = await prisma.user.findFirst({ where: { role: "TUTOR" } });
  let tuteeUser = await prisma.user.findFirst({ where: { role: "TUTEE" } });

  if (!tutorUser || !tuteeUser) {
    console.log("Creating test tutor & student...");
    tutorUser = await prisma.user.create({
      data: {
        email: "reset_test_tutor@lbmathstuition.co.uk",
        name: "Reset Tutor",
        role: "TUTOR",
        passwordHash: "dummy",
      },
    });
    tuteeUser = await prisma.user.create({
      data: {
        email: "reset_test_student@lbmathstuition.co.uk",
        name: "Reset Student",
        role: "TUTEE",
        passwordHash: "dummy",
        pin: "5544",
      },
    });
  }

  const originalStart = new Date("2026-10-01T15:00:00.000Z");
  const originalEnd = new Date("2026-10-01T16:00:00.000Z");

  const session = await prisma.session.create({
    data: {
      title: "Test Reset Session",
      tutorId: tutorUser.id,
      tuteeId: tuteeUser.id,
      scheduledStartTime: originalStart,
      scheduledEndTime: originalEnd,
      status: "SCHEDULED",
      delayMinutes: 0,
    },
  });

  console.log("1. Created session with original start:", session.scheduledStartTime.toISOString());

  // Delay by 15 minutes
  const delayedStart = new Date(originalStart.getTime() + 15 * 60 * 1000);
  const delayedEnd = new Date(originalEnd.getTime() + 15 * 60 * 1000);

  const delayedSession = await prisma.session.update({
    where: { id: session.id },
    data: {
      scheduledStartTime: delayedStart,
      scheduledEndTime: delayedEnd,
      delayMinutes: 15,
      delayReason: "Traffic delay",
      status: "DELAYED",
    },
  });

  console.log("2. Delayed session to:", delayedSession.scheduledStartTime.toISOString(), "delayMinutes:", delayedSession.delayMinutes);
  if (delayedSession.delayMinutes !== 15 || delayedSession.status !== "DELAYED") {
    throw new Error("Failed to delay session");
  }

  // Now perform Reset Start Time
  const durationMs = delayedSession.scheduledEndTime.getTime() - delayedSession.scheduledStartTime.getTime();
  const resetStart = new Date(delayedSession.scheduledStartTime.getTime() - delayedSession.delayMinutes * 60 * 1000);
  resetStart.setSeconds(0, 0);
  const resetEnd = new Date(resetStart.getTime() + durationMs);
  resetEnd.setSeconds(0, 0);

  const resetSession = await prisma.session.update({
    where: { id: session.id },
    data: {
      scheduledStartTime: resetStart,
      scheduledEndTime: resetEnd,
      delayMinutes: 0,
      delayReason: null,
      status: "SCHEDULED",
      actualStartTime: null,
    },
  });

  console.log("3. Reset session to:", resetSession.scheduledStartTime.toISOString(), "delayMinutes:", resetSession.delayMinutes);

  if (resetSession.scheduledStartTime.toISOString() !== originalStart.toISOString()) {
    throw new Error(`Expected start time ${originalStart.toISOString()}, got ${resetSession.scheduledStartTime.toISOString()}`);
  }
  if (resetSession.delayMinutes !== 0) {
    throw new Error(`Expected delayMinutes 0, got ${resetSession.delayMinutes}`);
  }
  if (resetSession.delayReason !== null) {
    throw new Error(`Expected delayReason null, got ${resetSession.delayReason}`);
  }
  if (resetSession.status !== "SCHEDULED") {
    throw new Error(`Expected status SCHEDULED, got ${resetSession.status}`);
  }

  console.log("✓ PASSED: Start time reset cleanly back to original scheduled start time and delay cleared!");

  // Clean up
  await prisma.session.delete({ where: { id: session.id } });
  console.log("✓ Cleaned up test session");

  console.log("\nALL RESET START TIME TESTS PASSED! 🎉\n");
}

run()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
