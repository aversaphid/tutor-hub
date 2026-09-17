try {
  process.loadEnvFile();
} catch {}

import { prisma } from "../lib/prisma";

async function test() {
  console.log("Testing Prisma Client connection through @prisma/adapter-libsql...");
  const users = await prisma.user.findMany();
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS "SystemSetting" ("key" TEXT PRIMARY KEY, "value" TEXT NOT NULL, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);'
  );
  console.log("✅ SystemSetting table created or verified!");
  await prisma.$executeRawUnsafe(
    'INSERT INTO "SystemSetting" ("key", "value", "updatedAt") VALUES (\'subwaySurfersEnabled\', \'true\', CURRENT_TIMESTAMP) ON CONFLICT("key") DO NOTHING;'
  );
  const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM "SystemSetting"');
  console.log("SystemSetting rows:", rows);
}

test().catch((e) => {
  console.error("Prisma test error:", e);
  process.exit(1);
});
