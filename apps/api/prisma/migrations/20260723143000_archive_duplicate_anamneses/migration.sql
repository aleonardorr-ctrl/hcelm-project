CREATE TABLE "AnamnesisDuplicateArchive" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "originalAnamnesisId" UUID NOT NULL,
    "canonicalAnamnesisId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "originalCreatedAt" TIMESTAMP(3) NOT NULL,
    "originalUpdatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,

    CONSTRAINT "AnamnesisDuplicateArchive_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnamnesisDuplicateArchive_originalAnamnesisId_key"
ON "AnamnesisDuplicateArchive"("originalAnamnesisId");

CREATE INDEX "AnamnesisDuplicateArchive_tenantId_encounterId_idx"
ON "AnamnesisDuplicateArchive"("tenantId", "encounterId");

CREATE INDEX "AnamnesisDuplicateArchive_canonicalAnamnesisId_idx"
ON "AnamnesisDuplicateArchive"("canonicalAnamnesisId");

CREATE TABLE "_AnamnesisDuplicateResolution" AS
SELECT
    "id",
    FIRST_VALUE("id") OVER (
        PARTITION BY "tenantId", "encounterId"
        ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS "canonicalAnamnesisId",
    ROW_NUMBER() OVER (
        PARTITION BY "tenantId", "encounterId"
        ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS "rowNumber"
FROM "Anamnesis"
WHERE "encounterId" IS NOT NULL;

INSERT INTO "AnamnesisDuplicateArchive" (
    "originalAnamnesisId",
    "canonicalAnamnesisId",
    "tenantId",
    "patientId",
    "encounterId",
    "payload",
    "originalCreatedAt",
    "originalUpdatedAt",
    "reason"
)
SELECT
    anamnesis."id",
    resolution."canonicalAnamnesisId",
    anamnesis."tenantId",
    anamnesis."patientId",
    anamnesis."encounterId",
    to_jsonb(anamnesis),
    anamnesis."createdAt",
    anamnesis."updatedAt",
    'Consolidación reversible de anamnesis duplicadas por atención'
FROM "_AnamnesisDuplicateResolution" AS resolution
INNER JOIN "Anamnesis" AS anamnesis
    ON anamnesis."id" = resolution."id"
WHERE resolution."rowNumber" > 1;

UPDATE "Prescription" AS prescription
SET "anamnesisId" = resolution."canonicalAnamnesisId"
FROM "_AnamnesisDuplicateResolution" AS resolution
WHERE resolution."rowNumber" > 1
  AND prescription."anamnesisId" = resolution."id";

DELETE FROM "Anamnesis" AS anamnesis
USING "_AnamnesisDuplicateResolution" AS resolution
WHERE resolution."rowNumber" > 1
  AND anamnesis."id" = resolution."id";

DROP TABLE "_AnamnesisDuplicateResolution";

CREATE UNIQUE INDEX "Anamnesis_tenantId_encounterId_key"
ON "Anamnesis"("tenantId", "encounterId");
