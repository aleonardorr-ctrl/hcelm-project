import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformSuspensionSchedulerService {
  private readonly logger = new Logger(PlatformSuspensionSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  private isEnabled(variableName: string) {
    return (
      String(process.env[variableName] || '')
        .trim()
        .toLowerCase() === 'true'
    );
  }

  private async recordSystemFailure(input: {
    companyId: string;
    tenantId: string;
    targetName: string;
    targetIdentifier: string;
    category: string | null;
    previousStatus: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
    suspendedUntil: Date | null;
    error: unknown;
  }) {
    const errorMessage =
      'La reactivación automática no pudo completarse por un error interno.';

    try {
      await this.prisma.platformAdministrativeActionAudit.create({
        data: {
          entityType: 'COMPANY',
          action: 'REACTIVATE',
          targetEntityId: input.companyId,
          targetTenantId: input.tenantId,
          targetCompanyId: input.companyId,
          targetName: input.targetName,
          targetIdentifier: input.targetIdentifier,
          previousStatus: input.previousStatus,
          resultingStatus: null,
          category: input.category,
          reason: 'Intento automático por vencimiento de suspensión.',
          suspendedUntil: input.suspendedUntil,
          executionSource: 'SYSTEM',
          performedByPlatformUserId: null,
          performedByEmail: 'system@hcelm.local',
          performedByName: 'Sistema HCELM',
          successful: false,
          errorMessage,
          metadata: {
            trigger: 'SUSPENSION_EXPIRATION',
            scheduler: 'platform-expired-suspension-scanner',
          },
        },
      });
    } catch (auditError) {
      this.logger.error(
        'No se pudo registrar la auditoría del fallo automático.',
        auditError instanceof Error ? auditError.stack : undefined,
      );
    }
  }

  private async reactivateExpiredCompany(companyId: string, now: Date) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        tenant: {
          select: {
            active: true,
            status: true,
          },
        },
      },
    });

    if (!company) {
      return { result: 'NOT_FOUND' as const };
    }

    const targetName = company.tradeName || company.legalName;

    if (!company.tenant.active || company.tenant.status !== 'ACTIVE') {
      this.logger.warn(
        `Reactivación automática bloqueada para ${targetName}: tenant no activo.`,
      );

      return { result: 'BLOCKED_BY_TENANT' as const };
    }

    if (
      company.active ||
      company.status !== 'SUSPENDED' ||
      !company.suspendedUntil ||
      company.suspendedUntil.getTime() > now.getTime()
    ) {
      return { result: 'NO_LONGER_ELIGIBLE' as const };
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const currentCompany = await tx.company.findUnique({
          where: { id: company.id },
          include: {
            tenant: {
              select: {
                active: true,
                status: true,
              },
            },
          },
        });

        if (!currentCompany) {
          return null;
        }

        if (
          !currentCompany.tenant.active ||
          currentCompany.tenant.status !== 'ACTIVE'
        ) {
          return null;
        }

        const updateResult = await tx.company.updateMany({
          where: {
            id: currentCompany.id,
            active: false,
            status: 'SUSPENDED',
            suspendedUntil: {
              not: null,
              lte: now,
            },
          },
          data: {
            active: true,
            status: 'ACTIVE',
            reactivatedAt: now,
            reactivatedByPlatformUserId: null,
            reactivationReason:
              'Reactivación automática por vencimiento de suspensión.',
            suspendedUntil: null,
          },
        });

        if (updateResult.count !== 1) {
          return null;
        }

        const audit = await tx.platformAdministrativeActionAudit.create({
          data: {
            entityType: 'COMPANY',
            action: 'REACTIVATE',
            targetEntityId: currentCompany.id,
            targetTenantId: currentCompany.tenantId,
            targetCompanyId: currentCompany.id,
            targetName: currentCompany.tradeName || currentCompany.legalName,
            targetIdentifier: currentCompany.ruc,
            previousStatus: currentCompany.status,
            resultingStatus: 'ACTIVE',
            category: currentCompany.suspensionCategory,
            reason: 'Reactivación automática por vencimiento de suspensión.',
            suspendedUntil: currentCompany.suspendedUntil,
            executionSource: 'SYSTEM',
            performedByPlatformUserId: null,
            performedByEmail: 'system@hcelm.local',
            performedByName: 'Sistema HCELM',
            successful: true,
            metadata: {
              trigger: 'SUSPENSION_EXPIRATION',
              scheduler: 'platform-expired-suspension-scanner',
              previousActive: currentCompany.active,
              resultingActive: true,
              previousSuspensionReason: currentCompany.suspensionReason,
              scheduledSuspensionEnd:
                currentCompany.suspendedUntil?.toISOString() || null,
            },
          },
        });

        return { audit };
      });

      if (!result) {
        return { result: 'CONCURRENTLY_SKIPPED' as const };
      }

      return { result: 'REACTIVATED' as const };
    } catch (error) {
      await this.recordSystemFailure({
        companyId: company.id,
        tenantId: company.tenantId,
        targetName,
        targetIdentifier: company.ruc,
        category: company.suspensionCategory,
        previousStatus: company.status,
        suspendedUntil: company.suspendedUntil,
        error,
      });

      throw error;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'platform-expired-suspension-scanner',
    waitForCompletion: true,
  })
  async scanExpiredCompanySuspensions() {
    if (!this.isEnabled('HCELM_AUTOMATIC_REACTIVATION_SCAN_ENABLED')) {
      return;
    }

    const executionEnabled = this.isEnabled(
      'HCELM_AUTOMATIC_REACTIVATION_EXECUTION_ENABLED',
    );

    const now = new Date();

    const expiredCompanies = await this.prisma.company.findMany({
      where: {
        active: false,
        status: 'SUSPENDED',
        suspendedUntil: {
          not: null,
          lte: now,
        },
      },
      select: {
        id: true,
        tenantId: true,
        legalName: true,
        tradeName: true,
        ruc: true,
        suspendedUntil: true,
        tenant: {
          select: {
            active: true,
            status: true,
          },
        },
      },
      orderBy: {
        suspendedUntil: 'asc',
      },
      take: 100,
    });

    if (expiredCompanies.length === 0) {
      this.logger.debug(
        'No se encontraron suspensiones empresariales vencidas.',
      );
      return;
    }

    this.logger.warn(
      [
        `Suspensiones empresariales vencidas: ${expiredCompanies.length}.`,
        `Ejecución automática: ${
          executionEnabled ? 'HABILITADA' : 'DESHABILITADA'
        }.`,
      ].join(' '),
    );

    for (const company of expiredCompanies) {
      const companyName = company.tradeName || company.legalName;
      const tenantActive =
        company.tenant.active && company.tenant.status === 'ACTIVE';

      if (!executionEnabled) {
        this.logger.log(
          JSON.stringify({
            event: 'EXPIRED_COMPANY_SUSPENSION_DETECTED',
            mode: 'OBSERVATION_ONLY',
            companyId: company.id,
            tenantId: company.tenantId,
            companyName,
            ruc: company.ruc,
            suspendedUntil: company.suspendedUntil?.toISOString() || null,
            tenantActive,
          }),
        );

        continue;
      }

      try {
        const result = await this.reactivateExpiredCompany(company.id, now);

        this.logger.log(
          JSON.stringify({
            event: 'EXPIRED_COMPANY_SUSPENSION_PROCESSED',
            companyId: company.id,
            tenantId: company.tenantId,
            companyName,
            result: result.result,
          }),
        );
      } catch (error) {
        this.logger.error(
          `Falló la reactivación automática de ${companyName}.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
