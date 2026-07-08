-- CreateTable
CREATE TABLE "ReportEmailLog" (
    "id" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "guardianId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "ReportEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportEmailLog_childId_idx" ON "ReportEmailLog"("childId");

-- CreateIndex
CREATE INDEX "ReportEmailLog_patientId_idx" ON "ReportEmailLog"("patientId");

-- AddForeignKey
ALTER TABLE "ReportEmailLog" ADD CONSTRAINT "ReportEmailLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportEmailLog" ADD CONSTRAINT "ReportEmailLog_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
