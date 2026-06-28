import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { RequireSystemModules } from '../common/system-modules/require-system-modules.decorator';
import { SystemModuleGuard } from '../common/system-modules/system-module.guard';
import { CreateElectronicDocumentSequenceDto } from './dto/create-electronic-document-sequence.dto';
import { UpdateCompanyFiscalProfileDto } from './dto/update-company-fiscal-profile.dto';
import { UpsertCommercialCustomerDto } from './dto/upsert-commercial-customer.dto';
import { ElectronicBillingService } from './electronic-billing.service';

@ApiTags('Facturacion electronica')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, SystemModuleGuard)
@RequireSystemModules('PHARMACY', 'DRUGSTORE', 'BILLING')
@UseInterceptors(AuditInterceptor)
@Controller('electronic-billing')
export class ElectronicBillingController {
  constructor(private readonly service: ElectronicBillingService) {}

  @Get('readiness')
  readiness(
    @CurrentUser() user: any,
    @Query('businessUnit') businessUnit = 'FARMACIA',
    @Query('warehouse') warehouse = 'PRINCIPAL',
  ) {
    return this.service.getReadiness({
      tenantId: this.tenantId(user),
      userId: this.userId(user),
      businessUnit,
      warehouse,
    });
  }

  @Put('fiscal-profile')
  updateFiscalProfile(
    @CurrentUser() user: any,
    @Body() body: UpdateCompanyFiscalProfileDto,
  ) {
    return this.service.updateFiscalProfile({
      tenantId: this.tenantId(user),
      userId: this.userId(user),
      data: body,
    });
  }

  @Post('sequences')
  createSequence(
    @CurrentUser() user: any,
    @Body() body: CreateElectronicDocumentSequenceDto,
  ) {
    return this.service.createSequence({
      tenantId: this.tenantId(user),
      userId: this.userId(user),
      data: body,
    });
  }

  @Get('customers/search')
  searchCustomers(
    @CurrentUser() user: any,
    @Query('q') query = '',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.service.searchCustomers({
      tenantId: this.tenantId(user),
      userId: this.userId(user),
      query,
      pageSize: Number(pageSize),
    });
  }

  @Post('customers')
  upsertCustomer(
    @CurrentUser() user: any,
    @Body() body: UpsertCommercialCustomerDto,
  ) {
    return this.service.upsertCustomer({
      tenantId: this.tenantId(user),
      userId: this.userId(user),
      data: body,
    });
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
