import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

async function main() {
  console.log("=== VERIFYING TUTOR CREATION, SOUND TEST REMOVAL, RATING REFINEMENT & REPORT EDITING ===");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
    }
  }

  // 1. Static Checks: Sound Test removed from TeamsLauncher
  const teamsLauncherPath = path.join(process.cwd(), "components", "teams-launcher.tsx");
  const teamsLauncherContent = fs.readFileSync(teamsLauncherPath, "utf-8");
  assert(!teamsLauncherContent.includes("Sound Test"), "TeamsLauncher no longer contains 'Sound Test' button");
  assert(!teamsLauncherContent.includes("Volume2"), "TeamsLauncher no longer imports or uses Volume2");

  // 2. Static Checks: Admin page tutor creation form
  const adminPagePath = path.join(process.cwd(), "app", "admin", "page.tsx");
  const adminPageContent = fs.readFileSync(adminPagePath, "utf-8");
  assert(!adminPageContent.includes("Login Handle"), "Admin page user creation modal no longer renders 'Login Handle'");
  assert(adminPageContent.includes("Name *") && !adminPageContent.includes("Full Name *"), "Admin user creation form uses 'Name *' instead of 'Full Name *'");

  // 3. Static Checks: Tutor completion modal
  const modalPath = path.join(process.cwd(), "components", "tutor-completion-modal.tsx");
  const modalContent = fs.readFileSync(modalPath, "utf-8");
  assert(modalContent.includes("How did the lesson go overall?"), "Completion modal asks 'How did the lesson go overall?'");
  assert(!modalContent.includes("Outstanding — great progress"), "Completion modal removed star descriptions");
  assert(!modalContent.includes("Difficult — required heavy remediation"), "Completion modal removed star 1 description");

  // 4. Static Checks: Tutor page Edit Report button
  const tutorPagePath = path.join(process.cwd(), "app", "tutor", "page.tsx");
  const tutorPageContent = fs.readFileSync(tutorPagePath, "utf-8");
  assert(tutorPageContent.includes("Edit Report"), "Tutor dashboard contains 'Edit Report' button for completed unpaid lessons");
  assert(tutorPageContent.includes("Report Locked (Paid)"), "Tutor dashboard displays 'Report Locked (Paid)' for settled lessons");

  // 5. Functional / Database / API Logic Checks
  const baseUrl = "http://localhost:3000";

  // Login as admin
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "luke", password: "admin" }),
  });
  const loginData = await loginRes.json();
  const adminCookie = loginRes.headers.get("set-cookie") || "";
  assert(loginRes.ok && loginData.user?.role === "HEAD_TUTOR", "Admin login successful");

  // Create a new tutor with only Name and Password (no email supplied from frontend)
  const tutorName = `Emma EditTest ${Date.now().toString().slice(-4)}`;
  const createUserRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      name: tutorName,
      role: "TUTOR",
      password: "password123",
    }),
  });
  const createUserData = await createUserRes.json();
  assert(createUserRes.ok && createUserData.user?.id, "Admin created tutor without email field");
  assert(createUserData.user?.email.endsWith("@lbmathstuition.co.uk"), `Auto-generated login email is: ${createUserData.user?.email}`);

  // Create a student assigned to this tutor
  const studentName = `Alex Pupil ${Date.now().toString().slice(-4)}`;
  const createStudentRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      name: studentName,
      role: "TUTEE",
      assignedTutorId: createUserData.user.id,
    }),
  });
  const studentData = await createStudentRes.json();
  assert(createStudentRes.ok && studentData.user?.id, "Student created and assigned to tutor");

  // Schedule a lesson
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const end = new Date(now.getTime() - 10 * 60 * 1000); // 10 min ago
  const createSessionRes = await fetch(`${baseUrl}/api/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      tutorId: createUserData.user.id,
      tuteeId: studentData.user.id,
      scheduledStartTime: start.toISOString(),
      scheduledEndTime: end.toISOString(),
      teamsMeetingUrl: "https://teams.microsoft.com/test-edit",
    }),
  });
  const sessionData = await createSessionRes.json();
  assert(createSessionRes.ok && sessionData.session?.id, "Lesson scheduled");

  // Login as the new tutor
  const tutorLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: createUserData.user.email,
      password: "password123",
    }),
  });
  const tutorCookie = tutorLoginRes.headers.get("set-cookie") || "";
  assert(tutorLoginRes.ok, "Tutor logged in with auto-generated handle");

  // Tutor completes the lesson
  const completeRes = await fetch(`${baseUrl}/api/sessions/${sessionData.session.id}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: tutorCookie,
    },
    body: JSON.stringify({
      feedbackCovered: "Algebraic fractions & simultaneous equations",
      feedbackRating: 4,
      feedbackNotes: "Good effort on problem sets",
    }),
  });
  const completeData = await completeRes.json();
  assert(completeRes.ok && completeData.session?.status === "COMPLETED", "Tutor submitted initial lesson report");
  assert(completeData.session?.feedbackRating === 4, "Initial rating saved as 4");

  // Tutor EDITS the lesson report while unpaid (tutorPaid === false)
  const editReportRes = await fetch(`${baseUrl}/api/sessions/${sessionData.session.id}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: tutorCookie,
    },
    body: JSON.stringify({
      feedbackCovered: "Algebraic fractions, simultaneous equations, and quadratics practice",
      feedbackRating: 5,
      feedbackNotes: "Mastered the concept by the end. Homework assigned: textbook page 50.",
    }),
  });
  const editReportData = await editReportRes.json();
  assert(editReportRes.ok, "Tutor successfully edited report while unpaid");
  assert(editReportData.session?.feedbackRating === 5, "Updated rating is 5 stars");
  assert(editReportData.session?.feedbackCovered.includes("quadratics practice"), "Updated covered topics reflected in response");

  // Admin marks the lesson as PAID
  const markPaidRes = await fetch(`${baseUrl}/api/sessions/${sessionData.session.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ tutorPaid: true }),
  });
  const markPaidData = await markPaidRes.json();
  assert(markPaidRes.ok && markPaidData.session?.tutorPaid === true, "Admin marked lesson as paid");

  // Tutor attempts to EDIT the report after being marked paid -> MUST FAIL WITH 403
  const editPaidReportRes = await fetch(`${baseUrl}/api/sessions/${sessionData.session.id}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: tutorCookie,
    },
    body: JSON.stringify({
      feedbackCovered: "Attempted edit after payment",
      feedbackRating: 3,
      feedbackNotes: "Should not be permitted",
    }),
  });
  const editPaidReportData = await editPaidReportRes.json();
  assert(editPaidReportRes.status === 403, "API correctly blocked tutor edit after lesson marked as paid (403 Forbidden)");
  assert(editPaidReportData.error?.includes("marked as paid"), `Error message: ${editPaidReportData.error}`);

  // Admin unmarks the lesson (tutorPaid = false)
  const unmarkPaidRes = await fetch(`${baseUrl}/api/sessions/${sessionData.session.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ tutorPaid: false }),
  });
  assert(unmarkPaidRes.ok, "Admin unmarked lesson as paid (tutorPaid = false)");

  // Tutor can now edit again
  const reEditRes = await fetch(`${baseUrl}/api/sessions/${sessionData.session.id}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: tutorCookie,
    },
    body: JSON.stringify({
      feedbackCovered: "Algebraic fractions and exam revision",
      feedbackRating: 5,
      feedbackNotes: "Revision went smoothly",
    }),
  });
  assert(reEditRes.ok, "Tutor can edit report again once unlocked by admin");

  // Cleanup test entities
  await prisma.auditLog.deleteMany({ where: { sessionId: sessionData.session.id } });
  await prisma.session.delete({ where: { id: sessionData.session.id } });
  await prisma.user.delete({ where: { id: studentData.user.id } });
  await prisma.user.delete({ where: { id: createUserData.user.id } });

  console.log(`\n=== SUMMARY: ${passed}/${total} TESTS PASSED ===`);
  if (passed === total) {
    console.log("🎉 ALL NEW REQUIREMENTS VERIFIED SUCCESSFULLY!");
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
