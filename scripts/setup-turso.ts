import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

try {
  process.loadEnvFile();
} catch {}

async function setup() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing in environment.");
  }

  console.log(`Connecting to Turso: ${url}...`);
  const client = createClient({ url, authToken });

  console.log("Applying database schema to Turso...");

  // 1. Create User table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "role" TEXT NOT NULL,
      "passwordHash" TEXT,
      "pin" TEXT,
      "magicKey" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "assignedTutorId" TEXT,
      "studentPay" REAL,
      "tutorPay" REAL,
      CONSTRAINT "User_assignedTutorId_fkey" FOREIGN KEY ("assignedTutorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  // Migrate existing User table if columns missing
  try {
    await client.execute(`ALTER TABLE "User" ADD COLUMN "studentPay" REAL;`);
  } catch {}
  try {
    await client.execute(`ALTER TABLE "User" ADD COLUMN "tutorPay" REAL;`);
  } catch {}

  // 2. Create Session table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Session" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL DEFAULT 'Maths Lesson',
      "tutorId" TEXT NOT NULL,
      "tuteeId" TEXT NOT NULL,
      "scheduledStartTime" DATETIME NOT NULL,
      "scheduledEndTime" DATETIME NOT NULL,
      "actualStartTime" DATETIME,
      "actualEndTime" DATETIME,
      "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
      "delayMinutes" INTEGER NOT NULL DEFAULT 0,
      "delayReason" TEXT,
      "teamsMeetingUrl" TEXT,
      "unlockEarlyMinutes" INTEGER NOT NULL DEFAULT 5,
      "notes" TEXT,
      "adminReminder" TEXT,
      "tutorConfirmed" BOOLEAN NOT NULL DEFAULT false,
      "tuteeConfirmed" BOOLEAN NOT NULL DEFAULT false,
      "tutorPaid" BOOLEAN NOT NULL DEFAULT false,
      "tutorPaidAt" DATETIME,
      "feedbackCovered" TEXT,
      "feedbackRating" INTEGER,
      "feedbackNotes" TEXT,
      "feedbackSubmittedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Session_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Session_tuteeId_fkey" FOREIGN KEY ("tuteeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  // Migrate existing Session table if columns missing
  try {
    await client.execute(`ALTER TABLE "Session" ADD COLUMN "unlockEarlyMinutes" INTEGER NOT NULL DEFAULT 5;`);
  } catch {}

  // 3. Create AuditLog table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "actorId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "details" TEXT,
      "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AuditLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  // 4. Create SystemSetting table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "SystemSetting" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Create Resource table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Resource" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "description" TEXT,
      "category" TEXT NOT NULL DEFAULT 'General',
      "createdById" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Resource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  // 6. Create Indexes
  await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);
  await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "User_magicKey_key" ON "User"("magicKey");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "User_pin_idx" ON "User"("pin");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "User_assignedTutorId_idx" ON "User"("assignedTutorId");`);

  await client.execute(`CREATE INDEX IF NOT EXISTS "Session_tutorId_idx" ON "Session"("tutorId");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "Session_tuteeId_idx" ON "Session"("tuteeId");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "Session_status_idx" ON "Session"("status");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "Session_scheduledStartTime_idx" ON "Session"("scheduledStartTime");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "Session_scheduledEndTime_idx" ON "Session"("scheduledEndTime");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "Session_tuteeId_status_idx" ON "Session"("tuteeId", "status");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "Session_tutorId_status_idx" ON "Session"("tutorId", "status");`);

  await client.execute(`CREATE INDEX IF NOT EXISTS "AuditLog_sessionId_idx" ON "AuditLog"("sessionId");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");`);

  await client.execute(`CREATE INDEX IF NOT EXISTS "Resource_category_idx" ON "Resource"("category");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "Resource_createdAt_idx" ON "Resource"("createdAt");`);
  await client.execute(`CREATE INDEX IF NOT EXISTS "Resource_createdById_idx" ON "Resource"("createdById");`);

  console.log("✅ All tables and indexes created on Turso.");

  // Check if admin user already exists
  const checkAdmin = await client.execute({
    sql: `SELECT * FROM "User" WHERE email = ?`,
    args: ["luke@lbmathstuition.co.uk"],
  });

  if (checkAdmin.rows.length === 0) {
    console.log("Seeding sole Admin account for Luke...");
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash("admin", salt);
    const adminId = "admin_" + Date.now();
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO "User" ("id", "name", "email", "role", "passwordHash", "active", "createdAt", "updatedAt") 
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [adminId, "Luke", "luke@lbmathstuition.co.uk", "HEAD_TUTOR", adminHash, now, now],
    });
    console.log("✅ Admin account created: Luke (luke@lbmathstuition.co.uk) (Password: admin)");
  } else {
    console.log("✅ Admin account already exists on Turso database.");
  }

  // Verify by reading back user count
  const countRes = await client.execute(`SELECT COUNT(*) as count FROM "User"`);
  console.log(`✅ Connection verified! Total users in Turso database: ${countRes.rows[0].count}`);
  console.log("\n🎉 TURSO DATABASE SETUP COMPLETE!");
}

setup().catch((e) => {
  console.error("❌ Turso setup error:", e);
  process.exit(1);
});
