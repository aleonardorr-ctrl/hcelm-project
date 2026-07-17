import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PharmacyFefoAction,
  PharmacyFefoRuleKey,
  UpdatePharmacyFefoRuleDto,
  UpdatePharmacyFefoRulesDto,
} from './dto/update-pharmacy-fefo-rules.dto';

type Scope = {
  companyId: string;
  businessUnitId: string;
  displayName: string | null;
};

const RULE_KEYS: PharmacyFefoRuleKey[] = [
  'NORMAL',
  'WATCH',
  'PROMOTION',
  'CRITICAL',
];

const ACTIONS: PharmacyFefoAction[] = [
  'NORMAL',
  'ALERT',
  'SUGGEST_DISCOUNT',
  'REQUIRE_AUTHORIZATION',
];

const DEFAULT_RULES: UpdatePharmacyFefoRuleDto[] = [
  {
    id: 'NORMAL',
    label: 'Vencimiento normal',
    minDays: 181,
    maxDays: null,
    discountPercent: 0,
    action: 'NORMAL',
  },
  {
    id: 'WATCH',
    label: 'Vigilar rotación',
    minDays: 91,
    maxDays: 180,
    discountPercent: 0,
    action: 'ALERT',
  },
  {
    id: 'PROMOTION',
    label: 'Promoción FEFO',
    minDays: 31,
    maxDays: 90,
    discountPercent: 15,
    action: 'SUGGEST_DISCOUNT',
  },
  {
    id: 'CRITICAL',
    label: 'Vencimiento crítico',
    minDays: 0,
    maxDays: 30,
    discountPercent: 20,
    action: 'REQUIRE_AUTHORIZATION',
  },
];

@Injectable()
export class PharmacyFefoService {
  constructor(private readonly prisma: PrismaService) {}

  async getRules(tenantId: string, userId: string) {
    const scope = await this.resolveScope(tenantId, userId);

    const stored = await this.prisma.pharmacyFefoRule.findMany({
      where: {
        tenantId,
        companyId: scope.companyId,
        businessUnitId: scope.businessUnitId,
        active: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { minDays: 'desc' }],
    });

    return {
      scope,
      source: stored.length === RULE_KEYS.length ? 'DATABASE' : 'DEFAULTS',
      rules:
        stored.length === RULE_KEYS.length
          ? stored.map((rule) => ({
              id: rule.ruleKey,
              label: rule.label,
              minDays: rule.minDays,
              maxDays: rule.maxDays,
              discountPercent: Number(rule.discountPercent),
              action: rule.action,
            }))
          : DEFAULT_RULES,
    };
  }

  async saveRules(
    tenantId: string,
    userId: string,
    input: UpdatePharmacyFefoRulesDto,
  ) {
    const scope = await this.resolveScope(tenantId, userId);
    const rules = this.validateRules(input?.rules);

    await this.prisma.$transaction(
      rules.map((rule, index) =>
        this.prisma.pharmacyFefoRule.upsert({
          where: {
            tenantId_companyId_businessUnitId_ruleKey: {
              tenantId,
              companyId: scope.companyId,
              businessUnitId: scope.businessUnitId,
              ruleKey: rule.id,
            },
          },
          create: {
            tenantId,
            companyId: scope.companyId,
            businessUnitId: scope.businessUnitId,
            ruleKey: rule.id,
            label: rule.label,
            minDays: rule.minDays,
            maxDays: rule.maxDays,
            discountPercent: rule.discountPercent,
            action: rule.action,
            active: true,
            displayOrder: index,
            updatedById: userId,
          },
          update: {
            label: rule.label,
            minDays: rule.minDays,
            maxDays: rule.maxDays,
            discountPercent: rule.discountPercent,
            action: rule.action,
            active: true,
            displayOrder: index,
            updatedById: userId,
          },
        }),
      ),
    );

    return this.getRules(tenantId, userId);
  }

  async restoreDefaults(tenantId: string, userId: string) {
    return this.saveRules(tenantId, userId, { rules: DEFAULT_RULES });
  }

