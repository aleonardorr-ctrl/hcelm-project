import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(ruc: string, email: string, password: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ruc, active: true },
    });

    if (!tenant) {
      throw new UnauthorizedException('Empresa (RUC) no encontrada');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email,
        active: true,
      },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const access_token = await this.jwtService.signAsync(payload);

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      access_token,
      token: access_token,
    };
  }
}