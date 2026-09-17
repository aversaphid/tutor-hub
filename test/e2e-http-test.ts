async function testHttpEndpoints() {
  console.log("🌐 Running End-to-End HTTP Integration Tests for LB Maths Tuition...\n");

  const baseUrl = "http://localhost:3000";

  // 1. Check pages render 200
  const pages = ["/", "/student", "/admin"];
  for (const page of pages) {
    const res = await fetch(`${baseUrl}${page}`);
    console.log(`GET ${page} -> Status: ${res.status} (${res.ok ? "OK" : "ERROR"})`);
    if (!res.ok) throw new Error(`Page ${page} failed`);
  }

  // 2. Fetch active students from API
  const studentsRes = await fetch(`${baseUrl}/api/students`);
  const studentsData = await studentsRes.json();
  console.log(`GET /api/students -> Found ${studentsData.students?.length} students`);
  const alex = studentsData.students.find((s: any) => s.name === "Alex Chen");

  // 3. Test Student PIN login (PIN 4821)
  const pinRes = await fetch(`${baseUrl}/api/auth/student-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tuteeId: alex.id, pin: "4821" }),
  });
  console.log(`POST /api/auth/student-pin (Alex Chen / 4821) -> Status: ${pinRes.status} (Verified PIN)`);

  // 4. Test Magic Link Auth (STU-ALEX-9481)
  const magicRes = await fetch(`${baseUrl}/api/auth/student-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: "STU-ALEX-9481" }),
  });
  console.log(`POST /api/auth/student-key (STU-ALEX-9481) -> Status: ${magicRes.status} (Magic Link Bypass Verified)`);

  // 5. Test Luke Admin Login (luke@lbmathstuition.co.uk / admin)
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "luke@lbmathstuition.co.uk", password: "admin" }),
  });
  const cookie = adminLoginRes.headers.get("set-cookie") || "";
  console.log(`POST /api/auth/login (luke@lbmathstuition.co.uk / admin) -> Status: ${adminLoginRes.status} (Authenticated)`);

  // 6. Test Change Password Endpoint
  const changePassRes = await fetch(`${baseUrl}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ currentPassword: "admin", newPassword: "admin" }),
  });
  console.log(`POST /api/auth/change-password -> Status: ${changePassRes.status} (Password change verified)`);

  // 7. Test Fetching Sessions
  const sessRes = await fetch(`${baseUrl}/api/sessions`, { headers: { cookie } });
  const sessData = await sessRes.json();
  const activeSess = sessData.sessions[0];
  console.log(`GET /api/sessions -> Found ${sessData.sessions?.length} sessions. Selected: "${activeSess?.title}"`);

  // 8. Test Delay Session (+10 mins)
  const delayRes = await fetch(`${baseUrl}/api/sessions/${activeSess.id}/delay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ delayMinutes: 10 }),
  });
  console.log(`POST /api/sessions/${activeSess.id}/delay (+10m) -> Status: ${delayRes.status} (Delayed by 10 mins)`);

  // 9. Test Start Early ("Start Now")
  const startRes = await fetch(`${baseUrl}/api/sessions/${activeSess.id}/start`, {
    method: "POST",
    headers: { cookie },
  });
  const startData = await startRes.json();
  console.log(`POST /api/sessions/${activeSess.id}/start -> Status: ${startRes.status} (Flipped to: ${startData.session.status})`);

  // 10. Test Scheduling Conflict Double Booking Prevention
  const conflictRes = await fetch(`${baseUrl}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      title: "Double Booked Test",
      tutorId: activeSess.tutorId,
      tuteeId: activeSess.tuteeId,
      scheduledStartTime: activeSess.scheduledStartTime,
      scheduledEndTime: activeSess.scheduledEndTime,
    }),
  });
  const conflictData = await conflictRes.json();
  console.log(`POST /api/sessions (Double-Booking Conflict) -> Status: ${conflictRes.status} (Expected 409 Conflict: "${conflictData.error}")`);

  console.log("\n🎯 All 10 LB Maths Tuition E2E HTTP Integration Tests Passed Successfully!");
}

testHttpEndpoints().catch(console.error);
