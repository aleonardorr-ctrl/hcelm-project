import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { RequireSystemModules } from '../common/system-modules/require-system-modules.decorator';
import { SystemModuleGuard } from '../common/system-modules/system-module.guard';
import { CreatePharmacySaleDto } from './dto/create-pharmacy-sale.dto';
import { VoidPharmacySaleDto } from './dto/void-pharmacy-sale.dto';
import { PharmacySalesService } from './pharmacy-sales.service';

@ApiTags('Ventas de farmacia')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, SystemModuleGuard)
@RequireSystemModules('PHARMACY', 'DRUGSTORE')
@UseInterceptors(AuditInterceptor)
@Controller('pharmacy-sales')
export class PharmacySalesController {
  constructor(private readonly service: PharmacySalesService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() body: CreatePharmacySaleDto) {
    return this.service.createOtcSale({
      tenantId: this.tenantId(user),
      userId: this.userId(user),
      data: body,
    });
  }

  @Post(':id/void')
  voidSale(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: VoidPharmacySaleDto,
  ) {
    return this.service.voidSale({
      tenantId: this.tenantId(user),
      userId: this.userId(user),
      saleId: id,
      data: body,
    });
  }

  @Get('products/search')
  searchProducts(
    @CurrentUser() user: any,
    @Query('q') query = '',
    @Query('businessUnit') businessUnit = 'FARMACIA',
    @Query('warehouse') warehouse = 'PRINCIPAL',
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.service.searchProducts({
      tenantId: this.tenantId(user),
      userId: this.userId(user),
      query,
      businessUnit,
      warehouse,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get()
  list(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.service.list({
      tenantId: this.tenantId(user),
      userId: this.userId(user),
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne({
      tenantId: this.tenantId(user),
      userId: this.userId(user),
      id,
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
