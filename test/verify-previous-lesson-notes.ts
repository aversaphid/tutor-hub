import assert from "assert";

console.log("=== Testing Previous Lesson Extra Notes & Homework Retrieval Logic ===");

interface TestSession {
  id: string;
  tuteeId: string;
  title: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: "SCHEDULED" | "DELAYED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  feedbackNotes?: string | null;
  studentTopic?: string | null;
}

function getPreviousLessonNotes(session: any, allSessions: any[]): string | null {
  if (!session) return null;
  const tuteeId = session.tuteeId || session.tutee?.id;
  if (!tuteeId) return null;

  const currentStart = new Date(session.scheduledStartTime).getTime();

  const pastForStudent = allSessions
    .filter((s: any) => {
      const sTuteeId = s.tuteeId || s.tutee?.id;
      if (sTuteeId !== tuteeId || s.id === session.id) return false;
      if (s.status === "CANCELLED") return false;
      const sStart = new Date(s.scheduledStartTime).getTime();
      return sStart < currentStart && (s.status === "COMPLETED" || Boolean(s.feedbackNotes));
    })
    .sort(
      (a: any, b: any) =>
        new Date(b.scheduledStartTime).getTime() - new Date(a.scheduledStartTime).getTime()
    );

  const previousLesson = pastForStudent[0];
  return previousLesson?.feedbackNotes?.trim() || null;
}

// Test Case 1: Student has a previous completed lesson with homework assigned
const sessions1: TestSession[] = [
  {
    id: "lesson-prev",
    tuteeId: "student-1",
    title: "GCSE Algebra Basics",
    scheduledStartTime: "2026-09-23T17:00:00.000Z",
    scheduledEndTime: "2026-09-23T18:00:00.000Z",
    status: "COMPLETED",
    feedbackNotes: "Set textbook p. 42 Q 1-6 for homework. Review negative signs.",
  },
  {
    id: "lesson-curr",
    tuteeId: "student-1",
    title: "GCSE Quadratics",
    scheduledStartTime: "2026-09-30T17:00:00.000Z",
    scheduledEndTime: "2026-09-30T18:00:00.000Z",
    status: "IN_PROGRESS",
    studentTopic: "Quadratics",
  },
];

const notes1 = getPreviousLessonNotes(sessions1[1], sessions1);
assert.strictEqual(
  notes1,
  "Set textbook p. 42 Q 1-6 for homework. Review negative signs.",
  "Must retrieve extra notes & homework from previous lesson"
);
console.log("✅ [PASS] Successfully retrieved extra notes & homework from previous completed lesson");

// Test Case 2: Student has no previous lessons
const sessions2: TestSession[] = [
  {
    id: "lesson-only",
    tuteeId: "student-2",
    title: "First Lesson",
    scheduledStartTime: "2026-09-30T17:00:00.000Z",
    scheduledEndTime: "2026-09-30T18:00:00.000Z",
    status: "SCHEDULED",
  },
];

const notes2 = getPreviousLessonNotes(sessions2[0], sessions2);
assert.strictEqual(notes2, null, "Must return null when there is no previous lesson");
console.log("✅ [PASS] Returns null when student has no previous lessons");

// Test Case 3: Student's previous lesson had empty/whitespace extra notes
const sessions3: TestSession[] = [
  {
    id: "lesson-prev-empty",
    tuteeId: "student-3",
    title: "Trigonometry",
    scheduledStartTime: "2026-09-23T17:00:00.000Z",
    scheduledEndTime: "2026-09-23T18:00:00.000Z",
    status: "COMPLETED",
    feedbackNotes: "   ",
  },
  {
    id: "lesson-curr-3",
    tuteeId: "student-3",
    title: "Trigonometry Part 2",
    scheduledStartTime: "2026-09-30T17:00:00.000Z",
    scheduledEndTime: "2026-09-30T18:00:00.000Z",
    status: "SCHEDULED",
  },
];

const notes3 = getPreviousLessonNotes(sessions3[1], sessions3);
assert.strictEqual(notes3, null, "Must return null when extra notes were left blank or whitespace");
console.log("✅ [PASS] Returns null when previous lesson had empty/whitespace extra notes");

// Test Case 4: Ignores CANCELLED previous lesson and picks the actual taught previous lesson
const sessions4: TestSession[] = [
  {
    id: "lesson-real-prev",
    tuteeId: "student-4",
    title: "Calculus Intro",
    scheduledStartTime: "2026-09-16T17:00:00.000Z",
    scheduledEndTime: "2026-09-16T18:00:00.000Z",
    status: "COMPLETED",
    feedbackNotes: "Complete worksheet 4B questions 1 to 5.",
  },
  {
    id: "lesson-cancelled",
    tuteeId: "student-4",
    title: "Calculus Practice",
    scheduledStartTime: "2026-09-23T17:00:00.000Z",
    scheduledEndTime: "2026-09-23T18:00:00.000Z",
    status: "CANCELLED",
  },
  {
    id: "lesson-curr-4",
    tuteeId: "student-4",
    title: "Calculus Advanced",
    scheduledStartTime: "2026-09-30T17:00:00.000Z",
    scheduledEndTime: "2026-09-30T18:00:00.000Z",
    status: "SCHEDULED",
  },
];

const notes4 = getPreviousLessonNotes(sessions4[2], sessions4);
assert.strictEqual(
  notes4,
  "Complete worksheet 4B questions 1 to 5.",
  "Must bypass cancelled lessons and get the last completed taught lesson"
);
console.log("✅ [PASS] Bypasses cancelled lessons and finds the actual taught completed lesson");

// Test Case 5: Does not bleed notes across different students
const sessions5: TestSession[] = [
  {
    id: "lesson-alice",
    tuteeId: "alice",
    title: "Alice Lesson",
    scheduledStartTime: "2026-09-29T15:00:00.000Z",
    scheduledEndTime: "2026-09-29T16:00:00.000Z",
    status: "COMPLETED",
    feedbackNotes: "Alice homework: do page 10",
  },
  {
    id: "lesson-bob",
    tuteeId: "bob",
    title: "Bob Lesson",
    scheduledStartTime: "2026-09-30T16:00:00.000Z",
    scheduledEndTime: "2026-09-30T17:00:00.000Z",
    status: "SCHEDULED",
  },
];

const notes5 = getPreviousLessonNotes(sessions5[1], sessions5);
assert.strictEqual(notes5, null, "Must not leak Alice's notes to Bob");
console.log("✅ [PASS] Strictly scopes extra notes to the specific student");

console.log("\n🎉 ALL PREVIOUS LESSON NOTES VERIFICATION TESTS PASSED!");
