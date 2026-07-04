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
    businessUnit: string;
    warehouse: string;
    data: UpdateCompanyFiscalProfileDto;
  }) {
    const context = await this.resolveContext(
      params.tenantId,
      params.userId,
      params.businessUnit,
      params.warehouse,
    );
    this.assertAdministrator(context.userRole, context.membershipRole);

    const existing = await this.prisma.companyFiscalProfile.findUnique({
      where: { companyId: context.company.id },
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
      where: { companyId: context.company.id },
      update: commonData,
      create: {
        tenantId: params.tenantId,
        companyId: context.company.id,
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
    businessUnit: string;
    warehouse: string;
    data: UpsertCommercialCustomerDto;
  }) {
    const context = await this.resolveContext(
      params.tenantId,
      params.userId,
      params.businessUnit,
      params.warehouse,
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
          companyId: context.company.id,
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
          companyId: context.company.id,
          documentType: params.data.documentType,
          documentNumber,
        },
      },
      update: optionalData,
      create: {
        tenantId: params.tenantId,
        companyId: context.company.id,
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

  async getDraftDocuments(params: {
    tenantId: string;
    userId: string;
    businessUnit: string;
    warehouse: string;
    pageSize: number;
  }) {
    const context = await this.resolveContext(
      params.tenantId,
      params.userId,
      params.businessUnit,
      params.warehouse,
    );
    const pageSize = Number.isFinite(params.pageSize)
      ? Math.min(Math.max(Math.trunc(params.pageSize), 1), 50)
      : 20;
    const where: Prisma.ElectronicDocumentWhereInput = {
      tenantId: params.tenantId,
      companyId: context.company.id,
      businessUnitId: context.businessUnit.id,
      warehouseId: context.warehouse.id,
      status: 'DRAFT' as any,
    };

    const [items, total] = await Promise.all([
      this.prisma.electronicDocument.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: pageSize,
        select: {
          id: true,
          documentType: true,
          status: true,
          fullNumber: true,
          issueDate: true,
          customerName: true,
          customerDocumentType: true,
          customerDocumentNumber: true,
          currency: true,
          taxableAmount: true,
          igvTotal: true,
          total: true,
          createdAt: true,
          sale: { select: { id: true, saleNumber: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.electronicDocument.count({ where }),
    ]);

    return {
      items: items.map((document) => ({
        ...document,
        taxableAmount: document.taxableAmount.toString(),
        igvTotal: document.igvTotal.toString(),
        total: document.total.toString(),
      })),
      total,
      company: context.company,
      businessUnit: context.businessUnit,
      warehouse: context.warehouse,
    };
  }

  async createDraftDocumentFromSale(params: {
    tenantId: string;
    userId: string;
    businessUnit: string;
    warehouse: string;
    saleId: string;
    documentType: ElectronicDocumentType;
  }) {
    const context = await this.resolveContext(
      params.tenantId,
      params.userId,
      params.businessUnit,
      params.warehouse,
    );
    this.assertAdministrator(context.userRole, context.membershipRole);

    if (
      params.documentType !== ElectronicDocumentType.BOLETA &&
      params.documentType !== ElectronicDocumentType.FACTURA
    ) {
      throw new BadRequestException(
        'En esta etapa solo se preparan boletas y facturas.',
      );
    }

    const idempotencyKey =
      'BILLING:DRAFT:' + params.saleId + ':' + params.documentType;

    const existing = await this.prisma.electronicDocument.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId: params.tenantId, idempotencyKey },
      },
      include: { lines: true },
    });
    if (existing) return { document: existing, alreadyExisted: true };

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.pharmacySale.findFirst({
        where: {
          id: params.saleId,
          tenantId: params.tenantId,
          companyId: context.company.id,
          businessUnitId: context.businessUnit.id,
          warehouseId: context.warehouse.id,
          status: 'COMPLETED' as any,
          electronicDocuments: { none: {} },
        },
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
            include: {
              companyMedication: {
                select: {
                  sunatProductCode: true,
                  sunatUnitCode: true,
                  taxAffectationCode: true,
                  taxRate: true,
                },
              },
            },
          },
          commercialCustomer: true,
        },
      });
      if (!sale) {
        throw new NotFoundException(
          'Venta no encontrada o ya tiene comprobante preparado.',
        );
      }
      if (!sale.items.length) {
        throw new BadRequestException('La venta no tiene items para facturar.');
      }

      const profile = await tx.companyFiscalProfile.findUnique({
        where: { companyId: context.company.id },
      });
      if (!profile?.fiscalAddress?.trim()) {
        throw new BadRequestException(
          'Complete primero el perfil fiscal de la empresa emisora.',
        );
      }

      const sequence = await tx.electronicDocumentSequence.findFirst({
        where: {
          tenantId: params.tenantId,
          companyId: context.company.id,
          businessUnitId: context.businessUnit.id,
          warehouseId: context.warehouse.id,
          documentType: params.documentType,
          active: true,
        },
        orderBy: { series: 'asc' },
      });
      if (!sequence) {
        throw new BadRequestException(
          'Configure primero la serie fiscal correspondiente.',
        );
      }

      const customer = sale.commercialCustomer;
      const saleDocumentType = String(
        sale.customerDocumentType || '',
      ).toUpperCase();
      const customerDocumentType =
        (customer?.documentType as any) || saleDocumentType || null;
      const customerDocumentNumber =
        customer?.documentNumber || sale.customerDocumentNumber || null;
      const customerName =
        customer?.displayName || sale.customerName || 'CLIENTE VARIOS';

      if (
        params.documentType === ElectronicDocumentType.FACTURA &&
        (customerDocumentType !== 'RUC' || !customerDocumentNumber)
      ) {
        throw new BadRequestException(
          'Para preparar factura, la venta debe tener cliente empresa con RUC.',
        );
      }

      const nextNumber = sequence.currentNumber + 1;
      await tx.electronicDocumentSequence.update({
        where: { id: sequence.id },
        data: { currentNumber: nextNumber },
      });

      let taxableAmount = new Prisma.Decimal(0);
      let exoneratedAmount = new Prisma.Decimal(0);
      let unaffectedAmount = new Prisma.Decimal(0);
      let igvTotal = new Prisma.Decimal(0);

      const lines = sale.items.map((item, index) => {
        const taxAffectationCode =
          item.companyMedication.taxAffectationCode || '10';
        const taxRate = new Prisma.Decimal(
          item.companyMedication.taxRate || 18,
        );
        const lineTotal = new Prisma.Decimal(item.total);
        const lineValue =
          taxAffectationCode === '10' && taxRate.gt(0)
            ? lineTotal.div(new Prisma.Decimal(1).plus(taxRate.div(100)))
            : lineTotal;
        const igvAmount = lineTotal.minus(lineValue).toDecimalPlaces(4);

        if (taxAffectationCode === '10')
          taxableAmount = taxableAmount.plus(lineValue);
        else if (taxAffectationCode.startsWith('2'))
          exoneratedAmount = exoneratedAmount.plus(lineValue);
        else unaffectedAmount = unaffectedAmount.plus(lineValue);
        igvTotal = igvTotal.plus(igvAmount);

        return {
          tenantId: params.tenantId,
          saleItemId: item.id,
          lineNumber: index + 1,
          companySku: item.companySku,
          sunatProductCode: item.companyMedication.sunatProductCode,
          description: [
            item.commercialName || item.genericName,
            item.concentration,
            item.presentation,
          ]
            .filter(Boolean)
            .join(' '),
          unitCode: item.companyMedication.sunatUnitCode || 'NIU',
          quantity: item.quantity,
          unitValue: lineValue.div(item.quantity).toDecimalPlaces(4),
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          taxAffectationCode,
          taxRate,
          igvAmount,
          lineValue: lineValue.toDecimalPlaces(4),
          lineTotal,
        };
      });

      const fullNumber =
        sequence.series + '-' + String(nextNumber).padStart(8, '0');
      const document = await tx.electronicDocument.create({
        data: {
          tenantId: params.tenantId,
          companyId: context.company.id,
          businessUnitId: context.businessUnit.id,
          warehouseId: context.warehouse.id,
          saleId: sale.id,
          customerId: customer?.id || null,
          documentType: params.documentType,
          status: 'DRAFT' as any,
          environment: profile.environment,
          series: sequence.series,
          number: nextNumber,
          fullNumber,
          issueDate: new Date(),
          operationTypeCode: '0101',
          currency: sale.currency,
          issuerRuc: context.company.ruc,
          issuerLegalName: context.company.legalName,
          issuerTradeName: context.company.tradeName,
          issuerAddress: profile.fiscalAddress,
          issuerUbigeo: profile.ubigeo,
          customerDocumentType: customerDocumentType as any,
          customerDocumentNumber,
          customerName,
          customerAddress: customer?.address || null,
          customerEmail: customer?.email || null,
          customerPhone: customer?.phone || null,
          taxableAmount: taxableAmount.toDecimalPlaces(4),
          exoneratedAmount: exoneratedAmount.toDecimalPlaces(4),
          unaffectedAmount: unaffectedAmount.toDecimalPlaces(4),
          freeAmount: 0,
          discountTotal: sale.discountTotal,
          igvTotal: igvTotal.toDecimalPlaces(4),
          otherTaxTotal: 0,
          total: sale.total,
          idempotencyKey,
          createdById: params.userId,
          lines: { create: lines },
        },
        include: { lines: true },
      });

      return { document, alreadyExisted: false };
    });
  }

  async getPendingSalesForBilling(params: {
    tenantId: string;
    userId: string;
    businessUnit: string;
    warehouse: string;
    pageSize: number;
  }) {
    const context = await this.resolveContext(
      params.tenantId,
      params.userId,
      params.businessUnit,
      params.warehouse,
    );
    const pageSize = Number.isFinite(params.pageSize)
      ? Math.min(Math.max(Math.trunc(params.pageSize), 1), 50)
      : 20;

    const where: Prisma.PharmacySaleWhereInput = {
      tenantId: params.tenantId,
      companyId: context.company.id,
      businessUnitId: context.businessUnit.id,
      warehouseId: context.warehouse.id,
      status: 'COMPLETED' as any,
      electronicDocuments: { none: {} },
    };

    const [items, total] = await Promise.all([
      this.prisma.pharmacySale.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: pageSize,
        select: {
          id: true,
          saleNumber: true,
          createdAt: true,
          customerName: true,
          customerDocumentType: true,
          customerDocumentNumber: true,
          currency: true,
          total: true,
          items: {
            select: {
              id: true,
              genericName: true,
              commercialName: true,
              concentration: true,
              presentation: true,
              quantity: true,
              total: true,
            },
            orderBy: [{ createdAt: 'asc' }],
            take: 3,
          },
        },
      }),
      this.prisma.pharmacySale.count({ where }),
    ]);

    return {
      items: items.map((sale) => ({
        ...sale,
        total: sale.total.toString(),
        items: sale.items.map((item) => ({
          ...item,
          productName: [
            item.commercialName || item.genericName,
            item.concentration,
            item.presentation,
          ]
            .filter(Boolean)
            .join(' '),
          quantity: item.quantity.toString(),
          total: item.total.toString(),
        })),
      })),
      total,
      company: context.company,
      businessUnit: context.businessUnit,
      warehouse: context.warehouse,
    };
  }

  async searchCustomers(params: {
    tenantId: string;
    userId: string;
    businessUnit: string;
    warehouse: string;
    query: string;
    pageSize: number;
  }) {
    const context = await this.resolveContext(
      params.tenantId,
      params.userId,
      params.businessUnit,
      params.warehouse,
    );
    const query = params.query.trim();
    const pageSize = Number.isFinite(params.pageSize)
      ? Math.min(Math.max(Math.trunc(params.pageSize), 1), 50)
      : 20;
    const where: Prisma.CommercialCustomerWhereInput = {
      tenantId: params.tenantId,
      companyId: context.company.id,
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
      company: context.company,
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
