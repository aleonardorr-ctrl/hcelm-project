import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InstitutionService {
  constructor(private prisma: PrismaService) {}

  async getInstitution(tenantId: string) {
    const inst = await this.prisma.institution.findUnique({
      where: { tenantId },
    });

    if (inst) return inst;

    return this.prisma.institution.create({
      data: {
        tenantId,
        name: 'CONSULTORIO MÉDICO Y TÓPICO DE PROCEDIMIENTOS LAS MERCEDES',
        legalName: 'AME HEALTH SAC',
        ruc: '20611138777',
        address: '',
        phone: '',
        email: '',
        city: 'Arequipa',
        country: 'Perú',

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

        directorName: 'Dr. Alfonso Rodríguez Rojas',
        directorCmp: 'CMP 43992',
        directorRne: 'RNE 43920',

        timezone: 'America/Lima',
        language: 'es',
      },
    });
  }

  async updateInstitution(tenantId: string, data: any) {
    return this.prisma.institution.upsert({
      where: { tenantId },
      update: {
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
      },
      create: {
        tenantId,
        name: data.name,
        legalName: data.legalName,
        ruc: data.ruc,
        address: data.address,
        phone: data.phone,
        email: data.email,
        city: data.city || 'Arequipa',
        country: data.country || 'Perú',

        logoUrl: data.logoUrl || '',
        signatureUrl: data.signatureUrl || '',
        sealUrl: data.sealUrl || '',

        logoWidth: Number(data.logoWidth || 70),
        logoHeight: Number(data.logoHeight || 70),
        signatureWidth: Number(data.signatureWidth || 180),
        signatureHeight: Number(data.signatureHeight || 70),
        sealWidth: Number(data.sealWidth || 120),
        sealHeight: Number(data.sealHeight || 70),

        primaryColor: data.primaryColor || '#0f766e',
        secondaryColor: data.secondaryColor || '#14b8a6',

        directorName: data.directorName,
        directorCmp: data.directorCmp,
        directorRne: data.directorRne,

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
      where: {
        id: userId,
        tenantId,
      },
      data: { active },
    });
  }

  async getHceConfig(tenantId: string) {
    const config = await this.prisma.hceConfig.findUnique({
      where: { tenantId },
    });

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
      create: {
        tenantId,
        ...data,
      },
    });
  }
}