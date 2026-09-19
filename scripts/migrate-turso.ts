import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

// Simple .env reader
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

async function migrate() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoAuthToken) {
    console.log("No Turso credentials found, skipping Turso migration.");
    return;
  }

  console.log("Connecting to Turso:", tursoUrl);
  const client = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
  });

  console.log("Creating TutorUnavailability table on Turso if not exists...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "TutorUnavailability" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tutorId" TEXT NOT NULL,
      "startTime" DATETIME NOT NULL,
      "endTime" DATETIME NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'BUSY',
      "reason" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TutorUnavailability_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS "TutorUnavailability_tutorId_startTime_endTime_idx" 
    ON "TutorUnavailability"("tutorId", "startTime", "endTime");
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS "TutorUnavailability_startTime_endTime_idx" 
    ON "TutorUnavailability"("startTime", "endTime");
  `);

  console.log("✓ Turso migration applied successfully!");
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
