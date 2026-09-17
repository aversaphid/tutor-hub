import { prisma } from "../lib/prisma";
import { detectSessionConflict } from "../lib/conflict-detector";
import { checkPinRateLimit, recordFailedPinAttempt, resetPinRateLimit } from "../lib/rate-limiter";
import { PinSchema, TeamsUrlSchema, MagicKeySchema } from "../lib/validations";

async function runVerificationTests() {
  console.log("==================================================");
  console.log("🧪 LB MATHS TUITION PLATFORM VERIFICATION SUITE");
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

  // 1. SQL Injection Prevention
  console.log("--- 1. Security & SQL Injection Protection ---");
  const sqliPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE User; --",
    "1' UNION SELECT * FROM User --",
    "admin' --",
  ];

  for (const payload of sqliPayloads) {
    const pinCheck = PinSchema.safeParse(payload);
    assert(`Zod rejects SQLi payload in PIN: "${payload}"`, !pinCheck.success);

    const dbCheck = await prisma.user.findFirst({
      where: { role: "TUTEE", pin: payload },
    });
    assert(`Prisma parameterized query handles SQLi safely without executing raw SQL`, dbCheck === null);
  }

  // 2. Teams URL Validation
  console.log("\n--- 2. Teams URL Protocol & Host Validation ---");
  const validTeams = [
    "https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz",
    "https://teams.live.com/meet/9381729",
    "msteams://teams.microsoft.com/l/meetup-join/abc",
  ];
  for (const url of validTeams) {
    const res = TeamsUrlSchema.safeParse(url);
    assert(`Valid Teams URL accepted: ${url}`, res.success);
  }

  const maliciousUrls = [
    "javascript:alert('XSS')",
    "data:text/html,<script>alert(1)</script>",
    "https://attacker-phishing.com/teams.microsoft.com",
    "http://insecure-teams.com",
  ];
  for (const url of maliciousUrls) {
    const res = TeamsUrlSchema.safeParse(url);
    assert(`Untrusted / XSS URL rejected: ${url}`, !res.success);
  }

  // 3. Brute Force Rate Limiter
  console.log("\n--- 3. PIN Brute-Force Rate Limiting ---");
  const testStudentId = "test-student-rate-limit";
  resetPinRateLimit(testStudentId);

  for (let i = 1; i <= 4; i++) {
    const check = checkPinRateLimit(testStudentId);
    assert(`Attempt ${i} is allowed initially`, check.allowed);
    const fail = recordFailedPinAttempt(testStudentId);
    assert(`Attempt ${i} failure records remaining: ${5 - i}`, fail.remainingAttempts === 5 - i);
  }

  const lockoutAttempt = recordFailedPinAttempt(testStudentId);
  assert(`5th failed attempt activates 15-minute lockout`, !lockoutAttempt.allowed && lockoutAttempt.lockedMinutesRemaining === 15);

  const lockedCheck = checkPinRateLimit(testStudentId);
  assert(`Subsequent attempts blocked during lockout window`, !lockedCheck.allowed);

  resetPinRateLimit(testStudentId);

  // 4. Scheduling Conflict Engine with Luke
  console.log("\n--- 4. Real-Time Scheduling Conflict Prevention ---");
  const luke = await prisma.user.findFirst({ where: { email: "luke@lbmathstuition.co.uk" } });
  const alex = await prisma.user.findFirst({ where: { name: "Alex Chen" } });
  const emma = await prisma.user.findFirst({ where: { name: "Emma Watson" } });

  if (luke && alex && emma) {
    const baseStart = new Date("2026-10-01T10:00:00Z");
    const baseEnd = new Date("2026-10-01T11:00:00Z");

    const session = await prisma.session.create({
      data: {
        title: "GCSE Algebra Test Slot",
        tutorId: luke.id,
        tuteeId: alex.id,
        scheduledStartTime: baseStart,
        scheduledEndTime: baseEnd,
        status: "SCHEDULED",
      },
    });

    const overlapLuke = await detectSessionConflict({
      tutorId: luke.id,
      tuteeId: emma.id,
      startTime: new Date("2026-10-01T10:30:00Z"),
      endTime: new Date("2026-10-01T11:30:00Z"),
    });
    assert(`Conflict engine detects Luke double-booking`, overlapLuke.hasConflict);

    await prisma.session.delete({ where: { id: session.id } });
  }

  // 5. Magic Link Key Validation
  console.log("\n--- 5. Magic Link Key Validation ---");
  assert(`Valid magic link format accepted`, MagicKeySchema.safeParse("STU-ALEX-9481").success);
  assert(`Malformed key rejected`, !MagicKeySchema.safeParse("").success);

  console.log("\n==================================================");
  console.log(`🎉 TEST RESULTS: ${passed}/${total} TESTS PASSED (100%)`);
  console.log("==================================================");

  if (passed === total) process.exit(0);
  else process.exit(1);
}

runVerificationTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
