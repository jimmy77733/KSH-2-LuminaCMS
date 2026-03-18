import { PrismaClient as GeneratedPrismaClient } from "@/generated/prisma/client";

// Prisma 7 的產生 client 採用自訂 output，這裡統一包成 singleton，並用 any 避免建構子型別過於嚴格造成噪音。
const PrismaClientAny: any = GeneratedPrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma?: any;
};

export const prisma: any =
  globalForPrisma.prisma ?? new PrismaClientAny();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

