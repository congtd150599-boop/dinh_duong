-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "examinedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_examinedByUserId_fkey" FOREIGN KEY ("examinedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
