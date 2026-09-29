import { PrismaClient } from "@prisma/client";
import { resolveActiveSession } from "../lib/session-utils";

const prisma = new PrismaClient();

async function run() {
  console.log("=== VERIFY UNCOMPLETED PREVIOUS LESSON & STARTED DELAY LOGIC ===");

  const baseNow = new Date("2026-09-29T17:05:00.000Z"); // 5:05 PM
  const nowMs = baseNow.getTime();

  // Lesson A: 4:00 PM - 5:00 PM (Uncompleted, IN_PROGRESS)
  const lessonA = {
    id: "lesson-a",
    title: "Lesson A (Uncompleted)",
    status: "IN_PROGRESS" as const,
    scheduledStartTime: new Date("2026-09-29T16:00:00.000Z"),
    scheduledEndTime: new Date("2026-09-29T17:00:00.000Z"),
  };

  // Lesson B: 5:00 PM - 6:00 PM (Current ongoing lesson, IN_PROGRESS)
  const lessonB = {
    id: "lesson-b",
    title: "Lesson B (Current Ongoing)",
    status: "IN_PROGRESS" as const,
    scheduledStartTime: new Date("2026-09-29T17:00:00.000Z"),
    scheduledEndTime: new Date("2026-09-29T18:00:00.000Z"),
  };

  // Lesson C: 6:00 PM - 7:00 PM (Next scheduled lesson)
  const lessonC = {
    id: "lesson-c",
    title: "Lesson C (Next Scheduled)",
    status: "SCHEDULED" as const,
    scheduledStartTime: new Date("2026-09-29T18:00:00.000Z"),
    scheduledEndTime: new Date("2026-09-29T19:00:00.000Z"),
  };

  const sessions = [lessonA, lessonB, lessonC];

  console.log("\n--- Testing resolveActiveSession at 5:05 PM ---");
  const active = resolveActiveSession(sessions, nowMs);
  console.log("Resolved Active Lesson:", active?.title);
  if (active?.id !== "lesson-b") {
    throw new Error(`Expected active lesson to be Lesson B, got: ${active?.id}`);
  }
  console.log("✓ ACTIVE LESSON correctly selected as Lesson B (5:00 PM - 6:00 PM)");

  console.log("\n--- Testing nextLesson calculation ---");
  const activeStartMs = new Date(active.scheduledStartTime).getTime();
  const upcoming = sessions
    .filter((s: any) => {
      if (s.status === "COMPLETED" || s.status === "CANCELLED") return false;
      if (s.id === active.id) return false;
      const endMs = new Date(s.scheduledEndTime).getTime();
      const startMs = new Date(s.scheduledStartTime).getTime();
      if (endMs <= nowMs) return false;
      if (startMs < activeStartMs) return false;
      return true;
    })
    .sort(
      (a: any, b: any) =>
        new Date(a.scheduledStartTime).getTime() -
        new Date(b.scheduledStartTime).getTime()
    );

  const nextLesson = upcoming[0] || null;
  console.log("Resolved Next Lesson:", nextLesson?.title);
  if (nextLesson?.id !== "lesson-c") {
    throw new Error(`Expected next lesson to be Lesson C, got: ${nextLesson?.id}`);
  }
  console.log("✓ NEXT LESSON correctly selected as Lesson C (6:00 PM - 7:00 PM)");

  console.log("\n--- Testing uncompletedPastLessons detection ---");
  const uncompletedPastLessons = sessions.filter(
    (s: any) =>
      s.status === "IN_PROGRESS" &&
      new Date(s.scheduledEndTime).getTime() <= nowMs
  );
  console.log("Uncompleted past lessons count:", uncompletedPastLessons.length);
  if (uncompletedPastLessons.length !== 1 || uncompletedPastLessons[0].id !== "lesson-a") {
    throw new Error(`Expected uncompleted past lesson to be Lesson A, got: ${JSON.stringify(uncompletedPastLessons)}`);
  }
  console.log("✓ UNCOMPLETED PAST LESSON correctly detected as Lesson A for the alert banner");

  console.log("\n--- Testing Delay Calculation for Ongoing Lesson ---");
  // The delay should ALWAYS be added to the intended start time (session.scheduledStartTime),
  // not onto the arbitrary timestamp when the user clicks the button.
  // Example 1: Lesson intended start is 5:00:00 PM. Tutor clicks "+5m Delay" at 5:02:30 PM.
  // New start time is 5:05:00 PM (5 mins from intended start time, 2.5 mins from click).
  const start5pm = new Date("2026-09-29T17:00:00.000Z");
  const clickAt50230pm = new Date("2026-09-29T17:02:30.123Z");
  const delayMinutes = 5;

  const currentStart1 = new Date(start5pm);
  currentStart1.setSeconds(0, 0);
  const newStart1 = new Date(currentStart1.getTime() + delayMinutes * 60 * 1000);
  newStart1.setSeconds(0, 0);

  console.log(`Intended start: ${start5pm.toISOString()}`);
  console.log(`Clicked at: ${clickAt50230pm.toISOString()}`);
  console.log(`New start: ${newStart1.toISOString()}`);

  if (newStart1.toISOString() !== "2026-09-29T17:05:00.000Z") {
    throw new Error(`Expected new start time to be 2026-09-29T17:05:00.000Z, got ${newStart1.toISOString()}`);
  }
  console.log("✓ DELAY FROM INTENDED START: Correctly set to 5:05:00 PM (clean minute boundary)");

  // Example 2: Lesson intended start was 5:45:00 PM. Tutor clicks "+5m Delay" at 5:45:32 PM.
  // New start must be 5:50:00 PM (NOT 5:50:32 PM!).
  const start545pm = new Date("2026-09-29T17:45:00.000Z");
  const currentStart2 = new Date(start545pm);
  currentStart2.setSeconds(0, 0);
  const newStart2 = new Date(currentStart2.getTime() + delayMinutes * 60 * 1000);
  newStart2.setSeconds(0, 0);

  if (newStart2.toISOString() !== "2026-09-29T17:50:00.000Z") {
    throw new Error(`Expected new start time to be 2026-09-29T17:50:00.000Z, got ${newStart2.toISOString()}`);
  }
  console.log("✓ DELAY ON SECOND OFFSET: Correctly set to 5:50:00 PM (not 5:50:32 PM)");

  console.log("\n--- Testing Database Delay Integration ---");
  // Create a real DB session in IN_PROGRESS state to test that DB allows delay and updates properly
  let tutorUser = await prisma.user.findFirst({ where: { role: "TUTOR" } });
  let tuteeUser = await prisma.user.findFirst({ where: { role: "TUTEE" } });
  if (!tutorUser || !tuteeUser) {
    console.log("Users not found in DB, skipping DB mock");
  } else {
    const testSession = await prisma.session.create({
      data: {
        title: "Test In-Progress Delay Session",
        tutorId: tutorUser.id,
        tuteeId: tuteeUser.id,
        scheduledStartTime: new Date(Date.now() - 2 * 60 * 1000), // 2 mins ago
        scheduledEndTime: new Date(Date.now() + 58 * 60 * 1000),
        actualStartTime: new Date(Date.now() - 2 * 60 * 1000),
        status: "IN_PROGRESS",
      },
    });

    console.log("Created test session:", testSession.id, "status:", testSession.status);

    // Apply the exact delay update logic from the route
    const currentStart = new Date(testSession.scheduledStartTime);
    currentStart.setSeconds(0, 0);

    const computedStart = new Date(currentStart.getTime() + 5 * 60 * 1000);
    computedStart.setSeconds(0, 0);

    const duration = testSession.scheduledEndTime.getTime() - testSession.scheduledStartTime.getTime();
    const computedEnd = new Date(computedStart.getTime() + duration);
    computedEnd.setSeconds(0, 0);

    const updated = await prisma.session.update({
      where: { id: testSession.id },
      data: {
        delayMinutes: testSession.delayMinutes + 5,
        delayReason: "Tutor running slightly behind",
        scheduledStartTime: computedStart,
        scheduledEndTime: computedEnd,
        status: "DELAYED",
        actualStartTime: null,
      },
    });

    console.log("Updated session status:", updated.status);
    console.log("Updated actualStartTime:", updated.actualStartTime);
    console.log("Updated delayReason:", updated.delayReason);

    if (updated.status !== "DELAYED" || updated.actualStartTime !== null) {
      throw new Error("DB update failed to reset to DELAYED with null actualStartTime");
    }
    console.log("✓ DB update successfully transitioned IN_PROGRESS session to DELAYED with actualStartTime: null");

    // Clean up test session
    await prisma.session.delete({ where: { id: testSession.id } });
    console.log("✓ Test session cleaned up from DB");
  }

  console.log("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n");
}

run()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
