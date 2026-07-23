import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

describe('AuthService login operativo', () => {
  const businessUnits = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      code: 'CONSULTORIO',
      name: 'Consultorio Médico',
      active: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      code: 'DROGUERIA',
      name: 'Droguería AME HEALTH SAC',
      active: true,
    },
  ];
  const prisma = {
    company: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    userCompanyMembership: { findFirst: jest.fn() },
  };
  const jwt = { signAsync: jest.fn() };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.company.findFirst.mockResolvedValue({
      id: 'company-1',
      tenantId: 'tenant-1',
      code: 'AME',
      legalName: 'AME HEALTH SAC',
      tradeName: 'AME HEALTH SAC',
      ruc: '20611138777',
      active: true,
      tenant: {
        id: 'tenant-1',
        name: 'Grupo Rodríguez',
        ruc: null,
        active: true,
      },
      businessUnits,
    });
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'usuario@ame.test',
      password: 'password-hash',
      fullName: 'Usuario de prueba',
      role: 'ADMIN',
      platformRole: null,
      active: true,
    });
    prisma.userCompanyMembership.findFirst.mockResolvedValue({
      id: 'membership-1',
      role: 'ADMIN',
      isDefault: true,
      active: true,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwt.signAsync.mockResolvedValue('signed-token');

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
  });

  it('emite el token con la unidad seleccionada y devuelve las opciones activas', async () => {
    const result = await service.login(
      '20611138777',
      'usuario@ame.test',
      'password',
      businessUnits[1].id,
    );

    expect(result.businessUnit?.id).toBe(businessUnits[1].id);
    expect(result.businessUnits).toEqual(businessUnits);
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        businessUnitId: businessUnits[1].id,
        businessUnitCode: 'DROGUERIA',
      }),
    );
  });

  it('rechaza una unidad que no pertenece a la empresa activa', async () => {
    await expect(
      service.login(
        '20611138777',
        'usuario@ame.test',
        'password',
        '33333333-3333-4333-8333-333333333333',
      ),
    ).rejects.toThrow(
      new UnauthorizedException(
        'La unidad de negocio seleccionada no pertenece a la empresa o no está activa.',
      ),
    );

    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('conserva el Consultorio como contexto preferido si no se envía unidad', async () => {
    const result = await service.login(
      '20611138777',
      'usuario@ame.test',
      'password',
    );

    expect(result.businessUnit?.code).toBe('CONSULTORIO');
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ businessUnitCode: 'CONSULTORIO' }),
    );
  });
});
