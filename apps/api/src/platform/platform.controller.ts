import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformSuperadminGuard } from './platform-superadmin.guard';
import { PlatformService } from './platform.service';

@UseGuards(JwtAuthGuard, PlatformSuperadminGuard)
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Post('context/company')
  @HttpCode(HttpStatus.OK)
  async createCompanyContext(
    @Request() req: any,
    @Body() body: { companyId?: string; reason?: string },
  ) {
    const forwardedFor = req.headers?.['x-forwarded-for'];
    const ipAddress = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : String(forwardedFor || req.ip || req.socket?.remoteAddress || '')
          .split(',')[0]
          .trim();

    return this.platformService.createCompanyContext(
      req.user?.userId || req.user?.sub || '',
      body?.companyId || '',
      body?.reason || '',
      {
        ipAddress,
        userAgent: String(req.headers?.['user-agent'] || '').trim(),
      },
    );
  }

  @Post('context/company/exit')
  @HttpCode(HttpStatus.OK)
  async closeCompanyContext(@Request() req: any) {
    return this.platformService.closeCompanyContext(
      req.user?.userId || req.user?.sub || '',
      req.user?.platformAccessAuditId || '',
    );
  }

  @Post('access-audits/close')
  @HttpCode(HttpStatus.OK)
  async closeAccessAuditManually(
    @Request() req: any,
    @Body()
    body: {
      auditId?: string;
      reason?: string;
    },
  ) {
    return this.platformService.closeAccessAuditManually(
      req.user?.userId || req.user?.sub || '',
      body?.auditId || '',
      body?.reason || '',
    );
  }

  @Get('access-audits')
  async getAccessAudits(
    @Query()
    query: {
      page?: string;
      pageSize?: string;
      status?: string;
      companyId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    },
  ) {
    return this.platformService.getAccessAudits(query);
  }

  @Post('tenants/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendTenant(
    @Request() req: any,
    @Param('id') tenantId: string,
    @Body()
    body: {
      category?: string;
      reason?: string;
      suspendedUntil?: string;
    },
  ) {
    return this.platformService.suspendTenant(
      req.user?.userId || req.user?.sub || '',
      tenantId,
      body,
    );
  }

  @Post('tenants/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateTenant(
    @Request() req: any,
    @Param('id') tenantId: string,
    @Body() body: { reason?: string },
  ) {
    return this.platformService.reactivateTenant(
      req.user?.userId || req.user?.sub || '',
      tenantId,
      body?.reason || '',
    );
  }

  @Post('companies/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendCompany(
    @Request() req: any,
    @Param('id') companyId: string,
    @Body()
    body: {
      category?: string;
      reason?: string;
      suspendedUntil?: string;
    },
  ) {
    return this.platformService.suspendCompany(
      req.user?.userId || req.user?.sub || '',
      companyId,
      body,
    );
  }

  @Post('companies/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateCompany(
    @Request() req: any,
    @Param('id') companyId: string,
    @Body() body: { reason?: string },
  ) {
    return this.platformService.reactivateCompany(
      req.user?.userId || req.user?.sub || '',
      companyId,
      body?.reason || '',
    );
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Request() req: any,
    @Param('id') userId: string,
    @Body()
    body: {
      category?: string;
      reason?: string;
      suspendedUntil?: string;
    },
  ) {
    return this.platformService.suspendUser(
      req.user?.userId || req.user?.sub || '',
      userId,
      body,
    );
  }

  @Post('users/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateUser(
    @Request() req: any,
    @Param('id') userId: string,
    @Body() body: { reason?: string },
  ) {
    return this.platformService.reactivateUser(
      req.user?.userId || req.user?.sub || '',
      userId,
      body?.reason || '',
    );
  }

  @Get('dashboard/summary')
  async getDashboardSummary(@Request() req: any) {
    const summary = await this.platformService.getDashboardSummary();

    return {
      ...summary,
      currentUser: {
        id: req.user?.userId || req.user?.sub || null,
        email: req.user?.email || null,
        fullName: req.user?.fullName || null,
        platformRole: req.user?.platformRole || null,
      },
    };
  }
}
