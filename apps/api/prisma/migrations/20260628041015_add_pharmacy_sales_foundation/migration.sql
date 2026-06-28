-- CreateEnum
CREATE TYPE "PharmacySaleType" AS ENUM ('OTC', 'PRESCRIPTION');

-- CreateEnum
CREATE TYPE "PharmacySaleStatus" AS ENUM ('COMPLETED', 'VOIDED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PharmacyPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PharmacyPaymentMethod" AS ENUM ('CASH', 'CARD', 'YAPE', 'PLIN', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "PharmacyDocumentType" AS ENUM ('INTERNAL_SALE');

-- CreateTable
CREATE TABLE "PharmacyDocumentSequence" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "documentType" "PharmacyDocumentType" NOT NULL DEFAULT 'INTERNAL_SALE',
    "series" VARCHAR(10) NOT NULL,
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyDocumentSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacySale" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "saleNumber" VARCHAR(40) NOT NULL,
    "series" VARCHAR(10) NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "saleType" "PharmacySaleType" NOT NULL,
    "status" "PharmacySaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "patientId" UUID,
    "prescriptionId" UUID,
    "customerName" VARCHAR(180),
    "customerDocumentType" VARCHAR(20),
    "customerDocumentNumber" VARCHAR(30),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PEN',
    "subtotal" DECIMAL(14,4) NOT NULL,
    "discountTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,4) NOT NULL,
    "paymentStatus" "PharmacyPaymentStatus" NOT NULL DEFAULT 'PAID',
    "idempotencyKey" VARCHAR(180) NOT NULL,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacySale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacySaleItem" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "companyMedicationId" UUID NOT NULL,
    "prescriptionItemId" UUID,
    "companySku" VARCHAR(60),
    "genericName" VARCHAR(180) NOT NULL,
    "commercialName" VARCHAR(180),
    "concentration" VARCHAR(100),
    "presentation" VARCHAR(180) NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,4) NOT NULL,
    "total" DECIMAL(14,4) NOT NULL,
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
    "priceOverride" BOOLEAN NOT NULL DEFAULT false,
    "priceOverrideReason" TEXT,
    "priceApprovedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacySaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacySaleItemAllocation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "saleItemId" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "inventoryMovementId" UUID NOT NULL,
    "lotNumber" VARCHAR(100) NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,4),
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacySaleItemAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacySalePayment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "method" "PharmacyPaymentMethod" NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "reference" VARCHAR(100),
    "receivedAmount" DECIMAL(14,4),
    "changeAmount" DECIMAL(14,4),
    "idempotencyKey" VARCHAR(180) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacySalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PharmacyDocumentSequence_tenantId_companyId_businessUnitId__idx" ON "PharmacyDocumentSequence"("tenantId", "companyId", "businessUnitId", "warehouseId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyDocumentSequence_companyId_businessUnitId_warehouse_key" ON "PharmacyDocumentSequence"("companyId", "businessUnitId", "warehouseId", "documentType", "series");

-- CreateIndex
CREATE INDEX "PharmacySale_tenantId_companyId_businessUnitId_warehouseId__idx" ON "PharmacySale"("tenantId", "companyId", "businessUnitId", "warehouseId", "completedAt");

-- CreateIndex
CREATE INDEX "PharmacySale_tenantId_patientId_completedAt_idx" ON "PharmacySale"("tenantId", "patientId", "completedAt");

-- CreateIndex
CREATE INDEX "PharmacySale_tenantId_prescriptionId_idx" ON "PharmacySale"("tenantId", "prescriptionId");

