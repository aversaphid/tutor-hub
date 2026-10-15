import assert from "node:assert";
import { evaluateExpression } from "../lib/casio-math-engine";
import { sanitizeSessionForRole } from "../lib/session-sanitizer";
import { parseAuthToken, createAuthToken } from "../lib/auth";

console.log("==================================================");
console.log("🛡️ RUNNING AUTOMATED SECURITY AUDIT VERIFICATION");
console.log("==================================================\n");

// 1. Math Engine Code Injection Resistance
console.log("--- 1. Testing Math Engine Injection Resistance ---");
const maliciousInputs = [
  "process.exit(1)",
  "globalThis.console.log('pwned')",
  "require('fs').readFileSync('/etc/passwd')",
  "fetch('https://malicious.com')",
  "window.location='https://evil.com'",
  "constructor.constructor('return 1')()",
  "__proto__.polluted = true",
  "Function('return 2')()",
  "eval('1+1')",
  "1; alert(1)",
];

for (const input of maliciousInputs) {
  const res = evaluateExpression(input, { angleMode: "DEG", ans: 0 });
  assert.strictEqual(
    res.text,
    "Syntax ERROR",
    `Malicious input "${input}" must be rejected with Syntax ERROR, got: ${res.text}`
  );
  assert(Number.isNaN(res.num), `Malicious input "${input}" must evaluate to NaN`);
}
console.log("✅ [PASS] All 10 code injection and prototype pollution vectors safely neutralized by strict token whitelist");

// 2. Role-Based Financial Field Masking & Sanitization
console.log("\n--- 2. Testing RBAC Financial Data Sanitization ---");
const rawSession = {
  id: "session-sec-1",
  title: "A-Level Calculus",
  studentPay: 55, // Client fee (£55/hr)
  tutorPay: 35,   // Tutor wage (£35/hr)
  tutee: {
    id: "student-1",
    name: "Alice",
    studentPay: 55,
    tutorPay: 35,
  },
};

// Test Tutor sanitization
const tutorView = sanitizeSessionForRole(rawSession, "TUTOR");
assert.strictEqual(tutorView.studentPay, undefined, "Tutors must NEVER see client fee (studentPay)");
assert.strictEqual(tutorView.tutee?.studentPay, undefined, "Tutee child object must NOT leak studentPay to tutor");
assert.strictEqual(tutorView.tutorPay, 35, "Tutors can see their own agreed compensation");
console.log("✅ [PASS] Tutor RBAC masking: studentPay strictly withheld");

// Test Student sanitization
const studentView = sanitizeSessionForRole(rawSession, "TUTEE");
assert.strictEqual(studentView.tutorPay, undefined, "Students must NEVER see tutor compensation (tutorPay)");
assert.strictEqual(studentView.tutee?.tutorPay, undefined, "Tutee child object must NOT leak tutorPay to student");
assert.strictEqual(studentView.studentPay, undefined, "studentPay masked for safety");
console.log("✅ [PASS] Student RBAC masking: tutorPay strictly withheld");

// Test Head Tutor (Admin) sees both
const adminView = sanitizeSessionForRole(rawSession, "HEAD_TUTOR");
assert.strictEqual(adminView.studentPay, 55, "Head Tutor sees client fee");
assert.strictEqual(adminView.tutorPay, 35, "Head Tutor sees tutor compensation");
console.log("✅ [PASS] Admin RBAC: Head Tutor retains full financial audit access");

// 3. Cryptographic Token Tampering & Expiration Check
console.log("\n--- 3. Testing Auth Token Cryptographic Integrity ---");
const validToken = createAuthToken({ id: "user-test-1", role: "TUTOR", tokenVersion: 1 }, 3600);
const decoded = parseAuthToken(validToken);
assert(decoded !== null, "Valid signed token must successfully parse");
assert.strictEqual(decoded.sub, "user-test-1");
assert.strictEqual(decoded.role, "TUTOR");

// Tamper with payload
const [payloadPart, sigPart] = validToken.split(".");
const tamperedPayload = Buffer.from(
  JSON.stringify({ sub: "user-admin", role: "HEAD_TUTOR", iat: Date.now(), exp: Date.now() + 3600000 })
).toString("base64url");
const tamperedToken = `${tamperedPayload}.${sigPart}`;
const tamperedResult = parseAuthToken(tamperedToken);
assert.strictEqual(tamperedResult, null, "Tampered payload with invalid HMAC signature must be rejected");
console.log("✅ [PASS] HMAC-SHA256 signature tampering detection verified");

// Test Expired Token
const expiredToken = createAuthToken({ id: "user-test-2", role: "TUTEE" }, -10); // Expired 10s ago
const expiredResult = parseAuthToken(expiredToken);
assert.strictEqual(expiredResult, null, "Expired token must be rejected");
console.log("✅ [PASS] Token expiration timestamp strictly enforced");

console.log("\n==================================================");
console.log("🎉 ALL SECURITY AUDIT VERIFICATION TESTS PASSED!");
console.log("==================================================\n");
