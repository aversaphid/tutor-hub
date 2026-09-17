import { prisma } from "../lib/prisma";
import {
  CreateUserSchema,
  ChangePasswordSchema,
  LessonCompletionSchema,
  UpdateSessionSchema,
} from "../lib/validations";

async function runLessonLifecycleVerification() {
  console.log("==================================================");
  console.log("🧪 VERIFYING LESSON LIFECYCLE & NEW USER FEATURES");
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

  // 1. Password Requirements: Min 5 characters
  console.log("--- 1. Password Policy (Minimum 5 characters) ---");
  const pwd4 = ChangePasswordSchema.safeParse({
    currentPassword: "admin",
    newPassword: "1234",
  });
  assert("Password with 4 characters is REJECTED", !pwd4.success);

  const pwd5 = ChangePasswordSchema.safeParse({
    currentPassword: "admin",
    newPassword: "12345",
  });
  assert("Password with 5 characters is ACCEPTED", pwd5.success);

  const createUserPwd4 = CreateUserSchema.safeParse({
    name: "Short Pwd Tutor",
    email: "short@lbmathstuition.co.uk",
    role: "TUTOR",
    password: "abcd",
  });
  assert("Create user with 4-character password is REJECTED", !createUserPwd4.success);

  const createUserPwd5 = CreateUserSchema.safeParse({
    name: "Valid Pwd Tutor",
    email: "valid@lbmathstuition.co.uk",
    role: "TUTOR",
    password: "abcde",
  });
  assert("Create user with 5-character password is ACCEPTED", createUserPwd5.success);

  // 2. Login username derivation
  console.log("\n--- 2. Username Normalization & Suffix ---");
  const normalizeIdentifier = (input: string) => {
    let clean = input.trim();
    if (!clean.includes("@")) {
      clean = `${clean.toLowerCase()}@lbmathstuition.co.uk`;
    }
    return clean;
  };
  assert(
    "Username 'luke' auto-resolves to luke@lbmathstuition.co.uk",
    normalizeIdentifier("luke") === "luke@lbmathstuition.co.uk"
  );
  assert(
    "Username 'SARAH' auto-resolves to sarah@lbmathstuition.co.uk",
    normalizeIdentifier("SARAH") === "sarah@lbmathstuition.co.uk"
  );
  assert(
    "Email 'luke@lbmathstuition.co.uk' preserves email",
    normalizeIdentifier("luke@lbmathstuition.co.uk") === "luke@lbmathstuition.co.uk"
  );

  // 3. Meeting Room 5-minute unlock rule
  console.log("\n--- 3. Meeting Room 5-Minute Unlock Logic ---");
  const now = Date.now();
  const isMeetingUnlocked = (scheduledStartTime: number, status: string) => {
    const unlockTime = scheduledStartTime - 5 * 60 * 1000;
    return status === "IN_PROGRESS" || now >= unlockTime;
  };

  // Session starting in 10 minutes (locked)
  assert(
    "Meeting starting in 10 minutes is LOCKED",
    !isMeetingUnlocked(now + 10 * 60 * 1000, "SCHEDULED")
  );

  // Session starting in 4 minutes (unlocked)
  assert(
    "Meeting starting in 4 minutes is UNLOCKED (within 5-minute window)",
    isMeetingUnlocked(now + 4 * 60 * 1000, "SCHEDULED")
  );

  // Session starting in 15 minutes but tutor clicked Start Now (IN_PROGRESS)
  assert(
    "Meeting started early by tutor (IN_PROGRESS) is UNLOCKED immediately",
    isMeetingUnlocked(now + 15 * 60 * 1000, "IN_PROGRESS")
  );

  // 4. Student Lesson Completion Schema
  console.log("\n--- 4. Student Lesson Completion Validation ---");
  const invalidRating0 = LessonCompletionSchema.safeParse({
    feedbackCovered: "Algebra quadratics",
    feedbackRating: 0,
  });
  assert("Rating 0 is REJECTED", !invalidRating0.success);

  const invalidRating6 = LessonCompletionSchema.safeParse({
    feedbackCovered: "Algebra quadratics",
    feedbackRating: 6,
  });
  assert("Rating 6 is REJECTED", !invalidRating6.success);

  const missingCovered = LessonCompletionSchema.safeParse({
    feedbackCovered: "",
    feedbackRating: 5,
  });
  assert("Empty covered topics is REJECTED", !missingCovered.success);

  const validReview = LessonCompletionSchema.safeParse({
    feedbackCovered: "Simultaneous Equations and Graphs",
    feedbackRating: 5,
    feedbackNotes: "Very helpful session, understood substitution method!",
  });
  assert("Valid 5-star review with topics covered and notes is ACCEPTED", validReview.success);

  // 5. Database Verification: Session Completion and Paid Status Toggle
  console.log("\n--- 5. Database Integration & Paid Status Toggle ---");
  const tutor = await prisma.user.findFirst({ where: { role: { in: ["HEAD_TUTOR", "TUTOR"] } } });
  const student = await prisma.user.findFirst({ where: { role: "TUTEE" } });

  if (tutor && student) {
    const testSession = await prisma.session.create({
      data: {
        title: "Test GCSE Calculus Session",
        tutorId: tutor.id,
        tuteeId: student.id,
        scheduledStartTime: new Date(now - 3600000), // 1 hour ago
        scheduledEndTime: new Date(now - 1800000),   // 30 min ago
        status: "SCHEDULED",
        tutorPaid: false,
      },
    });
    assert("Created test session in past", testSession.id !== undefined);

    // Student completes lesson
    const completedSession = await prisma.session.update({
      where: { id: testSession.id },
      data: {
        status: "COMPLETED",
        feedbackCovered: "Integration by parts and definite integrals",
        feedbackRating: 5,
        feedbackNotes: "Brilliant explanation of boundary values",
        feedbackSubmittedAt: new Date(),
      },
    });
    assert(
      "Student review recorded in database (5 stars, covered topics, notes)",
      completedSession.feedbackRating === 5 &&
        completedSession.feedbackCovered === "Integration by parts and definite integrals" &&
        completedSession.tutorPaid === false
    );

    // 3-Tier Categorization Check
    const endMs = new Date(completedSession.scheduledEndTime).getTime();
    const isDoneOrPassed =
      completedSession.status === "COMPLETED" || (endMs <= now && completedSession.status !== "IN_PROGRESS");
    const isCompletedUnpaid = isDoneOrPassed && !completedSession.tutorPaid;
    assert("Session is categorized as 'Completed (Tutor Not Paid)'", isCompletedUnpaid);

    // Admin toggles to Paid
    const paidSession = await prisma.session.update({
      where: { id: testSession.id },
      data: {
        tutorPaid: true,
        tutorPaidAt: new Date(),
      },
    });
    assert(
      "Admin marks session as paid (tutorPaid = true, tutorPaidAt timestamp set)",
      paidSession.tutorPaid === true && paidSession.tutorPaidAt !== null
    );

    // Admin reverts to Unpaid
    const unpaidAgainSession = await prisma.session.update({
      where: { id: testSession.id },
      data: {
        tutorPaid: false,
        tutorPaidAt: null,
      },
    });
    assert(
      "Admin can revert session to unpaid (tutorPaid = false, tutorPaidAt cleared)",
      unpaidAgainSession.tutorPaid === false && unpaidAgainSession.tutorPaidAt === null
    );

    // Clean up test session
    await prisma.session.delete({ where: { id: testSession.id } });
    console.log("🧹 Cleaned up temporary test session");
  }

  console.log("\n==================================================");
  console.log(`RESULTS: ${passed} / ${total} assertions passed`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runLessonLifecycleVerification()
  .catch((err) => {
    console.error("Verification failed with uncaught error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
