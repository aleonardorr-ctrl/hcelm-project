-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "masterCode" VARCHAR(60);

-- AlterTable
ALTER TABLE "MedicationInventoryLot" ADD COLUMN     "locationNotes" VARCHAR(255),
ADD COLUMN     "shelfCode" VARCHAR(60),
ADD COLUMN     "shelfLevel" VARCHAR(60);

-- CreateIndex
CREATE INDEX "Medication_tenantId_masterCode_idx" ON "Medication"("tenantId", "masterCode");

-- CreateIndex
CREATE INDEX "MedicationInventoryLot_tenantId_businessUnit_warehouse_shel_idx" ON "MedicationInventoryLot"("tenantId", "businessUnit", "warehouse", "shelfCode", "shelfLevel");
