import {
  Body,
  Controller,
  Delete,
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

  @Delete('companies/:id')
  deleteCompany(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteCompany(
      this.tenantId(user),
      this.userId(user),
      id,
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

  @Delete('business-units/:id')
  deleteBusinessUnit(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteBusinessUnit(
      this.tenantId(user),
      this.userId(user),
      id,
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

  @Delete('warehouses/:id')
  deleteWarehouse(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteWarehouse(
      this.tenantId(user),
      this.userId(user),
      id,
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

  @Patch('module-installations/:id')
  updateModuleInstallation(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateModuleInstallation(
      this.tenantId(user),
      this.userId(user),
      id,
      body,
    );
  }

  @Delete('module-installations/:id')
  deleteModuleInstallation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteModuleInstallation(
      this.tenantId(user),
      this.userId(user),
      id,
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

  @Delete('collaborations/:id')
  deleteCollaboration(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteCollaboration(
      this.tenantId(user),
      this.userId(user),
      id,
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
