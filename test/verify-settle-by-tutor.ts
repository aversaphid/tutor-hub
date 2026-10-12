import assert from "assert";
import { BatchArchiveSessionsSchema } from "../lib/validations";

console.log("=== Testing Batch Archive & Settle by Tutor Validation ===");

// 1. Settle by tutor with sessionIds and tutorId (dates omitted)
const tutorSettlementNoDates = BatchArchiveSessionsSchema.safeParse({
  sessionIds: ["session-1", "session-2"],
  tutorId: "tutor-123",
});
assert.strictEqual(tutorSettlementNoDates.success, true);
assert.deepStrictEqual(tutorSettlementNoDates.data?.sessionIds, ["session-1", "session-2"]);
assert.strictEqual(tutorSettlementNoDates.data?.tutorId, "tutor-123");
console.log("✅ [PASS] Settle by tutor with sessionIds (omitted dates) succeeded");

// 2. Settle by tutor with standard 4-digit ISO dates (2099)
const tutorSettlementWithDates = BatchArchiveSessionsSchema.safeParse({
  startDate: new Date(0).toISOString(),
  endDate: new Date("2099-12-31T23:59:59.999Z").toISOString(),
  sessionIds: ["session-1"],
  tutorId: "tutor-123",
});
assert.strictEqual(tutorSettlementWithDates.success, true);
assert.strictEqual(tutorSettlementWithDates.data?.endDate, "2099-12-31T23:59:59.999Z");
console.log("✅ [PASS] Settle by tutor with valid ISO dates succeeded");

// 3. Batch archive by date range (no sessionIds)
const dateRangeArchive = BatchArchiveSessionsSchema.safeParse({
  startDate: "2026-09-01T00:00:00.000Z",
  endDate: "2026-09-30T23:59:59.999Z",
});
assert.strictEqual(dateRangeArchive.success, true);
console.log("✅ [PASS] Date range archive with valid start and end dates succeeded");

// 4. Missing both sessionIds and date range
const invalidEmpty = BatchArchiveSessionsSchema.safeParse({
  tutorId: "tutor-123",
});
assert.strictEqual(invalidEmpty.success, false);
console.log("✅ [PASS] Missing both sessionIds and date range properly rejected");

// 5. Malformed non-ISO date string
const invalidDateString = BatchArchiveSessionsSchema.safeParse({
  startDate: "not-a-date",
  endDate: "2026-09-30T23:59:59.999Z",
});
assert.strictEqual(invalidDateString.success, false);
console.log("✅ [PASS] Malformed non-ISO date string properly rejected");

console.log("\n🎉 ALL SETTLE BY TUTOR VALIDATION TESTS PASSED!");
