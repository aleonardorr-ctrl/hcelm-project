-- CreateEnum
CREATE TYPE "CompanyModuleKey" AS ENUM ('CLINICAL', 'PHARMACY', 'DRUGSTORE', 'BILLING', 'CASHBOX', 'MANAGEMENT', 'LABORATORY', 'IMAGING');

-- CreateEnum
CREATE TYPE "CompanyCollaborationResource" AS ENUM ('PRESCRIPTION_REFERRAL', 'DISPENSING', 'STOCK_VISIBILITY', 'RESERVATION', 'PURCHASE_TRANSFER', 'REPORTING');

-- CreateEnum
CREATE TYPE "CompanyCollaborationDirection" AS ENUM ('ONE_WAY', 'TWO_WAY');

-- CreateEnum
CREATE TYPE "CompanyCollaborationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PrescriptionReferralStatus" AS ENUM ('PENDING', 'VIEWED', 'ACCEPTED', 'PARTIALLY_DISPENSED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "businessUnitId" UUID,
ADD COLUMN     "companyId" UUID;

-- CreateTable
CREATE TABLE "CompanyModuleInstallation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "warehouseId" UUID,
    "moduleKey" "CompanyModuleKey" NOT NULL,
    "displayName" VARCHAR(180),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyModuleInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyCollaborationAgreement" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "ownerCompanyId" UUID NOT NULL,
    "partnerCompanyId" UUID NOT NULL,
    "sourceBusinessUnitId" UUID,
    "targetBusinessUnitId" UUID,
    "resource" "CompanyCollaborationResource" NOT NULL,
    "direction" "CompanyCollaborationDirection" NOT NULL DEFAULT 'ONE_WAY',
    "status" "CompanyCollaborationStatus" NOT NULL DEFAULT 'DRAFT',
    "requiresPatientConsent" BOOLEAN NOT NULL DEFAULT true,
    "shareMinimumClinicalData" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyCollaborationAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionReferral" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "sourceCompanyId" UUID NOT NULL,
    "sourceBusinessUnitId" UUID,
    "targetCompanyId" UUID NOT NULL,
    "targetBusinessUnitId" UUID,
    "status" "PrescriptionReferralStatus" NOT NULL DEFAULT 'PENDING',
    "requiresPatientConsent" BOOLEAN NOT NULL DEFAULT true,
    "patientConsentGranted" BOOLEAN NOT NULL DEFAULT false,
    "patientConsentAt" TIMESTAMP(3),
    "patientConsentBy" VARCHAR(180),
    "sharedPayload" JSONB,
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyModuleInstallation_tenantId_companyId_moduleKey_acti_idx" ON "CompanyModuleInstallation"("tenantId", "companyId", "moduleKey", "active");

-- CreateIndex
CREATE INDEX "CompanyModuleInstallation_tenantId_businessUnitId_active_idx" ON "CompanyModuleInstallation"("tenantId", "businessUnitId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyModuleInstallation_businessUnitId_moduleKey_key" ON "CompanyModuleInstallation"("businessUnitId", "moduleKey");

-- CreateIndex
CREATE INDEX "CompanyCollaborationAgreement_tenantId_ownerCompanyId_statu_idx" ON "CompanyCollaborationAgreement"("tenantId", "ownerCompanyId", "status");

-- CreateIndex
CREATE INDEX "CompanyCollaborationAgreement_tenantId_partnerCompanyId_sta_idx" ON "CompanyCollaborationAgreement"("tenantId", "partnerCompanyId", "status");

-- CreateIndex
CREATE INDEX "CompanyCollaborationAgreement_tenantId_resource_status_idx" ON "CompanyCollaborationAgreement"("tenantId", "resource", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyCollaborationAgreement_ownerCompanyId_partnerCompany_key" ON "CompanyCollaborationAgreement"("ownerCompanyId", "partnerCompanyId", "sourceBusinessUnitId", "targetBusinessUnitId", "resource");

-- CreateIndex
CREATE INDEX "PrescriptionReferral_tenantId_targetCompanyId_status_create_idx" ON "PrescriptionReferral"("tenantId", "targetCompanyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PrescriptionReferral_tenantId_sourceCompanyId_status_create_idx" ON "PrescriptionReferral"("tenantId", "sourceCompanyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PrescriptionReferral_tenantId_prescriptionId_idx" ON "PrescriptionReferral"("tenantId", "prescriptionId");

-- CreateIndex
CREATE INDEX "Prescription_tenantId_companyId_businessUnitId_idx" ON "Prescription"("tenantId", "companyId", "businessUnitId");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyModuleInstallation" ADD CONSTRAINT "CompanyModuleInstallation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyModuleInstallation" ADD CONSTRAINT "CompanyModuleInstallation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyModuleInstallation" ADD CONSTRAINT "CompanyModuleInstallation_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyModuleInstallation" ADD CONSTRAINT "CompanyModuleInstallation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyCollaborationAgreement" ADD CONSTRAINT "CompanyCollaborationAgreement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyCollaborationAgreement" ADD CONSTRAINT "CompanyCollaborationAgreement_ownerCompanyId_fkey" FOREIGN KEY ("ownerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyCollaborationAgreement" ADD CONSTRAINT "CompanyCollaborationAgreement_partnerCompanyId_fkey" FOREIGN KEY ("partnerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyCollaborationAgreement" ADD CONSTRAINT "CompanyCollaborationAgreement_sourceBusinessUnitId_fkey" FOREIGN KEY ("sourceBusinessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyCollaborationAgreement" ADD CONSTRAINT "CompanyCollaborationAgreement_targetBusinessUnitId_fkey" FOREIGN KEY ("targetBusinessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionReferral" ADD CONSTRAINT "PrescriptionReferral_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionReferral" ADD CONSTRAINT "PrescriptionReferral_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionReferral" ADD CONSTRAINT "PrescriptionReferral_sourceCompanyId_fkey" FOREIGN KEY ("sourceCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionReferral" ADD CONSTRAINT "PrescriptionReferral_sourceBusinessUnitId_fkey" FOREIGN KEY ("sourceBusinessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionReferral" ADD CONSTRAINT "PrescriptionReferral_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionReferral" ADD CONSTRAINT "PrescriptionReferral_targetBusinessUnitId_fkey" FOREIGN KEY ("targetBusinessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionReferral" ADD CONSTRAINT "PrescriptionReferral_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionReferral" ADD CONSTRAINT "PrescriptionReferral_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
