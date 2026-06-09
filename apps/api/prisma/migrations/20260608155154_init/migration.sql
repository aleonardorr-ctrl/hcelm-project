/*
  Warnings:

  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clinical_encounters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `diagnoses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `establishments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `legal_documents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `medications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tenants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "clinical_encounters" DROP CONSTRAINT "clinical_encounters_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "clinical_encounters" DROP CONSTRAINT "clinical_encounters_patientId_fkey";

-- DropForeignKey
ALTER TABLE "clinical_encounters" DROP CONSTRAINT "clinical_encounters_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "establishments" DROP CONSTRAINT "establishments_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "legal_documents" DROP CONSTRAINT "legal_documents_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "legal_documents" DROP CONSTRAINT "legal_documents_patientId_fkey";

-- DropForeignKey
ALTER TABLE "legal_documents" DROP CONSTRAINT "legal_documents_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "medications" DROP CONSTRAINT "medications_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "patients" DROP CONSTRAINT "patients_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenantId_fkey";

-- DropTable
DROP TABLE "audit_logs";

-- DropTable
DROP TABLE "clinical_encounters";

-- DropTable
DROP TABLE "diagnoses";

-- DropTable
DROP TABLE "establishments";

-- DropTable
DROP TABLE "legal_documents";

-- DropTable
DROP TABLE "medications";

-- DropTable
DROP TABLE "patients";

-- DropTable
DROP TABLE "tenants";

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'medico',
    "cmp" TEXT,
    "rne" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'DNI',
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Establishment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "directorName" TEXT,
    "directorCmp" TEXT,
    "directorRne" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Establishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "issuedBy" UUID NOT NULL,
    "certificateType" TEXT NOT NULL DEFAULT 'REST_CERTIFICATE',
    "diagnoses" TEXT[],
    "restDays" INTEGER,
    "observations" TEXT,
    "place" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anamnesis" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "fechaAtencion" TIMESTAMP(3) NOT NULL,
    "motivoConsulta" TEXT NOT NULL,
    "tiempoEnfermedad" TEXT,
    "anamnesisActual" TEXT,
    "funcionesBiologicas" TEXT,
    "antecedentesPersonales" TEXT,
    "antecedentesFamiliares" TEXT,
    "signosVitales" JSONB,
    "examenFisico" TEXT,
    "diagnosticoPrincipal" JSONB,
    "diagnosticosSecundarios" JSONB,
    "examenesAuxiliares" TEXT,
    "prescripcionesFarmacia" TEXT,
    "destinoFinal" TEXT NOT NULL DEFAULT 'alta_medica',
    "issuedBy" TEXT DEFAULT 'admin@amehealth.pe',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anamnesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT,
    "legalName" TEXT,
    "ruc" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT DEFAULT 'Arequipa',
    "country" TEXT DEFAULT 'Perú',
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#0f766e',
    "secondaryColor" TEXT DEFAULT '#14b8a6',
    "directorName" TEXT,
    "directorCmp" TEXT,
    "directorRne" TEXT,
    "timezone" TEXT DEFAULT 'America/Lima',
    "language" TEXT DEFAULT 'es',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HceConfig" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "requireCie10" BOOLEAN NOT NULL DEFAULT true,
    "allowMultipleDiagnoses" BOOLEAN NOT NULL DEFAULT true,
    "defaultRestDays" INTEGER NOT NULL DEFAULT 1,
    "requireVitalSigns" BOOLEAN NOT NULL DEFAULT true,
    "autoSaveDrafts" BOOLEAN NOT NULL DEFAULT true,
    "signatureRequired" BOOLEAN NOT NULL DEFAULT true,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_ruc_key" ON "Tenant"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "Establishment_tenantId_key" ON "Establishment"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_tenantId_key" ON "Institution"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "HceConfig_tenantId_key" ON "HceConfig"("tenantId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_issuedBy_fkey" FOREIGN KEY ("issuedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HceConfig" ADD CONSTRAINT "HceConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
