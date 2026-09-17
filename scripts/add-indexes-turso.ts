import { createClient } from "@libsql/client";

try {
  process.loadEnvFile();
} catch {}

async function run() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.log("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not set. Skipping Turso index migration.");
    return;
  }

  console.log(`Applying performance indexes to Turso database: ${url}...`);
  const client = createClient({ url, authToken });

  const indexStatements = [
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_magicKey_key" ON "User"("magicKey");`,
    `CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");`,
    `CREATE INDEX IF NOT EXISTS "User_pin_idx" ON "User"("pin");`,
    `CREATE INDEX IF NOT EXISTS "User_assignedTutorId_idx" ON "User"("assignedTutorId");`,
    `CREATE INDEX IF NOT EXISTS "Session_tutorId_idx" ON "Session"("tutorId");`,
    `CREATE INDEX IF NOT EXISTS "Session_tuteeId_idx" ON "Session"("tuteeId");`,
    `CREATE INDEX IF NOT EXISTS "Session_status_idx" ON "Session"("status");`,
    `CREATE INDEX IF NOT EXISTS "Session_scheduledStartTime_idx" ON "Session"("scheduledStartTime");`,
    `CREATE INDEX IF NOT EXISTS "Session_scheduledEndTime_idx" ON "Session"("scheduledEndTime");`,
    `CREATE INDEX IF NOT EXISTS "Session_tuteeId_status_idx" ON "Session"("tuteeId", "status");`,
    `CREATE INDEX IF NOT EXISTS "Session_tutorId_status_idx" ON "Session"("tutorId", "status");`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_sessionId_idx" ON "AuditLog"("sessionId");`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");`,
  ];

  for (const sql of indexStatements) {
    await client.execute(sql);
  }

  console.log("✅ All performance indexes successfully ensured on Turso!");
}

run().catch((err) => {
  console.error("Failed to add indexes:", err);
});
