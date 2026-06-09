import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EstablishmentService {
  constructor(private prisma: PrismaService) {}

  async getConfig(tenantId: string) {
    let config = await (this.prisma as any).establishment.findUnique({ where: { tenantId } });
    
    // Si no existe, creamos uno por defecto con los datos del seed
    if (!config) {
      const tenant = await (this.prisma as any).tenant.findUnique({ where: { id: tenantId } });
      config = await (this.prisma as any).establishment.create({
        data: { 
          tenantId, 
          name: tenant?.name || 'AME HEALTH SAC',
          directorName: 'Dr. Alfonso Rodriguez Rojas',
          directorCmp: 'CMP 43992'
        }
      });
    }
    return config;
  }

  async updateConfig(tenantId: string, data: any) {
    const updateData = {
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      directorName: data.directorName,
      directorCmp: data.directorCmp,
      logoUrl: data.logoUrl,
    };

    return await (this.prisma as any).establishment.upsert({
      where: { tenantId },
      create: { tenantId, ...updateData },
      update: updateData,
    });
  }
}