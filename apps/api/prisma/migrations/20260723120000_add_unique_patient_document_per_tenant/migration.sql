CREATE UNIQUE INDEX "Patient_tenantId_documentType_documentNumber_key"
ON "Patient"("tenantId", "documentType", "documentNumber");
