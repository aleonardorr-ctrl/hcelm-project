import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(ruc: string, email: string, password: string) {
    const normalizedRuc = String(ruc || '').trim();
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();

    const company = await this.prisma.company.findFirst({
      where: {
        ruc: normalizedRuc,
        active: true,
        tenant: {
          active: true,
        },
      },
      select: {
        id: true,
        tenantId: true,
        code: true,
        legalName: true,
        tradeName: true,
        ruc: true,
        active: true,
        tenant: {
          select: {
            id: true,
            name: true,
            ruc: true,
            active: true,
          },
        },
        businessUnits: {
          where: {
            active: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            code: true,
            name: true,
            active: true,
          },
        },
      },
    });

    if (!company) {
      throw new UnauthorizedException(
        'Empresa no encontrada o no habilitada para ingresar.',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: company.tenantId,
        email: normalizedEmail,
        active: true,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        password: true,
        fullName: true,
        role: true,
        platformRole: true,
        active: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const membership = await this.prisma.userCompanyMembership.findFirst({
      where: {
        tenantId: company.tenantId,
        userId: user.id,
        companyId: company.id,
        active: true,
        company: {
          active: true,
        },
      },
      select: {
        id: true,
        role: true,
        isDefault: true,
        active: true,
      },
    });

    if (!membership) {
      throw new UnauthorizedException(
        'El usuario no tiene acceso activo a la empresa seleccionada.',
      );
    }

    const preferredBusinessUnit =
      company.businessUnits.find((unit) => {
        const code = String(unit.code || '').toUpperCase();

        if (company.code === 'SUMCRIT') {
          return code === 'BOTICA';
        }

        return code === 'CONSULTORIO';
      }) || company.businessUnits[0];

    const payload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      platformRole: user.platformRole,
      tenantId: user.tenantId,
      tenantName: company.tenant.name,
      companyId: company.id,
      companyCode: company.code,
      companyName: company.tradeName || company.legalName,
      companyLegalName: company.legalName,
      companyRuc: company.ruc,
      membershipRole: membership.role,
      businessUnitId: preferredBusinessUnit?.id || null,
      businessUnitCode: preferredBusinessUnit?.code || null,
      businessUnitName: preferredBusinessUnit?.name || null,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        platformRole: user.platformRole,
        active: user.active,
      },
      tenant: company.tenant,
      company: {
        id: company.id,
        code: company.code,
        legalName: company.legalName,
        tradeName: company.tradeName,
        ruc: company.ruc,
      },
      businessUnit: preferredBusinessUnit || null,
      membership,
      access_token: accessToken,
      token: accessToken,
    };
  }
}
