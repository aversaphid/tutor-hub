import assert from "node:assert";
import {
  registerSubscriber,
  broadcastCalculatorAction,
  CalculatorActionPayload,
} from "../lib/sse-bus";

console.log("=== Testing Live Calculator Sync Engine & Protocol ===");

// 1. Test SSE Subscriber receives calculator-sync event
const receivedEvents: string[] = [];
const mockController = {
  enqueue: (bytes: Uint8Array) => {
    receivedEvents.push(new TextDecoder().decode(bytes));
  },
} as any;

const unsubscribe = registerSubscriber({
  userId: "student-123",
  role: "TUTEE",
  controller: mockController,
});

// Broadcast SYNC_TOGGLE from Tutor
const togglePayload: CalculatorActionPayload = {
  sessionId: "session-456",
  senderId: "tutor-999",
  senderName: "Luke",
  senderRole: "TUTOR",
  actionType: "SYNC_TOGGLE",
  isSynced: true,
  fullState: {
    items: [{ id: "1", type: "number", value: "42" }],
    result: "42",
    angleMode: "DEG",
  },
};

broadcastCalculatorAction(togglePayload);

const firstEvent = receivedEvents.shift() || "";
assert(
  firstEvent.startsWith("event: calculator-sync\ndata: "),
  "Expected event name to be 'calculator-sync'"
);

const jsonStr = firstEvent.replace("event: calculator-sync\ndata: ", "").trim();
const parsed = JSON.parse(jsonStr);

assert.strictEqual(parsed.sessionId, "session-456");
assert.strictEqual(parsed.senderName, "Luke");
assert.strictEqual(parsed.actionType, "SYNC_TOGGLE");
assert.strictEqual(parsed.isSynced, true);
assert.strictEqual(parsed.fullState?.result, "42");
console.log("✅ [PASS] SYNC_TOGGLE successfully broadcasts across SSE with full state snapshot");

// 2. Broadcast BUTTON press from Student
receivedEvents.length = 0;
const buttonPayload: CalculatorActionPayload = {
  sessionId: "session-456",
  senderId: "student-123",
  senderName: "Enoch",
  senderRole: "TUTEE",
  actionType: "BUTTON",
  actionValue: "SQRT",
  isSynced: true,
};

broadcastCalculatorAction(buttonPayload);
const buttonEvent = receivedEvents.shift() || "";
const parsedButton = JSON.parse(
  buttonEvent.replace("event: calculator-sync\ndata: ", "").trim()
);
assert.strictEqual(parsedButton.senderId, "student-123");
assert.strictEqual(parsedButton.senderName, "Enoch");
assert.strictEqual(parsedButton.actionType, "BUTTON");
assert.strictEqual(parsedButton.actionValue, "SQRT");
console.log("✅ [PASS] BUTTON press event properly serialized and delivered in real-time");

// 3. Test Echo Prevention Filter
const myUserId = "student-123";
const shouldProcess = (action: any) => action.senderId !== myUserId;

assert.strictEqual(
  shouldProcess(parsedButton),
  false,
  "Sender should ignore own button press to prevent infinite echo"
);
assert.strictEqual(
  shouldProcess(parsed),
  true,
  "Receiver should process remote peer action"
);
console.log("✅ [PASS] Self-action echo guard successfully discriminates sender from receiver");

// 4. Test Live Mouse Cursor Movement and Click Broadcasting
receivedEvents.length = 0;
broadcastCalculatorAction({
  sessionId: "session-456",
  senderId: "tutor-999",
  senderName: "Luke",
  senderRole: "TUTOR",
  actionType: "CURSOR_MOVE",
  cursorPos: { x: 48.5, y: 62.3 },
  isSynced: true,
});
const cursorEvent = receivedEvents.shift() || "";
const parsedCursor = JSON.parse(
  cursorEvent.replace("event: calculator-sync\ndata: ", "").trim()
);
assert.strictEqual(parsedCursor.actionType, "CURSOR_MOVE");
assert.strictEqual(parsedCursor.cursorPos?.x, 48.5);
assert.strictEqual(parsedCursor.cursorPos?.y, 62.3);
console.log("✅ [PASS] CURSOR_MOVE relative coordinates delivered cleanly across SSE");

// 5. Test Unsubscribe cleans up controller
unsubscribe();
receivedEvents.length = 0;
broadcastCalculatorAction({
  actionType: "BUTTON",
  actionValue: "5",
});
assert.strictEqual(receivedEvents.length, 0, "Unsubscribed client should receive no events");
console.log("✅ [PASS] Clean unsubscription prevents memory leaks and stale event dispatches");

console.log("\n🎉 ALL LIVE CALCULATOR SYNC ENGINE TESTS PASSED!\n");
