-- Corregir lotes demo: asignar companyMedicationId
UPDATE "MedicationInventoryLot" SET "companyMedicationId" = '465facc6-02b0-4fbe-ad9c-c4917c11691b' WHERE "lotNumber" = 'OTC-PARA-001';
UPDATE "MedicationInventoryLot" SET "companyMedicationId" = '5768b04d-6e86-43b1-adb1-8132ed6f7045' WHERE "lotNumber" = 'OTC-SRO-001';
UPDATE "MedicationInventoryLot" SET "companyMedicationId" = '66aaba54-6b8e-4c95-9c1c-6622f4301c5a' WHERE "lotNumber" = 'OTC-ALC-001';
UPDATE "MedicationInventoryLot" SET "companyMedicationId" = '529e4b20-d4d7-4f09-a44f-583249790576' WHERE "lotNumber" = 'RX-AMOX-001';
UPDATE "MedicationInventoryLot" SET "companyMedicationId" = '681898c0-d575-4cc4-847e-462c342beb63' WHERE "lotNumber" = 'RX-AZI-001';
UPDATE "MedicationInventoryLot" SET "companyMedicationId" = '07a46fd1-69fc-46ec-9860-31b63ecc3b89' WHERE "lotNumber" = 'RX-PRED-001';
UPDATE "MedicationInventoryLot" SET "companyMedicationId" = '6c33f97a-a1ff-44f4-b5fb-7999851c58a6' WHERE "lotNumber" = 'RX-LOS-001';

-- Verificar corrección
SELECT l."lotNumber", l.stock, l."salePrice", cm."companySku"
FROM "MedicationInventoryLot" l
JOIN "CompanyMedication" cm ON cm.id = l."companyMedicationId"
WHERE l."lotNumber" LIKE 'OTC-%' OR l."lotNumber" LIKE 'RX-%'
ORDER BY l."lotNumber";
