import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== VERIFYING PARENT / GUARDIAN CONTACT EMAIL FEATURE ===");
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

  // 1. Admin login
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "luke", password: "admin" }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminCookie = adminLoginRes.headers.get("set-cookie") || "";
  assert(adminLoginRes.ok && adminLoginData.user?.role === "HEAD_TUTOR", "Admin logged in successfully");

  // 2. Create test tutor
  const tutorSuffix = Date.now().toString().slice(-4);
  const tutorPassword = "password123";
  const createTutorRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: `Tutor ParentTest ${tutorSuffix}`,
      role: "TUTOR",
      password: tutorPassword,
    }),
  });
  const tutorData = await createTutorRes.json();
  assert(createTutorRes.ok && tutorData.user?.id, "Test tutor created");

  // 3. Admin creates student WITH parentEmail
  const studentSuffix = Date.now().toString().slice(-4);
  const initialParentEmail = `parent-${studentSuffix}@testfamily.co.uk`;
  const createStudentRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: `Student ParentTest ${studentSuffix}`,
      role: "TUTEE",
      assignedTutorId: tutorData.user.id,
      parentEmail: initialParentEmail,
    }),
  });
  const studentData = await createStudentRes.json();
  assert(createStudentRes.ok && studentData.user?.id, "Test student created with parentEmail");
  assert(
    studentData.user?.parentEmail === initialParentEmail,
    `Created student has correct parentEmail (${initialParentEmail})`
  );

  const studentId = studentData.user.id;
  const studentPin = studentData.user.pin;

  // 4. Admin GET /api/admin/users returns parentEmail
  const adminUsersRes = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Cookie: adminCookie },
  });
  const adminUsersData = await adminUsersRes.json();
  const foundStudentAdmin = adminUsersData.users?.find((u: any) => u.id === studentId);
  assert(
    foundStudentAdmin?.parentEmail === initialParentEmail,
    "Admin GET /api/admin/users includes parentEmail"
  );

  // 5. Admin updates student's parentEmail via PATCH /api/admin/users
  const adminUpdatedEmail = `admin-updated-${studentSuffix}@testfamily.co.uk`;
  const adminUpdateRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      studentId,
      parentEmail: adminUpdatedEmail,
    }),
  });
  const adminUpdateData = await adminUpdateRes.json();
  assert(adminUpdateRes.ok, "Admin PATCH /api/admin/users succeeded");
  assert(
    adminUpdateData.student?.parentEmail === adminUpdatedEmail,
    `Admin updated student's parentEmail to ${adminUpdatedEmail}`
  );

  // 6. Tutor logs in and views their assigned students
  const tutorEmail = tutorData.user.email;
  const tutorLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: tutorEmail, password: tutorPassword }),
  });
  const tutorCookie = tutorLoginRes.headers.get("set-cookie") || "";
  assert(tutorLoginRes.ok, "Tutor logged in successfully");

  const tutorAssignedRes = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Cookie: tutorCookie },
  });
  const tutorAssignedData = await tutorAssignedRes.json();
  const foundStudentTutor = tutorAssignedData.users?.find((u: any) => u.id === studentId);
  assert(
    foundStudentTutor?.parentEmail === adminUpdatedEmail,
    `Tutor can see student's updated parentEmail (${adminUpdatedEmail})`
  );

  // 7. Student logs in via PIN
  const studentLoginRes = await fetch(`${baseUrl}/api/auth/student-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: studentPin }),
  });
  const studentLoginData = await studentLoginRes.json();
  const studentCookie = studentLoginRes.headers.get("set-cookie") || "";
  assert(studentLoginRes.ok && studentLoginData.student?.id === studentId, "Student logged in via PIN");
  assert(
    studentLoginData.student?.parentEmail === adminUpdatedEmail,
    "Student login response includes current parentEmail"
  );

  // 8. Student updates their parent contact email via PATCH /api/student/parent-email
  const studentUpdatedEmail = `student-set-${studentSuffix}@testfamily.co.uk`;
  const studentUpdateRes = await fetch(`${baseUrl}/api/student/parent-email`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ parentEmail: studentUpdatedEmail }),
  });
  const studentUpdateData = await studentUpdateRes.json();
  assert(studentUpdateRes.ok, "Student PATCH /api/student/parent-email succeeded");
  assert(
    studentUpdateData.parentEmail === studentUpdatedEmail,
    `Student successfully updated parentEmail to ${studentUpdatedEmail}`
  );

  // 9. Validation check: Student sends invalid email
  const invalidEmailRes = await fetch(`${baseUrl}/api/student/parent-email`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ parentEmail: "invalid-email-address" }),
  });
  assert(invalidEmailRes.status === 400, "Validation rejected invalid email format with 400");

  // 10. Verify Tutor sees the new student-updated parent email
  const tutorAssignedRes2 = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Cookie: tutorCookie },
  });
  const tutorAssignedData2 = await tutorAssignedRes2.json();
  const foundStudentTutor2 = tutorAssignedData2.users?.find((u: any) => u.id === studentId);
  assert(
    foundStudentTutor2?.parentEmail === studentUpdatedEmail,
    `Tutor immediately sees student-updated parentEmail (${studentUpdatedEmail})`
  );

  // 11. Cleanup test records
  await fetch(`${baseUrl}/api/admin/users?id=${studentId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  await fetch(`${baseUrl}/api/admin/users?id=${tutorData.user.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  console.log("🧹 Test student and tutor cleaned up.");

  console.log(`\nResults: ${passed}/${total} assertions passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
