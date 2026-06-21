/**
 * Archivo: diagnoses.controller.ts
 * Ruta: apps/api/src/diagnoses/diagnoses.controller.ts
 * Función: Búsqueda, plantilla y flujo seguro de importación CIE.
 */
import {
  BadRequestException,
  Controller,
  Get,
  Param,
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
import { DiagnosesService } from './diagnoses.service';

@ApiTags('Diagnósticos CIE')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('diagnoses')
export class DiagnosesController {
  constructor(private readonly diagnosesService: DiagnosesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Buscar diagnósticos por código, nombre o sinónimo' })
  search(
    @Request() req: any,
    @Query('q') query = '',
    @Query('system') system = 'CIE10',
  ) {
    return this.diagnosesService.search(
      this.getTenantId(req),
      query,
      system,
    );
  }

  @Get('template')
  @ApiOperation({ summary: 'Descargar plantilla Excel para CIE-10 o CIE-11' })
  async downloadTemplate(
    @Query('system') system: string = 'CIE10',
    @Res({ passthrough: true }) response: Response,
  ) {
    const template = await this.diagnosesService.generateTemplate(system);

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
      limits: { fileSize: 5 * 1024 * 1024 },
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
  @ApiOperation({ summary: 'Validar y previsualizar una importación CIE' })
  previewImport(
    @Request() req: any,
    @UploadedFile() file?: Express.Multer.File,
    @Query('system') system: string = 'CIE10',
  ) {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo Excel.');
    }

    return this.diagnosesService.previewImport({
      tenantId: this.getTenantId(req),
      userId: this.getUserId(req),
      system,
      file,
    });
  }

  @Post('import/:previewId/apply')
  @ApiOperation({ summary: 'Confirmar una importación CIE previamente validada' })
  applyImport(@Request() req: any, @Param('previewId') previewId: string) {
    return this.diagnosesService.applyImport({
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
