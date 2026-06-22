// Archivo: institution.service.ts
// Ruta: apps/api/src/institution/institution.service.ts
// Funcion: Gestion institucional, contexto clinico, usuarios y configuracion HCE.
import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstitutionService {
  constructor(private prisma: PrismaService) {}

  async getInstitution(tenantId: string) {
    const inst = await this.prisma.institution.findUnique({ where: { tenantId } });

    if (inst) return inst;

    return this.prisma.institution.create({
      data: {
        tenantId,
        name: 'CONSULTORIO MEDICO Y TOPICO DE PROCEDIMIENTOS LAS MERCEDES',
        legalName: 'AME HEALTH SAC',
        ruc: '20611138777',
        address: '',
        phone: '',
        email: '',
        city: 'Arequipa',
        country: 'Peru',
        logoUrl: '',
        signatureUrl: '',
        sealUrl: '',
        logoWidth: 70,
        logoHeight: 70,
        signatureWidth: 180,
        signatureHeight: 70,
        sealWidth: 120,
        sealHeight: 70,
        primaryColor: '#0f766e',
        secondaryColor: '#14b8a6',
        directorName: 'Dr. Alfonso Rodriguez Rojas',
        directorCmp: 'CMP 43992',
        directorRne: 'RNE 43920',
        timezone: 'America/Lima',
        language: 'es',
        altitudeMeters: 0,
        spo2AltitudeAdjustmentEnabled: false,
        spo2ReferenceProfile: 'ADULT_ACCLIMATIZED',
        spo2ExpectedMin: 95,
        spo2ExpectedMax: 100,
      },
    });
  }

  async updateInstitution(tenantId: string, data: any) {
    const altitudeMeters = this.integerInRange(data.altitudeMeters, 0, 8849, 0);
    const spo2ExpectedMin = this.integerInRange(data.spo2ExpectedMin, 50, 100, 95);
    const spo2ExpectedMax = this.integerInRange(data.spo2ExpectedMax, 50, 100, 100);

    if (spo2ExpectedMin > spo2ExpectedMax) {
      throw new BadRequestException(
        'La SpO2 esperada minima no puede superar la maxima.',
      );
    }

    const institutionData = {
      name: data.name,
      legalName: data.legalName,
      ruc: data.ruc,
      address: data.address,
      phone: data.phone,
      email: data.email,
      city: data.city,
      country: data.country,
      logoUrl: data.logoUrl,
      signatureUrl: data.signatureUrl,
      sealUrl: data.sealUrl,
      logoWidth: Number(data.logoWidth || 70),
      logoHeight: Number(data.logoHeight || 70),
      signatureWidth: Number(data.signatureWidth || 180),
      signatureHeight: Number(data.signatureHeight || 70),
      sealWidth: Number(data.sealWidth || 120),
      sealHeight: Number(data.sealHeight || 70),
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      directorName: data.directorName,
      directorCmp: data.directorCmp,
      directorRne: data.directorRne,
      timezone: data.timezone,
      language: data.language,
      altitudeMeters,
      spo2AltitudeAdjustmentEnabled:
        data.spo2AltitudeAdjustmentEnabled === true,
      spo2ReferenceProfile: 'ADULT_ACCLIMATIZED',
      spo2ExpectedMin,
      spo2ExpectedMax,
    };

    return this.prisma.institution.upsert({
      where: { tenantId },
      update: institutionData,
      create: {
        tenantId,
        ...institutionData,
        city: data.city || 'Arequipa',
        country: data.country || 'Peru',
        logoUrl: data.logoUrl || '',
        signatureUrl: data.signatureUrl || '',
        sealUrl: data.sealUrl || '',
        primaryColor: data.primaryColor || '#0f766e',
        secondaryColor: data.secondaryColor || '#14b8a6',
        timezone: data.timezone || 'America/Lima',
        language: data.language || 'es',
      },
    });
  }

  async getUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        cmp: true,
        rne: true,
        active: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async createUser(tenantId: string, data: any) {
    const tempPassword = data.password || 'AME2026';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    return this.prisma.user.create({
      data: {
        tenantId,
        email: data.email,
        fullName: data.fullName,
        role: data.role || 'medico',
        cmp: data.cmp,
        rne: data.rne,
        password: hashedPassword,
        active: data.active !== false,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        cmp: true,
        rne: true,
        active: true,
      },
    });
  }

  async toggleUser(tenantId: string, userId: string, active: boolean) {
    return this.prisma.user.updateMany({
      where: { id: userId, tenantId },
      data: { active },
    });
  }

  async getHceConfig(tenantId: string) {
    const config = await this.prisma.hceConfig.findUnique({ where: { tenantId } });

    if (config) return config;

    return this.prisma.hceConfig.create({
      data: {
        tenantId,
        requireCie10: true,
        allowMultipleDiagnoses: true,
        defaultRestDays: 1,
        requireVitalSigns: true,
        autoSaveDrafts: true,
        signatureRequired: true,
        customFields: [],
      },
    });
  }

  async updateHceConfig(tenantId: string, data: any) {
    return this.prisma.hceConfig.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data },
    });
  }

  private integerInRange(
    value: unknown,
    minimum: number,
    maximum: number,
    fallback: number,
  ) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) return fallback;

    const integerValue = Math.round(numericValue);

    if (integerValue < minimum || integerValue > maximum) {
      throw new BadRequestException(
        `El valor debe estar entre ${minimum} y ${maximum}.`,
      );
    }

    return integerValue;
  }
}
