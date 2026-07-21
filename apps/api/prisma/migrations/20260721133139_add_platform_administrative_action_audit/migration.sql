-- CreateEnum
CREATE TYPE "PlatformAdministrativeEntityType" AS ENUM ('TENANT', 'COMPANY', 'USER');

-- CreateEnum
CREATE TYPE "PlatformAdministrativeAction" AS ENUM ('SUSPEND', 'REACTIVATE');

-- CreateTable
CREATE TABLE "PlatformAdministrativeActionAudit" (
    "id" UUID NOT NULL,
    "entityType" "PlatformAdministrativeEntityType" NOT NULL,
    "action" "PlatformAdministrativeAction" NOT NULL,
    "targetEntityId" UUID NOT NULL,
    "targetTenantId" UUID,
    "targetCompanyId" UUID,
    "targetUserId" UUID,
    "targetName" VARCHAR(200) NOT NULL,
    "targetIdentifier" VARCHAR(120),
    "previousStatus" "AdministrativeEntityStatus" NOT NULL,
    "resultingStatus" "AdministrativeEntityStatus" NOT NULL,
    "category" VARCHAR(50),
    "reason" VARCHAR(500) NOT NULL,
    "suspendedUntil" TIMESTAMP(3),
    "performedByPlatformUserId" UUID NOT NULL,
    "performedByEmail" VARCHAR(180) NOT NULL,
    "performedByName" VARCHAR(180),
    "ipAddress" VARCHAR(80),
    "userAgent" TEXT,
    "closedAccessCount" INTEGER NOT NULL DEFAULT 0,
    "successful" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" VARCHAR(500),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAdministrativeActionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformAdministrativeActionAudit_entityType_targetEntityId_idx" ON "PlatformAdministrativeActionAudit"("entityType", "targetEntityId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAdministrativeActionAudit_targetTenantId_createdAt_idx" ON "PlatformAdministrativeActionAudit"("targetTenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAdministrativeActionAudit_targetCompanyId_createdAt_idx" ON "PlatformAdministrativeActionAudit"("targetCompanyId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAdministrativeActionAudit_targetUserId_createdAt_idx" ON "PlatformAdministrativeActionAudit"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAdministrativeActionAudit_performedByPlatformUserId_idx" ON "PlatformAdministrativeActionAudit"("performedByPlatformUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAdministrativeActionAudit_action_createdAt_idx" ON "PlatformAdministrativeActionAudit"("action", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAdministrativeActionAudit_successful_createdAt_idx" ON "PlatformAdministrativeActionAudit"("successful", "createdAt");
