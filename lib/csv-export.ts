import { formatTutorName } from "./format";

export interface SessionExportData {
  id: string;
  title?: string | null;
  scheduledStartTime: string | Date;
  scheduledEndTime: string | Date;
  actualStartTime?: string | Date | null;
  status?: string;
  tutorPaid?: boolean | null;
  tutorConfirmed?: boolean | null;
  tuteeConfirmed?: boolean | null;
  feedbackRating?: number | null;
  feedbackCovered?: string | null;
  feedbackNotes?: string | null;
  studentTopic?: string | null;
  adminReminder?: string | null;
  notes?: string | null;
  teamsMeetingUrl?: string | null;
  tutor?: { name?: string | null; email?: string | null } | null;
  tutee?: { name?: string | null } | null;
}

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let stringVal = String(val).replace(/"/g, '""');
  // Mitigate CSV Formula Injection: prepend single quote if cell begins with =, +, -, @, \t, or \r
  if (/^[=+\-@\t\r]/.test(stringVal)) {
    stringVal = "'" + stringVal;
  }
  return `"${stringVal}"`;
}

/**
 * Converts a list of session objects into RFC 4180 compliant CSV and triggers browser download.
 * Structure:
 * 1. Lesson ID
 * 2. Date (dd/mm/yyyy)
 * 3. Day of week
 * 4. Tutee Name
 * 5. Tutor Name
 * 6. Time (start-end in 24h time)
 * 7. Tutor Attendance Confirmation
 * 8. Tutee Attendance Confirmation
 * 9. Topic Covered
 * 10. Paid (Yes / No)
 * 11. Tutor Feedback
 * 12. Admin Notes
 */
export function exportSessionsToCSV(sessions: SessionExportData[], filenamePrefix = "lb-maths-lessons"): string {
  const headers = [
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
  ];

  const rows = sessions.map((s) => {
    const start = new Date(s.scheduledStartTime);
    const end = new Date(s.scheduledEndTime);
    const isValidStart = !isNaN(start.getTime());
    const isValidEnd = !isNaN(end.getTime());

    let dateStr = "";
    let dayStr = "";
    let timeStr = "";

    if (isValidStart) {
      const d = String(start.getDate()).padStart(2, "0");
      const m = String(start.getMonth() + 1).padStart(2, "0");
      const y = start.getFullYear();
      dateStr = `${d}/${m}/${y}`;
      dayStr = start.toLocaleDateString("en-GB", { weekday: "long" });

      if (isValidEnd) {
        const startH = String(start.getHours()).padStart(2, "0");
        const startM = String(start.getMinutes()).padStart(2, "0");
        const endH = String(end.getHours()).padStart(2, "0");
        const endM = String(end.getMinutes()).padStart(2, "0");
        timeStr = `${startH}:${startM} - ${endH}:${endM}`;
      }
    }

    const tutorConfirmedStr = s.tutorConfirmed ? "Confirmed" : "Unconfirmed";
    const tuteeConfirmedStr = s.tuteeConfirmed ? "Confirmed" : "Unconfirmed";
    const topicCovered = s.feedbackCovered || s.studentTopic || "";
    const isPaidStr = s.tutorPaid ? "Yes" : "No";
    const tutorFeedback = s.feedbackNotes || "";
    const adminNotes = [s.adminReminder, s.notes].filter(Boolean).join(" - ") || "";

    return [
      escapeCSV(s.id),
      escapeCSV(dateStr),
      escapeCSV(dayStr),
      escapeCSV(s.tutee?.name || "Student"),
      escapeCSV(formatTutorName(s.tutor?.name) || "Tutor"),
      escapeCSV(timeStr),
      escapeCSV(tutorConfirmedStr),
      escapeCSV(tuteeConfirmedStr),
      escapeCSV(topicCovered),
      escapeCSV(isPaidStr),
      escapeCSV(tutorFeedback),
      escapeCSV(adminNotes),
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

  if (typeof document !== "undefined") {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const dateTag = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `${filenamePrefix}-${dateTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return csvContent;
}
