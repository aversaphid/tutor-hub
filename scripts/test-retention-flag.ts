// scripts/test-retention-flag.ts
// Unit verification test for Inactivity Flag and Break vs Retention logic

interface Session {
  id: string;
  tuteeId: string;
  status: string;
  scheduledEndTime: string;
}

interface Student {
  id: string;
  name: string;
  active: boolean;
  createdAt?: string;
}

function getStudentInactivityInfo(
  st: Student,
  sessions: Session[],
  retentionThresholdDays: number,
  currentTime: number
) {
  const studentSessions = sessions.filter(
    (s) => s.tuteeId === st.id && s.status !== "CANCELLED"
  );

  const now = currentTime;
  const hasUpcoming = studentSessions.some(
    (s) => new Date(s.scheduledEndTime).getTime() > now
  );

  if (hasUpcoming) {
    return {
      daysSinceLastLesson: 0,
      lastLessonDate: null,
      hasUpcoming: true,
      isFlaggedForRetention: false,
      noLessonsEver: studentSessions.length === 0,
    };
  }

  let referenceMs: number;
  let lastLessonDate: Date | null = null;

  if (studentSessions.length > 0) {
    const pastTimes = studentSessions.map((s) => new Date(s.scheduledEndTime).getTime());
    referenceMs = Math.max(...pastTimes);
    lastLessonDate = new Date(referenceMs);
  } else {
    referenceMs = new Date(st.createdAt || 0).getTime();
    lastLessonDate = null;
  }

  const daysSinceLastLesson = Math.max(0, Math.floor((now - referenceMs) / (1000 * 60 * 60 * 24)));
  const isFlaggedForRetention = daysSinceLastLesson >= retentionThresholdDays;

  return {
    daysSinceLastLesson,
    lastLessonDate,
    hasUpcoming: false,
    isFlaggedForRetention,
    noLessonsEver: studentSessions.length === 0,
  };
}

const NOW = Date.parse("2026-09-24T12:00:00.000Z");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Test cases
const studentOnBreakRecent: Student = {
  id: "s1",
  name: "Alice (Summer Break)",
  active: false, // on holiday/break
  createdAt: new Date(NOW - 200 * ONE_DAY_MS).toISOString(),
};

const studentActiveNoRecentLessons: Student = {
  id: "s2",
  name: "Bob (Active status but 120d no lessons)",
  active: true,
  createdAt: new Date(NOW - 300 * ONE_DAY_MS).toISOString(),
};

const studentWithUpcoming: Student = {
  id: "s3",
  name: "Charlie (Has Upcoming Lesson)",
  active: true,
  createdAt: new Date(NOW - 300 * ONE_DAY_MS).toISOString(),
};

const studentNewNoLessonsYet: Student = {
  id: "s4",
  name: "Dana (Created 5 days ago, no lessons yet)",
  active: true,
  createdAt: new Date(NOW - 5 * ONE_DAY_MS).toISOString(),
};

const mockSessions: Session[] = [
  // Alice had a lesson 15 days ago before going on summer break
  {
    id: "sess1",
    tuteeId: "s1",
    status: "COMPLETED",
    scheduledEndTime: new Date(NOW - 15 * ONE_DAY_MS).toISOString(),
  },
  // Bob had a lesson 120 days ago
  {
    id: "sess2",
    tuteeId: "s2",
    status: "COMPLETED",
    scheduledEndTime: new Date(NOW - 120 * ONE_DAY_MS).toISOString(),
  },
  // Charlie had a lesson 100 days ago, BUT has an upcoming lesson tomorrow
  {
    id: "sess3",
    tuteeId: "s3",
    status: "COMPLETED",
    scheduledEndTime: new Date(NOW - 100 * ONE_DAY_MS).toISOString(),
  },
  {
    id: "sess4",
    tuteeId: "s3",
    status: "SCHEDULED",
    scheduledEndTime: new Date(NOW + 1 * ONE_DAY_MS).toISOString(),
  },
];

