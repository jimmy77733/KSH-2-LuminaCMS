// Prisma seed script (CommonJS, avoids TS/ESM 相容性問題)
/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const [adminRole, editorRole, viewerRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: "Admin" },
      update: {},
      create: { name: "Admin" },
    }),
    prisma.role.upsert({
      where: { name: "Editor" },
      update: {},
      create: { name: "Editor" },
    }),
    prisma.role.upsert({
      where: { name: "Viewer" },
      update: {},
      create: { name: "Viewer" },
    }),
  ]);

  const adminPassword = "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      roleId: adminRole.id,
    },
  });

  console.log("Seed completed: roles and initial admin user created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

