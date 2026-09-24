import assert from "assert";

interface StudentMock {
  id: string;
  name: string;
  active: boolean;
}

function filterStudentsByStatus(
  students: StudentMock[],
  filter: "ALL" | "ACTIVE" | "INACTIVE"
): StudentMock[] {
  return students.filter((st) => {
    if (filter === "ACTIVE" && st.active === false) return false;
    if (filter === "INACTIVE" && st.active !== false) return false;
    return true;
  });
}

function getDeletionFlagMetadata(student: StudentMock) {
  if (student.active === false) {
    return {
      flaggedForDeletion: true,
      reason: "Inactive student profile flagged for permanent erasure per UK GDPR Art. 5(1)(e) & Terms/Privacy Policy",
      label: "Flagged for Deletion",
    };
  }
  return {
    flaggedForDeletion: false,
    label: "Active",
  };
}

async function runTests() {
  console.log("--- Testing Inactive Student Deletion Flag & Policy Filtering ---");

  const students: StudentMock[] = [
    { id: "s1", name: "Alice Active", active: true },
    { id: "s2", name: "Bob Inactive", active: false },
    { id: "s3", name: "Charlie Active", active: true },
    { id: "s4", name: "Daisy Inactive", active: false },
  ];

  // 1. Verify ALL filter
  const allList = filterStudentsByStatus(students, "ALL");
  assert.strictEqual(allList.length, 4);

  // 2. Verify ACTIVE filter
  const activeList = filterStudentsByStatus(students, "ACTIVE");
  assert.strictEqual(activeList.length, 2);
  assert(activeList.every((s) => s.active === true));

  // 3. Verify INACTIVE filter
  const inactiveList = filterStudentsByStatus(students, "INACTIVE");
  assert.strictEqual(inactiveList.length, 2);
  assert(inactiveList.every((s) => s.active === false));

  // 4. Verify Flag metadata on inactive vs active
  const bobFlag = getDeletionFlagMetadata(students[1]);
  assert.strictEqual(bobFlag.flaggedForDeletion, true);
  assert.strictEqual(bobFlag.label, "Flagged for Deletion");

  const aliceFlag = getDeletionFlagMetadata(students[0]);
  assert.strictEqual(aliceFlag.flaggedForDeletion, false);
  assert.strictEqual(aliceFlag.label, "Active");

  console.log("✓ Inactive student deletion flag logic verified");
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
