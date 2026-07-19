-- AlterTable
ALTER TABLE "PharmacyFefoRule" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "platformRole" VARCHAR(40);

-- RenameIndex
ALTER INDEX "PharmacyFefoAuthorization_approver_idx" RENAME TO "PharmacyFefoAuthorization_tenantId_approvedById_approvedAt_idx";

-- RenameIndex
ALTER INDEX "PharmacyFefoAuthorization_consumed_sale_idx" RENAME TO "PharmacyFefoAuthorization_consumedBySaleId_idx";

-- RenameIndex
ALTER INDEX "PharmacyFefoAuthorization_product_lot_status_idx" RENAME TO "PharmacyFefoAuthorization_tenantId_medicationId_lotId_statu_idx";

-- RenameIndex
ALTER INDEX "PharmacyFefoAuthorization_requester_status_idx" RENAME TO "PharmacyFefoAuthorization_tenantId_requestedById_status_cre_idx";

-- RenameIndex
ALTER INDEX "PharmacyFefoAuthorization_scope_status_created_idx" RENAME TO "PharmacyFefoAuthorization_tenantId_companyId_businessUnitId_idx";

-- RenameIndex
ALTER INDEX "PharmacyFefoAuthorization_token_idx" RENAME TO "PharmacyFefoAuthorization_tenantId_authorizationTokenHash_idx";

-- RenameIndex
ALTER INDEX "PharmacyFefoAuthorization_valid_until_status_idx" RENAME TO "PharmacyFefoAuthorization_validUntil_status_idx";

-- RenameIndex
ALTER INDEX "PharmacyFefoRule_tenantId_companyId_businessUnitId_active_displ" RENAME TO "PharmacyFefoRule_tenantId_companyId_businessUnitId_active_d_idx";
