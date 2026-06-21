/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,hceNumber]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "hceNumber" VARCHAR(30);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_tenantId_hceNumber_key" ON "Patient"("tenantId", "hceNumber");
