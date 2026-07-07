-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "childId" TEXT;

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Child_name_idx" ON "Child"("name");

-- CreateIndex
CREATE INDEX "Patient_childId_idx" ON "Patient"("childId");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;
