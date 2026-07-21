-- AlterTable
ALTER TABLE "PlatformAdministrativeActionAudit" ALTER COLUMN "targetEntityId" DROP NOT NULL,
ALTER COLUMN "previousStatus" DROP NOT NULL,
ALTER COLUMN "resultingStatus" DROP NOT NULL;
