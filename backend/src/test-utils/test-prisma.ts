import { PrismaClient } from '@prisma/client';

/** A PrismaClient pointed at DATABASE_URL_TEST (a separate database — see docker/README.md). */
export const testPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

export async function truncateAllTables(): Promise<void> {
  await testPrisma.$executeRawUnsafe('TRUNCATE TABLE "Patient", "GrowthStandardPoint", "User" RESTART IDENTITY CASCADE;');
}
