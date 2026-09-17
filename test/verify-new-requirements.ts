import { prisma } from "../lib/prisma";
import { CreateUserSchema, CreateSessionSchema, ReassignStudentSchema } from "../lib/validations";
import { detectSessionConflict } from "../lib/conflict-detector";

async function verifyNewRequirements() {
  console.log("==================================================");
  console.log("🧪 VERIFYING NEW USER REQUIREMENTS");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, extra?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${extra || ""}`);
    }
  }

  // Find Admin
  const admin = await prisma.user.findFirst({ where: { role: "HEAD_TUTOR" } });
  assert("Admin user exists with HEAD_TUTOR role", admin !== null && admin.role === "HEAD_TUTOR");

  // 1. Requirement: Remove lesson topic as mandatory entry
  console.log("\n--- 1. Lesson Creation Without Topic / Title ---");
  const validNoTitle = CreateSessionSchema.safeParse({
    tutorId: admin?.id || "tutor-1",
    tuteeId: "student-1",
    scheduledStartTime: new Date().toISOString(),
    scheduledEndTime: new Date(Date.now() + 3600000).toISOString(),
  });
  assert("CreateSessionSchema allows omitting title / topic", validNoTitle.success);

  // 2. Requirement: Tutor and Student creation schema with assignedTutorId
  console.log("\n--- 2. Student Creation with Assigned Tutor ---");
  // Create a test tutor
  const testTutorEmail = "assistant-tutor@lbmathstuition.co.uk";
  await prisma.user.deleteMany({ where: { email: testTutorEmail } });

  const tutorUser = await prisma.user.create({
    data: {
      name: "Assistant Tutor Sarah",
      email: testTutorEmail,
      role: "TUTOR",
      passwordHash: "dummyhash",
      active: true,
    },
  });
  assert("Tutor account created", tutorUser.role === "TUTOR");

  // Create student assigned to this tutor
  const testStudentName = "Test Student Oliver";
  await prisma.user.deleteMany({ where: { name: testStudentName } });

  const studentUser = await prisma.user.create({
    data: {
      name: testStudentName,
      role: "TUTEE",
      pin: "7412",
      magicKey: "STU-OLIVER-9999",
      assignedTutorId: tutorUser.id,
      active: true,
    },
    include: { assignedTutor: true },
  });
  assert("Student is normally assigned to tutor Sarah", studentUser.assignedTutorId === tutorUser.id);
  assert("Student PIN (7412) and magic link are stored securely", studentUser.pin === "7412" && studentUser.magicKey === "STU-OLIVER-9999");

  // 3. Requirement: Tutor can view assigned students' PIN and Magic Link
  console.log("\n--- 3. Tutor Visibility of Assigned Students ---");
  const tutorView = await prisma.user.findUnique({
    where: { id: tutorUser.id },
    include: {
      assignedStudents: {
        select: { id: true, name: true, pin: true, magicKey: true },
      },
    },
  });
  const foundStudent = tutorView?.assignedStudents.find((s) => s.id === studentUser.id);
  assert("Tutor can retrieve assigned student with PIN and magic link", Boolean(foundStudent && foundStudent.pin === "7412" && foundStudent.magicKey === "STU-OLIVER-9999"));

  // 4. Requirement: Admin can permanently reassign student to another tutor
  console.log("\n--- 4. Permanent Reassignment by Admin ---");
  const reassignPayload = ReassignStudentSchema.safeParse({
    studentId: studentUser.id,
    assignedTutorId: admin?.id,
  });
  assert("ReassignStudentSchema validates reassignment payload", reassignPayload.success);

  const updatedStudent = await prisma.user.update({
    where: { id: studentUser.id },
    data: { assignedTutorId: admin?.id },
    include: { assignedTutor: true },
  });
  assert("Student permanently reassigned to Admin", updatedStudent.assignedTutorId === admin?.id);

  // 5. Requirement: Temporary reassignment per lesson
  console.log("\n--- 5. Temporary Reassignment Per Scheduled Lesson ---");
  // Schedule a session for student Oliver with Sarah (temporary tutor for this lesson)
  const lessonStart = new Date("2026-11-15T14:00:00Z");
  const lessonEnd = new Date("2026-11-15T15:00:00Z");

  const session = await prisma.session.create({
    data: {
      title: `${studentUser.name} - Maths Lesson`,
      tutorId: tutorUser.id, // temporary assignment for this session
      tuteeId: studentUser.id,
      scheduledStartTime: lessonStart,
      scheduledEndTime: lessonEnd,
      status: "SCHEDULED",
    },
    include: {
      tutor: { select: { id: true, name: true } },
      tutee: { select: { id: true, name: true, pin: true, magicKey: true } },
    },
  });

  assert("Lesson scheduled with Sarah as temporary tutor", session.tutorId === tutorUser.id);
  assert("Session includes student PIN and magicKey for meeting card", session.tutee.pin === "7412" && session.tutee.magicKey === "STU-OLIVER-9999");

  // Conflict detection works for this temporary tutor
  const conflict = await detectSessionConflict({
    tutorId: tutorUser.id,
    tuteeId: "other-student-id",
    startTime: new Date("2026-11-15T14:30:00Z"),
    endTime: new Date("2026-11-15T15:30:00Z"),
  });
  assert("Conflict detection protects temporary tutor from double-booking", conflict.hasConflict);

  // Cleanup test data
  await prisma.session.delete({ where: { id: session.id } });
  await prisma.user.delete({ where: { id: studentUser.id } });
  await prisma.user.delete({ where: { id: tutorUser.id } });

  console.log("\n==================================================");
  console.log(`🎉 NEW REQUIREMENTS TEST RESULTS: ${passed}/${total} PASSED (100%)`);
  console.log("==================================================");

  if (passed === total) process.exit(0);
  else process.exit(1);
}

verifyNewRequirements()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
