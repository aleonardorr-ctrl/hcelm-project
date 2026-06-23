/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,internalCode]` on the table `Medication` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "atcCode" VARCHAR(30),
ADD COLUMN     "barcode" VARCHAR(80),
ADD COLUMN     "coldChain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "controlled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdById" UUID,
ADD COLUMN     "internalCode" VARCHAR(50),
ADD COLUMN     "laboratory" VARCHAR(180),
ADD COLUMN     "manufacturer" VARCHAR(180),
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "pharmaceuticalForm" VARCHAR(150),
ADD COLUMN     "pnumCode" VARCHAR(50),
ADD COLUMN     "productType" VARCHAR(40) NOT NULL DEFAULT 'MEDICAMENTO',
ADD COLUMN     "registrationHolder" VARCHAR(180),
ADD COLUMN     "requiresPrescription" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sanitaryRegistration" VARCHAR(100),
ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "source" VARCHAR(255),
ADD COLUMN     "taxable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "unitMeasure" VARCHAR(80);

-- CreateTable
CREATE TABLE "MedicationInventoryLot" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "businessUnit" VARCHAR(30) NOT NULL DEFAULT 'FARMACIA',
    "warehouse" VARCHAR(100) NOT NULL DEFAULT 'PRINCIPAL',
    "lotNumber" VARCHAR(100) NOT NULL DEFAULT 'SIN_LOTE',
    "expirationDate" TIMESTAMP(3),
    "stock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "minimumStock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "purchasePrice" DECIMAL(14,4),
    "salePrice" DECIMAL(14,4),
    "wholesalePrice" DECIMAL(14,4),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PEN',
    "supplier" VARCHAR(180),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" VARCHAR(255),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationInventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicationInventoryLot_tenantId_businessUnit_warehouse_acti_idx" ON "MedicationInventoryLot"("tenantId", "businessUnit", "warehouse", "active");

-- CreateIndex
CREATE INDEX "MedicationInventoryLot_tenantId_expirationDate_idx" ON "MedicationInventoryLot"("tenantId", "expirationDate");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationInventoryLot_tenantId_medicationId_businessUnit_w_key" ON "MedicationInventoryLot"("tenantId", "medicationId", "businessUnit", "warehouse", "lotNumber");

-- CreateIndex
CREATE INDEX "Medication_tenantId_active_productType_idx" ON "Medication"("tenantId", "active", "productType");

-- CreateIndex
CREATE INDEX "Medication_tenantId_barcode_idx" ON "Medication"("tenantId", "barcode");

-- CreateIndex
CREATE INDEX "Medication_tenantId_genericName_idx" ON "Medication"("tenantId", "genericName");

-- CreateIndex
CREATE INDEX "Medication_tenantId_commercialName_idx" ON "Medication"("tenantId", "commercialName");

-- CreateIndex
CREATE UNIQUE INDEX "Medication_tenantId_internalCode_key" ON "Medication"("tenantId", "internalCode");

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryLot" ADD CONSTRAINT "MedicationInventoryLot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryLot" ADD CONSTRAINT "MedicationInventoryLot_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryLot" ADD CONSTRAINT "MedicationInventoryLot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
