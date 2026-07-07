-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kcalPer100" DOUBLE PRECISION NOT NULL,
    "proteinPer100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbPer100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatPer100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "benefits" TEXT,
    "cautionNote" TEXT,
    "conditionTags" TEXT[],
    "source" TEXT,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Food_name_key" ON "Food"("name");
