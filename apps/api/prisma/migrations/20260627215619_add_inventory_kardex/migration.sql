-- CreateEnum
CREATE TYPE "MedicationInventoryMovementType" AS ENUM ('INITIAL_STOCK', 'PURCHASE', 'SALE', 'PRESCRIPTION_DISPENSING', 'POSITIVE_ADJUSTMENT', 'NEGATIVE_ADJUSTMENT', 'CUSTOMER_RETURN', 'SUPPLIER_RETURN', 'TRANSFER_IN', 'TRANSFER_OUT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "MedicationInventoryMovementDirection" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "MedicationInventoryMovement" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "companyMedicationId" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "movementType" "MedicationInventoryMovementType" NOT NULL,
    "direction" "MedicationInventoryMovementDirection" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "stockBefore" DECIMAL(14,3) NOT NULL,
    "stockAfter" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,4),
    "unitPrice" DECIMAL(14,4),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PEN',
    "operationId" UUID NOT NULL,
    "idempotencyKey" VARCHAR(180) NOT NULL,
    "sourceType" VARCHAR(40),
    "sourceId" VARCHAR(100),
    "sourceLineId" VARCHAR(100),
    "documentType" VARCHAR(40),
    "documentNumber" VARCHAR(100),
    "reason" TEXT,
    "metadata" JSONB,
    "reversalOfId" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationInventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicationInventoryMovement_reversalOfId_key" ON "MedicationInventoryMovement"("reversalOfId");

-- CreateIndex
CREATE INDEX "MedicationInventoryMovement_tenantId_companyId_warehouseId__idx" ON "MedicationInventoryMovement"("tenantId", "companyId", "warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicationInventoryMovement_tenantId_medicationId_createdAt_idx" ON "MedicationInventoryMovement"("tenantId", "medicationId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicationInventoryMovement_tenantId_lotId_createdAt_idx" ON "MedicationInventoryMovement"("tenantId", "lotId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicationInventoryMovement_tenantId_operationId_idx" ON "MedicationInventoryMovement"("tenantId", "operationId");

-- CreateIndex
CREATE INDEX "MedicationInventoryMovement_tenantId_sourceType_sourceId_idx" ON "MedicationInventoryMovement"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationInventoryMovement_tenantId_idempotencyKey_key" ON "MedicationInventoryMovement"("tenantId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "MedicationInventoryMovement" ADD CONSTRAINT "MedicationInventoryMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryMovement" ADD CONSTRAINT "MedicationInventoryMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryMovement" ADD CONSTRAINT "MedicationInventoryMovement_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryMovement" ADD CONSTRAINT "MedicationInventoryMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryMovement" ADD CONSTRAINT "MedicationInventoryMovement_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryMovement" ADD CONSTRAINT "MedicationInventoryMovement_companyMedicationId_fkey" FOREIGN KEY ("companyMedicationId") REFERENCES "CompanyMedication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryMovement" ADD CONSTRAINT "MedicationInventoryMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "MedicationInventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryMovement" ADD CONSTRAINT "MedicationInventoryMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryMovement" ADD CONSTRAINT "MedicationInventoryMovement_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "MedicationInventoryMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- HCELM_KARDEX_INITIAL_BALANCES
INSERT INTO "MedicationInventoryMovement" (
  "id",
  "tenantId",
  "companyId",
  "businessUnitId",
  "warehouseId",
  "medicationId",
  "companyMedicationId",
  "lotId",
  "movementType",
  "direction",
  "quantity",
  "stockBefore",
  "stockAfter",
  "unitCost",
  "unitPrice",
  "currency",
  "operationId",
  "idempotencyKey",
  "sourceType",
  "sourceId",
  "reason",
  "createdById",
  "createdAt"
)
SELECT
  gen_random_uuid(),
  lot."tenantId",
  lot."companyId",
  lot."businessUnitId",
  lot."warehouseId",
  lot."medicationId",
  lot."companyMedicationId",
  lot."id",
  'INITIAL_STOCK',
  'IN',
  lot."stock",
  0,
  lot."stock",
  lot."purchasePrice",
  lot."salePrice",
  lot."currency",
  gen_random_uuid(),
  'LEGACY_INITIAL_STOCK:' || lot."id"::text,
  'LEGACY_MIGRATION',
  lot."id"::text,
  'Saldo inicial migrado al crear Kardex',
  lot."createdById",
  CURRENT_TIMESTAMP
FROM "MedicationInventoryLot" lot
WHERE lot."stock" > 0
ON CONFLICT ("tenantId", "idempotencyKey") DO NOTHING;

-- HCELM_KARDEX_INTEGRITY_CONSTRAINTS
ALTER TABLE "MedicationInventoryMovement"
  ADD CONSTRAINT "MedicationInventoryMovement_quantity_positive_chk"
    CHECK ("quantity" > 0),
  ADD CONSTRAINT "MedicationInventoryMovement_stock_before_nonnegative_chk"
    CHECK ("stockBefore" >= 0),
  ADD CONSTRAINT "MedicationInventoryMovement_stock_after_nonnegative_chk"
    CHECK ("stockAfter" >= 0),
  ADD CONSTRAINT "MedicationInventoryMovement_stock_arithmetic_chk"
    CHECK (
      ("direction" = 'IN' AND "stockAfter" = "stockBefore" + "quantity")
      OR
      ("direction" = 'OUT' AND "stockAfter" = "stockBefore" - "quantity")
    ),
  ADD CONSTRAINT "MedicationInventoryMovement_not_self_reversal_chk"
    CHECK ("reversalOfId" IS NULL OR "reversalOfId" <> "id");
