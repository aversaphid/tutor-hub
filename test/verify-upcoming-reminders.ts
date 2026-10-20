import { prisma } from "../lib/prisma";
import { checkAndSendUpcomingLessonReminders } from "../lib/lesson-reminders";

async function runReminderTests() {
  console.log("=== Testing Upcoming Lesson Push Notification Engine ===\n");

  // Find a tutor and student to test with
  const tutor = await prisma.user.findFirst({
    where: { role: { in: ["TUTOR", "HEAD_TUTOR"] } },
    select: { id: true, name: true },
  });
  const student = await prisma.user.findFirst({
    where: { role: "TUTEE" },
    select: { id: true, name: true },
  });

  if (!tutor || !student) {
    console.log("⚠️ Not enough users in database to run live session reminder test. Skipping DB creation.");
    return;
  }

  console.log(`Using Tutor: ${tutor.name} (${tutor.id}) and Student: ${student.name} (${student.id})`);

  const now = new Date();
  // 1. Create a session starting in 10 minutes (within 15-minute reminder window)
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
  const oneHourFromNow = new Date(tenMinutesFromNow.getTime() + 60 * 60 * 1000);

  const testSession = await prisma.session.create({
    data: {
      title: "Test Upcoming Reminder Lesson",
      tutorId: tutor.id,
      tuteeId: student.id,
      scheduledStartTime: tenMinutesFromNow,
      scheduledEndTime: oneHourFromNow,
      status: "SCHEDULED",
      reminderSentAt: null,
    },
  });

  console.log(`Created test session: ${testSession.id} scheduled at ${tenMinutesFromNow.toISOString()}`);

  try {
    // 2. Run reminder engine
    console.log("\nRunning checkAndSendUpcomingLessonReminders()...");
    const result = await checkAndSendUpcomingLessonReminders();

    if (result.sentCount < 1) {
      throw new Error(`Expected at least 1 session reminder sent, got ${result.sentCount}`);
    }
    console.log(`✅ Success! Detected and dispatched upcoming reminder for ${result.sentCount} session(s).`);

    // 3. Verify reminderSentAt was stamped on the session
    const updated = await prisma.session.findUnique({
      where: { id: testSession.id },
      select: { reminderSentAt: true },
    });

    if (!updated?.reminderSentAt) {
      throw new Error("reminderSentAt was not updated in the database!");
    }
    console.log(`✅ reminderSentAt properly stamped: ${updated.reminderSentAt.toISOString()}`);

    // 4. Test Idempotency: Second run should NOT dispatch any duplicate reminder
    console.log("\nTesting Idempotency (second run immediately after)...");
    // Advance throttle timer for testing
    const secondResult = await checkAndSendUpcomingLessonReminders();
    if (secondResult.sentCount !== 0) {
      throw new Error(`Idempotency failure: second run sent ${secondResult.sentCount} reminders! Expected 0.`);
    }
    console.log("✅ Idempotency verified: zero duplicate notifications sent.");

    // 5. Test Far Future session (2 hours away): should NOT be triggered
    const twoHoursFromNow = new Date(now.getTime() + 120 * 60 * 1000);
    const farSession = await prisma.session.create({
      data: {
        title: "Far Future Lesson",
        tutorId: tutor.id,
        tuteeId: student.id,
        scheduledStartTime: twoHoursFromNow,
        scheduledEndTime: new Date(twoHoursFromNow.getTime() + 3600000),
        status: "SCHEDULED",
        reminderSentAt: null,
      },
    });

    const farResult = await checkAndSendUpcomingLessonReminders();
    if (farResult.sentCount !== 0) {
      throw new Error("Far future session was prematurely alerted!");
    }
    console.log("✅ Far future session (2h away) properly excluded from 15m alert window.");

    // Clean up far session
    await prisma.session.delete({ where: { id: farSession.id } });

  } finally {
    // Clean up test session
    await prisma.session.delete({ where: { id: testSession.id } }).catch(() => {});
    console.log("✅ Cleaned up test sessions.");
  }

  console.log("\n🎉 ALL UPCOMING LESSON REMINDER TESTS PASSED!");
}

runReminderTests()
  .catch((err) => {
    console.error("❌ Test Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
