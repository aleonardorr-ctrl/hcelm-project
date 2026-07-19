import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;

const adapter = new PrismaPg(
  new Pool({
    connectionString,
  }),
);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Iniciando seed...');

  const tenantId = '00000000-0000-0000-0000-000000000001';

  let tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Grupo Rodríguez',
        ruc: '20611138777',
        active: true,
      },
    });

    console.log('✅ Tenant creado');
  }

  // HCELM_MULTIEMPRESA_SEED: grupo empresarial predeterminado Grupo Rodríguez.
  const company = await prisma.company.upsert({
    where: {
      tenantId_ruc: {
        tenantId,
        ruc: '20611138777',
      },
    },
    update: {
      code: 'AME',
      legalName: 'AME HEALTH SAC',
      tradeName: 'AME HEALTH SAC',
      active: true,
      isDefault: true,
    },
    create: {
      tenantId,
      code: 'AME',
      legalName: 'AME HEALTH SAC',
      tradeName: 'AME HEALTH SAC',
      ruc: '20611138777',
      active: true,
      isDefault: true,
    },
  });

  const defaultBusinessUnits = [
    {
      code: 'CONSULTORIO',
      name: 'Consultorio Medico y Topico Las Mercedes',
      type: 'CLINICAL',
    },
    {
      code: 'DROGUERIA',
      name: 'Drogueria AME HEALTH SAC',
      type: 'DRUGSTORE',
    },
  ];

  for (const unitData of defaultBusinessUnits) {
    const businessUnit = await prisma.businessUnit.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: unitData.code,
        },
      },
      update: {
        name: unitData.name,
        type: unitData.type,
        active: true,
      },
      create: {
        tenantId,
        companyId: company.id,
        ...unitData,
        active: true,
      },
    });

    await prisma.warehouse.upsert({
      where: {
        businessUnitId_code: {
          businessUnitId: businessUnit.id,
          code: 'PRINCIPAL',
        },
      },
      update: {
        name: 'Almacen principal',
        active: true,
      },
      create: {
        tenantId,
        companyId: company.id,
        businessUnitId: businessUnit.id,
        code: 'PRINCIPAL',
        name: 'Almacen principal',
        active: true,
      },
    });
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: 'admin@amehealth.pe' },
  });

  if (!existingUser) {
    const initialAdminPassword = process.env.HCELM_SEED_ADMIN_PASSWORD || '';
    if (initialAdminPassword.length < 12) {
      throw new Error(
        'Defina HCELM_SEED_ADMIN_PASSWORD con al menos 12 caracteres para crear el administrador inicial.',
      );
    }
    const hashedPassword = await bcrypt.hash(initialAdminPassword, 12);

    await prisma.user.create({
      data: {
        id: '00000000-0000-0000-0000-000000000002',
        tenantId,
        email: 'admin@amehealth.pe',
        password: hashedPassword,
        fullName: 'Dr. Alfonso',
        role: 'admin',
        cmp: 'CMP 43992',
        active: true,
      },
    });

    console.log('✅ Usuario Admin creado');
  }

  const adminUser = await prisma.user.findFirst({
    where: { tenantId, email: 'admin@amehealth.pe' },
  });

  if (adminUser) {
    await prisma.userCompanyMembership.upsert({
      where: {
        userId_companyId: {
          userId: adminUser.id,
          companyId: company.id,
        },
      },
      update: {
        role: adminUser.role,
        isDefault: true,
        active: true,
      },
      create: {
        tenantId,
        userId: adminUser.id,
        companyId: company.id,
        role: adminUser.role,
        isDefault: true,
        active: true,
      },
    });
  }

  const existingPatient = await prisma.patient.findFirst({
    where: { documentNumber: '78945612' },
  });

  if (!existingPatient) {
    await prisma.patient.create({
      data: {
        id: '00000000-0000-0000-0000-000000000003',
        tenantId,
        fullName: 'Juan Pérez',
        documentNumber: '78945612',
        documentType: 'DNI',
      },
    });

    console.log('✅ Paciente de prueba creado');
  }

  const medications = [
    {
      genericName: 'Paracetamol',
      commercialName: 'Panadol',
      concentration: '500 mg',
      presentation: 'Tableta',
      route: 'Vía oral',
    },
    {
      genericName: 'Paracetamol',
      commercialName: 'Acetaminofén',
      concentration: '120 mg/5 mL',
      presentation: 'Jarabe',
      route: 'Vía oral',
    },
    {
      genericName: 'Ibuprofeno',
      commercialName: 'Doloflam',
      concentration: '400 mg',
      presentation: 'Tableta',
      route: 'Vía oral',
    },
    {
      genericName: 'Amoxicilina',
      commercialName: 'Amoxil',
      concentration: '500 mg',
      presentation: 'Cápsula',
      route: 'Vía oral',
    },
    {
      genericName: 'Amoxicilina + Ácido clavulánico',
      commercialName: 'Augmentin',
      concentration: '875 mg/125 mg',
      presentation: 'Tableta',
      route: 'Vía oral',
    },
    {
      genericName: 'Azitromicina',
      commercialName: 'Zitromax',
      concentration: '500 mg',
      presentation: 'Tableta',
      route: 'Vía oral',
    },
    {
      genericName: 'Ceftriaxona',
      commercialName: 'Rocephin',
      concentration: '1 g',
      presentation: 'Vial',
      route: 'Vía IM/EV',
    },
    {
      genericName: 'Omeprazol',
      commercialName: 'Losec',
      concentration: '20 mg',
      presentation: 'Cápsula',
      route: 'Vía oral',
    },
    {
      genericName: 'Omeprazol',
      commercialName: 'Losec IV',
      concentration: '40 mg',
      presentation: 'Ampolla',
      route: 'Vía endovenosa',
    },
    {
      genericName: 'Losartán',
      commercialName: 'Cozaar',
      concentration: '50 mg',
      presentation: 'Tableta',
      route: 'Vía oral',
    },
    {
      genericName: 'Metformina',
      commercialName: 'Glucophage',
      concentration: '850 mg',
      presentation: 'Tableta',
      route: 'Vía oral',
    },
    {
      genericName: 'Salbutamol',
      commercialName: 'Ventolin',
      concentration: '100 mcg/dosis',
      presentation: 'Inhalador',
      route: 'Vía inhalatoria',
    },
    {
      genericName: 'Dexametasona',
      commercialName: 'Decadron',
      concentration: '4 mg/mL',
      presentation: 'Ampolla',
      route: 'Vía IM/EV',
    },
    {
      genericName: 'Ketorolaco',
      commercialName: 'Dolgenal',
      concentration: '30 mg/mL',
      presentation: 'Ampolla',
      route: 'Vía IM/EV',
    },
  ];

  for (const med of medications) {
    const exists = await prisma.medication.findFirst({
      where: {
        tenantId,
        genericName: med.genericName,
        concentration: med.concentration,
        presentation: med.presentation,
      },
    });

    if (!exists) {
      await prisma.medication.create({
        data: {
          tenantId,
          ...med,
          active: true,
        },
      });
    }
  }

  const tenantMedications = await prisma.medication.findMany({
    where: { tenantId },
  });

  for (const medication of tenantMedications) {
    await prisma.companyMedication.upsert({
      where: {
        companyId_medicationId: {
          companyId: company.id,
          medicationId: medication.id,
        },
      },
      update: {
        companySku: medication.internalCode,
        barcode: medication.barcode,
        active: medication.active,
      },
      create: {
        tenantId,
        companyId: company.id,
        medicationId: medication.id,
        companySku: medication.internalCode,
        barcode: medication.barcode,
        active: medication.active,
      },
    });
  }

  console.log('✅ Medicamentos iniciales cargados');
  console.log('🎉 Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
