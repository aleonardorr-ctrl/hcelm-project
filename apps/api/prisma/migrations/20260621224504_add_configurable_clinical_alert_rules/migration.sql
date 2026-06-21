-- CreateTable
CREATE TABLE "ClinicalAlertRule" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "abbreviation" VARCHAR(20) NOT NULL,
    "category" VARCHAR(40) NOT NULL DEFAULT 'vital_signs',
    "sourceType" VARCHAR(40) NOT NULL DEFAULT 'VITAL_SIGNS',
    "displayFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unit" VARCHAR(30),
    "referenceKey" VARCHAR(80),
    "sourceNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalAlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAlertBand" (
    "id" UUID NOT NULL,
    "ruleId" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(10),
    "colorHex" VARCHAR(9),
    "matchMode" VARCHAR(10) NOT NULL DEFAULT 'ALL',
    "messageTemplate" TEXT NOT NULL,
    "suggestedAction" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalAlertBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAlertCondition" (
    "id" UUID NOT NULL,
    "bandId" UUID NOT NULL,
    "sourceField" VARCHAR(80) NOT NULL,
    "operator" VARCHAR(20) NOT NULL,
    "value1" DOUBLE PRECISION NOT NULL,
    "value2" DOUBLE PRECISION,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalAlertCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalAlertRule_tenantId_active_displayOrder_idx" ON "ClinicalAlertRule"("tenantId", "active", "displayOrder");

-- CreateIndex
CREATE INDEX "ClinicalAlertRule_tenantId_sourceType_idx" ON "ClinicalAlertRule"("tenantId", "sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalAlertRule_tenantId_key_key" ON "ClinicalAlertRule"("tenantId", "key");

-- CreateIndex
CREATE INDEX "ClinicalAlertBand_ruleId_active_priority_idx" ON "ClinicalAlertBand"("ruleId", "active", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalAlertBand_ruleId_key_key" ON "ClinicalAlertBand"("ruleId", "key");

-- CreateIndex
CREATE INDEX "ClinicalAlertCondition_bandId_order_idx" ON "ClinicalAlertCondition"("bandId", "order");

-- AddForeignKey
ALTER TABLE "ClinicalAlertRule" ADD CONSTRAINT "ClinicalAlertRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAlertRule" ADD CONSTRAINT "ClinicalAlertRule_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAlertBand" ADD CONSTRAINT "ClinicalAlertBand_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ClinicalAlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAlertCondition" ADD CONSTRAINT "ClinicalAlertCondition_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "ClinicalAlertBand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
