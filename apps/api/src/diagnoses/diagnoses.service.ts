/**
 * Archivo: diagnoses.service.ts
 * Ruta: apps/api/src/diagnoses/diagnoses.service.ts
 * Función: Búsqueda, generación de plantilla y flujo de importación CIE.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

const REQUIRED_COLUMNS = ['codigo', 'descripcion'] as const;
const MAX_IMPORT_ROWS = 20_000;
const ALLOWED_COLUMNS = [
  'codigo',
  'descripcion',
  'capitulo',
  'grupo',
  'subgrupo',
  'sinonimos',
  'activo',
  'observaciones',
] as const;

type ImportAction = 'CREATE' | 'UPDATE' | 'UNCHANGED';

type ValidDiagnosisRow = {
  rowNumber: number;
  system: string;
  code: string;
  description: string;
  chapter: string | null;
  group: string | null;
  subgroup: string | null;
  synonyms: string[];
  active: boolean;
  observations: string | null;
  searchText: string;
  action: ImportAction;
};

type InvalidDiagnosisRow = {
  rowNumber: number;
  code: string | null;
  description: string | null;
  errors: string[];
};

@Injectable()
export class DiagnosesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, query: string, system = 'CIE10') {
    const normalizedQuery = String(query || '').trim();
    const normalizedSystem = this.normalizeSystem(system);

    if (!normalizedQuery) return [];

    const diagnoses = await this.prisma.diagnosisCatalog.findMany({
      where: {
        tenantId,
        system: normalizedSystem,
        active: true,
        OR: [
          { code: { contains: normalizedQuery, mode: 'insensitive' } },
          { description: { contains: normalizedQuery, mode: 'insensitive' } },
          { searchText: { contains: normalizedQuery, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ code: 'asc' }],
      take: 30,
      select: {
        id: true,
        system: true,
        code: true,
        description: true,
        chapter: true,
        group: true,
        subgroup: true,
        synonyms: true,
      },
    });

    return diagnoses.map((diagnosis) => ({
      ...diagnosis,
      desc: diagnosis.description,
    }));
  }

  async listCatalog(params: {
    tenantId: string;
    system: string;
    query?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const system = this.normalizeSystem(params.system);
    const query = String(params.query || '').trim();
    const page = Number.isFinite(params.page)
      ? Math.max(1, Math.trunc(params.page || 1))
      : 1;
    const pageSize = Number.isFinite(params.pageSize)
      ? Math.min(100, Math.max(10, Math.trunc(params.pageSize || 50)))
      : 50;
    const normalizedStatus = String(params.status || 'all').toLowerCase();

    const where: any = {
      tenantId: params.tenantId,
      system,
    };

    if (normalizedStatus === 'active') where.active = true;
    if (normalizedStatus === 'inactive') where.active = false;
    if (query) {
      where.OR = [
        { code: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { searchText: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.diagnosisCatalog.count({ where }),
      this.prisma.diagnosisCatalog.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          system: true,
          code: true,
          description: true,
          chapter: true,
          group: true,
          subgroup: true,
          synonyms: true,
          active: true,
          observations: true,
          source: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      system,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items,
    };
  }

  async listImports(tenantId: string, system = 'CIE10') {
    return this.prisma.catalogImport.findMany({
      where: {
        tenantId,
        catalogType: this.normalizeSystem(system),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
      select: {
        id: true,
        catalogType: true,
        sourceFileName: true,
        source: true,
        status: true,
        totalRows: true,
        validRows: true,
        invalidRows: true,
        createdRows: true,
        updatedRows: true,
        skippedRows: true,
        errorRows: true,
        createdAt: true,
        completedAt: true,
      },
    });
  }

  async changeStatus(params: {
    tenantId: string;
    diagnosisId: string;
    active: boolean;
  }) {
    const diagnosis = await this.prisma.diagnosisCatalog.findFirst({
      where: { id: params.diagnosisId, tenantId: params.tenantId },
      select: { id: true, code: true, description: true, active: true },
    });

    if (!diagnosis) throw new NotFoundException('Código diagnóstico no encontrado.');

    const updated = await this.prisma.diagnosisCatalog.update({
      where: { id: diagnosis.id },
      data: { active: params.active },
      select: {
        id: true,
        code: true,
        description: true,
        active: true,
        updatedAt: true,
      },
    });

    return {
      message: params.active
        ? 'Código diagnóstico activado correctamente.'
        : 'Código diagnóstico inactivado correctamente.',
      diagnosis: updated,
    };
  }

  async generateTemplate(system: string) {
    const normalizedSystem = this.normalizeSystem(system);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HCELM - AME HEALTH SAC';
    workbook.created = new Date();

    const catalogSheet = workbook.addWorksheet(
      normalizedSystem === 'CIE11' ? 'CIE-11' : 'CIE-10',
      { views: [{ state: 'frozen', ySplit: 1 }] },
    );

    catalogSheet.columns = [
      { header: 'codigo', key: 'codigo', width: 18 },
      { header: 'descripcion', key: 'descripcion', width: 48 },
      { header: 'capitulo', key: 'capitulo', width: 28 },
      { header: 'grupo', key: 'grupo', width: 25 },
      { header: 'subgrupo', key: 'subgrupo', width: 25 },
      { header: 'sinonimos', key: 'sinonimos', width: 38 },
      { header: 'activo', key: 'activo', width: 12 },
      { header: 'observaciones', key: 'observaciones', width: 38 },
    ];

    const header = catalogSheet.getRow(1);
    header.height = 24;
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
    header.alignment = { vertical: 'middle', horizontal: 'center' };

    catalogSheet.autoFilter = { from: 'A1', to: 'H1' };
    catalogSheet.getColumn('A').numFmt = '@';
    for (let row = 2; row <= 5000; row += 1) {
      catalogSheet.getCell(`A${row}`).numFmt = '@';
      catalogSheet.getCell(`G${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"SI,NO"'],
      };
    }

    const instructions = workbook.addWorksheet('Instrucciones');
    instructions.columns = [
      { key: 'field', width: 24 },
      { key: 'required', width: 14 },
      { key: 'instruction', width: 80 },
    ];
    instructions.addRow(['CAMPO', 'OBLIGATORIO', 'INDICACIÓN']);
    instructions.addRows([
      ['codigo', 'Sí', `Código ${normalizedSystem}; se conserva como texto.`],
      ['descripcion', 'Sí', 'Nombre oficial del diagnóstico.'],
      ['capitulo', 'No', 'Capítulo al que pertenece.'],
      ['grupo', 'No', 'Grupo diagnóstico.'],
      ['subgrupo', 'No', 'Subgrupo diagnóstico.'],
      ['sinonimos', 'No', 'Separar varios sinónimos con punto y coma.'],
      ['activo', 'No', 'Usar SI o NO. Si está vacío se considera SI.'],
      ['observaciones', 'No', 'Notas administrativas del catálogo.'],
    ]);
    instructions.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    instructions.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
    instructions.getColumn(3).alignment = { wrapText: true, vertical: 'top' };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return {
      fileName: `plantilla_${normalizedSystem.toLowerCase()}.xlsx`,
      buffer: Buffer.from(arrayBuffer),
    };
  }

  async previewImport(params: {
    tenantId: string;
    userId: string | null;
    system: string;
    file: Express.Multer.File;
  }) {
    const system = this.normalizeSystem(params.system);
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(params.file.buffer as any);
    } catch {
      throw new BadRequestException('El archivo Excel está dañado o no es válido.');
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('El archivo no contiene hojas de cálculo.');
    }

    const estimatedDataRows = Math.max(sheet.actualRowCount - 1, 0);
    if (estimatedDataRows > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `El archivo supera el máximo de ${MAX_IMPORT_ROWS} registros.`,
      );
    }

    const headers = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, columnNumber) => {
      const header = this.normalizeHeader(this.cellText(cell.value));
      if (header) headers.set(header, columnNumber);
    });

    const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.has(column));
    if (missingColumns.length > 0) {
      throw new BadRequestException({
        message: 'El archivo no tiene todas las columnas obligatorias.',
        missingColumns,
        expectedColumns: ALLOWED_COLUMNS,
      });
    }

    const rawRows: Array<Omit<ValidDiagnosisRow, 'action'>> = [];
    const invalidRows: InvalidDiagnosisRow[] = [];
    const codesInFile = new Set<string>();

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const value = (column: string) => {
        const columnNumber = headers.get(column);
        return columnNumber ? this.cellText(row.getCell(columnNumber).value) : '';
      };

      const code = this.normalizeCode(value('codigo'));
      const description = value('descripcion').trim();
      if (!code && !description) return;

      const errors: string[] = [];
      if (!code) errors.push('El código es obligatorio.');
      if (!description) errors.push('La descripción es obligatoria.');
      if (code.length > 20) errors.push('El código supera los 20 caracteres.');
      if (codesInFile.has(code)) errors.push('Código duplicado dentro del archivo.');

      let active = true;
      try {
        active = this.parseActive(value('activo'));
      } catch (error: any) {
        errors.push(error.message);
      }

      if (errors.length > 0) {
        invalidRows.push({
          rowNumber,
          code: code || null,
          description: description || null,
          errors,
        });
        return;
      }

      codesInFile.add(code);
      const synonyms = this.parseSynonyms(value('sinonimos'));
      const chapter = this.nullableText(value('capitulo'));
      const group = this.nullableText(value('grupo'));
      const subgroup = this.nullableText(value('subgrupo'));

      rawRows.push({
        rowNumber,
        system,
        code,
        description,
        chapter,
        group,
        subgroup,
        synonyms,
        active,
        observations: this.nullableText(value('observaciones')),
        searchText: [code, description, chapter, group, subgroup, ...synonyms]
          .filter(Boolean)
          .join(' '),
      });
    });

    if (rawRows.length + invalidRows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `El archivo supera el máximo de ${MAX_IMPORT_ROWS} registros.`,
      );
    }

    const existing = await this.prisma.diagnosisCatalog.findMany({
      where: {
        tenantId: params.tenantId,
        system,
        code: { in: rawRows.map((row) => row.code) },
      },
    });
    const existingByCode = new Map(existing.map((row) => [row.code, row]));

    const validRows: ValidDiagnosisRow[] = rawRows.map((row) => {
      const current = existingByCode.get(row.code);
      const action: ImportAction = !current
        ? 'CREATE'
        : this.sameDiagnosis(current, row)
          ? 'UNCHANGED'
          : 'UPDATE';
      return { ...row, action };
    });

    const summary = {
      totalRows: validRows.length + invalidRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      toCreate: validRows.filter((row) => row.action === 'CREATE').length,
      toUpdate: validRows.filter((row) => row.action === 'UPDATE').length,
      unchanged: validRows.filter((row) => row.action === 'UNCHANGED').length,
    };

    const report = { system, summary, validRows, invalidRows };
    const catalogImport = await this.prisma.catalogImport.create({
      data: {
        tenantId: params.tenantId,
        catalogType: system,
        sourceFileName: params.file.originalname,
        source: 'Excel',
        status: 'PREVIEWED',
        totalRows: summary.totalRows,
        validRows: summary.validRows,
        invalidRows: summary.invalidRows,
        errorRows: summary.invalidRows,
        validationReport: report as any,
        createdById: params.userId,
      },
    });

    return {
      previewId: catalogImport.id,
      ...report,
      validRows: validRows.slice(0, 100),
      invalidRows: invalidRows.slice(0, 100),
      previewLimited: validRows.length > 100 || invalidRows.length > 100,
    };
  }

  async applyImport(params: {
    tenantId: string;
    userId: string | null;
    previewId: string;
  }) {
    const catalogImport = await this.prisma.catalogImport.findFirst({
      where: { id: params.previewId, tenantId: params.tenantId },
    });

    if (!catalogImport) throw new NotFoundException('Previsualización no encontrada.');
    if (catalogImport.status === 'COMPLETED') {
      throw new ConflictException('Esta importación ya fue aplicada.');
    }
    if (catalogImport.status !== 'PREVIEWED') {
      throw new ConflictException('La importación no está lista para aplicarse.');
    }

    const report = catalogImport.validationReport as any;
    const rows = Array.isArray(report?.validRows)
      ? (report.validRows as ValidDiagnosisRow[])
      : [];

    if (rows.length === 0) {
      throw new BadRequestException('No existen registros válidos para importar.');
    }

    const createdRows = rows.filter((row) => row.action === 'CREATE').length;
    const updatedRows = rows.filter((row) => row.action === 'UPDATE').length;
    const skippedRows = rows.filter((row) => row.action === 'UNCHANGED').length;
    const rowsToCreate = rows.filter((row) => row.action === 'CREATE');
    const rowsToUpdate = rows.filter((row) => row.action === 'UPDATE');

    await this.prisma.$transaction(
      async (tx) => {
        const claim = await tx.catalogImport.updateMany({
          where: {
            id: catalogImport.id,
            tenantId: params.tenantId,
            status: 'PREVIEWED',
          },
          data: { status: 'APPLYING' },
        });

        if (claim.count !== 1) {
          throw new ConflictException(
            'La importación ya está siendo procesada o fue aplicada.',
          );
        }

        if (rowsToCreate.length > 0) {
          const batchSize = 1000;
          for (let offset = 0; offset < rowsToCreate.length; offset += batchSize) {
            const batch = rowsToCreate.slice(offset, offset + batchSize);
            await tx.diagnosisCatalog.createMany({
              data: batch.map((row) => ({
                tenantId: params.tenantId,
                createdById: params.userId,
                system: row.system,
                code: row.code,
                description: row.description,
                chapter: row.chapter,
                group: row.group,
                subgroup: row.subgroup,
                synonyms: row.synonyms,
                searchText: row.searchText,
                active: row.active,
                observations: row.observations,
                source: catalogImport.sourceFileName,
              })),
            });
          }
        }

        for (const row of rowsToUpdate) {
          await tx.diagnosisCatalog.update({
            where: {
              tenantId_system_code: {
                tenantId: params.tenantId,
                system: row.system,
                code: row.code,
              },
            },
            data: {
              description: row.description,
              chapter: row.chapter,
              group: row.group,
              subgroup: row.subgroup,
              synonyms: row.synonyms,
              searchText: row.searchText,
              active: row.active,
              observations: row.observations,
              source: catalogImport.sourceFileName,
            },
          });
        }

        await tx.catalogImport.update({
          where: { id: catalogImport.id },
          data: {
            status: 'COMPLETED',
            createdRows,
            updatedRows,
            skippedRows,
            completedAt: new Date(),
          },
        });
      },
      { timeout: 180_000 },
    );

    return {
      message: 'Catálogo importado correctamente.',
      importId: catalogImport.id,
      createdRows,
      updatedRows,
      skippedRows,
      invalidRows: catalogImport.invalidRows,
    };
  }

  private normalizeSystem(value?: string | null) {
    const system = String(value || 'CIE10')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    return system === 'CIE11' ? 'CIE11' : 'CIE10';
  }

  private normalizeHeader(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
  }

  private normalizeCode(value: string) {
    return value.trim().toUpperCase().replace(/\s+/g, '');
  }

  private nullableText(value: string) {
    const text = value.trim();
    return text || null;
  }

  private parseSynonyms(value: string) {
    return [...new Set(value.split(/[;|\n]/).map((item) => item.trim()).filter(Boolean))];
  }

  private parseActive(value: string) {
    const normalized = value.trim().toUpperCase();
    if (!normalized || ['SI', 'SÍ', 'TRUE', '1', 'ACTIVO'].includes(normalized)) {
      return true;
    }
    if (['NO', 'FALSE', '0', 'INACTIVO'].includes(normalized)) return false;
    throw new Error('El campo activo debe contener SI o NO.');
  }

  private cellText(value: ExcelJS.CellValue) {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
      if ('text' in value) return String(value.text || '');
      if ('result' in value) return String(value.result ?? '');
      if ('richText' in value) {
        return value.richText.map((part) => part.text).join('');
      }
    }
    return String(value);
  }

  private sameDiagnosis(current: any, candidate: Omit<ValidDiagnosisRow, 'action'>) {
    return (
      current.description === candidate.description &&
      (current.chapter || null) === candidate.chapter &&
      (current.group || null) === candidate.group &&
      (current.subgroup || null) === candidate.subgroup &&
      JSON.stringify(current.synonyms || []) === JSON.stringify(candidate.synonyms) &&
      current.active === candidate.active &&
      (current.observations || null) === candidate.observations
    );
  }
}
