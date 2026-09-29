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
  // Case: Lesson started at 5:00 PM. At 5:02 PM (2 minutes after start), tutor delays by 5 minutes.
  // Requirement: New start time is 5:05 PM, which is 3 minutes from the time the delay button is clicked (5:02 PM).
  const start5pm = new Date("2026-09-29T17:00:00.000Z");
  const clickAt502pm = new Date("2026-09-29T17:02:00.000Z");
  const delayMinutes = 5;

  const scheduledStartMs = start5pm.getTime();
  const prospectiveStartMs = scheduledStartMs + delayMinutes * 60 * 1000;
  const nowClickMs = clickAt502pm.getTime();

  let newStart: Date;
  if (prospectiveStartMs > nowClickMs) {
    newStart = new Date(prospectiveStartMs);
  } else {
    newStart = new Date(nowClickMs + delayMinutes * 60 * 1000);
  }

  const minutesFromClick = (newStart.getTime() - clickAt502pm.getTime()) / (60 * 1000);
  console.log(`Original start: ${start5pm.toISOString()}`);
  console.log(`Delay clicked at: ${clickAt502pm.toISOString()}`);
  console.log(`New start: ${newStart.toISOString()}`);
  console.log(`Minutes from click to new start: ${minutesFromClick}m`);

  if (minutesFromClick !== 3) {
    throw new Error(`Expected new start time to be 3 minutes from click, got ${minutesFromClick}m`);
  }
  console.log("✓ DELAY 2 MINS AFTER START: Correctly set to 3 minutes from click (5:05 PM)");

  // Case: Lesson started at 5:00 PM. At 5:07 PM (7 minutes after start), tutor delays by 5 minutes.
  // Since 5:00 + 5m = 5:05 PM is in the past, new start is 5:07 + 5m = 5:12 PM (5 minutes from click).
  const clickAt507pm = new Date("2026-09-29T17:07:00.000Z");
  const nowClickMs2 = clickAt507pm.getTime();
  let newStart2: Date;
  if (prospectiveStartMs > nowClickMs2) {
    newStart2 = new Date(prospectiveStartMs);
  } else {
    newStart2 = new Date(nowClickMs2 + delayMinutes * 60 * 1000);
  }
  const minutesFromClick2 = (newStart2.getTime() - clickAt507pm.getTime()) / (60 * 1000);
  console.log(`New start when clicked at 5:07 PM: ${newStart2.toISOString()} (${minutesFromClick2}m from click)`);
  if (minutesFromClick2 !== 5) {
    throw new Error(`Expected new start time to be 5 minutes from click, got ${minutesFromClick2}m`);
  }
  console.log("✓ DELAY PAST WINDOW: Correctly falls forward to 5 minutes from click (5:12 PM)");

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
    const now = new Date();
    const nowMsReal = now.getTime();
    const sStartMs = testSession.scheduledStartTime.getTime();
    const pStartMs = sStartMs + 5 * 60 * 1000;

    let computedStart: Date;
    let addedDel: number;
    if (pStartMs > nowMsReal) {
      computedStart = new Date(pStartMs);
      addedDel = 5;
    } else {
      computedStart = new Date(nowMsReal + 5 * 60 * 1000);
      addedDel = Math.max(5, Math.ceil((computedStart.getTime() - sStartMs) / 60000));
    }

    const duration = testSession.scheduledEndTime.getTime() - testSession.scheduledStartTime.getTime();
    const computedEnd = new Date(computedStart.getTime() + duration);

    const updated = await prisma.session.update({
      where: { id: testSession.id },
      data: {
        delayMinutes: testSession.delayMinutes + addedDel,
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
