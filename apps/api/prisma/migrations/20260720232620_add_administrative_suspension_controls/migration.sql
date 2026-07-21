-- CreateEnum
CREATE TYPE "AdministrativeEntityStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "reactivatedAt" TIMESTAMP(3),
ADD COLUMN     "reactivatedByPlatformUserId" UUID,
ADD COLUMN     "reactivationReason" VARCHAR(500),
ADD COLUMN     "status" "AdministrativeEntityStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedByPlatformUserId" UUID,
ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ADD COLUMN     "suspensionCategory" VARCHAR(50),
ADD COLUMN     "suspensionReason" VARCHAR(500);

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "reactivatedAt" TIMESTAMP(3),
ADD COLUMN     "reactivatedByPlatformUserId" UUID,
ADD COLUMN     "reactivationReason" VARCHAR(500),
ADD COLUMN     "status" "AdministrativeEntityStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedByPlatformUserId" UUID,
ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ADD COLUMN     "suspensionCategory" VARCHAR(50),
ADD COLUMN     "suspensionReason" VARCHAR(500);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "reactivatedAt" TIMESTAMP(3),
ADD COLUMN     "reactivatedByPlatformUserId" UUID,
ADD COLUMN     "reactivationReason" VARCHAR(500),
ADD COLUMN     "status" "AdministrativeEntityStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedByPlatformUserId" UUID,
ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ADD COLUMN     "suspensionCategory" VARCHAR(50),
ADD COLUMN     "suspensionReason" VARCHAR(500);
