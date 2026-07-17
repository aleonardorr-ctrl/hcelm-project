CREATE TABLE "PharmacyFefoRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "ruleKey" VARCHAR(30) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "minDays" INTEGER NOT NULL,
    "maxDays" INTEGER,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "action" VARCHAR(40) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyFefoRule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PharmacyFefoRule_days_check"
      CHECK ("minDays" >= 0 AND ("maxDays" IS NULL OR "maxDays" >= "minDays")),
    CONSTRAINT "PharmacyFefoRule_discount_check"
      CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100),
    CONSTRAINT "PharmacyFefoRule_key_check"
      CHECK ("ruleKey" IN ('NORMAL', 'WATCH', 'PROMOTION', 'CRITICAL')),
    CONSTRAINT "PharmacyFefoRule_action_check"
      CHECK ("action" IN ('NORMAL', 'ALERT', 'SUGGEST_DISCOUNT', 'REQUIRE_AUTHORIZATION'))
);

CREATE UNIQUE INDEX "PharmacyFefoRule_tenantId_companyId_businessUnitId_ruleKey_key"
ON "PharmacyFefoRule"("tenantId", "companyId", "businessUnitId", "ruleKey");

CREATE INDEX "PharmacyFefoRule_tenantId_companyId_businessUnitId_active_displayOrder_idx"
ON "PharmacyFefoRule"("tenantId", "companyId", "businessUnitId", "active", "displayOrder");

CREATE INDEX "PharmacyFefoRule_updatedById_idx"
ON "PharmacyFefoRule"("updatedById");