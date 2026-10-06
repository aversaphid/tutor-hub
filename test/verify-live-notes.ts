import assert from "assert";
import { UpdateSessionSchema } from "../lib/validations";

console.log("=== Testing Live Lesson Notes Validation & Schema ===");

// 1. Valid feedbackNotes string in PATCH schema
const validFeedbackNotes = UpdateSessionSchema.safeParse({
  feedbackNotes: "Set textbook p. 42 Q 1-6 for homework. Reviewed negative numbers and brackets.",
});
assert.strictEqual(validFeedbackNotes.success, true);
assert.strictEqual(
  validFeedbackNotes.data?.feedbackNotes,
  "Set textbook p. 42 Q 1-6 for homework. Reviewed negative numbers and brackets."
);
console.log("✅ [PASS] Valid feedbackNotes schema parsing succeeded");

// 2. Clear feedbackNotes by passing null
const clearFeedbackNotes = UpdateSessionSchema.safeParse({
  feedbackNotes: null,
});
assert.strictEqual(clearFeedbackNotes.success, true);
assert.strictEqual(clearFeedbackNotes.data?.feedbackNotes, null);
console.log("✅ [PASS] Clearing feedbackNotes with null succeeded");

// 3. Empty string feedbackNotes
const emptyFeedbackNotes = UpdateSessionSchema.safeParse({
  feedbackNotes: "",
});
assert.strictEqual(emptyFeedbackNotes.success, true);
assert.strictEqual(emptyFeedbackNotes.data?.feedbackNotes, "");
console.log("✅ [PASS] Empty string feedbackNotes accepted");

// 4. Combined update with teamsMeetingUrl and feedbackNotes
const combinedUpdate = UpdateSessionSchema.safeParse({
  teamsMeetingUrl: "https://teams.microsoft.com/l/meetup-join/12345",
  feedbackNotes: "Live notes written during the meeting",
});
assert.strictEqual(combinedUpdate.success, true);
assert.strictEqual(combinedUpdate.data?.feedbackNotes, "Live notes written during the meeting");
console.log("✅ [PASS] Combined PATCH with teamsMeetingUrl and feedbackNotes succeeded");

console.log("\n🎉 ALL LIVE LESSON NOTES TESTS PASSED!");
