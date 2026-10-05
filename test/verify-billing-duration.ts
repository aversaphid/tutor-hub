import assert from "node:assert";
import {
  getLessonDurationHours,
  getLessonDurationMultiplier,
  calculateSessionAmounts,
  getSessionStudentPay,
  getSessionTutorPay,
  DEFAULT_BILLING_DURATION_MODE,
  BillingDurationMode,
} from "../lib/billing";

console.log("=== RUNNING BILLING DURATION & PROPORTIONALITY VERIFICATION SUITE ===");

// 1. Verify getLessonDurationHours
{
  const sess1h = {
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T20:00:00Z",
  };
  assert.strictEqual(getLessonDurationHours(sess1h), 1, "1h session should be 1.0 hour");

  const sess2h = {
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T21:00:00Z",
  };
  assert.strictEqual(getLessonDurationHours(sess2h), 2, "2h session should be 2.0 hours");

  const sess1h25m = {
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T20:25:00Z",
  };
  assert.strictEqual(
    Math.round(getLessonDurationHours(sess1h25m) * 1000) / 1000,
    1.417,
    "1h 25m session should be ~1.417 hours"
  );

  const sess1h30m = {
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T20:30:00Z",
  };
  assert.strictEqual(getLessonDurationHours(sess1h30m), 1.5, "1h 30m session should be 1.5 hours");

  const sess30m = {
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T19:30:00Z",
  };
  assert.strictEqual(getLessonDurationHours(sess30m), 0.5, "30m session should be 0.5 hours");
  console.log("✓ Duration in hours computed accurately for all intervals");
}

// 2. Verify getLessonDurationMultiplier in ROUND_NEAREST_HOUR mode
{
  // 1 hr 25m -> rounds down to 1 hour (1.0x)
  const sess1h25m = {
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T20:25:00Z",
  };
  assert.strictEqual(
    getLessonDurationMultiplier(sess1h25m, "ROUND_NEAREST_HOUR"),
    1,
    "1h 25m in ROUND_NEAREST_HOUR must round to 1 hour (1x)"
  );

  // 1 hr 30m -> rounds up to 2 hours (2.0x)
  const sess1h30m = {
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T20:30:00Z",
  };
  assert.strictEqual(
    getLessonDurationMultiplier(sess1h30m, "ROUND_NEAREST_HOUR"),
    2,
    "1h 30m in ROUND_NEAREST_HOUR must round to 2 hours (2x)"
  );

  // 2 hrs -> rounds to 2 hours (2.0x)
  const sess2h = {
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T21:00:00Z",
  };
  assert.strictEqual(
    getLessonDurationMultiplier(sess2h, "ROUND_NEAREST_HOUR"),
    2,
    "2h in ROUND_NEAREST_HOUR must be 2 hours (2x)"
  );

  // 30 mins -> minimum 1 hour (1.0x)
  const sess30m = {
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T19:30:00Z",
  };
  assert.strictEqual(
    getLessonDurationMultiplier(sess30m, "ROUND_NEAREST_HOUR"),
    1,
    "30 mins in ROUND_NEAREST_HOUR has min 1 hr baseline (1x)"
  );
  console.log("✓ ROUND_NEAREST_HOUR multiplier rules verified (1h25->1x, 1h30->2x, 2h->2x)");
}

// 3. Verify getLessonDurationMultiplier in PROPORTIONAL mode
{
  const sess30m = {
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T19:30:00Z",
  };
  assert.strictEqual(
    getLessonDurationMultiplier(sess30m, "PROPORTIONAL"),
    0.5,
    "30 mins in PROPORTIONAL mode must be 0.5x (half hour = half cost)"
  );

  const sess1h30m = {
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T20:30:00Z",
  };
  assert.strictEqual(
    getLessonDurationMultiplier(sess1h30m, "PROPORTIONAL"),
    1.5,
    "1h 30m in PROPORTIONAL mode must be 1.5x"
  );

  const sess2h = {
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T21:00:00Z",
  };
  assert.strictEqual(
    getLessonDurationMultiplier(sess2h, "PROPORTIONAL"),
    2.0,
    "2h in PROPORTIONAL mode must be 2.0x"
  );
  console.log("✓ PROPORTIONAL multiplier rules verified (30m->0.5x, 1h30->1.5x, 2h->2.0x)");
}

// 4. Verify Junaid's exact session scenario (User Request)
{
  // Junaid has base rates: studentPay: 25, tutorPay: 16
  // 1 lesson, 2 hours
  const junaid2hSession = {
    id: "cmugrnzox0001cg87zg9gzhqg",
    scheduledStartTime: "2026-10-04T19:00:00Z",
    scheduledEndTime: "2026-10-04T21:00:00Z",
    tutee: {
      name: "Junaid",
      studentPay: 25,
      tutorPay: 16,
    },
  };

  // In ROUND_NEAREST_HOUR mode:
  const roundedAmounts = calculateSessionAmounts(junaid2hSession, "ROUND_NEAREST_HOUR");
  assert.strictEqual(roundedAmounts.multiplier, 2, "Junaid 2h session multiplier should be 2");
  assert.strictEqual(roundedAmounts.studentPay, 50, "Junaid should pay £50 (£25 * 2h) in nearest-hour mode");
  assert.strictEqual(roundedAmounts.tutorPay, 32, "Tutor should receive £32 (£16 * 2h) in nearest-hour mode");
  assert.strictEqual(getSessionStudentPay(junaid2hSession, "ROUND_NEAREST_HOUR"), 50);
  assert.strictEqual(getSessionTutorPay(junaid2hSession, "ROUND_NEAREST_HOUR"), 32);

  // In PROPORTIONAL mode:
  const proportionalAmounts = calculateSessionAmounts(junaid2hSession, "PROPORTIONAL");
  assert.strictEqual(proportionalAmounts.multiplier, 2, "Junaid 2h session multiplier should be 2");
  assert.strictEqual(proportionalAmounts.studentPay, 50, "Junaid should pay £50 in proportional mode");
  assert.strictEqual(proportionalAmounts.tutorPay, 32, "Tutor should receive £32 in proportional mode");

  // If Junaid had a 30m lesson in PROPORTIONAL mode:
  const junaid30mSession = {
    ...junaid2hSession,
    scheduledEndTime: "2026-10-04T19:30:00Z",
  };
  const prop30m = calculateSessionAmounts(junaid30mSession, "PROPORTIONAL");
  assert.strictEqual(prop30m.multiplier, 0.5);
  assert.strictEqual(prop30m.studentPay, 12.5, "30m lesson should be £12.50 (half of £25)");
  assert.strictEqual(prop30m.tutorPay, 8, "30m lesson tutor pay should be £8.00 (half of £16)");

  console.log("✓ Junaid's 2-hour lesson correctly yields £50 student fee and £32 tutor pay!");
}

console.log("\nALL BILLING DURATION TESTS PASSED SUCCESSFULLY! 🎉\n");
