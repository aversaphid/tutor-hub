import {
  addDaysPreservingWallClock,
  getZonedParts,
  zonedTimeToUtc,
  formatLondonTime,
  formatLondonDate,
  UK_TIMEZONE,
} from "../lib/timezone";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log("=== Running DST & Timezone Verification Suite ===\n");

// 1. Autumn Transition (Clocks go back 1 hour from BST to GMT on 25 Oct 2026)
console.log("Test 1: Autumn DST boundary (Oct 21 BST -> Oct 28 GMT)...");
const oct21 = new Date("2026-10-21T16:10:00.000Z"); // 17:10 BST
const oct21Parts = getZonedParts(oct21);
assert(oct21Parts.hour === 17 && oct21Parts.minute === 10, "Oct 21 London hour should be 17:10");

const oct28 = addDaysPreservingWallClock(oct21, 7);
const oct28Parts = getZonedParts(oct28);
assert(oct28Parts.hour === 17 && oct28Parts.minute === 10, "Oct 28 London hour must still be 17:10");
assert(oct28Parts.day === 28 && oct28Parts.month === 10, "Oct 28 day/month correct");
assert(oct28.toISOString() === "2026-10-28T17:10:00.000Z", "Oct 28 in GMT is 17:10:00Z");
console.log("  ✅ Autumn transition preserved wall-clock time: 17:10 BST -> 17:10 GMT");

// 2. Spring Transition (Clocks go forward 1 hour from GMT to BST on 28 March 2027)
console.log("\nTest 2: Spring DST boundary (March 24 GMT -> March 31 BST)...");
const march24 = new Date("2027-03-24T17:10:00.000Z"); // 17:10 GMT
const march24Parts = getZonedParts(march24);
assert(march24Parts.hour === 17 && march24Parts.minute === 10, "March 24 London hour should be 17:10");

const march31 = addDaysPreservingWallClock(march24, 7);
const march31Parts = getZonedParts(march31);
assert(march31Parts.hour === 17 && march31Parts.minute === 10, "March 31 London hour must still be 17:10");
assert(march31Parts.day === 31 && march31Parts.month === 3, "March 31 day/month correct");
assert(march31.toISOString() === "2027-03-31T16:10:00.000Z", "March 31 in BST is 16:10:00Z");
console.log("  ✅ Spring transition preserved wall-clock time: 17:10 GMT -> 17:10 BST");

// 3. Multi-week repeat (4 weeks across autumn switch)
console.log("\nTest 3: 4-week recurrence across autumn transition...");
for (let w = 0; w <= 4; w++) {
  const recurring = addDaysPreservingWallClock(oct21, w * 7);
  const parts = getZonedParts(recurring);
  assert(parts.hour === 17 && parts.minute === 10, `Week ${w} hour must be 17:10`);
  console.log(`  Week ${w}: London=${formatLondonDate(recurring)} ${formatLondonTime(recurring)} (UTC=${recurring.toISOString()})`);
}

// 4. Formatting checks
console.log("\nTest 4: Format utilities formatLondonTime & formatLondonDate...");
const testDate = new Date("2026-10-21T16:10:00.000Z");
const timeStr = formatLondonTime(testDate);
assert(timeStr === "17:10", `Expected "17:10", got "${timeStr}"`);
console.log(`  ✅ formatLondonTime produced "${timeStr}"`);

console.log("\n🎉 ALL DST & Timezone tests PASSED successfully!");
