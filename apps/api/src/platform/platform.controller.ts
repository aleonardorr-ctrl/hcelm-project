import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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
    @Body() body: { companyId?: string },
  ) {
    return this.platformService.createCompanyContext(
      req.user?.userId || req.user?.sub || '',
      body?.companyId || '',
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