-- CreateIndex
CREATE INDEX "PharmacySale_tenantId_status_completedAt_idx" ON "PharmacySale"("tenantId", "status", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacySale_tenantId_idempotencyKey_key" ON "PharmacySale"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacySale_companyId_saleNumber_key" ON "PharmacySale"("companyId", "saleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacySale_companyId_businessUnitId_warehouseId_series_se_key" ON "PharmacySale"("companyId", "businessUnitId", "warehouseId", "series", "sequenceNumber");

-- CreateIndex
CREATE INDEX "PharmacySaleItem_tenantId_saleId_idx" ON "PharmacySaleItem"("tenantId", "saleId");

-- CreateIndex
CREATE INDEX "PharmacySaleItem_tenantId_medicationId_createdAt_idx" ON "PharmacySaleItem"("tenantId", "medicationId", "createdAt");

-- CreateIndex
CREATE INDEX "PharmacySaleItem_tenantId_prescriptionItemId_idx" ON "PharmacySaleItem"("tenantId", "prescriptionItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacySaleItemAllocation_inventoryMovementId_key" ON "PharmacySaleItemAllocation"("inventoryMovementId");

-- CreateIndex
CREATE INDEX "PharmacySaleItemAllocation_tenantId_saleItemId_idx" ON "PharmacySaleItemAllocation"("tenantId", "saleItemId");

-- CreateIndex
CREATE INDEX "PharmacySaleItemAllocation_tenantId_lotId_createdAt_idx" ON "PharmacySaleItemAllocation"("tenantId", "lotId", "createdAt");

-- CreateIndex
CREATE INDEX "PharmacySalePayment_tenantId_saleId_paidAt_idx" ON "PharmacySalePayment"("tenantId", "saleId", "paidAt");

-- CreateIndex
CREATE INDEX "PharmacySalePayment_tenantId_method_paidAt_idx" ON "PharmacySalePayment"("tenantId", "method", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacySalePayment_tenantId_idempotencyKey_key" ON "PharmacySalePayment"("tenantId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "PharmacyDocumentSequence" ADD CONSTRAINT "PharmacyDocumentSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyDocumentSequence" ADD CONSTRAINT "PharmacyDocumentSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyDocumentSequence" ADD CONSTRAINT "PharmacyDocumentSequence_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyDocumentSequence" ADD CONSTRAINT "PharmacyDocumentSequence_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySaleItem" ADD CONSTRAINT "PharmacySaleItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySaleItem" ADD CONSTRAINT "PharmacySaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PharmacySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySaleItem" ADD CONSTRAINT "PharmacySaleItem_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySaleItem" ADD CONSTRAINT "PharmacySaleItem_companyMedicationId_fkey" FOREIGN KEY ("companyMedicationId") REFERENCES "CompanyMedication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySaleItem" ADD CONSTRAINT "PharmacySaleItem_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "PrescriptionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySaleItem" ADD CONSTRAINT "PharmacySaleItem_priceApprovedById_fkey" FOREIGN KEY ("priceApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySaleItemAllocation" ADD CONSTRAINT "PharmacySaleItemAllocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySaleItemAllocation" ADD CONSTRAINT "PharmacySaleItemAllocation_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "PharmacySaleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySaleItemAllocation" ADD CONSTRAINT "PharmacySaleItemAllocation_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "MedicationInventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySaleItemAllocation" ADD CONSTRAINT "PharmacySaleItemAllocation_inventoryMovementId_fkey" FOREIGN KEY ("inventoryMovementId") REFERENCES "MedicationInventoryMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySalePayment" ADD CONSTRAINT "PharmacySalePayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySalePayment" ADD CONSTRAINT "PharmacySalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PharmacySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySalePayment" ADD CONSTRAINT "PharmacySalePayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- HCELM_PHARMACY_SALES_INTEGRITY_CONSTRAINTS

ALTER TABLE "PharmacyDocumentSequence"
ADD CONSTRAINT "PharmacyDocumentSequence_currentNumber_check"
CHECK ("currentNumber" >= 0);

ALTER TABLE "PharmacySale"
ADD CONSTRAINT "PharmacySale_sequenceNumber_check"
CHECK ("sequenceNumber" > 0);

ALTER TABLE "PharmacySale"
ADD CONSTRAINT "PharmacySale_amounts_check"
CHECK (
  "subtotal" >= 0
  AND "discountTotal" >= 0
  AND "discountTotal" <= "subtotal"
  AND "taxTotal" >= 0
  AND "total" >= 0
);

ALTER TABLE "PharmacySale"
ADD CONSTRAINT "PharmacySale_prescription_check"
CHECK (
  "saleType" <> 'PRESCRIPTION'
  OR "prescriptionId" IS NOT NULL
);

ALTER TABLE "PharmacySale"
ADD CONSTRAINT "PharmacySale_void_check"
CHECK (
  ("status" = 'VOIDED' AND "voidedAt" IS NOT NULL AND "voidedById" IS NOT NULL AND NULLIF(BTRIM("voidReason"), '') IS NOT NULL)
  OR ("status" <> 'VOIDED' AND "voidedAt" IS NULL AND "voidedById" IS NULL AND "voidReason" IS NULL)
);

ALTER TABLE "PharmacySaleItem"
ADD CONSTRAINT "PharmacySaleItem_quantity_check"
CHECK ("quantity" > 0);

ALTER TABLE "PharmacySaleItem"
ADD CONSTRAINT "PharmacySaleItem_discountPercent_check"
CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100);

ALTER TABLE "PharmacySaleItem"
ADD CONSTRAINT "PharmacySaleItem_amounts_check"
CHECK (
  "unitPrice" >= 0
  AND "discountAmount" >= 0
  AND "taxAmount" >= 0
  AND "subtotal" >= 0
  AND "total" >= 0
  AND "discountAmount" <= "subtotal"
);

ALTER TABLE "PharmacySaleItem"
ADD CONSTRAINT "PharmacySaleItem_priceOverride_check"
CHECK (
  "priceOverride" = false
  OR (
    NULLIF(BTRIM("priceOverrideReason"), '') IS NOT NULL
    AND "priceApprovedById" IS NOT NULL
  )
);

ALTER TABLE "PharmacySaleItemAllocation"
ADD CONSTRAINT "PharmacySaleItemAllocation_quantity_check"
CHECK ("quantity" > 0);

ALTER TABLE "PharmacySaleItemAllocation"
ADD CONSTRAINT "PharmacySaleItemAllocation_prices_check"
CHECK (
  ("unitCost" IS NULL OR "unitCost" >= 0)
  AND "unitPrice" >= 0
);

ALTER TABLE "PharmacySalePayment"
ADD CONSTRAINT "PharmacySalePayment_amount_check"
CHECK (
  "amount" > 0
  AND ("receivedAmount" IS NULL OR "receivedAmount" >= "amount")
  AND ("changeAmount" IS NULL OR "changeAmount" >= 0)
);

