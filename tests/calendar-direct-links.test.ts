import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getCanonicalPortalUrl,
  getCanonicalPortalHost,
  generateICS,
  generateMultiEventICS,
  CalendarEvent,
} from "../lib/calendar";

describe("Calendar Links & Reminder Engine", () => {
  it("resolves canonical portal host and URL to portal.lbmathstuition.co.uk in production", () => {
    // Simulated production request with old internal Deno hostname
    const reqWithOldHost = new Request("https://tutor-hub-xyz.deno.dev/api/calendar/subscribe", {
      headers: { host: "tutor-hub-xyz.deno.dev" },
    });
    assert.equal(getCanonicalPortalHost(reqWithOldHost), "portal.lbmathstuition.co.uk");
    assert.equal(getCanonicalPortalUrl(reqWithOldHost), "https://portal.lbmathstuition.co.uk");

    // Simulated custom domain request
    const reqWithCustomHost = new Request("https://portal.lbmathstuition.co.uk/api/calendar/subscribe", {
      headers: { host: "portal.lbmathstuition.co.uk" },
    });
    assert.equal(getCanonicalPortalHost(reqWithCustomHost), "portal.lbmathstuition.co.uk");
    assert.equal(getCanonicalPortalUrl(reqWithCustomHost), "https://portal.lbmathstuition.co.uk");

    // Default without request object
    assert.equal(getCanonicalPortalHost(), "portal.lbmathstuition.co.uk");
    assert.equal(getCanonicalPortalUrl(), "https://portal.lbmathstuition.co.uk");
  });

  it("preserves localhost during local development", () => {
    const reqLocal = new Request("http://localhost:3000/api/calendar/subscribe", {
      headers: { host: "localhost:3000" },
    });
    assert.equal(getCanonicalPortalHost(reqLocal), "localhost:3000");
    assert.equal(getCanonicalPortalUrl(reqLocal), "http://localhost:3000");
  });

  it("generates single-event ICS with student direct link, correct UID, and alarm", () => {
    const magicKey = "stu_magic_key_123456789";
    const studentDirectUrl = `https://portal.lbmathstuition.co.uk/student?key=${magicKey}`;

    const event: CalendarEvent = {
      id: "session-abc-123",
      title: "Maths Lesson with Luke",
      description: `LB Maths Tuition Online Session\nTutor: Luke\nStudent: Alex\nDirect Student Portal: ${studentDirectUrl}`,
      location: studentDirectUrl,
      url: studentDirectUrl,
      startTime: "2026-10-20T17:00:00.000Z",
      endTime: "2026-10-20T18:00:00.000Z",
      tutorName: "Luke",
      studentName: "Alex",
      studentMagicKey: magicKey,
    };

    const ics = generateICS(event);

    // UID must use portal.lbmathstuition.co.uk, not tutor-hub
    assert.match(ics, /UID:lb-maths-session-abc-123@portal\.lbmathstuition\.co\.uk/);
    assert.doesNotMatch(ics, /tutor-hub/);

    // Must attach RFC 5545 URL property
    assert.match(ics, /URL:https:\/\/portal\.lbmathstuition\.co\.uk\/student\?key=stu_magic_key_123456789/);

    // Must attach direct link to VALARM notification
    assert.match(ics, /DESCRIPTION:Maths lesson starting in 15 mins - Tap to join: https:\/\/portal\.lbmathstuition\.co\.uk\/student\?key=stu_magic_key_123456789/);

    // Location must contain the direct link
    assert.match(ics, /LOCATION:https:\/\/portal\.lbmathstuition\.co\.uk\/student\?key=stu_magic_key_123456789/);
  });

  it("generates multi-event ICS with student direct link and alarm", () => {
    const magicKey = "stu_magic_key_999";
    const studentDirectUrl = `https://portal.lbmathstuition.co.uk/student?key=${magicKey}`;

    const events: CalendarEvent[] = [
      {
        id: "session-1",
        title: "Maths Lesson (Alex)",
        description: `Direct Student Portal: ${studentDirectUrl}`,
        location: studentDirectUrl,
        url: studentDirectUrl,
        startTime: "2026-10-21T16:00:00.000Z",
        endTime: "2026-10-21T17:00:00.000Z",
        studentMagicKey: magicKey,
      },
    ];

    const ics = generateMultiEventICS(events);

    assert.match(ics, /UID:lb-maths-session-1@portal\.lbmathstuition\.co\.uk/);
    assert.doesNotMatch(ics, /tutor-hub/);
    assert.match(ics, /URL:https:\/\/portal\.lbmathstuition\.co\.uk\/student\?key=stu_magic_key_999/);
    assert.match(ics, /DESCRIPTION:Maths lesson starting in 15 mins - Tap to join: https:\/\/portal\.lbmathstuition\.co\.uk\/student\?key=stu_magic_key_999/);
  });
});
