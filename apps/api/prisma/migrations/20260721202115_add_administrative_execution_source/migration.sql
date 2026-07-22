-- CreateEnum
CREATE TYPE "PlatformAdministrativeExecutionSource" AS ENUM ('USER', 'SYSTEM');

-- AlterTable
ALTER TABLE "PlatformAdministrativeActionAudit" ADD COLUMN     "executionSource" "PlatformAdministrativeExecutionSource" NOT NULL DEFAULT 'USER',
ALTER COLUMN "performedByPlatformUserId" DROP NOT NULL;
