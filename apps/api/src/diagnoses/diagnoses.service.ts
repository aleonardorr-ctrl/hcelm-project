/**
 * Archivo: diagnoses.service.ts
 * Ruta: apps/api/src/diagnoses/diagnoses.service.ts
 * Función: Búsqueda normalizada en los catálogos CIE del tenant.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiagnosesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, query: string, system = 'CIE10') {
    const normalizedQuery = String(query || '').trim();
    const normalizedSystem = this.normalizeSystem(system);

    if (!normalizedQuery) return [];

    const diagnoses = await this.prisma.diagnosisCatalog.findMany({
      where: {
        tenantId,
        system: normalizedSystem,
        active: true,
        OR: [
          { code: { contains: normalizedQuery, mode: 'insensitive' } },
          { description: { contains: normalizedQuery, mode: 'insensitive' } },
          { searchText: { contains: normalizedQuery, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ code: 'asc' }],
      take: 30,
      select: {
        id: true,
        system: true,
        code: true,
        description: true,
        chapter: true,
        group: true,
        subgroup: true,
        synonyms: true,
      },
    });

    return diagnoses.map((diagnosis) => ({
      ...diagnosis,
      desc: diagnosis.description,
    }));
  }

  private normalizeSystem(value?: string | null) {
    const system = String(value || 'CIE10')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    return system === 'CIE11' ? 'CIE11' : 'CIE10';
  }
}
