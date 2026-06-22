-- CreateTable
CREATE TABLE "TenantSystemModule" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSystemModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantSystemModule_tenantId_enabled_idx" ON "TenantSystemModule"("tenantId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSystemModule_tenantId_key_key" ON "TenantSystemModule"("tenantId", "key");

-- AddForeignKey
ALTER TABLE "TenantSystemModule" ADD CONSTRAINT "TenantSystemModule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
