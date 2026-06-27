const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { Pool } = require('pg');

const root = process.cwd();
const envPath = path.join(root, 'apps', 'api', '.env');

if (!fs.existsSync(envPath)) {
  console.error('ERROR: no existe apps/api/.env.');
  process.exit(1);
}

dotenv.config({ path: envPath });
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL no esta definida en apps/api/.env.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function normalizedCode(value, fallback) {
  const clean = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  return clean || fallback;
}

async function main() {
  const client = await pool.connect();
  const summary = {
    companies: 0,
    memberships: 0,
    companyMedications: 0,
    businessUnits: 0,
    warehouses: 0,
    lotsUpdated: 0,
  };

  try {
    await client.query('BEGIN');

    const tenants = await client.query(`
      SELECT t."id", t."name", t."ruc",
             i."legalName", i."name" AS "institutionName"
      FROM "Tenant" t
      LEFT JOIN "Institution" i ON i."tenantId" = t."id"
      WHERE t."active" = TRUE
      ORDER BY t."createdAt" ASC
    `);

    const companyByTenant = new Map();

    for (const tenant of tenants.rows) {
      const existingCompanyCount = await client.query(
        `SELECT COUNT(*)::int AS "count" FROM "Company" WHERE "tenantId" = $1`,
        [tenant.id],
      );
      if (existingCompanyCount.rows[0].count > 1) {
        throw new Error(
          `El tenant ${tenant.id} ya tiene mas de una empresa. El backfill inicial no puede decidir a cual pertenecen los datos heredados.`,
        );
      }

      const legalName = tenant.legalName || tenant.name;
      const tradeName = tenant.institutionName || tenant.name;
      const baseCode = normalizedCode(legalName.split(/\s+/)[0], tenant.ruc);

      let company = await client.query(
        `SELECT "id" FROM "Company" WHERE "tenantId" = $1 AND "ruc" = $2 LIMIT 1`,
        [tenant.id, tenant.ruc],
      );

      if (!company.rowCount) {
        company = await client.query(
          `INSERT INTO "Company"
            ("id", "tenantId", "code", "legalName", "tradeName", "ruc", "active", "isDefault", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, NOW(), NOW())
           RETURNING "id"`,
          [crypto.randomUUID(), tenant.id, baseCode, legalName, tradeName, tenant.ruc],
        );
        summary.companies += 1;
      }

      const companyId = company.rows[0].id;
      companyByTenant.set(tenant.id, companyId);

      const membershipResult = await client.query(
        `INSERT INTO "UserCompanyMembership"
          ("id", "tenantId", "userId", "companyId", "role", "isDefault", "active", "createdAt", "updatedAt")
         SELECT gen_random_uuid(), u."tenantId", u."id", $2, u."role", TRUE, TRUE, NOW(), NOW()
         FROM "User" u
         WHERE u."tenantId" = $1
         ON CONFLICT ("userId", "companyId") DO NOTHING`,
        [tenant.id, companyId],
      );
      summary.memberships += membershipResult.rowCount || 0;

      const medicationResult = await client.query(
        `INSERT INTO "CompanyMedication"
          ("id", "tenantId", "companyId", "medicationId", "companySku", "barcode", "active", "createdAt", "updatedAt")
         SELECT gen_random_uuid(), m."tenantId", $2, m."id", m."internalCode", m."barcode", m."active", NOW(), NOW()
         FROM "Medication" m
         WHERE m."tenantId" = $1
         ON CONFLICT ("companyId", "medicationId") DO NOTHING`,
        [tenant.id, companyId],
      );
      summary.companyMedications += medicationResult.rowCount || 0;
    }

    const dimensions = await client.query(`
      SELECT DISTINCT "tenantId", "businessUnit", "warehouse"
      FROM "MedicationInventoryLot"
      ORDER BY "tenantId", "businessUnit", "warehouse"
    `);

    const unitCache = new Map();
    const warehouseCache = new Map();

    for (const row of dimensions.rows) {
      const companyId = companyByTenant.get(row.tenantId);
      if (!companyId) throw new Error(`No existe empresa predeterminada para tenant ${row.tenantId}.`);

      const unitCode = normalizedCode(row.businessUnit, 'SIN_UNIDAD');
      const unitKey = `${companyId}|${unitCode}`;
      let businessUnitId = unitCache.get(unitKey);

      if (!businessUnitId) {
        let unit = await client.query(
          `SELECT "id" FROM "BusinessUnit" WHERE "companyId" = $1 AND "code" = $2 LIMIT 1`,
          [companyId, unitCode],
        );
        if (!unit.rowCount) {
          unit = await client.query(
            `INSERT INTO "BusinessUnit"
              ("id", "tenantId", "companyId", "code", "name", "type", "active", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
             RETURNING "id"`,
            [crypto.randomUUID(), row.tenantId, companyId, unitCode, row.businessUnit, unitCode],
          );
          summary.businessUnits += 1;
        }
        businessUnitId = unit.rows[0].id;
        unitCache.set(unitKey, businessUnitId);
      }

      const warehouseCode = normalizedCode(row.warehouse, 'PRINCIPAL');
      const warehouseKey = `${businessUnitId}|${warehouseCode}`;
      let warehouseId = warehouseCache.get(warehouseKey);

      if (!warehouseId) {
        let warehouse = await client.query(
          `SELECT "id" FROM "Warehouse" WHERE "businessUnitId" = $1 AND "code" = $2 LIMIT 1`,
          [businessUnitId, warehouseCode],
        );
        if (!warehouse.rowCount) {
          warehouse = await client.query(
            `INSERT INTO "Warehouse"
              ("id", "tenantId", "companyId", "businessUnitId", "code", "name", "active", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
             RETURNING "id"`,
            [crypto.randomUUID(), row.tenantId, companyId, businessUnitId, warehouseCode, row.warehouse],
          );
          summary.warehouses += 1;
        }
        warehouseId = warehouse.rows[0].id;
        warehouseCache.set(warehouseKey, warehouseId);
      }

      const lotResult = await client.query(
        `UPDATE "MedicationInventoryLot" l
         SET "companyId" = $4,
             "businessUnitId" = $5,
             "warehouseId" = $6,
             "companyMedicationId" = cm."id"
         FROM "CompanyMedication" cm
         WHERE l."tenantId" = $1
           AND l."businessUnit" = $2
           AND l."warehouse" = $3
           AND cm."tenantId" = l."tenantId"
           AND cm."companyId" = $4
           AND cm."medicationId" = l."medicationId"`,
        [row.tenantId, row.businessUnit, row.warehouse, companyId, businessUnitId, warehouseId],
      );
      summary.lotsUpdated += lotResult.rowCount || 0;
    }

    const invalid = await client.query(`
      SELECT COUNT(*)::int AS "count"
      FROM "MedicationInventoryLot"
      WHERE "companyId" IS NULL
         OR "businessUnitId" IS NULL
         OR "warehouseId" IS NULL
         OR "companyMedicationId" IS NULL
    `);

    if (invalid.rows[0].count !== 0) {
      throw new Error(`${invalid.rows[0].count} lotes quedaron sin asignacion organizacional.`);
    }

    await client.query('COMMIT');
    console.log('OK: migracion de datos multiempresa completada.');
    console.table(summary);
    console.log('Verificacion: 0 lotes sin empresa, unidad, almacen o SKU empresarial.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`ERROR: ${error.message}`);
    console.error('Se revirtieron todos los cambios de esta ejecucion.');
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
