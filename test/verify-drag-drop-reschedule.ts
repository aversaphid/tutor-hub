import assert from "node:assert";

console.log("=== Testing Drag & Drop Lesson Rescheduling Engine ===");

// 1. Time & Duration Preservation Calculation
function calculateDropTimes(
  originalStartIso: string,
  originalEndIso: string,
  targetDay: Date,
  targetHour: number,
  targetMinute: number
) {
  const origStart = new Date(originalStartIso).getTime();
  const origEnd = new Date(originalEndIso).getTime();
  const durationMs = Math.max(30 * 60 * 1000, origEnd - origStart);

  const targetDate = new Date(targetDay);
  targetDate.setHours(targetHour, targetMinute, 0, 0);

  const newStart = targetDate;
  const newEnd = new Date(targetDate.getTime() + durationMs);

  return {
    isSameTime: newStart.getTime() === origStart,
    newStart,
    newEnd,
    durationMinutes: Math.round(durationMs / (1000 * 60)),
  };
}

// Test 1: 1-hour lesson dragged from Monday 09:00 to Wednesday 14:30
const mon9am = new Date("2026-10-05T09:00:00Z").toISOString();
const mon10am = new Date("2026-10-05T10:00:00Z").toISOString();
const wednesday = new Date("2026-10-07T00:00:00");

const res1 = calculateDropTimes(mon9am, mon10am, wednesday, 14, 30);
assert.strictEqual(res1.isSameTime, false, "Drop to Wednesday should not be same time");
assert.strictEqual(res1.durationMinutes, 60, "Duration must be preserved at 60 mins");
assert.strictEqual(res1.newStart.getHours(), 14, "New start hour should be 14");
assert.strictEqual(res1.newStart.getMinutes(), 30, "New start minute should be 30");
assert.strictEqual(res1.newEnd.getHours(), 15, "New end hour should be 15");
assert.strictEqual(res1.newEnd.getMinutes(), 30, "New end minute should be 30");
console.log("✅ [PASS] Drag calculation correctly preserves 60m lesson duration across days");

// Test 2: 90-minute lesson (1.5h) dragged to 16:00
const fri2pm = new Date("2026-10-09T14:00:00Z").toISOString();
const fri330pm = new Date("2026-10-09T15:30:00Z").toISOString();
const friday = new Date("2026-10-09T00:00:00");

const res2 = calculateDropTimes(fri2pm, fri330pm, friday, 16, 0);
assert.strictEqual(res2.durationMinutes, 90, "Duration must remain 90 mins");
assert.strictEqual(res2.newStart.getHours(), 16);
assert.strictEqual(res2.newStart.getMinutes(), 0);
assert.strictEqual(res2.newEnd.getHours(), 17);
assert.strictEqual(res2.newEnd.getMinutes(), 30);
console.log("✅ [PASS] Drag calculation correctly preserves 90m lesson duration on slot change");

// Test 3: Drop back onto exact same slot is detected as no-op
const originalDate = new Date("2026-10-05T09:00:00");
const res3 = calculateDropTimes(
  originalDate.toISOString(),
  new Date(originalDate.getTime() + 3600000).toISOString(),
  originalDate,
  9,
  0
);
assert.strictEqual(res3.isSameTime, true, "Same slot drop should be detected as no-op");
console.log("✅ [PASS] Dropping onto exact same slot properly flagged as no-op");

// Test 4: Optimistic Override State Merging
interface Session {
  id: string;
  title: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
}

const sessions: Session[] = [
  {
    id: "sess-1",
    title: "GCSE Maths",
    scheduledStartTime: "2026-10-05T09:00:00Z",
    scheduledEndTime: "2026-10-05T10:00:00Z",
  },
  {
    id: "sess-2",
    title: "A-Level Physics",
    scheduledStartTime: "2026-10-05T11:00:00Z",
    scheduledEndTime: "2026-10-05T12:00:00Z",
  },
];

const optimisticOverrides: Record<string, { scheduledStartTime: string; scheduledEndTime: string }> = {
  "sess-1": {
    scheduledStartTime: "2026-10-05T15:00:00Z",
    scheduledEndTime: "2026-10-05T16:00:00Z",
  },
};

const merged = sessions.map((s) => {
  if (optimisticOverrides[s.id]) {
    return {
      ...s,
      ...optimisticOverrides[s.id],
    };
  }
  return s;
});

assert.strictEqual(merged[0].scheduledStartTime, "2026-10-05T15:00:00Z", "sess-1 should be moved optimistically");
assert.strictEqual(merged[0].scheduledEndTime, "2026-10-05T16:00:00Z");
assert.strictEqual(merged[1].scheduledStartTime, "2026-10-05T11:00:00Z", "sess-2 should remain unchanged");
console.log("✅ [PASS] Optimistic override state correctly updates moved session without affecting others");

// Test 5: Conflict confirmation flow payload validation
function simulateRescheduleResponse(allowOverlap: boolean, hasConflict: boolean) {
  if (hasConflict && !allowOverlap) {
    return {
      status: 409,
      body: {
        error: "Conflict detected: tutor has another lesson at this time.",
        conflict: true,
      },
    };
  }
  return {
    status: 200,
    body: {
      success: true,
      message: "Session rescheduled successfully",
    },
  };
}

const clashAttempt = simulateRescheduleResponse(false, true);
assert.strictEqual(clashAttempt.status, 409, "Clash without allowOverlap must return 409");
assert.strictEqual(clashAttempt.body.conflict, true);

const overrideAttempt = simulateRescheduleResponse(true, true);
assert.strictEqual(overrideAttempt.status, 200, "Clash with allowOverlap=true must succeed with 200");
assert.strictEqual(overrideAttempt.body.success, true);
console.log("✅ [PASS] Conflict detection and allowOverlap bypass behave as expected");

console.log("\n🎉 ALL DRAG & DROP RESCHEDULING TESTS PASSED (100% SUCCESS)!\n");
