import { PrismaClient } from "@/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const DB_PATH = path.resolve("data/skillforge.db");

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3(DB_PATH);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
