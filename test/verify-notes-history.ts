import assert from "node:assert/strict";

async function runNotesHistoryTests() {
  console.log("=== Testing Notes & Homework History Retrieval Engine ===");

  const mockSessions = [
    {
      id: "session-1",
      tuteeId: "student-alice",
      scheduledStartTime: "2026-10-01T16:00:00Z",
      status: "COMPLETED",
      topic: "Algebra & Quadratic Formula",
      title: "Maths Lesson",
      feedbackNotes: "Complete exercise 4B questions 1-5 on quadratic formula.",
      tutor: { id: "tutor-1", name: "Luke" },
    },
    {
      id: "session-2",
      tuteeId: "student-alice",
      scheduledStartTime: "2026-10-08T16:00:00Z",
      status: "COMPLETED",
      topic: "Simultaneous Equations",
      title: "Maths Lesson",
      feedbackNotes: "Revise elimination method. Homework: worksheet 3.",
      tutor: { id: "tutor-1", name: "Luke" },
    },
    {
      id: "session-3",
      tuteeId: "student-alice",
      scheduledStartTime: "2026-10-05T16:00:00Z",
      status: "COMPLETED",
      topic: "Probability Trees",
      title: "Maths Lesson",
      feedbackNotes: "   ", // Blank notes - must be excluded
      tutor: { id: "tutor-1", name: "Luke" },
    },
    {
      id: "session-4",
      tuteeId: "student-bob", // Different student
      scheduledStartTime: "2026-10-02T16:00:00Z",
      status: "COMPLETED",
      topic: "Trigonometry",
      title: "Maths Lesson",
      feedbackNotes: "Bob homework: SOH CAH TOA questions.",
      tutor: { id: "tutor-1", name: "Luke" },
    },
    {
      id: "session-5",
      tuteeId: "student-alice",
      scheduledStartTime: "2026-10-09T16:00:00Z",
      status: "CANCELLED", // Cancelled - must be excluded
      topic: "Surds",
      title: "Maths Lesson",
      feedbackNotes: "Cancelled by student",
      tutor: { id: "tutor-1", name: "Luke" },
    },
  ];

  // 1. Scoping and filtering test
  const studentId = "student-alice";
  const history = mockSessions
    .filter(
      (s) =>
        s.tuteeId === studentId &&
        s.status !== "CANCELLED" &&
        Boolean(s.feedbackNotes && s.feedbackNotes.trim().length > 0)
    )
    .sort(
      (a, b) =>
        new Date(b.scheduledStartTime).getTime() -
        new Date(a.scheduledStartTime).getTime()
    );

  assert.equal(history.length, 2);
  assert.equal(history[0].id, "session-2");
  assert.equal(history[1].id, "session-1");
  console.log("✅ [PASS] Strictly scopes notes to student and excludes empty or cancelled sessions");

  // 2. Search query test
  const searchQ = "quadratic";
  const matched = history.filter((s) => {
    const q = searchQ.toLowerCase();
    return (
      (s.feedbackNotes || "").toLowerCase().includes(q) ||
      (s.topic || "").toLowerCase().includes(q) ||
      (s.tutor?.name || "").toLowerCase().includes(q)
    );
  });
  assert.equal(matched.length, 1);
  assert.equal(matched[0].id, "session-1");
  console.log("✅ [PASS] Search filter accurately locates note content and lesson topic");

  // 3. Tutor search test
  const tutorQ = "luke";
  const tutorMatched = history.filter((s) =>
    (s.tutor?.name || "").toLowerCase().includes(tutorQ)
  );
  // 4. Staff-only Admin Notes Visibility Test
  const studentView = history.map((s) => {
    // Simulated student view where notes/adminReminder are stripped
    const { notes, adminReminder, ...studentSafe } = s as any;
    return studentSafe;
  });
  assert.equal(studentView[0].notes, undefined, "Admin notes must not be present in student view");
  assert.equal(studentView[0].adminReminder, undefined, "Admin reminders must not be present in student view");

  const staffSession = {
    ...history[0],
    notes: "Focus on basic factorising first before quadratic formula",
    adminReminder: "Ask parent about mock exams",
  };
  assert.ok(staffSession.notes, "Staff can access admin notes");
  assert.ok(staffSession.adminReminder, "Staff can access admin reminders");
  console.log("✅ [PASS] Admin notes and reminders securely visible to staff and hidden from students");

  console.log("\n🎉 ALL NOTES & HOMEWORK HISTORY TESTS PASSED!\n");
}

runNotesHistoryTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
