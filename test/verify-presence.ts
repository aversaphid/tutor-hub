import assert from "node:assert";
import {
  recordUserConnected,
  recordUserDisconnected,
  recordUserHeartbeat,
  recordUserLeave,
  isUserOnline,
  getAllOnlineUserIds,
  _resetPresenceForTesting,
} from "../lib/presence";
import { registerSubscriber } from "../lib/sse-bus";

console.log("=== Testing Online Presence Tracking Engine ===");

_resetPresenceForTesting();

// Test 1: User initially offline
assert.strictEqual(isUserOnline("student-1"), false);
assert.deepStrictEqual(getAllOnlineUserIds(), []);
console.log("✅ [PASS] User is offline by default");

// Test 2: Connecting marked as online
const connectResult1 = recordUserConnected("student-1", { role: "TUTEE", name: "Alice" });
assert.strictEqual(connectResult1.wasOnline, false);
assert.strictEqual(isUserOnline("student-1"), true);
assert.deepStrictEqual(getAllOnlineUserIds(), ["student-1"]);
console.log("✅ [PASS] User connecting is immediately marked online");

// Test 3: Multiple connections (e.g. multiple tabs)
const connectResult2 = recordUserConnected("student-1");
assert.strictEqual(connectResult2.wasOnline, true);
assert.strictEqual(isUserOnline("student-1"), true);

// Disconnecting one tab keeps user online because another tab is open
const disconnectResult1 = recordUserDisconnected("student-1");
assert.strictEqual(disconnectResult1.isStillOnline, true);
assert.strictEqual(isUserOnline("student-1"), true);
console.log("✅ [PASS] Multiple tabs correctly handled: stays online while at least 1 tab open");

// Test 4: Heartbeat keeps user online
const hbResult = recordUserHeartbeat("student-2", { role: "TUTEE", name: "Bob" });
assert.strictEqual(hbResult.wasOnline, false);
assert.strictEqual(isUserOnline("student-2"), true);
console.log("✅ [PASS] Heartbeat successfully marks user online");

// Test 5: Explicit leave (e.g. browser beforeunload beacon or logout)
recordUserLeave("student-2");
assert.strictEqual(isUserOnline("student-2"), false);
console.log("✅ [PASS] Explicit leave immediately marks user offline");

// Test 6: Inactivity timeout
_resetPresenceForTesting();
recordUserHeartbeat("student-3");
assert.strictEqual(isUserOnline("student-3", 1000), true);
// Simulate threshold check with 0ms timeout (immediate expiration if no active connection)
assert.strictEqual(isUserOnline("student-3", -1), false);
console.log("✅ [PASS] Stale users without active connection expire after timeout");

// Test 7: Presence connect, disconnect, and broadcast
_resetPresenceForTesting();
const connected = recordUserConnected("student-sse", { role: "TUTEE" });
assert.strictEqual(connected.wasOnline, false);
assert.strictEqual(isUserOnline("student-sse"), true);
assert.deepStrictEqual(getAllOnlineUserIds(), ["student-sse"]);

const disconnected = recordUserDisconnected("student-sse");
assert.strictEqual(disconnected.isStillOnline, false);
assert.strictEqual(isUserOnline("student-sse"), false);
assert.deepStrictEqual(getAllOnlineUserIds(), []);
console.log("✅ [PASS] User connect and disconnect lifecycle properly updates presence and online state");

console.log("\n🎉 ALL ONLINE PRESENCE ENGINE TESTS PASSED!");
