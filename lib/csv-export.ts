export interface SessionExportData {
  id: string;
  title?: string | null;
  scheduledStartTime: string | Date;
  scheduledEndTime: string | Date;
  actualStartTime?: string | Date | null;
  status: string;
  tutorPaid?: boolean | null;
  tutorConfirmed?: boolean | null;
  tuteeConfirmed?: boolean | null;
  feedbackRating?: number | null;
  feedbackCovered?: string | null;
  feedbackNotes?: string | null;
  adminReminder?: string | null;
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
 * Converts a list of session objects into RFC 4180 compliant CSV and triggers browser download
 */
export function exportSessionsToCSV(sessions: SessionExportData[], filenamePrefix = "lb-maths-lessons"): void {
  const headers = [
    "Lesson ID",
    "Lesson Title",
    "Date",
    "Start Time",
    "End Time",
    "Duration (Minutes)",
    "Student Name",
    "Tutor Name",
    "Status",
    "Tutor Attendance Confirmed",
    "Student Attendance Confirmed",
    "Tutor Settled / Paid",
    "Lesson Rating",
    "Topics Covered",
    "Tutor Feedback Notes",
    "Admin Reminder",
    "Microsoft Teams URL",
  ];

  const rows = sessions.map((s) => {
    const start = new Date(s.scheduledStartTime);
    const end = new Date(s.scheduledEndTime);
    const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);

    const dateStr = start.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const startTimeStr = start.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const endTimeStr = end.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return [
      escapeCSV(s.id),
      escapeCSV(s.title || "Maths Lesson"),
      escapeCSV(dateStr),
      escapeCSV(startTimeStr),
      escapeCSV(endTimeStr),
      escapeCSV(durationMins),
      escapeCSV(s.tutee?.name || "Student"),
      escapeCSV(s.tutor?.name || "Tutor"),
      escapeCSV(s.status),
      escapeCSV(s.tutorConfirmed ? "Confirmed" : "Unconfirmed"),
      escapeCSV(s.tuteeConfirmed ? "Confirmed" : "Unconfirmed"),
      escapeCSV(s.tutorPaid ? "Paid / Settled" : "Unpaid"),
      escapeCSV(s.feedbackRating ? `${s.feedbackRating} / 5` : "Unrated"),
      escapeCSV(s.feedbackCovered || ""),
      escapeCSV(s.feedbackNotes || ""),
      escapeCSV(s.adminReminder || ""),
      escapeCSV(s.teamsMeetingUrl || ""),
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
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
