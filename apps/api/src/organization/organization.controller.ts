import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { OrganizationService } from './organization.service';

@Controller('organization')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  @Get()
  getStructure(@CurrentUser() user: any) {
    return this.service.getStructure(this.tenantId(user), this.userId(user));
  }

  @Post('companies')
  createCompany(@CurrentUser() user: any, @Body() body: any) {
    return this.service.createCompany(
      this.tenantId(user),
      this.userId(user),
      body,
    );
  }

  @Patch('companies/:id')
  updateCompany(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateCompany(
      this.tenantId(user),
      this.userId(user),
      id,
      body,
    );
  }

  @Post('business-units')
  createBusinessUnit(@CurrentUser() user: any, @Body() body: any) {
    return this.service.createBusinessUnit(
      this.tenantId(user),
      this.userId(user),
      body,
    );
  }

  @Patch('business-units/:id')
  updateBusinessUnit(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateBusinessUnit(
      this.tenantId(user),
      this.userId(user),
      id,
      body,
    );
  }

  @Post('warehouses')
  createWarehouse(@CurrentUser() user: any, @Body() body: any) {
    return this.service.createWarehouse(
      this.tenantId(user),
      this.userId(user),
      body,
    );
  }

  @Patch('warehouses/:id')
  updateWarehouse(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateWarehouse(
      this.tenantId(user),
      this.userId(user),
      id,
      body,
    );
  }

  @Put('module-installations')
  saveModuleInstallation(@CurrentUser() user: any, @Body() body: any) {
    return this.service.saveModuleInstallation(
      this.tenantId(user),
      this.userId(user),
      body,
    );
  }

  @Post('collaborations')
  createCollaboration(@CurrentUser() user: any, @Body() body: any) {
    return this.service.createCollaboration(
      this.tenantId(user),
      this.userId(user),
      body,
    );
  }

  @Patch('collaborations/:id')
  updateCollaboration(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateCollaboration(
      this.tenantId(user),
      this.userId(user),
      id,
      body,
    );
  }

  private tenantId(user: any) {
    const value = String(user?.tenantId || '');
    if (!value) throw new UnauthorizedException('Tenant no identificado.');
    return value;
  }

  private userId(user: any) {
    const value = String(user?.userId || user?.sub || '');
    if (!value) throw new UnauthorizedException('Usuario no identificado.');
    return value;
  }
}
