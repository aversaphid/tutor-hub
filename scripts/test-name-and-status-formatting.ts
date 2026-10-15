import { formatTutorName } from "../lib/format";
import { sanitizeSessionForRole, sanitizeSessionsForRole } from "../lib/session-sanitizer";
import { exportSessionsToCSV } from "../lib/csv-export";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
}

console.log("==================================================");
console.log("TESTING TUTOR NAME & LESSON STATUS FORMATTING");
console.log("==================================================");

// --- 1. Tutor Name Capitalization ---
console.log("\n--- 1. Testing formatTutorName() ---");
assert(formatTutorName("luke") === "Luke", "Lowercase 'luke' becomes 'Luke'");
assert(formatTutorName("luke b") === "Luke B", "Multi-word 'luke b' becomes 'Luke B'");
assert(formatTutorName("admin") === "Luke", "Legacy 'admin' resolves to 'Luke'");
assert(formatTutorName("Admin") === "Luke", "Legacy 'Admin' resolves to 'Luke'");
assert(formatTutorName("sarah smith") === "Sarah Smith", "'sarah smith' becomes 'Sarah Smith'");
assert(formatTutorName("tutor") === "Tutor", "'tutor' becomes 'Tutor'");
assert(formatTutorName("") === "", "Empty string returns empty string");
assert(formatTutorName(null) === "", "Null returns empty string");
assert(formatTutorName(undefined) === "", "Undefined returns empty string");

// --- 2. Session Sanitizer Tutor Name Formatting ---
console.log("\n--- 2. Testing sanitizeSessionForRole() tutor formatting ---");
const rawSession = {
  id: "sess-1",
  title: "Maths Tuition",
  status: "IN_PROGRESS",
  scheduledStartTime: new Date().toISOString(),
  scheduledEndTime: new Date().toISOString(),
  tutor: { id: "tut-1", name: "luke", email: "luke@lbmathstuition.co.uk" },
  tutee: { id: "stu-1", name: "Alex Chen" },
  studentPay: 45,
  tutorPay: 30,
};

const sanitizedForStudent = sanitizeSessionForRole(rawSession, "TUTEE");
assert(sanitizedForStudent.tutor?.name === "Luke", "Student gets capitalized tutor name 'Luke'");
assert(sanitizedForStudent.tutorPay === undefined, "Student cannot see tutorPay");

const sanitizedForTutor = sanitizeSessionForRole(rawSession, "TUTOR");
assert(sanitizedForTutor.tutor?.name === "Luke", "Tutor gets capitalized tutor name 'Luke'");
assert(sanitizedForTutor.tutorPay === 30, "Tutor can see tutorPay");
assert(sanitizedForTutor.studentPay === undefined, "Tutor cannot see studentPay");

// --- 3. CSV Export IN PROGRESS & Tutor Name Formatting ---
console.log("\n--- 3. Testing CSV export status and tutor name ---");
const csvOutput = exportSessionsToCSV([rawSession]);
assert(!csvOutput.includes("IN_PROGRESS"), "CSV does not contain 'IN_PROGRESS' with underscore");
assert(csvOutput.includes('"IN PROGRESS"'), "CSV contains formatted 'IN PROGRESS'");
assert(csvOutput.includes('"Luke"'), "CSV contains formatted tutor name 'Luke'");
assert(!csvOutput.includes('"luke"'), "CSV does not contain lowercase 'luke'");

console.log("\n==================================================");
console.log("🎉 ALL NAME AND STATUS FORMATTING TESTS PASSED!");
console.log("==================================================");
