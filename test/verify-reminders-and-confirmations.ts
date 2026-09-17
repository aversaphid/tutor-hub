import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== VERIFYING ADMIN PERSONAL REMINDERS & CONFIRMATION TOGGLES ===");
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

  const baseUrl = "http://localhost:3000";

  // 1. Login as Admin
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "luke", password: "admin" }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminCookie = adminLoginRes.headers.get("set-cookie") || "";
  assert(adminLoginRes.ok && adminLoginData.user?.role === "HEAD_TUTOR", "Admin logged in successfully");

  // Create test tutor
  const tutorName = `Tom Tutor ${Date.now().toString().slice(-4)}`;
  const createTutorRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ name: tutorName, role: "TUTOR", password: "password123" }),
  });
  const tutorData = await createTutorRes.json();
  assert(createTutorRes.ok && tutorData.user?.id, "Test tutor created");

  // Create test student
  const studentName = `Sophie Student ${Date.now().toString().slice(-4)}`;
  const createStudentRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ name: studentName, role: "TUTEE", assignedTutorId: tutorData.user.id }),
  });
  const studentData = await createStudentRes.json();
  assert(createStudentRes.ok && studentData.user?.id, "Test student created");

  // 2. Schedule a lesson with an Admin Personal Reminder
  const now = new Date();
  const start = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours in future
  const end = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const initialReminder = "Bring GCSE 2024 past papers & formula sheet";
  const createSessionRes = await fetch(`${baseUrl}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      tutorId: tutorData.user.id,
      tuteeId: studentData.user.id,
      scheduledStartTime: start.toISOString(),
      scheduledEndTime: end.toISOString(),
      adminReminder: initialReminder,
    }),
  });
  const sessionData = await createSessionRes.json();
  assert(createSessionRes.ok && sessionData.session?.id, "Lesson scheduled with personal reminder");
  assert(sessionData.session?.adminReminder === initialReminder, `Initial reminder correctly saved: "${sessionData.session?.adminReminder}"`);
  assert(sessionData.session?.tutorConfirmed === false, "Tutor confirmation starts as false (Pending)");
  assert(sessionData.session?.tuteeConfirmed === false, "Student confirmation starts as false (Pending)");

  const sessionId = sessionData.session.id;

  // 3. Admin updates the personal reminder
  const updatedReminder = "Call mum about mock tests, review trigonometry";
  const updateReminderRes = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ adminReminder: updatedReminder }),
  });
  const updateReminderData = await updateReminderRes.json();
  assert(updateReminderRes.ok && updateReminderData.session?.adminReminder === updatedReminder, "Admin updated personal reminder successfully");

  // 4. Admin toggles Tutor Confirmed status
  const toggleTutorOnRes = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ tutorConfirmed: true }),
  });
  const toggleTutorOnData = await toggleTutorOnRes.json();
  assert(toggleTutorOnRes.ok && toggleTutorOnData.session?.tutorConfirmed === true, "Admin toggled Tutor Confirmed to TRUE");

  const toggleTutorOffRes = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ tutorConfirmed: false }),
  });
  const toggleTutorOffData = await toggleTutorOffRes.json();
  assert(toggleTutorOffRes.ok && toggleTutorOffData.session?.tutorConfirmed === false, "Admin toggled Tutor Confirmed back to FALSE");

  // 5. Admin toggles Student Confirmed status
  const toggleStudentOnRes = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ tuteeConfirmed: true }),
  });
  const toggleStudentOnData = await toggleStudentOnRes.json();
  assert(toggleStudentOnRes.ok && toggleStudentOnData.session?.tuteeConfirmed === true, "Admin toggled Student Confirmed to TRUE");

  const toggleStudentOffRes = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ tuteeConfirmed: false }),
  });
  const toggleStudentOffData = await toggleStudentOffRes.json();
  assert(toggleStudentOffRes.ok && toggleStudentOffData.session?.tuteeConfirmed === false, "Admin toggled Student Confirmed back to FALSE");

  // 6. Tutor self-confirms attendance
  const tutorLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: tutorData.user.email, password: "password123" }),
  });
  const tutorCookie = tutorLoginRes.headers.get("set-cookie") || "";
  assert(tutorLoginRes.ok, "Tutor logged in successfully");

  const tutorConfirmRes = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: tutorCookie },
    body: JSON.stringify({ tutorConfirmed: true }),
  });
  const tutorConfirmData = await tutorConfirmRes.json();
  assert(tutorConfirmRes.ok && tutorConfirmData.session?.tutorConfirmed === true, "Tutor self-confirmed attendance");

  // 7. Student self-confirms attendance via magic link
  const studentAuthRes = await fetch(`${baseUrl}/api/auth/student-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: studentData.user.magicKey }),
  });
  const studentCookie = studentAuthRes.headers.get("set-cookie") || "";
  assert(studentAuthRes.ok, "Student authenticated with magic key");

  const studentConfirmRes = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ tuteeConfirmed: true }),
  });
  const studentConfirmData = await studentConfirmRes.json();
  assert(studentConfirmRes.ok && studentConfirmData.session?.tuteeConfirmed === true, "Student self-confirmed attendance");

  // 8. Verify both are now confirmed in database
  const dbSession = await prisma.session.findUnique({ where: { id: sessionId } });
  assert(dbSession?.tutorConfirmed === true && dbSession?.tuteeConfirmed === true, "Both Tutor and Student confirmed in database");

  // 9. Admin clears personal reminder
  const clearReminderRes = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ adminReminder: null }),
  });
  const clearReminderData = await clearReminderRes.json();
  assert(clearReminderRes.ok && clearReminderData.session?.adminReminder === null, "Admin cleared personal reminder");

  // 10. Verify audit logs recorded actions
  const auditLogs = await prisma.auditLog.findMany({
    where: { sessionId },
    orderBy: { timestamp: "desc" },
  });
  const hasReminderLog = auditLogs.some((l) => l.action === "REMINDER_UPDATED");
  const hasConfirmationLog = auditLogs.some((l) => l.action === "CONFIRMATION_UPDATED");
  assert(hasReminderLog, "REMINDER_UPDATED audit log recorded");
  assert(hasConfirmationLog, "CONFIRMATION_UPDATED audit log recorded");

  // Cleanup
  await prisma.auditLog.deleteMany({ where: { sessionId } });
  await prisma.session.delete({ where: { id: sessionId } });
  await prisma.user.delete({ where: { id: studentData.user.id } });
  await prisma.user.delete({ where: { id: tutorData.user.id } });

  console.log(`\n=== SUMMARY: ${passed}/${total} TESTS PASSED ===`);
  if (passed === total) {
    console.log("🎉 ALL REMINDER AND CONFIRMATION TESTS PASSED!");
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
