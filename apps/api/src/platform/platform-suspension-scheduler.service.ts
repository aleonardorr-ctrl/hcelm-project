import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';

type AdministrativeEntityType = 'TENANT' | 'COMPANY' | 'USER';

type AdministrativeStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

type AutomaticReactivationResult =
  | 'REACTIVATED'
  | 'NOT_FOUND'
  | 'NO_LONGER_ELIGIBLE'
  | 'BLOCKED_BY_TENANT'
  | 'CONCURRENTLY_SKIPPED';

@Injectable()
export class PlatformSuspensionSchedulerService {
  private readonly logger = new Logger(PlatformSuspensionSchedulerService.name);

  private readonly schedulerName = 'platform-expired-suspension-scanner';

  constructor(private readonly prisma: PrismaService) {}

  private isEnabled(variableName: string) {
    return (
      String(process.env[variableName] || '')
        .trim()
        .toLowerCase() === 'true'
    );
  }

  private systemAuditActor() {
    return {
      executionSource: 'SYSTEM' as const,
      performedByPlatformUserId: null,
      performedByEmail: 'system@hcelm.local',
      performedByName: 'Sistema HCELM',
    };
  }

  private async recordSystemFailure(input: {
    entityType: AdministrativeEntityType;
    entityId: string;
    tenantId: string;
    companyId?: string | null;
    userId?: string | null;
    targetName: string;
    targetIdentifier: string | null;
    category: string | null;
    previousStatus: AdministrativeStatus;
    suspendedUntil: Date | null;
  }) {
    try {
      await this.prisma.platformAdministrativeActionAudit.create({
        data: {
          entityType: input.entityType,
          action: 'REACTIVATE',
          targetEntityId: input.entityId,
          targetTenantId: input.tenantId,
          targetCompanyId: input.companyId || null,
          targetUserId: input.userId || null,
          targetName: input.targetName,
          targetIdentifier: input.targetIdentifier,
          previousStatus: input.previousStatus,
          resultingStatus: null,
          category: input.category,
          reason: 'Intento automático por vencimiento de suspensión.',
          suspendedUntil: input.suspendedUntil,
          ...this.systemAuditActor(),
          successful: false,
          errorMessage:
            'La reactivación automática no pudo completarse por un error interno.',
          metadata: {
            trigger: 'SUSPENSION_EXPIRATION',
            scheduler: this.schedulerName,
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

  private async reactivateExpiredTenant(
    tenantId: string,
    now: Date,
  ): Promise<{ result: AutomaticReactivationResult }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { result: 'NOT_FOUND' };
    }

    if (
      tenant.active ||
      tenant.status !== 'SUSPENDED' ||
      !tenant.suspendedUntil ||
      tenant.suspendedUntil.getTime() > now.getTime()
    ) {
      return { result: 'NO_LONGER_ELIGIBLE' };
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const currentTenant = await tx.tenant.findUnique({
          where: { id: tenant.id },
        });

        if (!currentTenant) {
          return 'NOT_FOUND' as const;
        }

        const updateResult = await tx.tenant.updateMany({
          where: {
            id: currentTenant.id,
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
          return 'CONCURRENTLY_SKIPPED' as const;
        }

        await tx.platformAdministrativeActionAudit.create({
          data: {
            entityType: 'TENANT',
            action: 'REACTIVATE',
            targetEntityId: currentTenant.id,
            targetTenantId: currentTenant.id,
            targetName: currentTenant.name,
            targetIdentifier: currentTenant.ruc,
            previousStatus: currentTenant.status,
            resultingStatus: 'ACTIVE',
            category: currentTenant.suspensionCategory,
            reason: 'Reactivación automática por vencimiento de suspensión.',
            suspendedUntil: currentTenant.suspendedUntil,
            ...this.systemAuditActor(),
            successful: true,
            metadata: {
              trigger: 'SUSPENSION_EXPIRATION',
              scheduler: this.schedulerName,
              previousActive: currentTenant.active,
              resultingActive: true,
              previousSuspensionReason: currentTenant.suspensionReason,
              scheduledSuspensionEnd:
                currentTenant.suspendedUntil?.toISOString() || null,
              childEntitiesAutomaticallyReactivated: false,
            },
          },
        });

        return 'REACTIVATED' as const;
      });

      return { result };
    } catch (error) {
      await this.recordSystemFailure({
        entityType: 'TENANT',
        entityId: tenant.id,
        tenantId: tenant.id,
        targetName: tenant.name,
        targetIdentifier: tenant.ruc,
        category: tenant.suspensionCategory,
        previousStatus: tenant.status,
        suspendedUntil: tenant.suspendedUntil,
      });

      throw error;
    }
  }

  private async reactivateExpiredCompany(
    companyId: string,
    now: Date,
  ): Promise<{ result: AutomaticReactivationResult }> {
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
      return { result: 'NOT_FOUND' };
    }

    const targetName = company.tradeName || company.legalName;

    if (!company.tenant.active || company.tenant.status !== 'ACTIVE') {
      return { result: 'BLOCKED_BY_TENANT' };
    }

    if (
      company.active ||
      company.status !== 'SUSPENDED' ||
      !company.suspendedUntil ||
      company.suspendedUntil.getTime() > now.getTime()
    ) {
      return { result: 'NO_LONGER_ELIGIBLE' };
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
          return 'NOT_FOUND' as const;
        }

        if (
          !currentCompany.tenant.active ||
          currentCompany.tenant.status !== 'ACTIVE'
        ) {
          return 'BLOCKED_BY_TENANT' as const;
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
          return 'CONCURRENTLY_SKIPPED' as const;
        }

        await tx.platformAdministrativeActionAudit.create({
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
            ...this.systemAuditActor(),
            successful: true,
            metadata: {
              trigger: 'SUSPENSION_EXPIRATION',
              scheduler: this.schedulerName,
              previousActive: currentCompany.active,
              resultingActive: true,
              previousSuspensionReason: currentCompany.suspensionReason,
              scheduledSuspensionEnd:
                currentCompany.suspendedUntil?.toISOString() || null,
            },
          },
        });

        return 'REACTIVATED' as const;
      });

      return { result };
    } catch (error) {
      await this.recordSystemFailure({
        entityType: 'COMPANY',
        entityId: company.id,
        tenantId: company.tenantId,
        companyId: company.id,
        targetName,
        targetIdentifier: company.ruc,
        category: company.suspensionCategory,
        previousStatus: company.status,
        suspendedUntil: company.suspendedUntil,
      });

      throw error;
    }
  }

  private async reactivateExpiredUser(
    userId: string,
    now: Date,
  ): Promise<{ result: AutomaticReactivationResult }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            active: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return { result: 'NOT_FOUND' };
    }

    const targetName = user.fullName || user.email;

    if (!user.tenant.active || user.tenant.status !== 'ACTIVE') {
      return { result: 'BLOCKED_BY_TENANT' };
    }

    if (
      user.active ||
      user.status !== 'SUSPENDED' ||
      !user.suspendedUntil ||
      user.suspendedUntil.getTime() > now.getTime()
    ) {
      return { result: 'NO_LONGER_ELIGIBLE' };
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const currentUser = await tx.user.findUnique({
          where: { id: user.id },
          include: {
            tenant: {
              select: {
                active: true,
                status: true,
              },
            },
          },
        });

        if (!currentUser) {
          return 'NOT_FOUND' as const;
        }

        if (
          !currentUser.tenant.active ||
          currentUser.tenant.status !== 'ACTIVE'
        ) {
          return 'BLOCKED_BY_TENANT' as const;
        }

        const updateResult = await tx.user.updateMany({
          where: {
            id: currentUser.id,
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
          return 'CONCURRENTLY_SKIPPED' as const;
        }

        await tx.platformAdministrativeActionAudit.create({
          data: {
            entityType: 'USER',
            action: 'REACTIVATE',
            targetEntityId: currentUser.id,
            targetTenantId: currentUser.tenantId,
            targetUserId: currentUser.id,
            targetName: currentUser.fullName || currentUser.email,
            targetIdentifier: currentUser.email,
            previousStatus: currentUser.status,
            resultingStatus: 'ACTIVE',
            category: currentUser.suspensionCategory,
            reason: 'Reactivación automática por vencimiento de suspensión.',
            suspendedUntil: currentUser.suspendedUntil,
            ...this.systemAuditActor(),
            successful: true,
            metadata: {
              trigger: 'SUSPENSION_EXPIRATION',
              scheduler: this.schedulerName,
              targetEmail: currentUser.email,
              targetDni: currentUser.dni,
              targetRole: currentUser.role,
              targetPlatformRole: currentUser.platformRole,
              previousActive: currentUser.active,
              resultingActive: true,
              previousSuspensionReason: currentUser.suspensionReason,
              scheduledSuspensionEnd:
                currentUser.suspendedUntil?.toISOString() || null,
            },
          },
        });

        return 'REACTIVATED' as const;
      });

      return { result };
    } catch (error) {
      await this.recordSystemFailure({
        entityType: 'USER',
        entityId: user.id,
        tenantId: user.tenantId,
        userId: user.id,
        targetName,
        targetIdentifier: user.email,
        category: user.suspensionCategory,
        previousStatus: user.status,
        suspendedUntil: user.suspendedUntil,
      });

      throw error;
    }
  }

  private logObservation(input: {
    entityType: AdministrativeEntityType;
    entityId: string;
    tenantId: string;
    targetName: string;
    targetIdentifier: string | null;
    suspendedUntil: Date | null;
    tenantActive?: boolean;
  }) {
    this.logger.log(
      JSON.stringify({
        event: `EXPIRED_${input.entityType}_SUSPENSION_DETECTED`,
        mode: 'OBSERVATION_ONLY',
        entityType: input.entityType,
        entityId: input.entityId,
        tenantId: input.tenantId,
        targetName: input.targetName,
        targetIdentifier: input.targetIdentifier,
        suspendedUntil: input.suspendedUntil?.toISOString() || null,
        tenantActive: input.tenantActive,
      }),
    );
  }

  private logProcessed(input: {
    entityType: AdministrativeEntityType;
    entityId: string;
    tenantId: string;
    targetName: string;
    result: AutomaticReactivationResult;
  }) {
    this.logger.log(
      JSON.stringify({
        event: `EXPIRED_${input.entityType}_SUSPENSION_PROCESSED`,
        entityType: input.entityType,
        entityId: input.entityId,
        tenantId: input.tenantId,
        targetName: input.targetName,
        result: input.result,
      }),
    );
  }

  async scanExpiredSuspensions() {
    if (!this.isEnabled('HCELM_AUTOMATIC_REACTIVATION_SCAN_ENABLED')) {
      return {
        scanEnabled: false,
        executionEnabled: false,
        detected: {
          tenants: 0,
          companies: 0,
          users: 0,
        },
      };
    }

    const executionEnabled = this.isEnabled(
      'HCELM_AUTOMATIC_REACTIVATION_EXECUTION_ENABLED',
    );

    const now = new Date();

    const expiredTenants = await this.prisma.tenant.findMany({
      where: {
        active: false,
        status: 'SUSPENDED',
        suspendedUntil: {
          not: null,
          lte: now,
        },
      },
      orderBy: {
        suspendedUntil: 'asc',
      },
      take: 100,
    });

    this.logger.log(
      [
        `Tenants vencidos detectados: ${expiredTenants.length}.`,
        `Ejecución automática: ${
          executionEnabled ? 'HABILITADA' : 'DESHABILITADA'
        }.`,
      ].join(' '),
    );

    for (const tenant of expiredTenants) {
      if (!executionEnabled) {
        this.logObservation({
          entityType: 'TENANT',
          entityId: tenant.id,
          tenantId: tenant.id,
          targetName: tenant.name,
          targetIdentifier: tenant.ruc,
          suspendedUntil: tenant.suspendedUntil,
        });
        continue;
      }

      try {
        const result = await this.reactivateExpiredTenant(tenant.id, now);

        this.logProcessed({
          entityType: 'TENANT',
          entityId: tenant.id,
          tenantId: tenant.id,
          targetName: tenant.name,
          result: result.result,
        });
      } catch (error) {
        this.logger.error(
          `Falló la reactivación automática del tenant ${tenant.name}.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    const expiredCompanies = await this.prisma.company.findMany({
      where: {
        active: false,
        status: 'SUSPENDED',
        suspendedUntil: {
          not: null,
          lte: now,
        },
      },
      include: {
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

    this.logger.log(
      `Empresas vencidas detectadas: ${expiredCompanies.length}.`,
    );

    for (const company of expiredCompanies) {
      const targetName = company.tradeName || company.legalName;
      const tenantActive =
        company.tenant.active && company.tenant.status === 'ACTIVE';

      if (!executionEnabled) {
        this.logObservation({
          entityType: 'COMPANY',
          entityId: company.id,
          tenantId: company.tenantId,
          targetName,
          targetIdentifier: company.ruc,
          suspendedUntil: company.suspendedUntil,
          tenantActive,
        });
        continue;
      }

      try {
        const result = await this.reactivateExpiredCompany(company.id, now);

        this.logProcessed({
          entityType: 'COMPANY',
          entityId: company.id,
          tenantId: company.tenantId,
          targetName,
          result: result.result,
        });
      } catch (error) {
        this.logger.error(
          `Falló la reactivación automática de la empresa ${targetName}.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    const expiredUsers = await this.prisma.user.findMany({
      where: {
        active: false,
        status: 'SUSPENDED',
        suspendedUntil: {
          not: null,
          lte: now,
        },
      },
      include: {
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

    this.logger.log(`Usuarios vencidos detectados: ${expiredUsers.length}.`);

    for (const user of expiredUsers) {
      const targetName = user.fullName || user.email;
      const tenantActive =
        user.tenant.active && user.tenant.status === 'ACTIVE';

      if (!executionEnabled) {
        this.logObservation({
          entityType: 'USER',
          entityId: user.id,
          tenantId: user.tenantId,
          targetName,
          targetIdentifier: user.email,
          suspendedUntil: user.suspendedUntil,
          tenantActive,
        });
        continue;
      }

      try {
        const result = await this.reactivateExpiredUser(user.id, now);

        this.logProcessed({
          entityType: 'USER',
          entityId: user.id,
          tenantId: user.tenantId,
          targetName,
          result: result.result,
        });
      } catch (error) {
        this.logger.error(
          `Falló la reactivación automática del usuario ${targetName}.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return {
      scanEnabled: true,
      executionEnabled,
      detected: {
        tenants: expiredTenants.length,
        companies: expiredCompanies.length,
        users: expiredUsers.length,
      },
      processedAt: now.toISOString(),
      processingOrder: ['TENANT', 'COMPANY', 'USER'],
      scheduledTimeZone: 'America/Lima',
      scheduledTime: '00:00',
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'platform-expired-suspension-scanner',
    timeZone: 'America/Lima',
    waitForCompletion: true,
  })
  async runScheduledExpiredSuspensionScan() {
    await this.scanExpiredSuspensions();
  }
}
