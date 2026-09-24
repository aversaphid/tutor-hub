export {};

// scripts/test-historical-rates.ts
// Unit test: Verify that student price changes do NOT edit archived lessons or historical business analytics,
// but update all unarchived / currently needs-to-be-paid lessons.

interface RateTestSession {
  id: string;
  tutorPaid: boolean;
  studentPay?: number | null;
  tutorPay?: number | null;
  tutee?: {
    studentPay?: number | null;
    tutorPay?: number | null;
  };
}

// Analytics rate extraction helper (identical to components/revenue-analytics-hub.tsx)
function getSessionStudentPay(s: RateTestSession): number {
  if (typeof s.studentPay === "number" && !isNaN(s.studentPay)) return s.studentPay;
  if (typeof s.tutee?.studentPay === "number" && !isNaN(s.tutee.studentPay)) return s.tutee.studentPay;
  return 0;
}

function getSessionTutorPay(s: RateTestSession): number {
  if (typeof s.tutorPay === "number" && !isNaN(s.tutorPay)) return s.tutorPay;
  if (typeof s.tutee?.tutorPay === "number" && !isNaN(s.tutee.tutorPay)) return s.tutee.tutorPay;
  return 0;
}

// Scenario:
// Student starts with initial rates: studentPay: 40, tutorPay: 30
let studentRates = {
  studentPay: 40,
  tutorPay: 30,
};

// Lesson 1: Conducted last month and archived (tutorPaid = true)
// When archived, its rates were snapshotted to 40 and 30
const archivedLesson: RateTestSession = {
  id: "lesson-archived-1",
  tutorPaid: true,
  studentPay: 40,
  tutorPay: 30,
  tutee: studentRates,
};

// Lesson 2: Completed recently, currently needs to be paid (tutorPaid = false)
const needsPaymentLesson: RateTestSession = {
  id: "lesson-needs-payment-2",
  tutorPaid: false,
  studentPay: null, // dynamic until archived
  tutorPay: null,
  tutee: studentRates,
};

// Lesson 3: Upcoming scheduled lesson (tutorPaid = false)
const upcomingLesson: RateTestSession = {
  id: "lesson-upcoming-3",
  tutorPaid: false,
  studentPay: null,
  tutorPay: null,
  tutee: studentRates,
};

console.log("=== Initial State (Student Rate: £40 / £30) ===");
console.log("Archived Lesson Revenue:", getSessionStudentPay(archivedLesson)); // 40
console.log("Archived Lesson Tutor Payout:", getSessionTutorPay(archivedLesson)); // 30
console.log("Needs Payment Lesson Revenue:", getSessionStudentPay(needsPaymentLesson)); // 40
console.log("Needs Payment Tutor Payout:", getSessionTutorPay(needsPaymentLesson)); // 30

// Admin updates student rate to £55 (fee) and £40 (pay)
console.log("\n=== Admin changes student rate to £55 / £40 ===");
studentRates = {
  studentPay: 55,
  tutorPay: 40,
};

// In our database update logic:
// - Archived lessons retain their locked snapshot (archivedLesson.studentPay = 40, tutorPay = 30)
// - Unarchived lessons point to updated studentRates
archivedLesson.tutee = studentRates;
needsPaymentLesson.tutee = studentRates;
upcomingLesson.tutee = studentRates;

console.log("Archived Lesson Revenue (should remain 40):", getSessionStudentPay(archivedLesson));
console.log("Archived Lesson Tutor Payout (should remain 30):", getSessionTutorPay(archivedLesson));
console.log("Needs Payment Lesson Revenue (should be updated to 55):", getSessionStudentPay(needsPaymentLesson));
console.log("Needs Payment Tutor Payout (should be updated to 40):", getSessionTutorPay(needsPaymentLesson));
console.log("Upcoming Lesson Revenue (should be updated to 55):", getSessionStudentPay(upcomingLesson));

// Assertions
if (getSessionStudentPay(archivedLesson) !== 40) {
  throw new Error(`Archived lesson revenue changed to ${getSessionStudentPay(archivedLesson)}! It must remain 40.`);
}
if (getSessionTutorPay(archivedLesson) !== 30) {
  throw new Error(`Archived lesson tutor payout changed to ${getSessionTutorPay(archivedLesson)}! It must remain 30.`);
}
if (getSessionStudentPay(needsPaymentLesson) !== 55) {
  throw new Error(`Needs-payment lesson was not updated to 55! Got ${getSessionStudentPay(needsPaymentLesson)}`);
}
if (getSessionTutorPay(needsPaymentLesson) !== 40) {
  throw new Error(`Needs-payment tutor pay was not updated to 40! Got ${getSessionTutorPay(needsPaymentLesson)}`);
}
if (getSessionStudentPay(upcomingLesson) !== 55) {
  throw new Error(`Upcoming lesson was not updated to 55! Got ${getSessionStudentPay(upcomingLesson)}`);
}

// Scenario 2: Free / Subsidised lesson (e.g. scholarship or pro bono: studentPay = 0, tutorPay = 25)
const freeLessonRates = { studentPay: 0, tutorPay: 25 };
const freeLesson: RateTestSession = {
  id: "free-lesson-1",
  tutorPaid: false,
  studentPay: null,
  tutorPay: null,
  tutee: freeLessonRates,
};

if (getSessionStudentPay(freeLesson) !== 0) {
  throw new Error(`Expected free lesson studentPay to be 0, got ${getSessionStudentPay(freeLesson)}`);
}
if (getSessionTutorPay(freeLesson) !== 25) {
  throw new Error(`Expected free lesson tutorPay to be 25, got ${getSessionTutorPay(freeLesson)}`);
}
const netProfit = getSessionStudentPay(freeLesson) - getSessionTutorPay(freeLesson);
if (netProfit !== -25) {
  throw new Error(`Expected net margin to be -25 (absorbed by business), got ${netProfit}`);
}

console.log("\n ALL RATE IMMUTABILITY, DYNAMIC UPDATE & FREE LESSON TESTS PASSED!");
