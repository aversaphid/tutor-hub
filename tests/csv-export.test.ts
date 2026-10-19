import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { exportSessionsToCSV, SessionExportData } from "../lib/csv-export";

describe("CSV Export Structure", () => {
  it("exports sessions with the exact requested column structure and formatting", () => {
    // 2026-11-05 is a Thursday
    const sampleSession: SessionExportData = {
      id: "lesson-abc-123",
      scheduledStartTime: new Date("2026-11-05T14:30:00Z"),
      scheduledEndTime: new Date("2026-11-05T15:30:00Z"),
      tutee: { name: "Alice Smith" },
      tutor: { name: "luke", email: "luke@lbmathstuition.co.uk" },
      tutorConfirmed: true,
      tuteeConfirmed: false,
      feedbackCovered: "Algebra & Linear Equations",
      tutorPaid: true,
      feedbackNotes: "Alice worked very well through all questions.",
      adminReminder: "Check parent invoice payment",
    };

    const csv = exportSessionsToCSV([sampleSession]);

    // Split rows
    const lines = csv.replace(/^\uFEFF/, "").split("\r\n");
    assert.equal(lines.length >= 2, true);

    // Check Header row
    const headers = lines[0].split(",");
    assert.deepEqual(headers, [
      "Lesson ID",
      "Date",
      "Day",
      "Tutee Name",
      "Tutor Name",
      "Time",
      "Tutor Attendance Confirmed",
      "Tutee Attendance Confirmed",
      "Topic Covered",
      "Paid",
      "Tutor Feedback",
      "Admin Notes",
    ]);

    // Check Data row values
    const dataLine = lines[1];
    assert.match(dataLine, /"lesson-abc-123"/);
    // Date in dd/mm/yyyy
    assert.match(dataLine, /"\d{2}\/\d{2}\/2026"/);
    // Day of the week
    assert.match(dataLine, /"Thursday"/);
    // Tutee Name
    assert.match(dataLine, /"Alice Smith"/);
    // Formatted Tutor Name
    assert.match(dataLine, /"Luke"/);
    // Time in 24h format start-end
    assert.match(dataLine, /"\d{2}:30 - \d{2}:30"/);
    // Tutor Attendance Confirmation
    assert.match(dataLine, /"Confirmed"/);
    // Tutee Attendance Confirmation
    assert.match(dataLine, /"Unconfirmed"/);
    // Topic Covered
    assert.match(dataLine, /"Algebra & Linear Equations"/);
    // Paid (Yes / No)
    assert.match(dataLine, /"Yes"/);
    // Tutor feedback
    assert.match(dataLine, /"Alice worked very well through all questions\."/);
    // Admin notes
    assert.match(dataLine, /"Check parent invoice payment"/);
  });

  it("handles unpaid lesson with 'No' and fallback topic/notes", () => {
    const unpaidSession: SessionExportData = {
      id: "lesson-unpaid-456",
      scheduledStartTime: "2026-10-19T09:00:00.000Z",
      scheduledEndTime: "2026-10-19T10:00:00.000Z",
      tutee: { name: "Bob Jones" },
      tutor: { name: "sarah" },
      tutorConfirmed: false,
      tuteeConfirmed: false,
      studentTopic: "Trigonometry Basics",
      tutorPaid: false,
      notes: "Follow up with tutor next week",
    };

    const csv = exportSessionsToCSV([unpaidSession]);
    const lines = csv.replace(/^\uFEFF/, "").split("\r\n");
    const dataLine = lines[1];

    assert.match(dataLine, /"lesson-unpaid-456"/);
    assert.match(dataLine, /"Bob Jones"/);
    assert.match(dataLine, /"Sarah"/);
    assert.match(dataLine, /"Trigonometry Basics"/);
    assert.match(dataLine, /"No"/); // Paid = No
    assert.match(dataLine, /"Follow up with tutor next week"/);
  });
});
