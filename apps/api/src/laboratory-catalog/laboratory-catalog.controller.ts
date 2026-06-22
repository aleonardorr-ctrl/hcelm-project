/**
 * Archivo: laboratory-catalog.controller.ts
 * Ruta: apps/api/src/laboratory-catalog/laboratory-catalog.controller.ts
 * Funcion: Busqueda, administracion e importacion Excel del catalogo de laboratorio.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { LaboratoryCatalogService } from './laboratory-catalog.service';

@ApiTags('Catalogo maestro de laboratorio')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('laboratory-catalog')
export class LaboratoryCatalogController {
  constructor(
    private readonly laboratoryCatalogService: LaboratoryCatalogService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Buscar examenes activos por codigo o nombre' })
  search(@Request() req: any, @Query('q') query = '') {
    return this.laboratoryCatalogService.search(this.getTenantId(req), query);
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Listar y filtrar el catalogo de laboratorio' })
  listCatalog(
    @Request() req: any,
    @Query('q') query = '',
    @Query('category') category = '',
    @Query('status') status = 'all',
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    return this.laboratoryCatalogService.listCatalog({
      tenantId: this.getTenantId(req),
      query,
      category,
      status,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias activas de laboratorio' })
  listCategories(@Request() req: any) {
    return this.laboratoryCatalogService.listCategories(this.getTenantId(req));
  }

  @Get('imports')
  @ApiOperation({ summary: 'Consultar historial de importaciones de laboratorio' })
  listImports(@Request() req: any) {
    return this.laboratoryCatalogService.listImports(this.getTenantId(req));
  }

  @Patch('catalog/:id/status')
  @ApiOperation({ summary: 'Activar o inactivar un examen de laboratorio' })
  changeStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { active?: boolean },
  ) {
    if (typeof body?.active !== 'boolean') {
      throw new BadRequestException('El campo active debe ser booleano.');
    }

    return this.laboratoryCatalogService.changeStatus({
      tenantId: this.getTenantId(req),
      laboratoryId: id,
      active: body.active,
    });
  }

  @Put('profiles/:id/components')
  @ApiOperation({ summary: 'Definir los componentes de un perfil' })
  setProfileComponents(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { componentIds?: string[] },
  ) {
    if (!Array.isArray(body?.componentIds)) {
      throw new BadRequestException('componentIds debe ser un arreglo.');
    }

    return this.laboratoryCatalogService.setProfileComponents({
      tenantId: this.getTenantId(req),
      profileId: id,
      componentIds: body.componentIds,
    });
  }

  @Get('template')
  @ApiOperation({ summary: 'Descargar plantilla Excel de laboratorio' })
  async downloadTemplate(@Res({ passthrough: true }) response: Response) {
    const template = await this.laboratoryCatalogService.generateTemplate();

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
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const validExtension = /\.(xlsx|xlsm)$/i.test(file.originalname);
        if (!validExtension) {
          return callback(
            new BadRequestException('Solo se permiten archivos .xlsx o .xlsm.'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Validar y previsualizar una importacion de laboratorio' })
  previewImport(
    @Request() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo Excel.');
    }

    return this.laboratoryCatalogService.previewImport({
      tenantId: this.getTenantId(req),
      userId: this.getUserId(req),
      file,
    });
  }

  @Post('import/:previewId/apply')
  @ApiOperation({ summary: 'Confirmar una importacion previamente validada' })
  applyImport(@Request() req: any, @Param('previewId') previewId: string) {
    return this.laboratoryCatalogService.applyImport({
      tenantId: this.getTenantId(req),
      userId: this.getUserId(req),
      previewId,
    });
  }

  private getTenantId(req: any): string {
    const user = req?.user || {};
    const tenantId =
      user?.tenantId ||
      user?.tenant_id ||
      user?.tenant?.id ||
      user?.payload?.tenantId ||
      user?.payload?.tenant_id ||
      req?.headers?.['x-tenant-id'];

    if (!tenantId) {
      throw new UnauthorizedException(
        'No se pudo identificar el tenant del usuario autenticado.',
      );
    }

    return String(tenantId);
  }

  private getUserId(req: any): string | null {
    const user = req?.user || {};
    const userId =
      user?.id || user?.userId || user?.sub || user?.payload?.sub || null;
    const normalizedUserId = userId ? String(userId) : '';

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalizedUserId,
    )
      ? normalizedUserId
      : null;
  }
}
