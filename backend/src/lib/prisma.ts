import { PrismaClient } from "@/generated/prisma";

// Globally patch BigInt serialization to prevent JSON.stringify errors
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// NOTE: Do NOT call prisma.$connect() here.
// Prisma connects lazily on the first query, which is the correct behaviour
// when using pgBouncer in transaction-pooling mode. Eagerly calling $connect()
// competes with real requests for the single connection slot during cold starts
// and causes spurious P2024 timeouts.

export default prisma;
