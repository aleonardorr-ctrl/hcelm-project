-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "chronicDiseases" TEXT,
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "usualMedication" TEXT;

-- CreateIndex
CREATE INDEX "Patient_tenantId_idx" ON "Patient"("tenantId");

-- CreateIndex
CREATE INDEX "Patient_documentNumber_idx" ON "Patient"("documentNumber");

-- CreateIndex
CREATE INDEX "Patient_fullName_idx" ON "Patient"("fullName");
