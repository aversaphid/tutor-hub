export {};

import { sanitizeSessionForRole } from "../lib/session-sanitizer";

// Test suite for role-based session sanitization
const mockSession = {
  id: "sess-1",
  title: "Math Lesson",
  scheduledStartTime: "2026-09-25T10:00:00Z",
  studentPay: 45, // Client fee paid by family
  tutorPay: 30,   // Tutor compensation
  tutee: {
    id: "stud-1",
    name: "Alex",
    studentPay: 45,
    tutorPay: 30,
  },
};

// 1. HEAD_TUTOR (Admin) should see all fields
const adminView = sanitizeSessionForRole(mockSession, "HEAD_TUTOR");
if (adminView.studentPay !== 45 || adminView.tutorPay !== 30) {
  throw new Error("HEAD_TUTOR must see both studentPay and tutorPay");
}
if (adminView.tutee?.studentPay !== 45 || adminView.tutee?.tutorPay !== 30) {
  throw new Error("HEAD_TUTOR must see tutee pay rates");
}

// 2. TUTOR should see their tutorPay, but NEVER studentPay
const tutorView = sanitizeSessionForRole(mockSession, "TUTOR");
if (tutorView.studentPay !== undefined) {
  throw new Error("TUTOR must NOT see studentPay (client fee)");
}
if (tutorView.tutee?.studentPay !== undefined) {
  throw new Error("TUTOR must NOT see tutee.studentPay");
}
if (tutorView.tutorPay !== 30 || tutorView.tutee?.tutorPay !== 30) {
  throw new Error("TUTOR must see their own tutorPay");
}

// 3. TUTEE (Student) must NEVER see tutorPay
const studentView = sanitizeSessionForRole(mockSession, "TUTEE");
if (studentView.tutorPay !== undefined) {
  throw new Error("TUTEE must NOT see tutorPay");
}
if (studentView.tutee?.tutorPay !== undefined) {
  throw new Error("TUTEE must NOT see tutee.tutorPay");
}
if (studentView.studentPay !== undefined) {
  throw new Error("TUTEE must NOT see raw session studentPay (handled via billing UI)");
}

console.log(" ALL SESSION SANITIZER ROLE-BASED MASKING TESTS PASSED!");
