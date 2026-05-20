import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Uncomment the next line if you want to see Prisma queries in the console
    // log: ['query'],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
