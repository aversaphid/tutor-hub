import assert from "node:assert";

function getPreviousLessonTeamsUrl(session: any, sessions: any[]): string | null {
  if (!session) return null;
  const tuteeId = session.tuteeId || session.tutee?.id;
  if (!tuteeId) return null;

  const currentStart = new Date(session.scheduledStartTime).getTime();

  const past = sessions
    .filter((s: any) => {
      const sTuteeId = s.tuteeId || s.tutee?.id;
      if (sTuteeId !== tuteeId || s.id === session.id) return false;
      if (s.status === "CANCELLED") return false;
      const sStart = new Date(s.scheduledStartTime).getTime();
      return sStart < currentStart && Boolean(s.teamsMeetingUrl?.trim());
    })
    .sort(
      (a: any, b: any) =>
        new Date(b.scheduledStartTime).getTime() - new Date(a.scheduledStartTime).getTime()
    );

  return past[0]?.teamsMeetingUrl?.trim() || null;
}

console.log("=== Testing Previous Lesson Teams Meeting URL Logic ===");

const studentA_id = "student-123";
const studentB_id = "student-456";

const sessions = [
  {
    id: "s1",
    tuteeId: studentA_id,
    scheduledStartTime: "2026-09-10T10:00:00Z",
    status: "ARCHIVED",
    teamsMeetingUrl: "https://teams.microsoft.com/l/meetup-join/link-1",
  },
  {
    id: "s2",
    tuteeId: studentA_id,
    scheduledStartTime: "2026-09-15T10:00:00Z",
    status: "ARCHIVED",
    teamsMeetingUrl: "https://teams.microsoft.com/l/meetup-join/link-2",
  },
  {
    id: "s3_cancelled",
    tuteeId: studentA_id,
    scheduledStartTime: "2026-09-20T10:00:00Z",
    status: "CANCELLED",
    teamsMeetingUrl: "https://teams.microsoft.com/l/meetup-join/cancelled-link",
  },
  {
    id: "s4_no_teams",
    tuteeId: studentA_id,
    scheduledStartTime: "2026-09-22T10:00:00Z",
    status: "ARCHIVED",
    teamsMeetingUrl: "",
  },
  {
    id: "s5_current",
    tuteeId: studentA_id,
    scheduledStartTime: "2026-09-25T10:00:00Z",
    status: "SCHEDULED",
    teamsMeetingUrl: "",
  },
  {
    id: "s_other_student",
    tuteeId: studentB_id,
    scheduledStartTime: "2026-09-24T10:00:00Z",
    status: "ARCHIVED",
    teamsMeetingUrl: "https://teams.microsoft.com/l/meetup-join/student-b-link",
  },
];

// Test 1: For s5_current, the most recent past valid teams link should be link-2 (skipping s3_cancelled and s4_no_teams)
const prevUrl = getPreviousLessonTeamsUrl(sessions[4], sessions);
assert.strictEqual(prevUrl, "https://teams.microsoft.com/l/meetup-join/link-2");
console.log("✅ [PASS] Successfully finds latest previous lesson link (link-2) skipping cancelled and blank links");

// Test 2: For student B who has no past lessons with teams URL prior to their first lesson
const studentB_first = {
  id: "s_b_first",
  tuteeId: studentB_id,
  scheduledStartTime: "2026-09-20T10:00:00Z",
  status: "SCHEDULED",
  teamsMeetingUrl: "",
};
const prevUrlB = getPreviousLessonTeamsUrl(studentB_first, sessions);
assert.strictEqual(prevUrlB, null);
console.log("✅ [PASS] Returns null when student has no earlier lessons with a Teams link");

// Test 3: Ignores links belonging to other students
const studentB_second = {
  id: "s_b_second",
  tuteeId: studentB_id,
  scheduledStartTime: "2026-09-26T10:00:00Z",
  status: "SCHEDULED",
  teamsMeetingUrl: "",
};
const prevUrlBSecond = getPreviousLessonTeamsUrl(studentB_second, sessions);
assert.strictEqual(prevUrlBSecond, "https://teams.microsoft.com/l/meetup-join/student-b-link");
console.log("✅ [PASS] Strictly scopes Teams links to the current student");

console.log("\n🎉 ALL PREVIOUS TEAMS URL LOGIC TESTS PASSED!");
