try {
  process.loadEnvFile();
} catch {}

import { prisma } from "../lib/prisma";

async function test() {
  console.log("Testing Prisma Client connection through @prisma/adapter-libsql...");
  await prisma.user.updateMany({
    where: {
      OR: [
        { email: "luke@lbmathstuition.co.uk" },
        { role: "HEAD_TUTOR" }
      ]
    },
    data: { name: "Luke" }
  });
  console.log("✅ Updated admin name to 'Luke'!");
  const updatedUsers = await prisma.user.findMany();
  console.log("Users in DB:", updatedUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
}

test().catch((e) => {
  console.error("Prisma test error:", e);
  process.exit(1);
});
