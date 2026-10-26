import { prisma } from "./prisma";
import { formatTutorName } from "./format";
import { sendPushToUser } from "./web-push";
import { formatLondonTime, formatLondonDate } from "./timezone";

let lastReminderCheck = 0;
const REMINDER_CHECK_THROTTLE_MS = 25_000; // Check at most once every 25 seconds per server instance

/**
 * Scan for upcoming scheduled lessons starting within the next 15 minutes that haven't received
 * a reminder push notification yet, and dispatch targeted alerts to both the student and tutor.
 */
export async function checkAndSendUpcomingLessonReminders(): Promise<{ sentCount: number }> {
  const now = Date.now();
  // Throttle to prevent duplicate concurrent queries
  if (now - lastReminderCheck < REMINDER_CHECK_THROTTLE_MS) {
    return { sentCount: 0 };
  }
  lastReminderCheck = now;

  let sentCount = 0;

  try {
    const nowDate = new Date(now);
    // 15-minute upcoming alert window (look ahead up to 16 minutes to avoid edge boundary skips)
    const upcomingCutoff = new Date(now + 16 * 60 * 1000);
    // Don't alert for sessions that are already more than 15 minutes past start
    const pastCutoff = new Date(now - 15 * 60 * 1000);

    const upcomingSessions: Array<{
      id: string;
      scheduledStartTime: Date;
      tutorId: string;
      tuteeId: string;
      tutor?: { id: string; name: string } | null;
      tutee?: { id: string; name: string } | null;
    }> = await (prisma.session as any).findMany({
      where: {
        status: { in: ["SCHEDULED", "DELAYED"] },
        scheduledStartTime: {
          lte: upcomingCutoff,
          gte: pastCutoff,
        },
        reminderSentAt: null,
      },
      include: {
        tutor: { select: { id: true, name: true } },
        tutee: { select: { id: true, name: true } },
      },
      take: 20,
    });

    if (upcomingSessions.length === 0) {
      return { sentCount: 0 };
    }

    for (const session of upcomingSessions) {
      const startMs = new Date(session.scheduledStartTime).getTime();
      const minutesUntil = Math.max(1, Math.round((startMs - now) / 60000));
      const tutorName = formatTutorName(session.tutor?.name) || "Your tutor";
      const studentName = session.tutee?.name || "Student";

      const timeFormatted = formatLondonTime(session.scheduledStartTime);

      // 1. Mark reminderSentAt FIRST to ensure idempotency and prevent duplicate pushes
      await (prisma.session as any).update({
        where: { id: session.id },
        data: { reminderSentAt: new Date() },
      });

      // 2. Send push to Student
      if (session.tuteeId) {
        sendPushToUser(session.tuteeId, {
          title: `⏰ Maths Lesson in ${minutesUntil}m`,
          body: `Your lesson with ${tutorName} starts at ${timeFormatted}. Tap to open your room!`,
          url: "/student",
          tag: `lesson-reminder-${session.id}`,
        }).catch((err) => console.warn(`[Reminder Push] Error to student ${session.tuteeId}:`, err));
      }

      // 3. Send push to Tutor
      if (session.tutorId) {
        sendPushToUser(session.tutorId, {
          title: `⏰ Lesson in ${minutesUntil}m: ${studentName}`,
          body: `Lesson with ${studentName} starts at ${timeFormatted}. Tap to open tutor hub!`,
          url: "/tutor",
          tag: `lesson-reminder-${session.id}`,
        }).catch((err) => console.warn(`[Reminder Push] Error to tutor ${session.tutorId}:`, err));
      }

      sentCount++;
    }

    if (sentCount > 0) {
      console.log(`[Reminders] Dispatched upcoming lesson push notifications for ${sentCount} session(s).`);
    }
  } catch (err) {
    console.error("[Reminders] Error checking upcoming lesson reminders:", err);
  }

  return { sentCount };
}

/**
 * Dispatch push notifications when a lesson begins (transitions to IN_PROGRESS).
 */
export async function sendLessonStartNotification(session: {
  id: string;
  tutorId: string;
  tuteeId: string;
  tutor?: { name?: string | null } | null;
  tutee?: { name?: string | null } | null;
}) {
  const tutorName = formatTutorName(session.tutor?.name) || "Your tutor";
  const studentName = session.tutee?.name || "Student";

  // Alert student
  if (session.tuteeId) {
    sendPushToUser(session.tuteeId, {
      title: "🚀 Maths Lesson Starting Now!",
      body: `Your lesson with ${tutorName} is now starting. Tap to join meeting!`,
      url: "/student",
      tag: `lesson-start-${session.id}`,
    }).catch(() => {});
  }

  // Alert tutor
  if (session.tutorId) {
    sendPushToUser(session.tutorId, {
      title: `🚀 Lesson Starting Now: ${studentName}`,
      body: `Your maths lesson with ${studentName} has started. Tap to open session!`,
      url: "/tutor",
      tag: `lesson-start-${session.id}`,
    }).catch(() => {});
  }
}

/**
 * Dispatch push notification when a new lesson is booked for a student.
 */
export async function sendLessonBookedNotification(session: {
  id: string;
  tuteeId: string;
  scheduledStartTime: Date | string;
  tutor?: { name?: string | null } | null;
}) {
  if (!session.tuteeId) return;

  const startDate = new Date(session.scheduledStartTime);
  const dateFormatted = formatLondonDate(startDate, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeFormatted = formatLondonTime(startDate);
  const tutorName = formatTutorName(session.tutor?.name) || "Your tutor";

  sendPushToUser(session.tuteeId, {
    title: "📅 New Lesson Scheduled",
    body: `Maths lesson with ${tutorName} booked for ${dateFormatted} at ${timeFormatted}.`,
    url: "/student",
    tag: `lesson-scheduled-${session.id}`,
  }).catch(() => {});
}

// Auto-register Deno Deploy Native Cron if running on Deno Deploy runtime
try {
  const deno = (globalThis as any).Deno;
  if (deno && typeof deno.cron === "function") {
    deno.cron("Upcoming Lesson Reminders", "* * * * *", async () => {
      await checkAndSendUpcomingLessonReminders();
    });
    console.log("[Deno.cron] Registered minute-by-minute upcoming lesson reminders.");
  }
} catch {}
