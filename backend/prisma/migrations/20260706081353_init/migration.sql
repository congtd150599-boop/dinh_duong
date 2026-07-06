-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "muac" DOUBLE PRECISION,
    "revisit" TIMESTAMP(3),
    "tuvan" TEXT NOT NULL,
    "labCa" DOUBLE PRECISION,
    "labVitD" DOUBLE PRECISION,
    "labZn" DOUBLE PRECISION,
    "labHb" DOUBLE PRECISION,
    "labFe" DOUBLE PRECISION,
    "labFerritin" DOUBLE PRECISION,
    "labChol" DOUBLE PRECISION,
    "labTg" DOUBLE PRECISION,
    "months" INTEGER NOT NULL,
    "bmi" DOUBLE PRECISION NOT NULL,
    "wfa" TEXT NOT NULL,
    "hfa" TEXT NOT NULL,
    "wfh" TEXT NOT NULL,
    "muacStatus" TEXT,
    "stdEnergy" INTEGER NOT NULL,
    "targetEnergy" INTEGER NOT NULL,
    "carbG" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "lipidG" INTEGER NOT NULL,
    "labAssessmentSummary" TEXT NOT NULL,
    "fullResult" JSONB NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Patient_examDate_idx" ON "Patient"("examDate");

-- CreateIndex
CREATE INDEX "Patient_name_idx" ON "Patient"("name");
