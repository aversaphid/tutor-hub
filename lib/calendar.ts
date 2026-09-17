export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location?: string;
  startTime: Date | string;
  endTime: Date | string;
  tutorName?: string;
  studentName?: string;
}

function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generates an RFC 5545 iCalendar (.ics) formatted string
 * Compatible with Apple Calendar, iOS, macOS, Outlook, and Google Calendar
 */
export function generateICS(event: CalendarEvent): string {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const now = new Date();

  const formattedStart = formatDateToICS(start);
  const formattedEnd = formatDateToICS(end);
  const formattedStamp = formatDateToICS(now);

  const cleanTitle = event.title.replace(/\n/g, " ");
  const cleanDescription = (event.description || "").replace(/\n/g, "\\n");
  const cleanLocation = (event.location || "Microsoft Teams / LB Maths Tuition Portal").replace(/\n/g, " ");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LB Maths Tuition//Lesson Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:lb-maths-${event.id}@lbmathstuition.co.uk`,
    `DTSTAMP:${formattedStamp}`,
    `DTSTART:${formattedStart}`,
    `DTEND:${formattedEnd}`,
    `SUMMARY:${cleanTitle}`,
    `DESCRIPTION:${cleanDescription}`,
    `LOCATION:${cleanLocation}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Maths lesson starting in 15 minutes",
    "TRIGGER:-PT15M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Downloads the .ics file directly in the browser
 */
export function downloadICS(event: CalendarEvent): void {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const filename = `maths-lesson-${new Date(event.startTime).toISOString().slice(0, 10)}.ics`;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a direct Google Calendar web link with prefilled session details
 */
export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  const formattedStart = formatDateToICS(start);
  const formattedEnd = formatDateToICS(end);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formattedStart}/${formattedEnd}`,
    details: event.description || "Join your online maths tuition lesson with LB Maths Tuition.",
    location: event.location || "Online (Microsoft Teams)",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
