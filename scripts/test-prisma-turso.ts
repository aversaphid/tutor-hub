try {
  process.loadEnvFile();
} catch {}

import { prisma } from "../lib/prisma";

async function test() {
  console.log("Testing Prisma Client connection through @prisma/adapter-libsql...");
  const users = await prisma.user.findMany();
  console.log("Found users via Prisma:", users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
  console.log("✅ SUCCESS: Prisma Client successfully connects and queries Turso database!");
}

test().catch((e) => {
  console.error("Prisma test error:", e);
  process.exit(1);
});
