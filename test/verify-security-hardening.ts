import assert from "assert";
import { isSecureContext, setAuthCookie, clearAuthCookie, AUTH_COOKIE_NAME } from "../lib/auth";
import {
  checkDualPinRateLimit,
  recordFailedDualPinAttempt,
  resetDualPinRateLimit,
  getClientIp,
} from "../lib/rate-limiter";
import { NextResponse } from "next/server";

async function runTests() {
  console.log("--- 1. Testing Auth & Secure Cookie Context ---");
  // Default in test env without NODE_ENV=production or Deno
  const defaultSecure = isSecureContext();
  console.log(`Default isSecureContext: ${defaultSecure}`);

  // Test setAuthCookie helper
  const res = NextResponse.json({ ok: true });
  setAuthCookie(res, "test_token_123", "TUTEE");
  const cookie = res.cookies.get(AUTH_COOKIE_NAME);
  assert(cookie, "Auth cookie must be set");
  assert.strictEqual(cookie.value, "test_token_123");
  assert.strictEqual(cookie.httpOnly, true, "Cookie must be httpOnly");
  assert.strictEqual(cookie.sameSite, "lax", "Cookie must be sameSite: lax");
  assert.strictEqual(cookie.maxAge, 86400, "TUTEE role cookie maxAge must be 24h (86400s)");

  // Test clearAuthCookie helper
  const resClear = NextResponse.json({ ok: true });
  clearAuthCookie(resClear);
  const clearCookie = resClear.cookies.get(AUTH_COOKIE_NAME);
  assert(clearCookie, "Cleared cookie must be present");
  assert.strictEqual(clearCookie.value, "");
  assert.strictEqual(clearCookie.maxAge, 0);
  console.log("✓ Auth cookie hardening and clearing verified");

  console.log("--- 2. Testing Dual-Tier PIN Rate Limiting ---");
  const testIp = "192.168.1.100";
  const student1 = "student_alpha";
  const student2 = "student_beta";

  // Reset before test
  resetDualPinRateLimit(testIp, student1);
  resetDualPinRateLimit(testIp, student2);

  // Student 1 check initial
  const initialCheck = checkDualPinRateLimit(testIp, student1);
  assert.strictEqual(initialCheck.allowed, true);
  assert.strictEqual(initialCheck.remainingAttempts, 5);

  // Simulate 4 failed attempts on student 1
  for (let i = 1; i <= 4; i++) {
    const fail = recordFailedDualPinAttempt(testIp, student1);
    assert.strictEqual(fail.allowed, true);
    assert.strictEqual(fail.remainingAttempts, 5 - i);
  }

  // 5th attempt locks student 1
  const lockAttempt = recordFailedDualPinAttempt(testIp, student1);
  assert.strictEqual(lockAttempt.allowed, false, "5th attempt must lock student 1");
  assert(lockAttempt.lockedMinutesRemaining && lockAttempt.lockedMinutesRemaining > 0);

  // Immediate subsequent check for student 1 is locked
  const blockedCheck = checkDualPinRateLimit(testIp, student1);
  assert.strictEqual(blockedCheck.allowed, false);

  // Reset student 1
  resetDualPinRateLimit(testIp, student1);
  const afterResetCheck = checkDualPinRateLimit(testIp, student1);
  assert.strictEqual(afterResetCheck.allowed, true);

  console.log("✓ Dual-tier PIN rate limiting verified");

  console.log("--- 3. Testing Client IP extraction ---");
  const reqWithForwarded = new Request("http://localhost:3000", {
    headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
  });
  assert.strictEqual(getClientIp(reqWithForwarded), "203.0.113.195");

  const reqWithRealIp = new Request("http://localhost:3000", {
    headers: { "x-real-ip": "198.51.100.4" },
  });
  assert.strictEqual(getClientIp(reqWithRealIp), "198.51.100.4");
  console.log("✓ Client IP extraction verified");

  console.log("--- All Security Hardening Verification Passed! ---");
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
