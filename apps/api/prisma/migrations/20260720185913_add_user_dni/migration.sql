/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,dni]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dni" VARCHAR(8);

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_dni_key" ON "User"("tenantId", "dni");
