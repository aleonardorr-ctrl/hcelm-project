import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    company: { findFirst: jest.fn() },
    businessUnit: { findFirst: jest.fn() },
    warehouse: { findFirst: jest.fn() },
    platformCompanyAccessAudit: { findUnique: jest.fn() },
  };

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.user.findFirst.mockResolvedValue({
      active: true,
      status: 'ACTIVE',
      tenant: { active: true, status: 'ACTIVE' },
    });
    prisma.company.findFirst.mockResolvedValue({
      active: true,
      status: 'ACTIVE',
    });
    prisma.businessUnit.findFirst.mockResolvedValue({ id: 'unit-1' });
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'warehouse-1' });

    const config = {
      get: jest.fn().mockReturnValue('a'.repeat(32)),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(config, prisma as unknown as PrismaService);
  });

  it('permite una sesión global sin empresa, unidad ni almacén', async () => {
    const result = await strategy.validate({
      sub: 'user-1',
      tenantId: 'tenant-1',
      platformRole: 'PLATFORM_SUPERADMIN',
    });

    expect(result.userId).toBe('user-1');
    expect(prisma.company.findFirst).not.toHaveBeenCalled();
    expect(prisma.businessUnit.findFirst).not.toHaveBeenCalled();
    expect(prisma.warehouse.findFirst).not.toHaveBeenCalled();
  });

  it('permite un contexto operativo activo y coherente', async () => {
    const result = await strategy.validate({
      sub: 'user-1',
      tenantId: 'tenant-1',
      companyId: 'company-1',
      businessUnitId: 'unit-1',
      warehouseId: 'warehouse-1',
    });

    expect(result.companyId).toBe('company-1');
    expect(prisma.businessUnit.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'unit-1',
        tenantId: 'tenant-1',
        companyId: 'company-1',
        active: true,
      },
      select: { id: true },
    });
    expect(prisma.warehouse.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'warehouse-1',
        tenantId: 'tenant-1',
        companyId: 'company-1',
        businessUnitId: 'unit-1',
        active: true,
      },
      select: { id: true },
    });
  });

  it('rechaza una unidad inactiva o ajena al contexto', async () => {
    prisma.businessUnit.findFirst.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'user-1',
        tenantId: 'tenant-1',
        companyId: 'company-1',
        businessUnitId: 'unit-2',
      }),
    ).rejects.toThrow(
      new UnauthorizedException(
        'La unidad de negocio está inactiva o no pertenece al contexto autenticado.',
      ),
    );
  });

  it('rechaza un almacén inactivo o ajeno a la unidad', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'user-1',
        tenantId: 'tenant-1',
        companyId: 'company-1',
        businessUnitId: 'unit-1',
        warehouseId: 'warehouse-2',
      }),
    ).rejects.toThrow(
      new UnauthorizedException(
        'El almacén está inactivo o no pertenece al contexto autenticado.',
      ),
    );
  });

  it('permite un acceso temporal cuyo contexto coincide con la auditoría', async () => {
    prisma.platformCompanyAccessAudit.findUnique.mockResolvedValue({
      id: 'audit-1',
      platformUserId: 'user-1',
      tenantId: 'tenant-1',
      companyId: 'company-1',
      businessUnitId: 'unit-1',
      warehouseId: 'warehouse-1',
      accessMode: 'COMPANY_OPERATION',
      status: 'ACTIVE',
      exitedAt: null,
    });

    const result = await strategy.validate({
      sub: 'user-1',
      tenantId: 'tenant-1',
      companyId: 'company-1',
      businessUnitId: 'unit-1',
      warehouseId: 'warehouse-1',
      accessMode: 'COMPANY_OPERATION',
      platformAccessAuditId: 'audit-1',
    });

    expect(result.platformAccessAuditId).toBe('audit-1');
  });
});
