-- CreateTable
CREATE TABLE "DiagnosisCatalog" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "system" VARCHAR(10) NOT NULL DEFAULT 'CIE10',
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT NOT NULL,
    "chapter" VARCHAR(255),
    "group" VARCHAR(255),
    "subgroup" VARCHAR(255),
    "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchText" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "observations" TEXT,
    "source" VARCHAR(255),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosisCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogImport" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "catalogType" VARCHAR(30) NOT NULL,
    "sourceFileName" VARCHAR(255) NOT NULL,
    "source" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "createdRows" INTEGER NOT NULL DEFAULT 0,
    "updatedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "validationReport" JSONB,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CatalogImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagnosisCatalog_tenantId_system_active_idx" ON "DiagnosisCatalog"("tenantId", "system", "active");

-- CreateIndex
CREATE INDEX "DiagnosisCatalog_tenantId_code_idx" ON "DiagnosisCatalog"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisCatalog_tenantId_system_code_key" ON "DiagnosisCatalog"("tenantId", "system", "code");

-- CreateIndex
CREATE INDEX "CatalogImport_tenantId_catalogType_createdAt_idx" ON "CatalogImport"("tenantId", "catalogType", "createdAt");

-- CreateIndex
CREATE INDEX "CatalogImport_tenantId_status_idx" ON "CatalogImport"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "DiagnosisCatalog" ADD CONSTRAINT "DiagnosisCatalog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisCatalog" ADD CONSTRAINT "DiagnosisCatalog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogImport" ADD CONSTRAINT "CatalogImport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogImport" ADD CONSTRAINT "CatalogImport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
