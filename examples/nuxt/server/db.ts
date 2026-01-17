// https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
import { PGlite } from "@electric-sql/pglite";
import { PrismaClient } from "@prisma/client";
import { resolve } from "pathe";
import { PrismaPGlite } from "pglite-prisma-adapter";

const prismaClientSingleton = () => {
  const client = new PGlite(
    resolve(process.env.DATABASE_URL ?? "./prisma/pgdata")
  );
  const adapter = new PrismaPGlite(client);
  return new PrismaClient({
    adapter,
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
