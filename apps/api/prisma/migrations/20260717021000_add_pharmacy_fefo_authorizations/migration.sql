CREATE TYPE "PharmacyFefoAuthorizationStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'CONSUMED',
  'CANCELLED'
);

CREATE TABLE "PharmacyFefoAuthorization" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "businessUnitId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "medicationId" UUID NOT NULL,
  "companyMedicationId" UUID NOT NULL,
  "lotId" UUID NOT NULL,
  "requestedById" UUID NOT NULL,
  "requestedQuantity" DECIMAL(14,3) NOT NULL,
  "requestReason" TEXT NOT NULL,
  "status" "PharmacyFefoAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
  "ruleKey" VARCHAR(30) NOT NULL DEFAULT 'CRITICAL',
  "daysToExpireAtRequest" INTEGER NOT NULL,
  "lotNumber" VARCHAR(100) NOT NULL,
  "expirationDate" TIMESTAMP(3) NOT NULL,
  "stockAtRequest" DECIMAL(14,3) NOT NULL,
  "approvedById" UUID,
  "approvalReason" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedById" UUID,
  "rejectionReason" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "authorizationTokenHash" VARCHAR(128),
  "validUntil" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "consumedBySaleId" UUID,
  "cancelledAt" TIMESTAMP(3),
  "cancelledById" UUID,
  "cancellationReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PharmacyFefoAuthorization_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PharmacyFefoAuthorization_scope_status_created_idx"
ON "PharmacyFefoAuthorization"(
  "tenantId",
  "companyId",
  "businessUnitId",
  "status",
  "createdAt"
);

CREATE INDEX "PharmacyFefoAuthorization_requester_status_idx"
ON "PharmacyFefoAuthorization"(
  "tenantId",
  "requestedById",
  "status",
  "createdAt"
);

CREATE INDEX "PharmacyFefoAuthorization_approver_idx"
ON "PharmacyFefoAuthorization"(
  "tenantId",
  "approvedById",
  "approvedAt"
);

CREATE INDEX "PharmacyFefoAuthorization_product_lot_status_idx"
ON "PharmacyFefoAuthorization"(
  "tenantId",
  "medicationId",
  "lotId",
  "status"
);

CREATE INDEX "PharmacyFefoAuthorization_token_idx"
ON "PharmacyFefoAuthorization"(
  "tenantId",
  "authorizationTokenHash"
);

CREATE INDEX "PharmacyFefoAuthorization_valid_until_status_idx"
ON "PharmacyFefoAuthorization"(
  "validUntil",
  "status"
);

CREATE INDEX "PharmacyFefoAuthorization_consumed_sale_idx"
ON "PharmacyFefoAuthorization"(
  "consumedBySaleId"
);

ALTER TABLE "PharmacyFefoAuthorization"
ADD CONSTRAINT "PharmacyFefoAuthorization_requested_quantity_check"
CHECK ("requestedQuantity" > 0);

ALTER TABLE "PharmacyFefoAuthorization"
ADD CONSTRAINT "PharmacyFefoAuthorization_reason_check"
CHECK (char_length(btrim("requestReason")) >= 10);

ALTER TABLE "PharmacyFefoAuthorization"
ADD CONSTRAINT "PharmacyFefoAuthorization_distinct_approver_check"
CHECK ("approvedById" IS NULL OR "approvedById" <> "requestedById");