console.log("=== Testing Default Retention Policy (90 Days) ===");

// 1. Alice is on a break (active = false), but had lessons 15 days ago. MUST NOT BE FLAGGED.
const aliceInfo = getStudentInactivityInfo(studentOnBreakRecent, mockSessions, 90, NOW);
console.log(`Alice (active=false, 15d): isFlagged = ${aliceInfo.isFlaggedForRetention} (Expected: false)`);
if (aliceInfo.isFlaggedForRetention !== false) throw new Error("Alice should NOT be flagged for retention!");

// 2. Bob is active in UI, but has done no lessons for 120 days. MUST BE FLAGGED.
const bobInfo = getStudentInactivityInfo(studentActiveNoRecentLessons, mockSessions, 90, NOW);
console.log(`Bob (active=true, 120d): isFlagged = ${bobInfo.isFlaggedForRetention} (Expected: true)`);
if (bobInfo.isFlaggedForRetention !== true) throw new Error("Bob MUST be flagged for retention!");

// 3. Charlie has an upcoming lesson. MUST NOT BE FLAGGED.
const charlieInfo = getStudentInactivityInfo(studentWithUpcoming, mockSessions, 90, NOW);
console.log(`Charlie (has upcoming): isFlagged = ${charlieInfo.isFlaggedForRetention} (Expected: false)`);
if (charlieInfo.isFlaggedForRetention !== false) throw new Error("Charlie should NOT be flagged!");

// 4. Dana created 5 days ago, no lessons yet. MUST NOT BE FLAGGED at 90d.
const danaInfo = getStudentInactivityInfo(studentNewNoLessonsYet, mockSessions, 90, NOW);
console.log(`Dana (new 5d, 0 lessons): isFlagged = ${danaInfo.isFlaggedForRetention} (Expected: false)`);
if (danaInfo.isFlaggedForRetention !== false) throw new Error("Dana should NOT be flagged!");

console.log("\n=== Testing Debug Threshold Overrides (0d and 7d) ===");

// 5. Test 0d debug preset: Anyone without upcoming lessons is flagged for immediate local testing
const alice0d = getStudentInactivityInfo(studentOnBreakRecent, mockSessions, 0, NOW);
const bob0d = getStudentInactivityInfo(studentActiveNoRecentLessons, mockSessions, 0, NOW);
const charlie0d = getStudentInactivityInfo(studentWithUpcoming, mockSessions, 0, NOW);
console.log(`Debug 0d - Alice flagged: ${alice0d.isFlaggedForRetention} (Expected: true)`);
console.log(`Debug 0d - Bob flagged: ${bob0d.isFlaggedForRetention} (Expected: true)`);
console.log(`Debug 0d - Charlie flagged: ${charlie0d.isFlaggedForRetention} (Expected: false, has upcoming)`);

if (!alice0d.isFlaggedForRetention || !bob0d.isFlaggedForRetention || charlie0d.isFlaggedForRetention) {
  throw new Error("Debug 0d preset failed!");
}

// 6. Test 7d debug preset: Alice (15d) and Bob (120d) flagged, Dana (5d) and Charlie (upcoming) not flagged
const alice7d = getStudentInactivityInfo(studentOnBreakRecent, mockSessions, 7, NOW);
const dana7d = getStudentInactivityInfo(studentNewNoLessonsYet, mockSessions, 7, NOW);
console.log(`Debug 7d - Alice flagged: ${alice7d.isFlaggedForRetention} (Expected: true)`);
console.log(`Debug 7d - Dana flagged: ${dana7d.isFlaggedForRetention} (Expected: false)`);

if (!alice7d.isFlaggedForRetention || dana7d.isFlaggedForRetention) {
  throw new Error("Debug 7d preset failed!");
}

console.log("\n ALL INACTIVITY & BREAK POLICY RETENTION TESTS PASSED!");
