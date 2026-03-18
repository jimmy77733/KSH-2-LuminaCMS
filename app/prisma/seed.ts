import { PrismaClient } from "./../src/generated/prisma/client";
import bcrypt from "bcrypt";

// 使用 `any` 來繞過 Prisma 7 型別對建構子參數的嚴格限制，確保在 CLI / seed 腳本環境下能順利建立客製 PrismaClient。
const PrismaClientAny: any = PrismaClient;
const prisma: any = new PrismaClientAny();

async function main() {
  // 建立預設角色
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

  // 初始 Admin 帳號
  const adminPassword = "admin123"; // 可之後改為從環境變數讀取
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

