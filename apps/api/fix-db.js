const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function fix() {
  console.log('🔧 Creando entorno manual...');
  
  try {
    // 1. Crear Tenant (Empresa)
    const tenant = await prisma.tenant.create({
      data: {
        name: 'AME HEALTH SAC',
        ruc: '20611138777',
        address: 'Arequipa, Perú',
        subscriptionStatus: 'ACTIVE',
        subscriptionExpiresAt: new Date('2030-12-31'),
      }
    });
    console.log('✅ Tenant creado:', tenant.ruc);

    // 2. Crear Usuario Admin
    const hash = await bcrypt.hash('AME2026', 10);
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'admin@amehealth.pe',
        fullName: 'Dr. Alfonso Rodriguez',
        role: 'DIRECTOR',
        passwordHash: hash,
        isActive: true
      }
    });
    console.log('✅ Usuario admin creado.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fix();