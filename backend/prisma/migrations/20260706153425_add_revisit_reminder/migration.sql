-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "guardianEmail" TEXT,
ADD COLUMN     "revisitReminderSentAt" TIMESTAMP(3);