  private validateRules(input: unknown): UpdatePharmacyFefoRuleDto[] {
    if (!Array.isArray(input) || input.length !== RULE_KEYS.length) {
      throw new BadRequestException(
        'Debe enviar exactamente cuatro reglas FEFO.',
      );
    }

    const rules = input.map((raw) => {
      const rule = raw as UpdatePharmacyFefoRuleDto;

      if (!RULE_KEYS.includes(rule.id)) {
        throw new BadRequestException('Se recibió una regla FEFO desconocida.');
      }

      if (
        typeof rule.label !== 'string' ||
        rule.label.trim().length < 3 ||
        rule.label.trim().length > 120
      ) {
        throw new BadRequestException(
          `La etiqueta de ${rule.id} no es válida.`,
        );
      }

      if (!Number.isInteger(rule.minDays) || rule.minDays < 0) {
        throw new BadRequestException(
          `Los días mínimos de ${rule.id} no son válidos.`,
        );
      }

      if (
        rule.maxDays !== null &&
        (!Number.isInteger(rule.maxDays) || rule.maxDays < rule.minDays)
      ) {
        throw new BadRequestException(
          `Los días máximos de ${rule.id} no son válidos.`,
        );
      }

      if (
        typeof rule.discountPercent !== 'number' ||
        !Number.isFinite(rule.discountPercent) ||
        rule.discountPercent < 0 ||
        rule.discountPercent > 100
      ) {
        throw new BadRequestException(
          `El descuento de ${rule.id} debe estar entre 0 y 100.`,
        );
      }

      if (!ACTIONS.includes(rule.action)) {
        throw new BadRequestException(
          `La acción de ${rule.id} no es válida.`,
        );
      }

      return {
        ...rule,
        label: rule.label.trim(),
        discountPercent: Number(rule.discountPercent.toFixed(2)),
      };
    });

    const uniqueKeys = new Set(rules.map((rule) => rule.id));
    if (uniqueKeys.size !== RULE_KEYS.length) {
      throw new BadRequestException('Las reglas FEFO no pueden repetirse.');
    }

    const sorted = [...rules].sort((a, b) => a.minDays - b.minDays);

    for (let index = 0; index < sorted.length - 1; index += 1) {
      const current = sorted[index];
      const next = sorted[index + 1];

      if (current.maxDays === null || current.maxDays + 1 !== next.minDays) {
        throw new BadRequestException(
          'Los rangos FEFO deben ser continuos y no superponerse.',
        );
      }
    }

    const highest = sorted[sorted.length - 1];
    if (highest.maxDays !== null) {
      throw new BadRequestException(
        'La regla de mayor rango debe quedar sin límite máximo.',
      );
    }

    return RULE_KEYS.map((key) => {
      const found = rules.find((rule) => rule.id === key);

      if (!found) {
        throw new BadRequestException(`Falta la regla ${key}.`);
      }

      return found;
    });
  }

  private async resolveScope(
    tenantId: string,
    userId: string,
  ): Promise<Scope> {
    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: {
        tenantId,
        userId,
        active: true,
        company: { active: true },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: { companyId: true },
    });

    const allowedCompanyIds = memberships.map((item) => item.companyId);

    if (allowedCompanyIds.length === 0) {
      throw new UnauthorizedException(
        'El usuario no tiene una empresa activa asignada.',
      );
    }

    const installation =
      await this.prisma.companyModuleInstallation.findFirst({
        where: {
          tenantId,
          companyId: { in: allowedCompanyIds },
          moduleKey: 'PHARMACY',
          active: true,
          company: { active: true },
          businessUnit: { active: true },
          warehouse: { is: { active: true } },
        },
        orderBy: [{ createdAt: 'asc' }],
        select: {
          companyId: true,
          businessUnitId: true,
          displayName: true,
        },
      });

    if (!installation) {
      throw new NotFoundException(
        'No existe una instalación activa de Farmacia/Botica.',
      );
    }

    return {
      companyId: installation.companyId,
      businessUnitId: installation.businessUnitId,
      displayName: installation.displayName,
    };
  }
}