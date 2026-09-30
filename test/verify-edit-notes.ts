import assert from "assert";
import { UpdateSessionSchema } from "../lib/validations";

console.log("=== Testing Admin Edit Notes Validation & Logic ===");

// 1. Valid notes string
const validNotes = UpdateSessionSchema.safeParse({
  notes: "Bring calculator and homework worksheet p.42",
});
assert.strictEqual(validNotes.success, true);
assert.strictEqual(validNotes.data?.notes, "Bring calculator and homework worksheet p.42");
console.log("✅ [PASS] Valid notes schema parsing succeeded");

// 2. Clear notes by passing null
const clearNotes = UpdateSessionSchema.safeParse({
  notes: null,
});
assert.strictEqual(clearNotes.success, true);
assert.strictEqual(clearNotes.data?.notes, null);
console.log("✅ [PASS] Clearing notes with null succeeded");

// 3. Notes with adminReminder together
const bothFields = UpdateSessionSchema.safeParse({
  notes: "New instructions for student/tutor",
  adminReminder: "Call parent afterwards",
});
assert.strictEqual(bothFields.success, true);
assert.strictEqual(bothFields.data?.notes, "New instructions for student/tutor");
assert.strictEqual(bothFields.data?.adminReminder, "Call parent afterwards");
console.log("✅ [PASS] Both notes and adminReminder parsed successfully");

// 4. Maximum length validation (1000 characters)
const longNotes = UpdateSessionSchema.safeParse({
  notes: "a".repeat(1001),
});
assert.strictEqual(longNotes.success, false);
console.log("✅ [PASS] Rejects notes exceeding 1000 characters");

console.log("\n🎉 ALL ADMIN EDIT NOTES VALIDATION TESTS PASSED!");
