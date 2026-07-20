-- AlterTable
ALTER TABLE "PlatformCompanyAccessAudit" ADD COLUMN     "closedByPlatformUserId" UUID,
ADD COLUMN     "closureReason" VARCHAR(500),
ADD COLUMN     "closureSource" VARCHAR(40);

-- CreateIndex
CREATE INDEX "PlatformCompanyAccessAudit_closedByPlatformUserId_exitedAt_idx" ON "PlatformCompanyAccessAudit"("closedByPlatformUserId", "exitedAt");
