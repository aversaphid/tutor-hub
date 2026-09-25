import { prisma } from "@/lib/prisma";
import { parseAuthToken } from "@/lib/auth";

function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const tutorIdFilter = searchParams.get("tutorId");

    if (!key) {
      return new Response("Missing calendar subscription key.", {
        status: 401,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // 1. Authenticate user by magicKey or signed auth token
    let user = await prisma.user.findFirst({
      where: { magicKey: key, active: true },
      select: {
        id: true,
        name: true,
        role: true,
        magicKey: true,
      },
    });

    if (!user) {
      // Fallback: test if key is a valid auth token
      const decoded = parseAuthToken(key);
      if (decoded?.sub) {
        user = await prisma.user.findUnique({
          where: { id: decoded.sub, active: true },
          select: {
            id: true,
            name: true,
            role: true,
            magicKey: true,
          },
        });
      }
    }

    if (!user) {
      return new Response("Unauthorized calendar subscription key.", {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // 2. Fetch active sessions within a 120-day active window (30 days past, 90 days future)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const ninetyDaysAhead = new Date(Date.now() + 90 * 24 * 3600 * 1000);

    const where: any = {
      status: { not: "CANCELLED" },
      scheduledStartTime: {
        gte: thirtyDaysAgo,
        lte: ninetyDaysAhead,
      },
    };

    if (user.role === "HEAD_TUTOR") {
      if (tutorIdFilter) {
        where.tutorId = tutorIdFilter;
      }
    } else if (user.role === "TUTOR") {
      where.tutorId = user.id;
    } else if (user.role === "TUTEE") {
      where.tuteeId = user.id;
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        tutor: { select: { name: true } },
        tutee: { select: { name: true } },
      },
      orderBy: { scheduledStartTime: "asc" },
    });

    // 3. Construct RFC 5545 iCalendar stream
    const now = new Date();
    const formattedStamp = formatDateToICS(now);
    const calendarName =
      user.role === "HEAD_TUTOR"
        ? tutorIdFilter
          ? "LB Maths Tuition - Tutor Schedule"
          : "LB Maths Tuition - All Lessons"
        : user.role === "TUTOR"
        ? `LB Maths Tuition - ${user.name}`
        : `LB Maths Tuition - ${user.name}`;

    const host = request.headers.get("host") || "lbmathstuition.co.uk";
    const portalUrl = `https://${host}`;

    const vEvents = sessions.map((s) => {
      const start = new Date(s.scheduledStartTime);
      const end = new Date(s.scheduledEndTime);
      const formattedStart = formatDateToICS(start);
      const formattedEnd = formatDateToICS(end);

      const tutorName = s.tutor?.name || "Tutor";
      const studentName = s.tutee?.name || "Student";

      let summary = `Maths Lesson: ${studentName}`;
      if (user.role === "TUTEE") {
        summary = `Maths Lesson with ${tutorName}`;
      } else if (user.role === "HEAD_TUTOR") {
        summary = `Maths Lesson: ${studentName} & ${tutorName}`;
      }

      const descLines = [
        `LB Maths Tuition Online Session`,
        `Student: ${studentName}`,
        `Tutor: ${tutorName}`,
        s.studentTopic ? `Topic: ${s.studentTopic}` : null,
        s.teamsMeetingUrl ? `Teams Meeting Link: ${s.teamsMeetingUrl}` : null,
        `Portal Lobby: ${portalUrl}/${user.role === "TUTEE" ? "student" : user.role === "TUTOR" ? "tutor" : "admin"}`,
        s.notes ? `Notes: ${s.notes}` : null,
      ]
        .filter(Boolean)
        .join("\\n");

      const cleanSummary = summary.replace(/\n/g, " ");
      const location = (s.teamsMeetingUrl || `${portalUrl}/student`).replace(/\n/g, " ");

      return [
        "BEGIN:VEVENT",
        `UID:session-${s.id}@${host}`,
        `DTSTAMP:${formattedStamp}`,
        `DTSTART:${formattedStart}`,
        `DTEND:${formattedEnd}`,
        `SUMMARY:${cleanSummary}`,
        `DESCRIPTION:${descLines}`,
        `LOCATION:${location}`,
        "STATUS:CONFIRMED",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "DESCRIPTION:Maths lesson starting in 15 minutes",
        "TRIGGER:-PT15M",
        "END:VALARM",
        "END:VEVENT",
      ].join("\r\n");
    });

    const icsFeed = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LB Maths Tuition//Lesson Portal WebCal//EN",
      `X-WR-CALNAME:${calendarName}`,
      "X-WR-TIMEZONE:Europe/London",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      "X-PUBLISHED-TTL:PT1H",
      ...vEvents,
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(icsFeed, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="lb-maths-calendar.ics"`,
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    console.error("WebCal subscription feed error:", err);
    return new Response("Failed to generate calendar feed.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
