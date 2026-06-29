import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CompanyCollaborationDirection,
  CompanyCollaborationResource,
  CompanyCollaborationStatus,
  CompanyModuleKey,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getStructure(tenantId: string, userId: string) {
    await this.assertAdministrator(tenantId, userId);
    const [
      companies,
      businessUnits,
      warehouses,
      installations,
      collaborations,
    ] = await Promise.all([
      this.prisma.company.findMany({
        where: { tenantId },
        orderBy: [{ isDefault: 'desc' }, { legalName: 'asc' }],
      }),
      this.prisma.businessUnit.findMany({
        where: { tenantId },
        orderBy: [{ companyId: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.warehouse.findMany({
        where: { tenantId },
        orderBy: [{ businessUnitId: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.companyModuleInstallation.findMany({
        where: { tenantId },
        orderBy: [{ companyId: 'asc' }, { moduleKey: 'asc' }],
      }),
      this.prisma.companyCollaborationAgreement.findMany({
        where: { tenantId },
        orderBy: [{ ownerCompanyId: 'asc' }, { resource: 'asc' }],
      }),
    ]);

    return {
      companies,
      businessUnits,
      warehouses,
      installations,
      collaborations,
    };
  }

  async createCompany(tenantId: string, userId: string, data: any) {
    await this.assertAdministrator(tenantId, userId);
    const code = this.code(data.code, 30);
    const legalName = this.required(data.legalName, 'La razon social', 180);
    const tradeName = this.optional(data.tradeName, 180);
    const ruc = this.ruc(data.ruc);

    return this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.company.findFirst({
        where: { tenantId, OR: [{ code }, { ruc }] },
      });
      if (duplicate)
        throw new ConflictException('El codigo o RUC ya esta registrado.');

      const company = await tx.company.create({
        data: {
          tenantId,
          code,
          legalName,
          tradeName,
          ruc,
          active: data.active !== false,
          isDefault: false,
        },
      });
      await tx.userCompanyMembership.upsert({
        where: { userId_companyId: { userId, companyId: company.id } },
        update: { role: 'ADMIN', active: true },
        create: {
          tenantId,
          userId,
          companyId: company.id,
          role: 'ADMIN',
          isDefault: false,
          active: true,
        },
      });
      return company;
    });
  }

  async updateCompany(tenantId: string, userId: string, id: string, data: any) {
    await this.assertAdministrator(tenantId, userId);
    const company = await this.company(tenantId, id);
    if (data.ruc && String(data.ruc).trim() !== company.ruc) {
      const used = await this.prisma.pharmacySale.count({
        where: { tenantId, companyId: id },
      });
      const documents = await this.prisma.electronicDocument.count({
        where: { tenantId, companyId: id },
      });
      if (used || documents) {
        throw new ConflictException(
          'No se puede cambiar el RUC de una empresa con operaciones.',
        );
      }
    }
    if (data.active === false) {
      const activeModules = await this.prisma.companyModuleInstallation.count({
        where: { tenantId, companyId: id, active: true },
      });
      if (activeModules) {
        throw new ConflictException(
          'Desactive primero los modulos de la empresa.',
        );
      }
    }
    return this.prisma.company.update({
      where: { id },
      data: {
        code: data.code === undefined ? undefined : this.code(data.code, 30),
        legalName:
          data.legalName === undefined
            ? undefined
            : this.required(data.legalName, 'La razon social', 180),
        tradeName:
          data.tradeName === undefined
            ? undefined
            : this.optional(data.tradeName, 180),
        ruc: data.ruc === undefined ? undefined : this.ruc(data.ruc),
        active: typeof data.active === 'boolean' ? data.active : undefined,
      },
    });
  }

  async createBusinessUnit(tenantId: string, userId: string, data: any) {
    await this.assertAdministrator(tenantId, userId);
    const company = await this.company(
      tenantId,
      this.uuid(data.companyId, 'empresa'),
    );
    return this.prisma.businessUnit.create({
      data: {
        tenantId,
        companyId: company.id,
        code: this.code(data.code, 40),
        name: this.required(data.name, 'El nombre de la unidad', 160),
        type: this.code(data.type, 40),
        active: data.active !== false,
      },
    });
  }

  async updateBusinessUnit(
    tenantId: string,
    userId: string,
    id: string,
    data: any,
  ) {
    await this.assertAdministrator(tenantId, userId);
    await this.businessUnit(tenantId, id);
    return this.prisma.businessUnit.update({
      where: { id },
      data: {
        code: data.code === undefined ? undefined : this.code(data.code, 40),
        name:
          data.name === undefined
            ? undefined
            : this.required(data.name, 'El nombre de la unidad', 160),
        type: data.type === undefined ? undefined : this.code(data.type, 40),
        active: typeof data.active === 'boolean' ? data.active : undefined,
      },
    });
  }

  async createWarehouse(tenantId: string, userId: string, data: any) {
    await this.assertAdministrator(tenantId, userId);
    const unit = await this.businessUnit(
      tenantId,
      this.uuid(data.businessUnitId, 'unidad de negocio'),
    );
    return this.prisma.warehouse.create({
      data: {
        tenantId,
        companyId: unit.companyId,
        businessUnitId: unit.id,
        code: this.code(data.code, 60),
        name: this.required(data.name, 'El nombre del almacen', 160),
        active: data.active !== false,
      },
    });
  }

  async updateWarehouse(
    tenantId: string,
    userId: string,
    id: string,
    data: any,
  ) {
    await this.assertAdministrator(tenantId, userId);
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
    });
    if (!warehouse) throw new NotFoundException('Almacen no encontrado.');
    return this.prisma.warehouse.update({
      where: { id },
      data: {
        code: data.code === undefined ? undefined : this.code(data.code, 60),
        name:
          data.name === undefined
            ? undefined
            : this.required(data.name, 'El nombre del almacen', 160),
        active: typeof data.active === 'boolean' ? data.active : undefined,
      },
    });
  }

  async saveModuleInstallation(tenantId: string, userId: string, data: any) {
    await this.assertAdministrator(tenantId, userId);
    const unit = await this.businessUnit(
      tenantId,
      this.uuid(data.businessUnitId, 'unidad de negocio'),
    );
    const moduleKey = this.enumValue(
      CompanyModuleKey,
      data.moduleKey,
      'modulo',
    ) as CompanyModuleKey;
    let warehouseId: string | null = null;
    if (data.warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: {
          id: this.uuid(data.warehouseId, 'almacen'),
          tenantId,
          companyId: unit.companyId,
          businessUnitId: unit.id,
        },
      });
      if (!warehouse)
        throw new BadRequestException('El almacen no pertenece a la unidad.');
      warehouseId = warehouse.id;
    }
    const settings =
      data.settings === undefined
        ? undefined
        : (data.settings as Prisma.InputJsonValue);
    return this.prisma.companyModuleInstallation.upsert({
      where: {
        businessUnitId_moduleKey: { businessUnitId: unit.id, moduleKey },
      },
      update: {
        companyId: unit.companyId,
        warehouseId,
        displayName: this.optional(data.displayName, 180),
        active: data.active !== false,
        settings,
      },
      create: {
        tenantId,
        companyId: unit.companyId,
        businessUnitId: unit.id,
        warehouseId,
        moduleKey,
        displayName: this.optional(data.displayName, 180),
        active: data.active !== false,
        settings,
      },
    });
  }

  async createCollaboration(tenantId: string, userId: string, data: any) {
    await this.assertAdministrator(tenantId, userId);
    const common = await this.collaborationData(tenantId, data);
    return this.prisma.companyCollaborationAgreement.create({ data: common });
  }

  async updateCollaboration(
    tenantId: string,
    userId: string,
    id: string,
    data: any,
  ) {
    await this.assertAdministrator(tenantId, userId);
    const current = await this.prisma.companyCollaborationAgreement.findFirst({
      where: { id, tenantId },
    });
    if (!current) throw new NotFoundException('Colaboracion no encontrada.');
    const merged = { ...current, ...data };
    const common = await this.collaborationData(tenantId, merged);
    return this.prisma.companyCollaborationAgreement.update({
      where: { id },
      data: common,
    });
  }

  private async collaborationData(tenantId: string, data: any) {
    const owner = await this.company(
      tenantId,
      this.uuid(data.ownerCompanyId, 'empresa propietaria'),
    );
    const partner = await this.company(
      tenantId,
      this.uuid(data.partnerCompanyId, 'empresa colaboradora'),
    );
    if (owner.id === partner.id) {
      throw new BadRequestException(
        'Una empresa no puede colaborar consigo misma.',
      );
    }
    const sourceUnit = data.sourceBusinessUnitId
      ? await this.businessUnit(tenantId, data.sourceBusinessUnitId)
      : null;
    const targetUnit = data.targetBusinessUnitId
      ? await this.businessUnit(tenantId, data.targetBusinessUnitId)
      : null;
    if (sourceUnit && sourceUnit.companyId !== owner.id) {
      throw new BadRequestException(
        'La unidad origen no pertenece a la empresa propietaria.',
      );
    }
    if (targetUnit && targetUnit.companyId !== partner.id) {
      throw new BadRequestException(
        'La unidad destino no pertenece a la empresa colaboradora.',
      );
    }
    const startAt = data.startAt ? new Date(data.startAt) : null;
    const endAt = data.endAt ? new Date(data.endAt) : null;
    if (startAt && endAt && endAt <= startAt) {
      throw new BadRequestException(
        'La fecha final debe ser posterior a la inicial.',
      );
    }
    return {
      tenantId,
      ownerCompanyId: owner.id,
      partnerCompanyId: partner.id,
      sourceBusinessUnitId: sourceUnit?.id || null,
      targetBusinessUnitId: targetUnit?.id || null,
      resource: this.enumValue(
        CompanyCollaborationResource,
        data.resource,
        'recurso',
      ) as CompanyCollaborationResource,
      direction: this.enumValue(
        CompanyCollaborationDirection,
        data.direction || 'ONE_WAY',
        'direccion',
      ) as CompanyCollaborationDirection,
      status: this.enumValue(
        CompanyCollaborationStatus,
        data.status || 'DRAFT',
        'estado',
      ) as CompanyCollaborationStatus,
      requiresPatientConsent: data.requiresPatientConsent !== false,
      shareMinimumClinicalData: data.shareMinimumClinicalData !== false,
      startAt,
      endAt,
      notes: this.optional(data.notes, 5000),
      metadata:
        data.metadata === undefined
          ? undefined
          : (data.metadata as Prisma.InputJsonValue),
    };
  }

  private async assertAdministrator(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, active: true },
      select: { role: true },
    });
    const role = String(user?.role || '')
      .trim()
      .toUpperCase();
    if (!['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new ForbiddenException(
        'Solo un administrador puede modificar la organizacion.',
      );
    }
  }

  private company(tenantId: string, id: string) {
    return this.prisma.company
      .findFirst({ where: { id, tenantId } })
      .then((value) => {
        if (!value) throw new NotFoundException('Empresa no encontrada.');
        return value;
      });
  }

  private businessUnit(tenantId: string, id: string) {
    return this.prisma.businessUnit
      .findFirst({ where: { id, tenantId } })
      .then((value) => {
        if (!value)
          throw new NotFoundException('Unidad de negocio no encontrada.');
        return value;
      });
  }

  private required(value: unknown, label: string, max: number) {
    const text = String(value || '').trim();
    if (!text) throw new BadRequestException(label + ' es obligatorio.');
    if (text.length > max)
      throw new BadRequestException(label + ' es demasiado largo.');
    return text;
  }

  private optional(value: unknown, max: number) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    if (text.length > max)
      throw new BadRequestException('El texto es demasiado largo.');
    return text || null;
  }

  private code(value: unknown, max: number) {
    const text = String(value || '')
      .trim()
      .toUpperCase();
    if (!new RegExp('^[A-Z0-9_-]{1,' + max + '}$').test(text)) {
      throw new BadRequestException(
        'El codigo contiene caracteres no permitidos.',
      );
    }
    return text;
  }

  private uuid(value: unknown, label: string) {
    const text = String(value || '').trim();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        text,
      )
    ) {
      throw new BadRequestException('Identificador de ' + label + ' invalido.');
    }
    return text;
  }

  private enumValue(source: object, value: unknown, label: string) {
    const text = String(value || '')
      .trim()
      .toUpperCase();
    if (!Object.values(source).includes(text)) {
      throw new BadRequestException('Valor de ' + label + ' no permitido.');
    }
    return text;
  }

  private ruc(value: unknown) {
    const text = String(value || '').trim();
    if (!/^\d{11}$/.test(text))
      throw new BadRequestException('El RUC debe tener 11 digitos.');
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce(
      (total, weight, index) => total + Number(text[index]) * weight,
      0,
    );
    const remainder = 11 - (sum % 11);
    const digit = remainder === 10 ? 0 : remainder === 11 ? 1 : remainder;
    if (digit !== Number(text[10])) {
      throw new BadRequestException(
        'El RUC no tiene un digito verificador valido.',
      );
    }
    return text;
  }
}
