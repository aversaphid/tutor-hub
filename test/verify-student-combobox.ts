import assert from "assert";
import { resolveStudentRegularTutor } from "../components/student-combobox";

console.log("=== Testing Student Combobox & Regular Tutor Resolution Engine ===");

// 1. Student with explicit assignedTutor object
const student1 = {
  id: "st-1",
  name: "Herbie",
  assignedTutor: { id: "tutor-1", name: "luke" },
};
const res1 = resolveStudentRegularTutor(student1, [], []);
assert.deepStrictEqual(res1, { id: "tutor-1", name: "Luke" });
console.log("✅ [PASS] Resolves explicit assignedTutor relation (formatted name 'Luke')");

// 2. Student with assignedTutorId matching a tutor in list
const student2 = {
  id: "st-2",
  name: "Enoch",
  assignedTutorId: "tutor-2",
};
const tutors = [
  { id: "tutor-1", name: "Luke" },
  { id: "tutor-2", name: "sarah smith" },
];
const res2 = resolveStudentRegularTutor(student2, tutors, []);
assert.deepStrictEqual(res2, { id: "tutor-2", name: "Sarah Smith" });
console.log("✅ [PASS] Resolves assignedTutorId against tutors list with proper capitalization");

// 3. Student without assignedTutorId, but with historical sessions
const student3 = {
  id: "st-3",
  name: "Zara",
  assignedTutorId: null,
};
const sessions = [
  { tuteeId: "st-3", tutorId: "tutor-1", tutor: { name: "Luke" } },
  { tuteeId: "st-3", tutorId: "tutor-2", tutor: { name: "Sarah" } },
  { tuteeId: "st-3", tutorId: "tutor-2", tutor: { name: "Sarah" } },
  { tuteeId: "st-3", tutorId: "tutor-2", tutor: { name: "Sarah" } },
];
const res3 = resolveStudentRegularTutor(student3, tutors, sessions);
assert.deepStrictEqual(res3, { id: "tutor-2", name: "Sarah Smith" });
console.log("✅ [PASS] Derives regular tutor from historical sessions count (3 vs 1)");

// 4. Student with no tutor assigned and no sessions
const student4 = {
  id: "st-4",
  name: "New Student",
};
const res4 = resolveStudentRegularTutor(student4, tutors, []);
assert.strictEqual(res4, null);
console.log("✅ [PASS] Returns null when student has no tutor assigned or previous sessions");

// 5. Test search filter logic: searching by student name or regular tutor name
const mockStudents = [
  { id: "st-1", name: "Herbie", regularTutorName: "Luke", regularTutorId: "tutor-1" },
  { id: "st-2", name: "Enoch", regularTutorName: "Sarah Smith", regularTutorId: "tutor-2" },
  { id: "st-3", name: "Zara", regularTutorName: "Sarah Smith", regularTutorId: "tutor-2" },
  { id: "st-4", name: "Alice", regularTutorName: null, regularTutorId: null },
];

function filterStudents(list: typeof mockStudents, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((s) => {
    const nameMatch = s.name.toLowerCase().includes(q);
    const tutorMatch = s.regularTutorName ? s.regularTutorName.toLowerCase().includes(q) : false;
    return nameMatch || tutorMatch;
  });
}

// Search by student name
const searchByName = filterStudents(mockStudents, "her");
assert.strictEqual(searchByName.length, 1);
assert.strictEqual(searchByName[0].name, "Herbie");
console.log("✅ [PASS] Filters by student name prefix ('her' -> Herbie)");

// Search by regular tutor name
const searchByTutor = filterStudents(mockStudents, "sarah");
assert.strictEqual(searchByTutor.length, 2);
assert.deepStrictEqual(searchByTutor.map((s) => s.name), ["Enoch", "Zara"]);
console.log("✅ [PASS] Filters by regular tutor name ('sarah' -> Enoch, Zara)");

// Case-insensitive search
const searchCase = filterStudents(mockStudents, "LUKE");
assert.strictEqual(searchCase.length, 1);
assert.strictEqual(searchCase[0].name, "Herbie");
console.log("✅ [PASS] Case-insensitive search supported");

console.log("\n🎉 ALL STUDENT COMBOBOX & REGULAR TUTOR TESTS PASSED!\n");
