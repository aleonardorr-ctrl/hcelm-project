-- AlterTable
ALTER TABLE "MedicationInventoryLot" ADD COLUMN     "businessUnitId" UUID,
ADD COLUMN     "companyId" UUID,
ADD COLUMN     "companyMedicationId" UUID,
ADD COLUMN     "warehouseId" UUID;

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "legalName" VARCHAR(180) NOT NULL,
    "tradeName" VARCHAR(180),
    "ruc" VARCHAR(11) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessUnit" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMedication" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "companySku" VARCHAR(60),
    "barcode" VARCHAR(80),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMedication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompanyMembership" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "role" VARCHAR(40) NOT NULL DEFAULT 'USER',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCompanyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Company_tenantId_active_idx" ON "Company"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Company_tenantId_code_key" ON "Company"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Company_tenantId_ruc_key" ON "Company"("tenantId", "ruc");

-- CreateIndex
CREATE INDEX "BusinessUnit_tenantId_companyId_active_idx" ON "BusinessUnit"("tenantId", "companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessUnit_companyId_code_key" ON "BusinessUnit"("companyId", "code");

-- CreateIndex
CREATE INDEX "Warehouse_tenantId_companyId_businessUnitId_active_idx" ON "Warehouse"("tenantId", "companyId", "businessUnitId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_businessUnitId_code_key" ON "Warehouse"("businessUnitId", "code");

-- CreateIndex
CREATE INDEX "CompanyMedication_tenantId_companyId_active_idx" ON "CompanyMedication"("tenantId", "companyId", "active");

-- CreateIndex
CREATE INDEX "CompanyMedication_tenantId_barcode_idx" ON "CompanyMedication"("tenantId", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMedication_companyId_medicationId_key" ON "CompanyMedication"("companyId", "medicationId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMedication_companyId_companySku_key" ON "CompanyMedication"("companyId", "companySku");

-- CreateIndex
CREATE INDEX "UserCompanyMembership_tenantId_companyId_active_idx" ON "UserCompanyMembership"("tenantId", "companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompanyMembership_userId_companyId_key" ON "UserCompanyMembership"("userId", "companyId");

-- AddForeignKey
ALTER TABLE "MedicationInventoryLot" ADD CONSTRAINT "MedicationInventoryLot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryLot" ADD CONSTRAINT "MedicationInventoryLot_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryLot" ADD CONSTRAINT "MedicationInventoryLot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationInventoryLot" ADD CONSTRAINT "MedicationInventoryLot_companyMedicationId_fkey" FOREIGN KEY ("companyMedicationId") REFERENCES "CompanyMedication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMedication" ADD CONSTRAINT "CompanyMedication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMedication" ADD CONSTRAINT "CompanyMedication_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMedication" ADD CONSTRAINT "CompanyMedication_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompanyMembership" ADD CONSTRAINT "UserCompanyMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompanyMembership" ADD CONSTRAINT "UserCompanyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompanyMembership" ADD CONSTRAINT "UserCompanyMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
