-- CreateTable
CREATE TABLE "LabReferenceRange" (
    "id" TEXT NOT NULL,
    "testKey" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "minMonths" INTEGER NOT NULL,
    "maxMonths" INTEGER NOT NULL,
    "lowSevere" DOUBLE PRECISION,
    "lowDeficit" DOUBLE PRECISION,
    "highBorderline" DOUBLE PRECISION,
    "highExcess" DOUBLE PRECISION,
    "highInclusive" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabReferenceRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabReferenceRange_testKey_gender_minMonths_maxMonths_key" ON "LabReferenceRange"("testKey", "gender", "minMonths", "maxMonths");
