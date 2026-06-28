-- CreateEnum
CREATE TYPE "CommercialCustomerType" AS ENUM ('NATURAL_PERSON', 'LEGAL_ENTITY', 'FOREIGN_CUSTOMER');

-- CreateEnum
CREATE TYPE "IdentityDocumentType" AS ENUM ('DNI', 'RUC', 'CE', 'PASSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ElectronicDocumentType" AS ENUM ('BOLETA', 'FACTURA', 'CREDIT_NOTE', 'DEBIT_NOTE');

-- CreateEnum
CREATE TYPE "ElectronicDocumentStatus" AS ENUM ('DRAFT', 'PENDING_GENERATION', 'GENERATED', 'SIGNED', 'SENT', 'ACCEPTED', 'OBSERVED', 'REJECTED', 'VOID_PENDING', 'VOIDED', 'ERROR');

-- CreateEnum
CREATE TYPE "ElectronicBillingEnvironment" AS ENUM ('BETA', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "ElectronicBillingProvider" AS ENUM ('NONE', 'SUNAT_DIRECT', 'PSE', 'OSE');

-- CreateEnum
CREATE TYPE "ElectronicDeliveryChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'TELEGRAM', 'SECURE_LINK', 'DOWNLOAD');

-- CreateEnum
CREATE TYPE "ElectronicDeliveryStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ElectronicDocumentJobType" AS ENUM ('GENERATE', 'SIGN', 'SUBMIT', 'QUERY_STATUS', 'DELIVER', 'VOID');

-- CreateEnum
CREATE TYPE "ElectronicDocumentJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "CompanyMedication" ADD COLUMN     "gtin" VARCHAR(20),
ADD COLUMN     "sunatProductCode" VARCHAR(20),
ADD COLUMN     "sunatUnitCode" VARCHAR(3),
ADD COLUMN     "taxAffectationCode" VARCHAR(2),
ADD COLUMN     "taxRate" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "PharmacySale" ADD COLUMN     "commercialCustomerId" UUID;

-- CreateTable
CREATE TABLE "CompanyFiscalProfile" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "fiscalAddress" VARCHAR(255) NOT NULL,
    "ubigeo" VARCHAR(6),
    "department" VARCHAR(100),
    "province" VARCHAR(100),
    "district" VARCHAR(100),
    "countryCode" VARCHAR(2) NOT NULL DEFAULT 'PE',
    "provider" "ElectronicBillingProvider" NOT NULL DEFAULT 'NONE',
    "environment" "ElectronicBillingEnvironment" NOT NULL DEFAULT 'BETA',
    "credentialSecretRef" VARCHAR(255),
    "certificateSecretRef" VARCHAR(255),
    "certificateExpiresAt" TIMESTAMP(3),
    "nonSecretSettings" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyFiscalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialCustomer" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "customerType" "CommercialCustomerType" NOT NULL,
    "documentType" "IdentityDocumentType" NOT NULL,
    "documentNumber" VARCHAR(20) NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "legalName" VARCHAR(200),
    "tradeName" VARCHAR(200),
    "firstNames" VARCHAR(120),
    "paternalSurname" VARCHAR(100),
    "maternalSurname" VARCHAR(100),
    "email" VARCHAR(180),
    "phone" VARCHAR(30),
    "whatsappPhone" VARCHAR(30),
    "telegramChatId" VARCHAR(100),
    "address" VARCHAR(255),
    "ubigeo" VARCHAR(6),
    "department" VARCHAR(100),
    "province" VARCHAR(100),
    "district" VARCHAR(100),
    "countryCode" VARCHAR(2) NOT NULL DEFAULT 'PE',
    "electronicConsentAt" TIMESTAMP(3),
    "marketingConsentAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocumentSequence" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "documentType" "ElectronicDocumentType" NOT NULL,
    "series" VARCHAR(4) NOT NULL,
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicDocumentSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocument" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "saleId" UUID,
    "customerId" UUID,
    "relatedDocumentId" UUID,
    "documentType" "ElectronicDocumentType" NOT NULL,
    "status" "ElectronicDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "environment" "ElectronicBillingEnvironment" NOT NULL DEFAULT 'BETA',
    "series" VARCHAR(4) NOT NULL,
    "number" INTEGER NOT NULL,
    "fullNumber" VARCHAR(20) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "operationTypeCode" VARCHAR(4) NOT NULL DEFAULT '0101',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PEN',
    "issuerRuc" VARCHAR(11) NOT NULL,
    "issuerLegalName" VARCHAR(200) NOT NULL,
    "issuerTradeName" VARCHAR(200),
    "issuerAddress" VARCHAR(255) NOT NULL,
    "issuerUbigeo" VARCHAR(6),
    "customerDocumentType" "IdentityDocumentType",
    "customerDocumentNumber" VARCHAR(20),
    "customerName" VARCHAR(200),
    "customerAddress" VARCHAR(255),
    "customerEmail" VARCHAR(180),
    "customerPhone" VARCHAR(30),
    "taxableAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "exoneratedAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unaffectedAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "freeAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "igvTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "otherTaxTotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "idempotencyKey" VARCHAR(180) NOT NULL,
    "referenceReasonCode" VARCHAR(4),
    "referenceReason" VARCHAR(500),
    "xmlStorageKey" VARCHAR(500),
    "cdrStorageKey" VARCHAR(500),
    "pdfStorageKey" VARCHAR(500),
    "xmlHash" VARCHAR(128),
    "qrPayload" TEXT,
    "sunatTicket" VARCHAR(100),
    "sunatResponseCode" VARCHAR(20),
    "sunatResponseDescription" TEXT,
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocumentLine" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "saleItemId" UUID,
    "lineNumber" INTEGER NOT NULL,
    "companySku" VARCHAR(60),
    "sunatProductCode" VARCHAR(20),
    "gtin" VARCHAR(20),
    "description" VARCHAR(500) NOT NULL,
    "unitCode" VARCHAR(3) NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitValue" DECIMAL(14,4) NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "discountAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "taxAffectationCode" VARCHAR(2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "igvAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "lineValue" DECIMAL(14,4) NOT NULL,
    "lineTotal" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectronicDocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocumentDelivery" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "channel" "ElectronicDeliveryChannel" NOT NULL,
    "destination" VARCHAR(255) NOT NULL,
    "recipientName" VARCHAR(200),
    "status" "ElectronicDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" VARCHAR(180) NOT NULL,
    "consentAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" VARCHAR(255),
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicDocumentDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocumentEvent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "status" "ElectronicDocumentStatus",
    "eventType" VARCHAR(60) NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectronicDocumentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocumentJob" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "jobType" "ElectronicDocumentJobType" NOT NULL,
    "status" "ElectronicDocumentJobStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" VARCHAR(180) NOT NULL,
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" VARCHAR(100),
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicDocumentJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyFiscalProfile_companyId_key" ON "CompanyFiscalProfile"("companyId");

-- CreateIndex
CREATE INDEX "CompanyFiscalProfile_tenantId_active_idx" ON "CompanyFiscalProfile"("tenantId", "active");

-- CreateIndex
CREATE INDEX "CompanyFiscalProfile_tenantId_provider_environment_idx" ON "CompanyFiscalProfile"("tenantId", "provider", "environment");

-- CreateIndex
CREATE INDEX "CommercialCustomer_tenantId_companyId_active_idx" ON "CommercialCustomer"("tenantId", "companyId", "active");

-- CreateIndex
CREATE INDEX "CommercialCustomer_tenantId_companyId_displayName_idx" ON "CommercialCustomer"("tenantId", "companyId", "displayName");

-- CreateIndex
CREATE INDEX "CommercialCustomer_tenantId_email_idx" ON "CommercialCustomer"("tenantId", "email");

-- CreateIndex
CREATE INDEX "CommercialCustomer_tenantId_phone_idx" ON "CommercialCustomer"("tenantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialCustomer_companyId_documentType_documentNumber_key" ON "CommercialCustomer"("companyId", "documentType", "documentNumber");

-- CreateIndex
CREATE INDEX "ElectronicDocumentSequence_tenantId_companyId_businessUnitI_idx" ON "ElectronicDocumentSequence"("tenantId", "companyId", "businessUnitId", "warehouseId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocumentSequence_companyId_businessUnitId_warehou_key" ON "ElectronicDocumentSequence"("companyId", "businessUnitId", "warehouseId", "documentType", "series");

-- CreateIndex
CREATE INDEX "ElectronicDocument_tenantId_companyId_status_issueDate_idx" ON "ElectronicDocument"("tenantId", "companyId", "status", "issueDate");

-- CreateIndex
CREATE INDEX "ElectronicDocument_tenantId_saleId_idx" ON "ElectronicDocument"("tenantId", "saleId");

-- CreateIndex
CREATE INDEX "ElectronicDocument_tenantId_customerId_issueDate_idx" ON "ElectronicDocument"("tenantId", "customerId", "issueDate");

-- CreateIndex
CREATE INDEX "ElectronicDocument_tenantId_relatedDocumentId_idx" ON "ElectronicDocument"("tenantId", "relatedDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocument_tenantId_idempotencyKey_key" ON "ElectronicDocument"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocument_companyId_documentType_series_number_key" ON "ElectronicDocument"("companyId", "documentType", "series", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocument_companyId_fullNumber_key" ON "ElectronicDocument"("companyId", "fullNumber");

-- CreateIndex
CREATE INDEX "ElectronicDocumentLine_tenantId_documentId_idx" ON "ElectronicDocumentLine"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "ElectronicDocumentLine_tenantId_saleItemId_idx" ON "ElectronicDocumentLine"("tenantId", "saleItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocumentLine_documentId_lineNumber_key" ON "ElectronicDocumentLine"("documentId", "lineNumber");

-- CreateIndex
CREATE INDEX "ElectronicDocumentDelivery_tenantId_documentId_status_idx" ON "ElectronicDocumentDelivery"("tenantId", "documentId", "status");

-- CreateIndex
CREATE INDEX "ElectronicDocumentDelivery_tenantId_channel_status_createdA_idx" ON "ElectronicDocumentDelivery"("tenantId", "channel", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocumentDelivery_tenantId_idempotencyKey_key" ON "ElectronicDocumentDelivery"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ElectronicDocumentEvent_tenantId_documentId_createdAt_idx" ON "ElectronicDocumentEvent"("tenantId", "documentId", "createdAt");

-- CreateIndex
CREATE INDEX "ElectronicDocumentEvent_tenantId_eventType_createdAt_idx" ON "ElectronicDocumentEvent"("tenantId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "ElectronicDocumentJob_tenantId_status_nextAttemptAt_idx" ON "ElectronicDocumentJob"("tenantId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "ElectronicDocumentJob_tenantId_documentId_jobType_idx" ON "ElectronicDocumentJob"("tenantId", "documentId", "jobType");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocumentJob_tenantId_idempotencyKey_key" ON "ElectronicDocumentJob"("tenantId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_commercialCustomerId_fkey" FOREIGN KEY ("commercialCustomerId") REFERENCES "CommercialCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyFiscalProfile" ADD CONSTRAINT "CompanyFiscalProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyFiscalProfile" ADD CONSTRAINT "CompanyFiscalProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialCustomer" ADD CONSTRAINT "CommercialCustomer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialCustomer" ADD CONSTRAINT "CommercialCustomer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialCustomer" ADD CONSTRAINT "CommercialCustomer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentSequence" ADD CONSTRAINT "ElectronicDocumentSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentSequence" ADD CONSTRAINT "ElectronicDocumentSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentSequence" ADD CONSTRAINT "ElectronicDocumentSequence_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentSequence" ADD CONSTRAINT "ElectronicDocumentSequence_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PharmacySale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CommercialCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_relatedDocumentId_fkey" FOREIGN KEY ("relatedDocumentId") REFERENCES "ElectronicDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentLine" ADD CONSTRAINT "ElectronicDocumentLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentLine" ADD CONSTRAINT "ElectronicDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ElectronicDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentLine" ADD CONSTRAINT "ElectronicDocumentLine_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "PharmacySaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentDelivery" ADD CONSTRAINT "ElectronicDocumentDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentDelivery" ADD CONSTRAINT "ElectronicDocumentDelivery_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ElectronicDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentEvent" ADD CONSTRAINT "ElectronicDocumentEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentEvent" ADD CONSTRAINT "ElectronicDocumentEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ElectronicDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentEvent" ADD CONSTRAINT "ElectronicDocumentEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentJob" ADD CONSTRAINT "ElectronicDocumentJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentJob" ADD CONSTRAINT "ElectronicDocumentJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ElectronicDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HCELM_ELECTRONIC_BILLING_INTEGRITY_CONSTRAINTS

ALTER TABLE "CompanyFiscalProfile"
ADD CONSTRAINT "CompanyFiscalProfile_fiscalAddress_check"
CHECK (NULLIF(BTRIM("fiscalAddress"), '') IS NOT NULL);

ALTER TABLE "CompanyFiscalProfile"
ADD CONSTRAINT "CompanyFiscalProfile_ubigeo_check"
CHECK ("ubigeo" IS NULL OR "ubigeo" ~ '^[0-9]{6}$');

ALTER TABLE "CompanyFiscalProfile"
ADD CONSTRAINT "CompanyFiscalProfile_activeProvider_check"
CHECK ("active" = false OR "provider" <> 'NONE');

ALTER TABLE "CommercialCustomer"
ADD CONSTRAINT "CommercialCustomer_displayName_check"
CHECK (NULLIF(BTRIM("displayName"), '') IS NOT NULL);

ALTER TABLE "CommercialCustomer"
ADD CONSTRAINT "CommercialCustomer_documentNumber_check"
CHECK (
  CASE "documentType"
    WHEN 'DNI' THEN "documentNumber" ~ '^[0-9]{8}$'
    WHEN 'RUC' THEN "documentNumber" ~ '^[0-9]{11}$'
    WHEN 'CE' THEN "documentNumber" ~ '^[A-Za-z0-9]{1,12}$'
    WHEN 'PASSPORT' THEN "documentNumber" ~ '^[A-Za-z0-9]{1,20}$'
    ELSE NULLIF(BTRIM("documentNumber"), '') IS NOT NULL
  END
);

ALTER TABLE "CommercialCustomer"
ADD CONSTRAINT "CommercialCustomer_ubigeo_check"
CHECK ("ubigeo" IS NULL OR "ubigeo" ~ '^[0-9]{6}$');

ALTER TABLE "CommercialCustomer"
ADD CONSTRAINT "CommercialCustomer_countryCode_check"
CHECK ("countryCode" ~ '^[A-Z]{2}$');

ALTER TABLE "ElectronicDocumentSequence"
ADD CONSTRAINT "ElectronicDocumentSequence_currentNumber_check"
CHECK ("currentNumber" >= 0);

ALTER TABLE "ElectronicDocumentSequence"
ADD CONSTRAINT "ElectronicDocumentSequence_series_check"
CHECK (
  ("documentType" = 'BOLETA' AND "series" ~ '^B[A-Z0-9]{3}$')
  OR ("documentType" = 'FACTURA' AND "series" ~ '^F[A-Z0-9]{3}$')
  OR ("documentType" IN ('CREDIT_NOTE', 'DEBIT_NOTE') AND "series" ~ '^[FB][A-Z0-9]{3}$')
);

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_number_check"
CHECK ("number" > 0);

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_fullNumber_check"
CHECK ("fullNumber" = "series" || '-' || LPAD("number"::text, 8, '0'));

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_series_check"
CHECK (
  ("documentType" = 'BOLETA' AND "series" ~ '^B[A-Z0-9]{3}$')
  OR ("documentType" = 'FACTURA' AND "series" ~ '^F[A-Z0-9]{3}$')
  OR ("documentType" IN ('CREDIT_NOTE', 'DEBIT_NOTE') AND "series" ~ '^[FB][A-Z0-9]{3}$')
);

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_issuer_check"
CHECK (
  "issuerRuc" ~ '^[0-9]{11}$'
  AND NULLIF(BTRIM("issuerLegalName"), '') IS NOT NULL
  AND NULLIF(BTRIM("issuerAddress"), '') IS NOT NULL
  AND ("issuerUbigeo" IS NULL OR "issuerUbigeo" ~ '^[0-9]{6}$')
);

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_customerPair_check"
CHECK (
  ("customerDocumentType" IS NULL AND "customerDocumentNumber" IS NULL)
  OR ("customerDocumentType" IS NOT NULL AND "customerDocumentNumber" IS NOT NULL)
);

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_customerDocument_check"
CHECK (
  "customerDocumentNumber" IS NULL
  OR CASE "customerDocumentType"
    WHEN 'DNI' THEN "customerDocumentNumber" ~ '^[0-9]{8}$'
    WHEN 'RUC' THEN "customerDocumentNumber" ~ '^[0-9]{11}$'
    WHEN 'CE' THEN "customerDocumentNumber" ~ '^[A-Za-z0-9]{1,12}$'
    WHEN 'PASSPORT' THEN "customerDocumentNumber" ~ '^[A-Za-z0-9]{1,20}$'
    ELSE NULLIF(BTRIM("customerDocumentNumber"), '') IS NOT NULL
  END
);

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_customerRequirement_check"
CHECK (
  (
    "documentType" = 'FACTURA'
    AND "customerDocumentType" = 'RUC'
    AND "customerDocumentNumber" ~ '^[0-9]{11}$'
    AND NULLIF(BTRIM("customerName"), '') IS NOT NULL
    AND NULLIF(BTRIM("customerAddress"), '') IS NOT NULL
  )
  OR (
    "documentType" = 'BOLETA'
    AND (
      "total" <= 700
      OR (
        "customerDocumentType" IS NOT NULL
        AND "customerDocumentNumber" IS NOT NULL
        AND NULLIF(BTRIM("customerName"), '') IS NOT NULL
      )
    )
  )
  OR "documentType" IN ('CREDIT_NOTE', 'DEBIT_NOTE')
);

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_reference_check"
CHECK (
  (
    "documentType" IN ('BOLETA', 'FACTURA')
    AND "relatedDocumentId" IS NULL
    AND "referenceReasonCode" IS NULL
    AND "referenceReason" IS NULL
  )
  OR (
    "documentType" IN ('CREDIT_NOTE', 'DEBIT_NOTE')
    AND "relatedDocumentId" IS NOT NULL
    AND NULLIF(BTRIM("referenceReasonCode"), '') IS NOT NULL
    AND NULLIF(BTRIM("referenceReason"), '') IS NOT NULL
  )
);

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_amounts_check"
CHECK (
  "taxableAmount" >= 0
  AND "exoneratedAmount" >= 0
  AND "unaffectedAmount" >= 0
  AND "freeAmount" >= 0
  AND "discountTotal" >= 0
  AND "igvTotal" >= 0
  AND "otherTaxTotal" >= 0
  AND "total" >= 0
);

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_statusDates_check"
CHECK (
  ("status" <> 'ACCEPTED' OR "acceptedAt" IS NOT NULL)
  AND (
    "acceptedAt" IS NULL
    OR "status" IN ('ACCEPTED', 'VOID_PENDING', 'VOIDED')
  )
  AND (
    "status" NOT IN ('SENT', 'ACCEPTED', 'OBSERVED', 'REJECTED', 'VOID_PENDING', 'VOIDED')
    OR "submittedAt" IS NOT NULL
  )
);

ALTER TABLE "ElectronicDocumentLine"
ADD CONSTRAINT "ElectronicDocumentLine_lineNumber_check"
CHECK ("lineNumber" > 0);

ALTER TABLE "ElectronicDocumentLine"
ADD CONSTRAINT "ElectronicDocumentLine_quantity_check"
CHECK ("quantity" > 0);

ALTER TABLE "ElectronicDocumentLine"
ADD CONSTRAINT "ElectronicDocumentLine_codes_check"
CHECK (
  "unitCode" ~ '^[A-Z0-9]{2,3}$'
  AND "taxAffectationCode" ~ '^[0-9]{2}$'
);

ALTER TABLE "ElectronicDocumentLine"
ADD CONSTRAINT "ElectronicDocumentLine_amounts_check"
CHECK (
  "unitValue" >= 0
  AND "unitPrice" >= 0
  AND "discountAmount" >= 0
  AND "taxRate" >= 0
  AND "taxRate" <= 100
  AND "igvAmount" >= 0
  AND "lineValue" >= 0
  AND "lineTotal" >= 0
);

ALTER TABLE "ElectronicDocumentDelivery"
ADD CONSTRAINT "ElectronicDocumentDelivery_destination_check"
CHECK (NULLIF(BTRIM("destination"), '') IS NOT NULL);

ALTER TABLE "ElectronicDocumentDelivery"
ADD CONSTRAINT "ElectronicDocumentDelivery_attempts_check"
CHECK ("attempts" >= 0);

ALTER TABLE "ElectronicDocumentDelivery"
ADD CONSTRAINT "ElectronicDocumentDelivery_consent_check"
CHECK (
  "channel" NOT IN ('EMAIL', 'WHATSAPP', 'TELEGRAM')
  OR "consentAt" IS NOT NULL
);

ALTER TABLE "ElectronicDocumentDelivery"
ADD CONSTRAINT "ElectronicDocumentDelivery_statusDates_check"
CHECK (
  ("status" NOT IN ('SENT', 'DELIVERED') OR "sentAt" IS NOT NULL)
  AND ("status" <> 'DELIVERED' OR "deliveredAt" IS NOT NULL)
);

ALTER TABLE "ElectronicDocumentEvent"
ADD CONSTRAINT "ElectronicDocumentEvent_eventType_check"
CHECK (NULLIF(BTRIM("eventType"), '') IS NOT NULL);

ALTER TABLE "ElectronicDocumentJob"
ADD CONSTRAINT "ElectronicDocumentJob_attempts_check"
CHECK (
  "attempts" >= 0
  AND "maxAttempts" > 0
  AND "attempts" <= "maxAttempts"
);

ALTER TABLE "ElectronicDocumentJob"
ADD CONSTRAINT "ElectronicDocumentJob_processing_check"
CHECK ("status" <> 'PROCESSING' OR "lockedAt" IS NOT NULL);

ALTER TABLE "ElectronicDocumentJob"
ADD CONSTRAINT "ElectronicDocumentJob_completed_check"
CHECK (
  ("status" = 'COMPLETED' AND "completedAt" IS NOT NULL)
  OR ("status" <> 'COMPLETED' AND "completedAt" IS NULL)
);

ALTER TABLE "CompanyMedication"
ADD CONSTRAINT "CompanyMedication_gtin_check"
CHECK (
  "gtin" IS NULL
  OR "gtin" ~ '^[0-9]{8}$|^[0-9]{12}$|^[0-9]{13}$|^[0-9]{14}$'
);

ALTER TABLE "CompanyMedication"
ADD CONSTRAINT "CompanyMedication_sunatUnitCode_check"
CHECK ("sunatUnitCode" IS NULL OR "sunatUnitCode" ~ '^[A-Z0-9]{2,3}$');

ALTER TABLE "CompanyMedication"
ADD CONSTRAINT "CompanyMedication_taxAffectationCode_check"
CHECK (
  "taxAffectationCode" IS NULL
  OR "taxAffectationCode" ~ '^[0-9]{2}$'
);

ALTER TABLE "CompanyMedication"
ADD CONSTRAINT "CompanyMedication_taxRate_check"
CHECK ("taxRate" IS NULL OR ("taxRate" >= 0 AND "taxRate" <= 100));

-- HCELM_CPE_AMOUNT_RULE
-- HCELM permite emitir boleta o factura por cualquier importe positivo.
-- Para consumidores finales, el umbral de S/5 regula la obligatoriedad,
-- no la posibilidad de emitir un comprobante individual.
ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_positiveIssuedTotal_check"
CHECK (
  "status" = 'DRAFT'
  OR "total" > 0
);

