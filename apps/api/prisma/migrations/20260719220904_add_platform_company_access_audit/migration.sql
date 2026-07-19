-- CreateTable
CREATE TABLE "PlatformCompanyAccessAudit" (
    "id" UUID NOT NULL,
    "platformUserId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "warehouseId" UUID,
    "reason" VARCHAR(500) NOT NULL,
    "accessMode" VARCHAR(40) NOT NULL DEFAULT 'COMPANY_OPERATION',
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "ipAddress" VARCHAR(80),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCompanyAccessAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformCompanyAccessAudit_platformUserId_enteredAt_idx" ON "PlatformCompanyAccessAudit"("platformUserId", "enteredAt");

-- CreateIndex
CREATE INDEX "PlatformCompanyAccessAudit_tenantId_companyId_enteredAt_idx" ON "PlatformCompanyAccessAudit"("tenantId", "companyId", "enteredAt");

-- CreateIndex
CREATE INDEX "PlatformCompanyAccessAudit_status_enteredAt_idx" ON "PlatformCompanyAccessAudit"("status", "enteredAt");
