import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Notes & Homework History Engine", () => {
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
      feedbackNotes: "", // Empty notes - should be filtered out
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
      status: "CANCELLED", // Cancelled - should be excluded
      topic: "Surds",
      title: "Maths Lesson",
      feedbackNotes: "Cancelled by student",
      tutor: { id: "tutor-1", name: "Luke" },
    },
  ];

  it("filters notes strictly for the requested student, ignoring empty notes and cancelled sessions", () => {
    const studentId = "student-alice";
    const history = mockSessions
      .filter(
        (s) =>
          s.tuteeId === studentId &&
          s.status !== "CANCELLED" &&
          s.feedbackNotes &&
          s.feedbackNotes.trim().length > 0
      )
      .sort(
        (a, b) =>
          new Date(b.scheduledStartTime).getTime() -
          new Date(a.scheduledStartTime).getTime()
      );

    assert.equal(history.length, 2);
    // Newest first
    assert.equal(history[0].id, "session-2");
    assert.equal(history[0].topic, "Simultaneous Equations");
    assert.equal(history[1].id, "session-1");
    assert.equal(history[1].topic, "Algebra & Quadratic Formula");
  });

  it("search query filters notes by content, topic, or tutor name", () => {
    const query = "quadratic";
    const filtered = mockSessions.filter((s) => {
      const q = query.toLowerCase();
      const notesMatch = (s.feedbackNotes || "").toLowerCase().includes(q);
      const topicMatch = (s.topic || "").toLowerCase().includes(q);
      const tutorMatch = (s.tutor?.name || "").toLowerCase().includes(q);
      return notesMatch || topicMatch || tutorMatch;
    });

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "session-1");
  });

  it("allows searching by tutor name across notes history", () => {
    const query = "luke";
    const filtered = mockSessions.filter(
      (s) =>
        s.tuteeId === "student-alice" &&
        s.status !== "CANCELLED" &&
        Boolean(s.feedbackNotes?.trim()) &&
        (s.tutor?.name || "").toLowerCase().includes(query.toLowerCase())
    );

    assert.equal(filtered.length, 2);
  });
});
