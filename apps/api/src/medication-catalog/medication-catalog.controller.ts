// Archivo: medication-catalog.controller.ts
// Ruta: apps/api/src/medication-catalog/medication-catalog.controller.ts
// Funcion: Plantilla, catalogo e importacion para Farmacia y Drogueria.
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireSystemModules } from '../common/system-modules/require-system-modules.decorator';
import { SystemModuleGuard } from '../common/system-modules/system-module.guard';
import { MedicationCatalogService } from './medication-catalog.service';
import { MedicationInventoryService } from './medication-inventory.service';

@ApiTags('Maestro corporativo de farmacia')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, SystemModuleGuard)
@RequireSystemModules('PHARMACY', 'DRUGSTORE')
@Controller('medication-catalog')
export class MedicationCatalogController {
  constructor(
    private readonly service: MedicationCatalogService,
    private readonly inventoryService: MedicationInventoryService,
  ) {}

  @Get('catalog')
  listCatalog(
    @Request() req: any,
    @Query('q') query = '',
    @Query('status') status = 'all',
    @Query('productType') productType = '',
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    return this.service.listCatalog({
      tenantId: this.getTenantId(req),
      companyId: this.getContextId(req, 'companyId', 'empresa'),
      businessUnitId: this.getContextId(
        req,
        'businessUnitId',
        'unidad de negocio',
      ),
      query,
      status,
      productType,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get('catalog/:id/fefo-preview')
  previewFefo(
    @Request() req: any,
    @Param('id') id: string,
    @Query('quantity') quantity = '1',
    @Query('businessUnit') businessUnit = 'BOTICA',
    @Query('warehouse') warehouse = 'PRINCIPAL',
  ) {
    return this.inventoryService.previewFefo({
      tenantId: this.getTenantId(req),
      userId: this.getUserId(req),
      companyId: this.getContextId(req, 'companyId', 'empresa'),
      businessUnitId: this.getContextId(
        req,
        'businessUnitId',
        'unidad de negocio',
      ),
      warehouseId: this.getOptionalContextId(req, 'warehouseId'),
      medicationId: id,
      businessUnit: String(businessUnit).trim().toUpperCase(),
      warehouse: String(warehouse).trim().toUpperCase(),
      quantity,
    });
  }

  @Get('catalog/:id/kardex')
  getMedicationKardex(
    @Request() req: any,
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    return this.inventoryService.listKardex({
      tenantId: this.getTenantId(req),
      companyId: this.getContextId(req, 'companyId', 'empresa'),
      businessUnitId: this.getContextId(
        req,
        'businessUnitId',
        'unidad de negocio',
      ),
      medicationId: id,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get('lots/:lotId/kardex')
  getLotKardex(
    @Request() req: any,
    @Param('lotId') lotId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    return this.inventoryService.listKardex({
      tenantId: this.getTenantId(req),
      companyId: this.getContextId(req, 'companyId', 'empresa'),
      businessUnitId: this.getContextId(
        req,
        'businessUnitId',
        'unidad de negocio',
      ),
      lotId,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get('imports')
  listImports(@Request() req: any) {
    return this.service.listImports(this.getTenantId(req));
  }

  @Get('code-preview')
  previewGeneratedCodes(
    @Request() req: any,
    @Query('productType') productType = 'MEDICAMENTO',
  ) {
    return this.service.previewGeneratedCodes({
      tenantId: this.getTenantId(req),
      productType,
    });
  }

  @Post('catalog')
  createProduct(@Request() req: any, @Body() body: any) {
    return this.service.createProduct({
      tenantId: this.getTenantId(req),
      userId: this.getUserId(req),
      data: body,
    });
  }

  @Post('catalog/:id/lots')
  createOrUpdateLot(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.createOrUpdateLot({
      tenantId: this.getTenantId(req),
      userId: this.getUserId(req),
      medicationId: id,
      data: body,
    });
  }

  @Patch('catalog/:id/status')
  changeStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { active?: boolean },
  ) {
    if (typeof body?.active !== 'boolean') {
      throw new BadRequestException('El campo active debe ser booleano.');
    }

    return this.service.changeStatus(this.getTenantId(req), id, body.active);
  }

  @Get('template')
  @ApiOperation({
    summary: 'Descargar plantilla corporativa de productos y lotes',
  })
  async downloadTemplate(@Res({ passthrough: true }) response: Response) {
    const template = await this.service.generateTemplate();

    response.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${template.fileName}"`,
    });

    return new StreamableFile(template.buffer);
  }

  @Post('import/preview')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (!/\.(xlsx|xlsm)$/i.test(file.originalname)) {
          return callback(
            new BadRequestException('Solo se permiten archivos .xlsx o .xlsm.'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  previewImport(
    @Request() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo Excel.');
    }

    return this.service.previewImport({
      tenantId: this.getTenantId(req),
      userId: this.getUserId(req),
      file,
    });
  }

  @Post('import/:previewId/apply')
  applyImport(@Request() req: any, @Param('previewId') previewId: string) {
    return this.service.applyImport({
      tenantId: this.getTenantId(req),
      userId: this.getUserId(req),
      previewId,
    });
  }

  private getTenantId(req: any) {
    const user = req?.user || {};
    const tenantId =
      user.tenantId ||
      user.tenant_id ||
      user.tenant?.id ||
      user.payload?.tenantId ||
      user.payload?.tenant_id ||
      req?.headers?.['x-tenant-id'];

    if (!tenantId) {
      throw new UnauthorizedException('No se pudo identificar el tenant.');
    }

    return String(tenantId);
  }

  private getUserId(req: any): string | null {
    const user = req?.user || {};
    const value = String(
      user.id || user.userId || user.sub || user.payload?.sub || '',
    );

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
      ? value
      : null;
  }

  private getContextId(req: any, key: string, label: string): string {
    const value = this.getOptionalContextId(req, key);

    if (!value) {
      throw new UnauthorizedException(
        `No se pudo identificar la ${label} autenticada.`,
      );
    }

    return value;
  }

  private getOptionalContextId(req: any, key: string): string | undefined {
    const user = req?.user || {};
    const value = String(user[key] || user.payload?.[key] || '').trim();

    return value || undefined;
  }
}
