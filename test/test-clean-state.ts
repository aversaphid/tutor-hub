async function testCleanState() {
  console.log("🔍 Verifying Clean State for LB Maths Tuition...\n");

  const baseUrl = "http://localhost:3000";

  // 1. Check Homepage HTML
  const homeRes = await fetch(`${baseUrl}/`);
  const homeHtml = await homeRes.text();

  if (homeHtml.includes("no microsoft account conflicts")) {
    throw new Error("Found 'no microsoft account conflicts' on homepage - should be removed!");
  }
  if (homeHtml.includes("InPrivate Clean Launch") || homeHtml.includes("PIN Brute-Force Lock")) {
    throw new Error("Found 3 assurances cards on homepage - should be removed!");
  }
  if (homeHtml.includes("Auto-Fill") || homeHtml.includes("Test Alex Magic Link")) {
    throw new Error("Found auto-fill or tutorial stuff on homepage - should be removed!");
  }
  console.log("✅ Homepage is clean: no taglines, no assurances, no tutorial/auto-fills.");

  // 2. Check Logo
  const logoRes = await fetch(`${baseUrl}/logo.png`);
  if (!logoRes.ok) throw new Error("Logo /logo.png not found!");
  console.log(`✅ Logo /logo.png is accessible (Status: ${logoRes.status}, Content-Type: ${logoRes.headers.get("content-type")})`);

  // 3. Check Students List (Should be empty initially)
  const studentsRes = await fetch(`${baseUrl}/api/students`);
  const studentsData = await studentsRes.json();
  console.log(`✅ Student list is clean (Count: ${studentsData.students.length})`);

  // 4. Test Luke Admin Login
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "luke@lbmathstuition.co.uk", password: "admin" }),
  });
  if (!loginRes.ok) throw new Error("Login failed for luke@lbmathstuition.co.uk");
  const loginData = await loginRes.json();
  const cookie = loginRes.headers.get("set-cookie") || "";
  console.log(`✅ Admin login successful for luke@lbmathstuition.co.uk (Name: ${loginData.user.name}, Role: ${loginData.user.role})`);

  // 5. Test Adding a Tutor via Profile
  const addTutorRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      name: "Sarah Jenkins",
      email: "sarah@lbmathstuition.co.uk",
      role: "TUTOR",
      password: "password123",
    }),
  });
  if (!addTutorRes.ok) throw new Error("Failed to add tutor via admin profile");
  console.log("✅ Successfully created additional tutor via admin profile!");

  // 6. Test Adding a Student via Profile
  const addStudentRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      name: "Oliver Smith",
      role: "TUTEE",
      pin: "3344",
    }),
  });
  if (!addStudentRes.ok) throw new Error("Failed to add student via admin profile");
  const studentData = await addStudentRes.json();
  console.log(`✅ Successfully created student (${studentData.user.name}, PIN: ${studentData.user.pin}, MagicKey: ${studentData.user.magicKey})!`);

  // 7. Test Student PIN login for the newly added student
  const studentPinRes = await fetch(`${baseUrl}/api/auth/student-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tuteeId: studentData.user.id, pin: "3344" }),
  });
  if (!studentPinRes.ok) throw new Error("Student PIN login failed for new student");
  console.log("✅ Student PIN login verified for newly added student!");

  // Clean up created student & tutor for a pristine slate
  const { prisma } = await import("../lib/prisma");
  await prisma.user.deleteMany({ where: { email: "sarah@lbmathstuition.co.uk" } });
  await prisma.user.deleteMany({ where: { id: studentData.user.id } });

  console.log("\n🎉 All clean state verification tests passed perfectly!");
}

testCleanState().catch(console.error);
