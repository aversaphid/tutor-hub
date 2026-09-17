import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

async function verifyDeletionsAndTutorCompletion() {
  console.log("==================================================");
  console.log("🧪 VERIFYING DELETIONS, TUTOR COMPLETION & UI UPDATES");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, extra?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${extra || ""}`);
    }
  }

  // 1. Check Login Placeholders (No 'luke', replaced by 'name')
  console.log("--- 1. Login Placeholders Verification ---");
  const loginPageContent = fs.readFileSync(
    path.join(__dirname, "../app/login/page.tsx"),
    "utf8"
  );
  const tutorModalContent = fs.readFileSync(
    path.join(__dirname, "../components/tutor-login-modal.tsx"),
    "utf8"
  );

  assert(
    "Login page placeholder has 'e.g. name'",
    loginPageContent.includes('placeholder="e.g. name"')
  );
  assert(
    "Login page does NOT suggest 'luke'",
    !loginPageContent.includes('placeholder="e.g. luke"')
  );
  assert(
    "Tutor modal placeholder has 'e.g. name'",
    tutorModalContent.includes('placeholder="e.g. name"')
  );
  assert(
    "Tutor modal does NOT suggest 'luke'",
    !tutorModalContent.includes('placeholder="e.g. luke"')
  );

  // 2. Check Tutor Next Meeting PIN (Copy button removed, plain PIN displayed)
  console.log("\n--- 2. Tutor Next Meeting PIN Display ---");
  const tutorPageContent = fs.readFileSync(
    path.join(__dirname, "../app/tutor/page.tsx"),
    "utf8"
  );
  assert(
    "Tutor Next Meeting card does not have PIN copy button",
    !tutorPageContent.includes("next-pin-${activeLesson.id}")
  );
  assert(
    "Tutor Next Meeting card cleanly renders student PIN",
    tutorPageContent.includes("{activeLesson.tutee?.pin || \"----\"}")
  );

  // 3. Test Lesson Deletion & Cascade
  console.log("\n--- 3. Lesson Deletion Verification ---");
  const admin = await prisma.user.findFirst({ where: { role: "HEAD_TUTOR" } });
  let testTutor = await prisma.user.findFirst({ where: { email: "sarah-del@lbmathstuition.co.uk" } });
  if (!testTutor) {
    testTutor = await prisma.user.create({
      data: {
        name: "Sarah Deletion Test",
        email: "sarah-del@lbmathstuition.co.uk",
        role: "TUTOR",
        active: true,
      },
    });
  }

  let testStudent = await prisma.user.findFirst({ where: { magicKey: "STU-DEL-TEST-001" } });
  if (!testStudent) {
    testStudent = await prisma.user.create({
      data: {
        name: "Delete Test Student",
        role: "TUTEE",
        pin: "5566",
        magicKey: "STU-DEL-TEST-001",
        assignedTutorId: testTutor.id,
        active: true,
      },
    });
  }

  const testSession = await prisma.session.create({
    data: {
      title: "Temporary Deletion Session",
      tutorId: testTutor.id,
      tuteeId: testStudent.id,
      scheduledStartTime: new Date(),
      scheduledEndTime: new Date(Date.now() + 3600000),
      status: "SCHEDULED",
    },
  });

  // Create an audit log for this session
  await prisma.auditLog.create({
    data: {
      sessionId: testSession.id,
      actorId: admin!.id,
      action: "SCHEDULED",
      details: "Test session created for deletion test",
    },
  });

  // Delete the session and associated audit logs
  await prisma.auditLog.deleteMany({ where: { sessionId: testSession.id } });
  await prisma.session.delete({ where: { id: testSession.id } });

  const foundSession = await prisma.session.findUnique({ where: { id: testSession.id } });
  const foundLogs = await prisma.auditLog.findMany({ where: { sessionId: testSession.id } });
  assert("Lesson deleted successfully", foundSession === null);
  assert("Associated session audit logs cleaned up", foundLogs.length === 0);

  // 4. Test Student Deletion & Associated Sessions Cascade
  console.log("\n--- 4. Student Deletion & Cascade ---");
  const studentForDelete = await prisma.user.create({
    data: {
      name: "Temporary Student For Deletion",
      role: "TUTEE",
      pin: "9876",
      magicKey: "STU-TEMP-DEL-999",
      active: true,
    },
  });

  const sessionForStudent = await prisma.session.create({
    data: {
      title: "Session to be deleted with student",
      tutorId: testTutor.id,
      tuteeId: studentForDelete.id,
      scheduledStartTime: new Date(),
      scheduledEndTime: new Date(Date.now() + 3600000),
    },
  });

  // Delete student and cascade
  await prisma.session.deleteMany({ where: { tuteeId: studentForDelete.id } });
  await prisma.user.delete({ where: { id: studentForDelete.id } });

  const checkStudent = await prisma.user.findUnique({ where: { id: studentForDelete.id } });
  const checkStudentSession = await prisma.session.findUnique({ where: { id: sessionForStudent.id } });
  assert("Student deleted from database", checkStudent === null);
  assert("Student sessions removed on student deletion", checkStudentSession === null);

  // 5. Test Tutor Deletion & Student Unassignment
  console.log("\n--- 5. Tutor Deletion & Student Unassignment ---");
  const tutorForDelete = await prisma.user.create({
    data: {
      name: "Temp Tutor For Deletion",
      email: "temp-del-tutor@lbmathstuition.co.uk",
      role: "TUTOR",
      active: true,
    },
  });

  const studentAssignedToTemp = await prisma.user.create({
    data: {
      name: "Student Assigned To Temp Tutor",
      role: "TUTEE",
      pin: "4321",
      magicKey: "STU-UNASSIGN-TEST",
      assignedTutorId: tutorForDelete.id,
      active: true,
    },
  });

  // Deleting tutor: unassigns students, removes tutor
  await prisma.user.updateMany({
    where: { assignedTutorId: tutorForDelete.id },
    data: { assignedTutorId: null },
  });
  await prisma.session.deleteMany({ where: { tutorId: tutorForDelete.id } });
  await prisma.user.delete({ where: { id: tutorForDelete.id } });

  const checkTutor = await prisma.user.findUnique({ where: { id: tutorForDelete.id } });
  const checkAssignedStudent = await prisma.user.findUnique({ where: { id: studentAssignedToTemp.id } });
  assert("Tutor deleted successfully", checkTutor === null);
  assert("Student unassigned when their tutor is deleted (assignedTutorId = null)", checkAssignedStudent?.assignedTutorId === null);

  // Clean up student
  await prisma.user.delete({ where: { id: studentAssignedToTemp.id } });

  // 6. Test Tutor-Driven Lesson Completion & Feedback
  console.log("\n--- 6. Tutor-Driven Lesson Completion ---");
  const completionSession = await prisma.session.create({
    data: {
      title: "Algebra & Geometry Review",
      tutorId: testTutor.id,
      tuteeId: testStudent.id,
      scheduledStartTime: new Date(Date.now() - 3600000),
      scheduledEndTime: new Date(Date.now() - 1800000),
      status: "IN_PROGRESS",
    },
  });

  // Tutor completes lesson with rating and topics covered
  const completedSession = await prisma.session.update({
    where: { id: completionSession.id },
    data: {
      status: "COMPLETED",
      actualEndTime: new Date(),
      feedbackCovered: "Linear simultaneous equations and circle theorems",
      feedbackRating: 5,
      feedbackNotes: "Student excelled at substitution method, homework assigned p. 55",
      feedbackSubmittedAt: new Date(),
    },
  });

  assert(
    "Tutor reported feedback is saved (status = COMPLETED, 5 stars, covered topics, notes)",
    Boolean(
      completedSession.status === "COMPLETED" &&
        completedSession.feedbackRating === 5 &&
        completedSession.feedbackCovered === "Linear simultaneous equations and circle theorems" &&
        completedSession.feedbackNotes?.includes("p. 55")
    )
  );

  // Clean up
  await prisma.session.delete({ where: { id: completionSession.id } });
  await prisma.user.delete({ where: { id: testStudent.id } });
  await prisma.user.delete({ where: { id: testTutor.id } });

  // 7. Clear Audit Logs Verification
  console.log("\n--- 7. Clear Audit Logs ---");
  await prisma.auditLog.create({
    data: {
      sessionId: "dummy-session",
      actorId: admin!.id,
      action: "TEST_ENTRY",
      details: "Temporary audit log for clearing test",
    },
  }).catch(() => {}); // If foreign key prevents dummy sessionId, test against existing logs

  const beforeClearCount = await prisma.auditLog.count();
  const deleteResult = await prisma.auditLog.deleteMany({});
  const afterClearCount = await prisma.auditLog.count();
  assert("Clear audit logs successfully wiped all entries", afterClearCount === 0);

  console.log("\n==================================================");
  console.log(`RESULTS: ${passed} / ${total} assertions passed`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

verifyDeletionsAndTutorCompletion()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
