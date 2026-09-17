import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding clean LB Maths Tuition database...");

  // Clean all existing records
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash("admin", salt);

  // Sole admin account for Luke
  await prisma.user.create({
    data: {
      name: "Admin",
      email: "luke@lbmathstuition.co.uk",
      role: Role.HEAD_TUTOR,
      passwordHash: adminHash,
      active: true,
    },
  });

  console.log("Database initialized cleanly with admin account: luke@lbmathstuition.co.uk");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
