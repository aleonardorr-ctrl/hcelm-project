import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CommercialCustomerType,
  ElectronicBillingEnvironment,
  ElectronicBillingProvider,
  ElectronicDocumentType,
  IdentityDocumentType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateElectronicDocumentSequenceDto } from './dto/create-electronic-document-sequence.dto';
import { UpdateCompanyFiscalProfileDto } from './dto/update-company-fiscal-profile.dto';
import { UpsertCommercialCustomerDto } from './dto/upsert-commercial-customer.dto';

@Injectable()
export class ElectronicBillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getReadiness(params: {
    tenantId: string;
    userId: string;
    businessUnit: string;
    warehouse: string;
  }) {
    const context = await this.resolveContext(
      params.tenantId,
      params.userId,
      params.businessUnit,
      params.warehouse,
    );
    const [profile, sequences, totalProducts, missingFiscalProducts] =
      await Promise.all([
        this.prisma.companyFiscalProfile.findUnique({
          where: { companyId: context.company.id },
          select: {
            id: true,
            fiscalAddress: true,
            ubigeo: true,
            department: true,
            province: true,
            district: true,
            countryCode: true,
            provider: true,
            environment: true,
            certificateExpiresAt: true,
            credentialSecretRef: true,
            certificateSecretRef: true,
            active: true,
            updatedAt: true,
          },
        }),
        this.prisma.electronicDocumentSequence.findMany({
          where: {
            tenantId: params.tenantId,
            companyId: context.company.id,
            businessUnitId: context.businessUnit.id,
            warehouseId: context.warehouse.id,
            active: true,
            documentType: {
              in: [
                ElectronicDocumentType.BOLETA,
                ElectronicDocumentType.FACTURA,
              ],
            },
          },
          select: {
            documentType: true,
            series: true,
            currentNumber: true,
            active: true,
          },
          orderBy: [{ documentType: 'asc' }, { series: 'asc' }],
        }),
        this.prisma.companyMedication.count({
          where: {
            tenantId: params.tenantId,
            companyId: context.company.id,
            active: true,
          },
        }),
        this.prisma.companyMedication.count({
          where: {
            tenantId: params.tenantId,
            companyId: context.company.id,
            active: true,
            OR: [
              { sunatUnitCode: null },
              { taxAffectationCode: null },
              { taxRate: null },
            ],
          },
        }),
      ]);

    const boletaSequence = sequences.find(
      (item) => item.documentType === ElectronicDocumentType.BOLETA,
    );
    const facturaSequence = sequences.find(
      (item) => item.documentType === ElectronicDocumentType.FACTURA,
    );
    const profileReady = Boolean(profile?.fiscalAddress?.trim());
    const providerReady = Boolean(
      profile?.active &&
      profile.provider !== ElectronicBillingProvider.NONE &&
      profile.credentialSecretRef,
    );
    const certificateReady = Boolean(profile?.certificateSecretRef);

    return {
      company: context.company,
      businessUnit: context.businessUnit,
      warehouse: context.warehouse,
      fiscalProfile: profile
        ? {
            id: profile.id,
            fiscalAddress: profile.fiscalAddress,
            ubigeo: profile.ubigeo,
            department: profile.department,
            province: profile.province,
            district: profile.district,
            countryCode: profile.countryCode,
            provider: profile.provider,
            environment: profile.environment,
            certificateExpiresAt: profile.certificateExpiresAt,
            active: profile.active,
            credentialConfigured: Boolean(profile.credentialSecretRef),
            certificateConfigured: certificateReady,
            updatedAt: profile.updatedAt,
          }
        : null,
      sequences,
      catalog: {
        activeProducts: totalProducts,
        missingFiscalConfiguration: missingFiscalProducts,
        ready: totalProducts > 0 && missingFiscalProducts === 0,
      },
      readiness: {
        profileReady,
        boletaSeriesReady: Boolean(boletaSequence),
        facturaSeriesReady: Boolean(facturaSequence),
        providerReady,
        certificateReady,
        draftBaseReady: profileReady,
        submissionReady: providerReady,
      },
      rules: {
        anyPositiveAmountCanBeIssued: true,
        individualReceiptMandatoryAbovePen: 5,
        boletaCustomerIdentityRequiredAbovePen: 700,
        facturaRequiresRuc: true,
        deliveryChannelsAreNotSunatSubmission: true,
      },
    };
  }

  async updateFiscalProfile(params: {
    tenantId: string;
    userId: string;
    data: UpdateCompanyFiscalProfileDto;
  }) {
    const membership = await this.resolveCompanyMembership(
      params.tenantId,
      params.userId,
    );
    this.assertAdministrator(membership.userRole, membership.membershipRole);

    const existing = await this.prisma.companyFiscalProfile.findUnique({
      where: { companyId: membership.company.id },
    });
    const provider =
      params.data.provider ??
      existing?.provider ??
      ElectronicBillingProvider.NONE;
    const active = params.data.active ?? existing?.active ?? false;
    const credentialSecretRef = this.nextNullable(
      params.data.credentialSecretRef,
      existing?.credentialSecretRef,
    );
    const certificateSecretRef = this.nextNullable(
      params.data.certificateSecretRef,
      existing?.certificateSecretRef,
    );

    if (active && provider === ElectronicBillingProvider.NONE) {
      throw new BadRequestException(
        'Un perfil fiscal activo requiere seleccionar SUNAT, PSE u OSE.',
      );
    }
    if (active && !credentialSecretRef) {
      throw new BadRequestException(
        'Un perfil fiscal activo requiere una referencia segura de credenciales.',
      );
    }
    if (
      active &&
      provider === ElectronicBillingProvider.SUNAT_DIRECT &&
      !certificateSecretRef
    ) {
      throw new BadRequestException(
        'La conexion directa con SUNAT requiere una referencia segura del certificado digital.',
      );
    }

    const commonData: any = {
      fiscalAddress: params.data.fiscalAddress.trim(),
      ubigeo: this.clean(params.data.ubigeo),
      department: this.clean(params.data.department),
      province: this.clean(params.data.province),
      district: this.clean(params.data.district),
      countryCode: (params.data.countryCode || 'PE').trim().toUpperCase(),
      provider,
      environment:
        params.data.environment ??
        existing?.environment ??
        ElectronicBillingEnvironment.BETA,
      credentialSecretRef,
      certificateSecretRef,
      certificateExpiresAt: params.data.certificateExpiresAt
        ? new Date(params.data.certificateExpiresAt)
        : (existing?.certificateExpiresAt ?? null),
      active,
    };
    if (params.data.nonSecretSettings !== undefined) {
      commonData.nonSecretSettings = params.data
        .nonSecretSettings as Prisma.InputJsonValue;
    }

    const profile = await this.prisma.companyFiscalProfile.upsert({
      where: { companyId: membership.company.id },
      update: commonData,
      create: {
        tenantId: params.tenantId,
        companyId: membership.company.id,
        ...commonData,
      },
    });

    return {
      id: profile.id,
      companyId: profile.companyId,
      fiscalAddress: profile.fiscalAddress,
      ubigeo: profile.ubigeo,
      department: profile.department,
      province: profile.province,
      district: profile.district,
      countryCode: profile.countryCode,
      provider: profile.provider,
      environment: profile.environment,
      certificateExpiresAt: profile.certificateExpiresAt,
      active: profile.active,
      credentialConfigured: Boolean(profile.credentialSecretRef),
      certificateConfigured: Boolean(profile.certificateSecretRef),
      updatedAt: profile.updatedAt,
    };
  }

  async createSequence(params: {
    tenantId: string;
    userId: string;
    data: CreateElectronicDocumentSequenceDto;
  }) {
    const context = await this.resolveContext(
      params.tenantId,
      params.userId,
      params.data.businessUnit,
      params.data.warehouse,
    );
    this.assertAdministrator(context.userRole, context.membershipRole);
    if (
      params.data.documentType !== ElectronicDocumentType.BOLETA &&
      params.data.documentType !== ElectronicDocumentType.FACTURA
    ) {
      throw new BadRequestException(
        'En esta etapa solo se configuran series de boleta y factura.',
      );
    }
    const series = params.data.series.trim().toUpperCase();
    const expectedPrefix =
      params.data.documentType === ElectronicDocumentType.BOLETA ? 'B' : 'F';
    if (!series.startsWith(expectedPrefix)) {
      throw new BadRequestException(
        'La serie no corresponde al tipo de comprobante seleccionado.',
      );
    }

    const unique = {
      companyId_businessUnitId_warehouseId_documentType_series: {
        companyId: context.company.id,
        businessUnitId: context.businessUnit.id,
        warehouseId: context.warehouse.id,
        documentType: params.data.documentType,
        series,
      },
    };
    const existing = await this.prisma.electronicDocumentSequence.findUnique({
      where: unique,
    });
    if (existing) {
      if (
        params.data.currentNumber !== undefined &&
        params.data.currentNumber !== existing.currentNumber
      ) {
        throw new ConflictException(
          'La numeracion existente no puede modificarse desde este endpoint.',
        );
      }
      return { sequence: existing, alreadyExisted: true };
    }

    const sequence = await this.prisma.electronicDocumentSequence.create({
      data: {
        tenantId: params.tenantId,
        companyId: context.company.id,
        businessUnitId: context.businessUnit.id,
        warehouseId: context.warehouse.id,
        documentType: params.data.documentType,
        series,
        currentNumber: params.data.currentNumber ?? 0,
        active: true,
      },
    });
    return { sequence, alreadyExisted: false };
  }

  async upsertCustomer(params: {
    tenantId: string;
    userId: string;
    data: UpsertCommercialCustomerDto;
  }) {
    const membership = await this.resolveCompanyMembership(
      params.tenantId,
      params.userId,
    );
    const documentNumber = this.normalizeDocument(
      params.data.documentType,
      params.data.documentNumber,
    );
    this.validateCustomerType(
      params.data.customerType,
      params.data.documentType,
      params.data.legalName || params.data.displayName,
    );
    const displayName = params.data.displayName.trim();
    if (!displayName) {
      throw new BadRequestException('El nombre del cliente es obligatorio.');
    }

    const existing = await this.prisma.commercialCustomer.findUnique({
      where: {
        companyId_documentType_documentNumber: {
          companyId: membership.company.id,
          documentType: params.data.documentType,
          documentNumber,
        },
      },
    });
    const optionalData: any = {
      customerType: params.data.customerType,
      displayName,
      legalName: this.optionalForUpdate(params.data.legalName),
      tradeName: this.optionalForUpdate(params.data.tradeName),
      firstNames: this.optionalForUpdate(params.data.firstNames),
      paternalSurname: this.optionalForUpdate(params.data.paternalSurname),
      maternalSurname: this.optionalForUpdate(params.data.maternalSurname),
      email:
        params.data.email === undefined
          ? undefined
          : this.clean(params.data.email)?.toLowerCase() || null,
      phone: this.optionalForUpdate(params.data.phone),
      whatsappPhone: this.optionalForUpdate(params.data.whatsappPhone),
      telegramChatId: this.optionalForUpdate(params.data.telegramChatId),
      address: this.optionalForUpdate(params.data.address),
      ubigeo: this.optionalForUpdate(params.data.ubigeo),
      department: this.optionalForUpdate(params.data.department),
      province: this.optionalForUpdate(params.data.province),
      district: this.optionalForUpdate(params.data.district),
      countryCode:
        params.data.countryCode === undefined
          ? undefined
          : params.data.countryCode.trim().toUpperCase(),
      active: true,
    };
    if (params.data.electronicDeliveryConsent !== undefined) {
      optionalData.electronicConsentAt = params.data.electronicDeliveryConsent
        ? existing?.electronicConsentAt || new Date()
        : null;
    }

    const customer = await this.prisma.commercialCustomer.upsert({
      where: {
        companyId_documentType_documentNumber: {
          companyId: membership.company.id,
          documentType: params.data.documentType,
          documentNumber,
        },
      },
      update: optionalData,
      create: {
        tenantId: params.tenantId,
        companyId: membership.company.id,
        customerType: params.data.customerType,
        documentType: params.data.documentType,
        documentNumber,
        displayName,
        legalName: this.clean(params.data.legalName),
        tradeName: this.clean(params.data.tradeName),
        firstNames: this.clean(params.data.firstNames),
        paternalSurname: this.clean(params.data.paternalSurname),
        maternalSurname: this.clean(params.data.maternalSurname),
        email: this.clean(params.data.email)?.toLowerCase() || null,
        phone: this.clean(params.data.phone),
        whatsappPhone: this.clean(params.data.whatsappPhone),
        telegramChatId: this.clean(params.data.telegramChatId),
        address: this.clean(params.data.address),
        ubigeo: this.clean(params.data.ubigeo),
        department: this.clean(params.data.department),
        province: this.clean(params.data.province),
        district: this.clean(params.data.district),
        countryCode: (params.data.countryCode || 'PE').trim().toUpperCase(),
        electronicConsentAt: params.data.electronicDeliveryConsent
          ? new Date()
          : null,
        active: true,
        createdById: params.userId,
      },
    });
    return { customer, created: !existing };
  }

  async searchCustomers(params: {
    tenantId: string;
    userId: string;
    query: string;
    pageSize: number;
  }) {
    const membership = await this.resolveCompanyMembership(
      params.tenantId,
      params.userId,
    );
    const query = params.query.trim();
    const pageSize = Number.isFinite(params.pageSize)
      ? Math.min(Math.max(Math.trunc(params.pageSize), 1), 50)
      : 20;
    const where: Prisma.CommercialCustomerWhereInput = {
      tenantId: params.tenantId,
      companyId: membership.company.id,
      active: true,
    };
    if (query) {
      where.OR = [
        { documentNumber: { contains: query, mode: 'insensitive' } },
        { displayName: { contains: query, mode: 'insensitive' } },
        { legalName: { contains: query, mode: 'insensitive' } },
        { tradeName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { whatsappPhone: { contains: query, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.commercialCustomer.findMany({
        where,
        orderBy: [{ displayName: 'asc' }, { documentNumber: 'asc' }],
        take: pageSize,
      }),
      this.prisma.commercialCustomer.count({ where }),
    ]);
    return {
      items,
      total,
      company: membership.company,
    };
  }

  private async resolveContext(
    tenantId: string,
    userId: string,
    businessUnitValue: string,
    warehouseValue: string,
  ) {
    const membership = await this.resolveCompanyMembership(tenantId, userId);
    const allowedCompanyIds = await this.activeMembershipCompanyIds(
      tenantId,
      userId,
    );
    const requestedBusinessUnit =
      businessUnitValue?.trim().toUpperCase() || 'BOTICA';
    const businessUnitCode =
      requestedBusinessUnit === 'FARMACIA' ? 'BOTICA' : requestedBusinessUnit;
    const warehouseCode = warehouseValue?.trim().toUpperCase() || 'PRINCIPAL';

    const businessUnit = await this.prisma.businessUnit.findFirst({
      where: {
        tenantId,
        code: businessUnitCode,
        active: true,
        ...(allowedCompanyIds.length
          ? { companyId: { in: allowedCompanyIds } }
          : {}),
        company: { active: true },
      },
      select: {
        id: true,
        code: true,
        name: true,
        companyId: true,
        company: {
          select: {
            id: true,
            code: true,
            legalName: true,
            tradeName: true,
            ruc: true,
          },
        },
      },
    });
    if (!businessUnit) {
      throw new NotFoundException(
        'Unidad de negocio no encontrada o inactiva.',
      );
    }

    const warehouse = await this.prisma.warehouse.findFirst({
      where: {
        tenantId,
        companyId: businessUnit.companyId,
        businessUnitId: businessUnit.id,
        code: warehouseCode,
        active: true,
      },
      select: { id: true, code: true, name: true },
    });
    if (!warehouse) {
      throw new NotFoundException('Almacen no encontrado o inactivo.');
    }

    const matchedMembership = await this.prisma.userCompanyMembership.findFirst(
      {
        where: {
          tenantId,
          userId,
          companyId: businessUnit.companyId,
          active: true,
        },
        select: { role: true },
      },
    );

    return {
      company: businessUnit.company,
      userRole: membership.userRole,
      membershipRole: matchedMembership?.role ?? membership.membershipRole,
      businessUnit: {
        id: businessUnit.id,
        code: businessUnit.code,
        name: businessUnit.name,
      },
      warehouse,
    };
  }

  private async activeMembershipCompanyIds(tenantId: string, userId: string) {
    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: {
        tenantId,
        userId,
        active: true,
        company: { active: true },
      },
      select: { companyId: true },
    });
    return memberships.map((item) => item.companyId);
  }

  private async resolveCompanyMembership(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, active: true },
      select: { id: true, role: true },
    });
    if (!user) throw new UnauthorizedException('Usuario no autorizado.');
    const membership = await this.prisma.userCompanyMembership.findFirst({
      where: {
        tenantId,
        userId,
        active: true,
        company: { active: true },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: {
        role: true,
        company: {
          select: {
            id: true,
            code: true,
            legalName: true,
            tradeName: true,
            ruc: true,
          },
        },
      },
    });
    if (!membership) {
      throw new UnauthorizedException(
        'El usuario no tiene una empresa activa asignada.',
      );
    }
    return {
      company: membership.company,
      userRole: user.role,
      membershipRole: membership.role,
    };
  }

  private assertAdministrator(userRole: string, membershipRole: string) {
    const allowed = new Set([
      'ADMIN',
      'ADMINISTRATOR',
      'SUPERADMIN',
      'SUPER_ADMIN',
    ]);
    if (
      !allowed.has(
        String(userRole || '')
          .trim()
          .toUpperCase(),
      ) &&
      !allowed.has(
        String(membershipRole || '')
          .trim()
          .toUpperCase(),
      )
    ) {
      throw new ForbiddenException(
        'Solo un administrador puede modificar la configuracion fiscal.',
      );
    }
  }

  private normalizeDocument(type: IdentityDocumentType, rawValue: string) {
    const value = rawValue.trim().toUpperCase();
    if (type === IdentityDocumentType.DNI) {
      if (!/^\d{8}$/.test(value)) {
        throw new BadRequestException(
          'El DNI debe contener exactamente 8 digitos.',
        );
      }
    } else if (type === IdentityDocumentType.RUC) {
      if (!/^\d{11}$/.test(value) || !this.isValidRuc(value)) {
        throw new BadRequestException(
          'El RUC no tiene un formato o digito verificador valido.',
        );
      }
    } else if (!/^[A-Z0-9][A-Z0-9-]{0,19}$/.test(value)) {
      throw new BadRequestException(
        'El documento debe contener entre 1 y 20 caracteres validos.',
      );
    }
    return value;
  }

  private validateCustomerType(
    customerType: CommercialCustomerType,
    documentType: IdentityDocumentType,
    legalName: string,
  ) {
    if (
      customerType === CommercialCustomerType.LEGAL_ENTITY &&
      documentType !== IdentityDocumentType.RUC
    ) {
      throw new BadRequestException(
        'Una persona juridica debe identificarse con RUC.',
      );
    }
    if (
      documentType === IdentityDocumentType.RUC &&
      customerType !== CommercialCustomerType.LEGAL_ENTITY
    ) {
      throw new BadRequestException(
        'Un cliente con RUC debe registrarse como persona juridica.',
      );
    }
    if (
      customerType === CommercialCustomerType.LEGAL_ENTITY &&
      !String(legalName || '').trim()
    ) {
      throw new BadRequestException(
        'La razon social es obligatoria para una empresa.',
      );
    }
  }

  private isValidRuc(value: string) {
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce(
      (total, weight, index) => total + Number(value[index]) * weight,
      0,
    );
    const remainder = 11 - (sum % 11);
    const checkDigit = remainder === 10 ? 0 : remainder === 11 ? 1 : remainder;
    return checkDigit === Number(value[10]);
  }

  private clean(value?: string | null) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private optionalForUpdate(value?: string) {
    return value === undefined ? undefined : this.clean(value);
  }

  private nextNullable(value: string | undefined, current?: string | null) {
    return value === undefined ? current || null : this.clean(value);
  }
}
