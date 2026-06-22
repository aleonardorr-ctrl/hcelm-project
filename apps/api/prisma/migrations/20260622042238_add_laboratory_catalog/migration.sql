-- CreateTable
CREATE TABLE "LaboratoryCatalog" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" VARCHAR(500) NOT NULL,
    "category" VARCHAR(150) NOT NULL,
    "subcategory" VARCHAR(150),
    "shortName" VARCHAR(150),
    "specimenType" VARCHAR(150),
    "unit" VARCHAR(80),
    "referenceValue" TEXT,
    "method" VARCHAR(255),
    "price" DECIMAL(10,2),
    "requiresFasting" BOOLEAN NOT NULL DEFAULT false,
    "isProfile" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "observations" TEXT,
    "searchText" TEXT NOT NULL DEFAULT '',
    "source" VARCHAR(255),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaboratoryCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaboratoryProfileComponent" (
    "profileId" UUID NOT NULL,
    "componentId" UUID NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaboratoryProfileComponent_pkey" PRIMARY KEY ("profileId","componentId")
);

-- CreateIndex
CREATE INDEX "LaboratoryCatalog_tenantId_active_category_idx" ON "LaboratoryCatalog"("tenantId", "active", "category");

-- CreateIndex
CREATE INDEX "LaboratoryCatalog_tenantId_code_idx" ON "LaboratoryCatalog"("tenantId", "code");

-- CreateIndex
CREATE INDEX "LaboratoryCatalog_tenantId_nameKey_idx" ON "LaboratoryCatalog"("tenantId", "nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "LaboratoryCatalog_tenantId_code_nameKey_key" ON "LaboratoryCatalog"("tenantId", "code", "nameKey");

-- CreateIndex
CREATE INDEX "LaboratoryProfileComponent_componentId_idx" ON "LaboratoryProfileComponent"("componentId");

-- AddForeignKey
ALTER TABLE "LaboratoryCatalog" ADD CONSTRAINT "LaboratoryCatalog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaboratoryCatalog" ADD CONSTRAINT "LaboratoryCatalog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaboratoryProfileComponent" ADD CONSTRAINT "LaboratoryProfileComponent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LaboratoryCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaboratoryProfileComponent" ADD CONSTRAINT "LaboratoryProfileComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "LaboratoryCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
