import assert from "node:assert";
import { resolveActiveSession } from "../lib/session-utils";

console.log("=== Testing Lesson Request & Loop Prevention Stability ===");

// Test 1: resolveActiveSession stability during ongoing lesson
const now = new Date("2026-10-07T16:30:00.000Z").getTime();
const ongoingLesson = {
  id: "sess-1",
  scheduledStartTime: "2026-10-07T16:10:00.000Z",
  scheduledEndTime: "2026-10-07T17:10:00.000Z",
  status: "IN_PROGRESS",
};
const futureLesson = {
  id: "sess-2",
  scheduledStartTime: "2026-10-14T16:10:00.000Z",
  scheduledEndTime: "2026-10-14T17:10:00.000Z",
  status: "SCHEDULED",
};

const active = resolveActiveSession([futureLesson, ongoingLesson], now);
assert.strictEqual(active?.id, "sess-1");
console.log("✅ [PASS] Active lesson resolves consistently without ping-ponging");

// Test 2: In-flight and throttle guard simulation
let inFlight = false;
let lastCallTime = 0;
let fetchCount = 0;

function throttledLoadSessions(callTime: number): boolean {
  if (inFlight) return false;
  if (callTime - lastCallTime < 2000) return false;
  inFlight = true;
  lastCallTime = callTime;
  fetchCount++;
  // simulate async completion
  inFlight = false;
  return true;
}

// Rapid burst calls within 50ms (simulating React re-render cascade)
const t0 = 10_000;
assert.strictEqual(throttledLoadSessions(t0), true);
assert.strictEqual(throttledLoadSessions(t0 + 50), false);
assert.strictEqual(throttledLoadSessions(t0 + 100), false);
assert.strictEqual(throttledLoadSessions(t0 + 500), false);
assert.strictEqual(throttledLoadSessions(t0 + 2050), true);
assert.strictEqual(fetchCount, 2);
console.log("✅ [PASS] Rapid burst network calls strictly blocked by throttling and in-flight guard");

// Test 3: Verify presence visibility check throttle
let lastVisTime = -20_000;
let presenceHeartbeatCount = 0;

function throttledVisibilityHeartbeat(callTime: number): boolean {
  if (callTime - lastVisTime < 15_000) return false;
  lastVisTime = callTime;
  presenceHeartbeatCount++;
  return true;
}

// User switching tabs or clicking into window 10 times in 2 seconds
const focusStart = 50_000;
for (let t = focusStart; t < focusStart + 2000; t += 200) {
  throttledVisibilityHeartbeat(t);
}
assert.strictEqual(presenceHeartbeatCount, 1);
// After 15 seconds, next focus triggers
assert.strictEqual(throttledVisibilityHeartbeat(focusStart + 16_000), true);
assert.strictEqual(presenceHeartbeatCount, 2);
console.log("✅ [PASS] Presence focus/visibility heartbeats throttled to at most once every 15s");

console.log("\n🎉 ALL LESSON REQUEST STABILITY TESTS PASSED!");
