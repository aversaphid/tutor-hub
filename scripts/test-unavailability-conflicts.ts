import { prisma } from "../lib/prisma";
import { detectSessionConflict } from "../lib/conflict-detector";

async function runTest() {
  console.log("=== Testing Tutor Unavailability & Holiday Conflict Engine ===");

  // Find or create tutor and student
  let tutor = await prisma.user.findFirst({
    where: { role: { in: ["TUTOR", "HEAD_TUTOR"] } },
  });

  if (!tutor) {
    tutor = await prisma.user.create({
      data: {
        name: "Test Tutor",
        email: "test_tutor@lbmaths.com",
        role: "TUTOR",
      },
    });
  }

  let student = await prisma.user.findFirst({
    where: { role: "TUTEE" },
  });

  let createdStudent = false;
  if (!student) {
    student = await prisma.user.create({
      data: {
        name: "Test Student",
        role: "TUTEE",
        pin: "9999",
      },
    });
    createdStudent = true;
  }

  console.log(`Using Tutor: ${tutor.name} (${tutor.id})`);
  console.log(`Using Student: ${student.name} (${student.id})`);

  // Clean up any test records
  await (prisma as any).tutorUnavailability.deleteMany({
    where: {
      reason: { in: ["TEST_HOURLY_BLACKOUT", "TEST_SUMMER_HOLIDAY"] },
    },
  });

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 14); // 2 weeks ahead

  // 1. Create an hourly blackout: 14:00 to 16:00
  const blackoutStart = new Date(baseDate);
  blackoutStart.setHours(14, 0, 0, 0);
  const blackoutEnd = new Date(baseDate);
  blackoutEnd.setHours(16, 0, 0, 0);

  const blackout = await (prisma as any).tutorUnavailability.create({
    data: {
      tutorId: tutor.id,
      startTime: blackoutStart,
      endTime: blackoutEnd,
      type: "BUSY",
      reason: "TEST_HOURLY_BLACKOUT",
    },
  });
  console.log("Created hourly blackout: 14:00 - 16:00");

  // Test 1A: Attempt booking a session inside blackout: 14:30 - 15:30
  const conflictSessionStart = new Date(baseDate);
  conflictSessionStart.setHours(14, 30, 0, 0);
  const conflictSessionEnd = new Date(baseDate);
  conflictSessionEnd.setHours(15, 30, 0, 0);

  const res1 = await detectSessionConflict({
    tutorId: tutor.id,
    tuteeId: student.id,
    startTime: conflictSessionStart,
    endTime: conflictSessionEnd,
  });

  if (res1.hasConflict) {
    console.log("✓ PASS: Hourly blackout successfully detected conflict:\n  ->", res1.reason);
  } else {
    console.error("FAIL: Hourly blackout failed to trigger conflict!");
    process.exit(1);
  }

  // Test 1B: Attempt booking a session non-overlapping: 16:30 - 17:30
  const okSessionStart = new Date(baseDate);
  okSessionStart.setHours(16, 30, 0, 0);
  const okSessionEnd = new Date(baseDate);
  okSessionEnd.setHours(17, 30, 0, 0);

  const res1B = await detectSessionConflict({
    tutorId: tutor.id,
    tuteeId: student.id,
    startTime: okSessionStart,
    endTime: okSessionEnd,
  });

  if (!res1B.hasConflict) {
    console.log("✓ PASS: Non-overlapping time slot passed without conflict.");
  } else {
    console.error("FAIL: False positive on non-overlapping time slot:", res1B.reason);
    process.exit(1);
  }

  // 2. Create a multi-day holiday: +20 days to +25 days
  const holStart = new Date(baseDate);
  holStart.setDate(holStart.getDate() + 6);
  holStart.setHours(0, 0, 0, 0);

  const holEnd = new Date(baseDate);
  holEnd.setDate(holEnd.getDate() + 11);
  holEnd.setHours(23, 59, 59, 999);

  const holiday = await (prisma as any).tutorUnavailability.create({
    data: {
      tutorId: tutor.id,
      startTime: holStart,
      endTime: holEnd,
      type: "HOLIDAY",
      reason: "TEST_SUMMER_HOLIDAY",
    },
  });
  console.log("Created multi-day holiday:", holStart.toISOString(), "to", holEnd.toISOString());

  // Test 2A: Attempt booking a session during holiday
  const holidaySessionStart = new Date(holStart);
  holidaySessionStart.setDate(holidaySessionStart.getDate() + 2);
  holidaySessionStart.setHours(10, 0, 0, 0);

  const holidaySessionEnd = new Date(holidaySessionStart);
  holidaySessionEnd.setHours(11, 0, 0, 0);

  const res2 = await detectSessionConflict({
    tutorId: tutor.id,
    tuteeId: student.id,
    startTime: holidaySessionStart,
    endTime: holidaySessionEnd,
  });

  if (res2.hasConflict) {
    console.log("✓ PASS: Holiday successfully detected conflict:\n  ->", res2.reason);
  } else {
    console.error("FAIL: Holiday failed to trigger conflict!");
    process.exit(1);
  }

  // 3. Clean up
  await (prisma as any).tutorUnavailability.deleteMany({
    where: {
      id: { in: [blackout.id, holiday.id] },
    },
  });

  if (createdStudent) {
    await prisma.user.delete({ where: { id: student.id } });
  }

  // Test 3: Confirm conflict is gone after deletion
  const res3 = await detectSessionConflict({
    tutorId: tutor.id,
    tuteeId: student.id,
    startTime: conflictSessionStart,
    endTime: conflictSessionEnd,
  });

  if (!res3.hasConflict) {
    console.log("✓ PASS: After deleting blackout, slot is open again.");
  } else {
    console.error("FAIL: Deleted blackout still caused conflict:", res3.reason);
    process.exit(1);
  }

  console.log("\n=================================================");
  console.log("ALL UNAVAILABILITY & HOLIDAY TESTS PASSED (4/4)!");
  console.log("=================================================");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
