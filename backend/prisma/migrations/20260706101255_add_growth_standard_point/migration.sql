-- CreateTable
CREATE TABLE "GrowthStandardPoint" (
    "id" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "median" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthStandardPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrowthStandardPoint_gender_metric_months_key" ON "GrowthStandardPoint"("gender", "metric", "months");
