import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaReady?: Promise<void>;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

export async function ensureDatabaseReady() {
  if (!globalForPrisma.prismaReady) {
    globalForPrisma.prismaReady = (async () => {
      if ((process.env.DATABASE_URL ?? "").includes("file:")) {
        await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
        await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
        await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
      }
    })().catch((error) => {
      globalForPrisma.prismaReady = undefined;
      throw error;
    });
  }

  await globalForPrisma.prismaReady;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
