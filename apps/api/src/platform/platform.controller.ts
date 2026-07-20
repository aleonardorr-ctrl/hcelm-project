import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
