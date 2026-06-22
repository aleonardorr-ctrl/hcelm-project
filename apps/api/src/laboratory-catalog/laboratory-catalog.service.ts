/**
 * Archivo: laboratory-catalog.service.ts
 * Ruta: apps/api/src/laboratory-catalog/laboratory-catalog.service.ts
 * Funcion: Catalogo, plantilla y flujo seguro de importacion de laboratorio.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

const CATALOG_TYPE = 'LABORATORY';
const MAX_IMPORT_ROWS = 20_000;
const REQUIRED_COLUMNS = ['codigo', 'categoria', 'nombre_examen'] as const;
const ALLOWED_COLUMNS = [
  'codigo',
  'tipo_registro',
  'categoria',
  'subcategoria',
  'nombre_examen',
  'nombre_corto',
  'tipo_muestra',
  'unidad',
  'valor_referencia',
  'metodo',
  'precio',
  'requiere_ayuno',
  'activo',
  'observaciones',
] as const;

const HEADER_ALIASES: Record<string, string> = {
  codigo: 'codigo',
  tipo: 'tipo_registro',
  tipo_registro: 'tipo_registro',
  tipo_de_registro: 'tipo_registro',
  categoria: 'categoria',
  subcategoria: 'subcategoria',
  nombre: 'nombre_examen',
  examen: 'nombre_examen',
  nombre_examen: 'nombre_examen',
  nombre_del_examen: 'nombre_examen',
  nombre_corto: 'nombre_corto',
  tipo_muestra: 'tipo_muestra',
  tipo_de_muestra: 'tipo_muestra',
  muestra: 'tipo_muestra',
  unidad: 'unidad',
  valor_referencia: 'valor_referencia',
  valor_de_referencia: 'valor_referencia',
  metodo: 'metodo',
  precio: 'precio',
  requiere_ayuno: 'requiere_ayuno',
  ayuno: 'requiere_ayuno',
  activo: 'activo',
  observaciones: 'observaciones',
};

type ImportAction = 'CREATE' | 'UPDATE' | 'UNCHANGED';

type LaboratoryImportRow = {
  rowNumber: number;
  code: string;
  name: string;
  nameKey: string;
  category: string;
  subcategory: string | null;
  shortName: string | null;
  specimenType: string | null;
  unit: string | null;
  referenceValue: string | null;
  method: string | null;
  price: number | null;
  requiresFasting: boolean;
  isProfile: boolean;
  active: boolean;
  observations: string | null;
  searchText: string;
  action: ImportAction;
};

type InvalidLaboratoryRow = {
  rowNumber: number;
  code: string | null;
  name: string | null;
  errors: string[];
};

type CodeCollision = {
  code: string;
  entries: Array<{
    rowNumber: number;
    category: string;
    name: string;
  }>;
};

type ProfileComponentLink = {
  rowNumber: number;
  profileCode: string;
  profileNameKey: string;
  componentCode: string;
  componentNameKey: string;
  order: number;
};

@Injectable()
export class LaboratoryCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, query: string) {
    const normalizedQuery = String(query || '').trim();
    if (normalizedQuery.length < 2) return [];

    return this.prisma.laboratoryCatalog.findMany({
      where: {
        tenantId,
        active: true,
        OR: [
          { code: { contains: normalizedQuery, mode: 'insensitive' } },
          { name: { contains: normalizedQuery, mode: 'insensitive' } },
          { shortName: { contains: normalizedQuery, mode: 'insensitive' } },
          { searchText: { contains: normalizedQuery, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 40,
      select: {
        id: true,
        code: true,
        name: true,
        shortName: true,
        category: true,
        subcategory: true,
        specimenType: true,
        unit: true,
        referenceValue: true,
        method: true,
        price: true,
        requiresFasting: true,
        isProfile: true,
        profileComponents: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            component: {
              select: { id: true, code: true, name: true, category: true },
            },
          },
        },
      },
    });
  }

  async listCatalog(params: {
    tenantId: string;
    query?: string;
    category?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query = String(params.query || '').trim();
    const category = String(params.category || '').trim();
    const status = String(params.status || 'all').toLowerCase();
    const page = Number.isFinite(params.page)
      ? Math.max(1, Math.trunc(params.page || 1))
      : 1;
    const pageSize = Number.isFinite(params.pageSize)
      ? Math.min(100, Math.max(10, Math.trunc(params.pageSize || 50)))
      : 50;

    const where: any = { tenantId: params.tenantId };
    if (status === 'active') where.active = true;
    if (status === 'inactive') where.active = false;
    if (category) where.category = category;
    if (query) {
      where.OR = [
        { code: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { shortName: { contains: query, mode: 'insensitive' } },
        { searchText: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.laboratoryCatalog.count({ where }),
      this.prisma.laboratoryCatalog.findMany({
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          category: true,
          subcategory: true,
          specimenType: true,
          unit: true,
          referenceValue: true,
          method: true,
          price: true,
          requiresFasting: true,
          isProfile: true,
          profileComponents: {
            orderBy: { order: 'asc' },
            select: {
              order: true,
              component: {
                select: { id: true, code: true, name: true, category: true },
              },
            },
          },
          active: true,
          observations: true,
          source: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items,
    };
  }

  async listCategories(tenantId: string) {
    const groups = await this.prisma.laboratoryCatalog.groupBy({
      by: ['category'],
      where: { tenantId, active: true },
      _count: { _all: true },
      orderBy: { category: 'asc' },
    });

    return groups.map((group) => ({
      category: group.category,
      count: group._count._all,
    }));
  }

  async listImports(tenantId: string) {
    return this.prisma.catalogImport.findMany({
      where: { tenantId, catalogType: CATALOG_TYPE },
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
    laboratoryId: string;
    active: boolean;
  }) {
    const item = await this.prisma.laboratoryCatalog.findFirst({
      where: { id: params.laboratoryId, tenantId: params.tenantId },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Examen de laboratorio no encontrado.');
    }

    const laboratory = await this.prisma.laboratoryCatalog.update({
      where: { id: item.id },
      data: { active: params.active },
      select: {
        id: true,
        code: true,
        name: true,
        active: true,
        updatedAt: true,
      },
    });

    return {
      message: params.active
        ? 'Examen activado correctamente.'
        : 'Examen inactivado correctamente.',
      laboratory,
    };
  }

  async setProfileComponents(params: {
    tenantId: string;
    profileId: string;
    componentIds: string[];
  }) {
    const profile = await this.prisma.laboratoryCatalog.findFirst({
      where: {
        id: params.profileId,
        tenantId: params.tenantId,
        isProfile: true,
      },
      select: { id: true, name: true },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de laboratorio no encontrado.');
    }

    const componentIds = [...new Set(params.componentIds)].filter(
      (id) => id !== profile.id,
    );
    const components = await this.prisma.laboratoryCatalog.findMany({
      where: {
        tenantId: params.tenantId,
        id: { in: componentIds },
        isProfile: false,
      },
      select: { id: true },
    });

    if (components.length !== componentIds.length) {
      throw new BadRequestException(
        'Uno o más componentes no existen, pertenecen a otro tenant o son perfiles.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.laboratoryProfileComponent.deleteMany({
        where: { profileId: profile.id },
      });

      if (components.length > 0) {
        await tx.laboratoryProfileComponent.createMany({
          data: components.map((component, index) => ({
            profileId: profile.id,
            componentId: component.id,
            order: index + 1,
          })),
        });
      }
    });

    return {
      message: 'Componentes del perfil actualizados correctamente.',
      profileId: profile.id,
      profileName: profile.name,
      componentCount: components.length,
    };
  }

  async generateTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HCELM - AME HEALTH SAC';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Laboratorio', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'codigo', key: 'codigo', width: 16 },
      { header: 'tipo_registro', key: 'tipo_registro', width: 18 },
      { header: 'categoria', key: 'categoria', width: 28 },
      { header: 'subcategoria', key: 'subcategoria', width: 26 },
      { header: 'nombre_examen', key: 'nombre_examen', width: 48 },
      { header: 'nombre_corto', key: 'nombre_corto', width: 24 },
      { header: 'tipo_muestra', key: 'tipo_muestra', width: 24 },
      { header: 'unidad', key: 'unidad', width: 16 },
      { header: 'valor_referencia', key: 'valor_referencia', width: 32 },
      { header: 'metodo', key: 'metodo', width: 28 },
      { header: 'precio', key: 'precio', width: 14 },
      { header: 'requiere_ayuno', key: 'requiere_ayuno', width: 18 },
      { header: 'activo', key: 'activo', width: 12 },
      { header: 'observaciones', key: 'observaciones', width: 36 },
    ];

    const header = sheet.getRow(1);
    header.height = 25;
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.autoFilter = { from: 'A1', to: 'N1' };
    sheet.getColumn('A').numFmt = '@';
    sheet.getColumn('K').numFmt = '0.00';

    for (let row = 2; row <= 5000; row += 1) {
      sheet.getCell(`A${row}`).numFmt = '@';
      sheet.getCell(`B${row}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"EXAMEN,PERFIL"'],
      };
      for (const column of ['L', 'M']) {
        sheet.getCell(`${column}${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"SI,NO"'],
        };
      }
    }

    const instructions = workbook.addWorksheet('Instrucciones');
    instructions.columns = [
      { key: 'field', width: 24 },
      { key: 'required', width: 14 },
      { key: 'instruction', width: 82 },
    ];
    instructions.addRow(['CAMPO', 'OBLIGATORIO', 'INDICACION']);
    instructions.addRows([
      ['codigo', 'Si', 'Codigo del examen. Se conserva como texto.'],
      ['tipo_registro', 'Si', 'Usar EXAMEN para una prueba individual o PERFIL para un conjunto de pruebas.'],
      ['categoria', 'Si', 'Grupo principal del examen.'],
      ['subcategoria', 'No', 'Subgrupo del examen.'],
      ['nombre_examen', 'Si', 'Nombre completo del examen o perfil.'],
      ['nombre_corto', 'No', 'Abreviatura o nombre mostrado en espacios reducidos.'],
      ['tipo_muestra', 'No', 'Ejemplo: suero, plasma, sangre total u orina.'],
      ['unidad', 'No', 'Unidad habitual del resultado.'],
      ['valor_referencia', 'No', 'Texto referencial; puede variar por edad o sexo.'],
      ['metodo', 'No', 'Metodo analitico principal.'],
      ['precio', 'No', 'Importe numerico, sin simbolo monetario.'],
      ['requiere_ayuno', 'No', 'Usar SI o NO.'],
      ['activo', 'No', 'Usar SI o NO. Vacio equivale a SI.'],
      ['observaciones', 'No', 'Notas administrativas o tecnicas.'],
      ['', '', ''],
      ['PERFILES', '', 'Todo PERFIL debe existir en la hoja Laboratorio y relacionarse con sus componentes en Componentes_Perfil.'],
      ['COMPONENTES', '', 'Cada componente debe existir como EXAMEN en la hoja Laboratorio.'],
      ['COINCIDENCIA', '', 'Los codigos y nombres de perfil y componente deben coincidir con la hoja Laboratorio.'],
      ['ORDEN', '', 'Usar numeros enteros desde 1 para definir el orden de los componentes.'],
    ]);
    instructions.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    instructions.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
    instructions.getColumn(3).alignment = { wrapText: true, vertical: 'top' };

    const components = workbook.addWorksheet('Componentes_Perfil', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    components.columns = [
      { header: 'codigo_perfil', key: 'codigo_perfil', width: 18 },
      { header: 'nombre_perfil', key: 'nombre_perfil', width: 42 },
      { header: 'codigo_componente', key: 'codigo_componente', width: 22 },
      { header: 'nombre_componente', key: 'nombre_componente', width: 45 },
      { header: 'orden', key: 'orden', width: 10 },
    ];
    components.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    components.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    components.autoFilter = { from: 'A1', to: 'E1' };
    components.getColumn('A').numFmt = '@';
    components.getColumn('C').numFmt = '@';

    const example = workbook.addWorksheet('Ejemplo_Perfiles');
    example.columns = [
      { header: 'HOJA', key: 'sheet', width: 22 },
      { header: 'codigo', key: 'code', width: 18 },
      { header: 'tipo_registro', key: 'type', width: 18 },
      { header: 'nombre', key: 'name', width: 42 },
      { header: 'relacion', key: 'relation', width: 58 },
    ];
    example.addRows([
      ['Laboratorio', 'PLIP', 'PERFIL', 'Perfil Lipidico', 'Registrar el perfil una sola vez.'],
      ['Laboratorio', 'COLT', 'EXAMEN', 'Colesterol total', 'Registrar cada componente como examen.'],
      ['Laboratorio', 'HDL', 'EXAMEN', 'Colesterol HDL', 'Registrar cada componente como examen.'],
      ['Componentes_Perfil', 'PLIP', '', 'Perfil Lipidico', 'PLIP + Perfil Lipidico -> COLT + Colesterol total -> orden 1'],
      ['Componentes_Perfil', 'PLIP', '', 'Perfil Lipidico', 'PLIP + Perfil Lipidico -> HDL + Colesterol HDL -> orden 2'],
    ]);
    example.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    example.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF475569' },
    };
    example.getColumn('A').numFmt = '@';
    example.getColumn('B').numFmt = '@';
    example.getColumn('E').alignment = { wrapText: true, vertical: 'top' };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return {
      fileName: 'plantilla_catalogo_laboratorio.xlsx',
      buffer: Buffer.from(arrayBuffer),
    };
  }

  async previewImport(params: {
    tenantId: string;
    userId: string | null;
    file: Express.Multer.File;
  }) {
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(params.file.buffer as any);
    } catch {
      throw new BadRequestException('El archivo Excel esta dañado o no es valido.');
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('El archivo no contiene hojas de calculo.');
    }

    const estimatedDataRows = Math.max(sheet.actualRowCount - 1, 0);
    if (estimatedDataRows > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `El archivo supera el maximo de ${MAX_IMPORT_ROWS} registros.`,
      );
    }

    const headers = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, columnNumber) => {
      const canonical = this.canonicalHeader(this.cellText(cell.value));
      if (canonical) headers.set(canonical, columnNumber);
    });

    const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.has(column));
    if (missingColumns.length > 0) {
      throw new BadRequestException({
        message: 'El archivo no tiene todas las columnas obligatorias.',
        missingColumns,
        expectedColumns: ALLOWED_COLUMNS,
      });
    }

    const rawRows: Array<Omit<LaboratoryImportRow, 'action'>> = [];
    const invalidRows: InvalidLaboratoryRow[] = [];
    const identitiesInFile = new Set<string>();
    const entriesByCode = new Map<
      string,
      Array<{ rowNumber: number; category: string; name: string }>
    >();

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const value = (column: string) => {
        const columnNumber = headers.get(column);
        return columnNumber ? this.cellText(row.getCell(columnNumber).value) : '';
      };

      const code = this.normalizeCode(value('codigo'));
      const recordType = value('tipo_registro').trim().toUpperCase();
      const category = value('categoria').trim();
      const name = value('nombre_examen').trim();
      if (!code && !category && !name) return;

      const nameKey = this.normalizeNameKey(name);
      const identity = `${code}::${nameKey}`;
      const errors: string[] = [];

      if (!code) errors.push('El codigo es obligatorio.');
      if (!category) errors.push('La categoria es obligatoria.');
      if (!name) errors.push('El nombre del examen es obligatorio.');
      if (recordType && !['EXAMEN', 'PERFIL'].includes(recordType)) {
        errors.push('Tipo de registro debe ser EXAMEN o PERFIL.');
      }
      if (name && !nameKey) {
        errors.push('El nombre debe contener letras o numeros.');
      }
      if (code.length > 30) errors.push('El codigo supera los 30 caracteres.');
      if (category.length > 150) errors.push('La categoria supera los 150 caracteres.');
      if (name.length > 500) errors.push('El nombre supera los 500 caracteres.');
      if (code && nameKey && identitiesInFile.has(identity)) {
        errors.push('Examen duplicado dentro del archivo: mismo codigo y nombre.');
      }

      let price: number | null = null;
      let requiresFasting = false;
      let active = true;

      try {
        price = this.parsePrice(value('precio'));
      } catch (error: any) {
        errors.push(error.message);
      }

      try {
        requiresFasting = this.parseBoolean(value('requiere_ayuno'), false);
      } catch (error: any) {
        errors.push(`Requiere ayuno: ${error.message}`);
      }

      try {
        active = this.parseBoolean(value('activo'), true);
      } catch (error: any) {
        errors.push(`Activo: ${error.message}`);
      }

      if (errors.length > 0) {
        invalidRows.push({
          rowNumber,
          code: code || null,
          name: name || null,
          errors,
        });
        return;
      }

      identitiesInFile.add(identity);
      const codeEntries = entriesByCode.get(code) || [];
      codeEntries.push({ rowNumber, category, name });
      entriesByCode.set(code, codeEntries);

      const subcategory = this.nullableText(value('subcategoria'));
      const shortName = this.nullableText(value('nombre_corto'));
      const specimenType = this.nullableText(value('tipo_muestra'));
      const unit = this.nullableText(value('unidad'));
      const referenceValue = this.nullableText(value('valor_referencia'));
      const method = this.nullableText(value('metodo'));

      rawRows.push({
        rowNumber,
        code,
        name,
        nameKey,
        category,
        subcategory,
        shortName,
        specimenType,
        unit,
        referenceValue,
        method,
        price,
        requiresFasting,
        isProfile: recordType
          ? recordType === 'PERFIL'
          : this.isProfileCategory(category),
        active,
        observations: this.nullableText(value('observaciones')),
        searchText: [
          code,
          name,
          shortName,
          category,
          subcategory,
          specimenType,
          method,
        ]
          .filter(Boolean)
          .join(' '),
      });
    });

    if (rawRows.length + invalidRows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `El archivo supera el maximo de ${MAX_IMPORT_ROWS} registros.`,
      );
    }

    const uniqueCodes = [...new Set(rawRows.map((row) => row.code))];
    const existing = await this.prisma.laboratoryCatalog.findMany({
      where: { tenantId: params.tenantId, code: { in: uniqueCodes } },
    });
    const existingByIdentity = new Map(
      existing.map((item) => [`${item.code}::${item.nameKey}`, item]),
    );

    const validRows: LaboratoryImportRow[] = rawRows.map((row) => {
      const current = existingByIdentity.get(`${row.code}::${row.nameKey}`);
      const action: ImportAction = !current
        ? 'CREATE'
        : this.sameLaboratory(current, row)
          ? 'UNCHANGED'
          : 'UPDATE';

      return { ...row, action };
    });

    const codeCollisions: CodeCollision[] = [...entriesByCode.entries()]
      .filter(([, entries]) => entries.length > 1)
      .map(([code, entries]) => ({ code, entries }));

    const profileMapping = this.parseProfileComponentSheet(workbook, validRows);
    const summary = {
      totalRows: validRows.length + invalidRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      toCreate: validRows.filter((row) => row.action === 'CREATE').length,
      toUpdate: validRows.filter((row) => row.action === 'UPDATE').length,
      unchanged: validRows.filter((row) => row.action === 'UNCHANGED').length,
      codeCollisions: codeCollisions.length,
      componentLinks: profileMapping.validLinks.length,
      invalidComponentLinks: profileMapping.invalidLinks.length,
    };

    const report = {
      summary,
      validRows,
      invalidRows,
      codeCollisions,
      componentLinks: profileMapping.validLinks,
      invalidComponentLinks: profileMapping.invalidLinks,
    };
    const catalogImport = await this.prisma.catalogImport.create({
      data: {
        tenantId: params.tenantId,
        catalogType: CATALOG_TYPE,
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

    if (!catalogImport) {
      throw new NotFoundException('Previsualizacion no encontrada.');
    }
    if (catalogImport.catalogType !== CATALOG_TYPE) {
      throw new ConflictException('La previsualizacion pertenece a otro catalogo.');
    }
    if (catalogImport.status === 'COMPLETED') {
      throw new ConflictException('Esta importacion ya fue aplicada.');
    }
    if (catalogImport.status !== 'PREVIEWED') {
      throw new ConflictException('La importacion no esta lista para aplicarse.');
    }

    const report = catalogImport.validationReport as any;
    if (
      Array.isArray(report?.invalidComponentLinks) &&
      report.invalidComponentLinks.length > 0
    ) {
      throw new BadRequestException(
        'Corrija las relaciones inválidas de la hoja Componentes_Perfil antes de importar.',
      );
    }
    const rows = Array.isArray(report?.validRows)
      ? (report.validRows as LaboratoryImportRow[])
      : [];

    if (rows.length === 0) {
      throw new BadRequestException('No existen registros validos para importar.');
    }

    const rowsToCreate = rows.filter((row) => row.action === 'CREATE');
    const rowsToUpdate = rows.filter((row) => row.action === 'UPDATE');
    const createdRows = rowsToCreate.length;
    const updatedRows = rowsToUpdate.length;
    const skippedRows = rows.filter((row) => row.action === 'UNCHANGED').length;

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
            'La importacion ya esta siendo procesada o fue aplicada.',
          );
        }

        const batchSize = 1000;
        for (let offset = 0; offset < rowsToCreate.length; offset += batchSize) {
          const batch = rowsToCreate.slice(offset, offset + batchSize);
          await tx.laboratoryCatalog.createMany({
            data: batch.map((row) => ({
              tenantId: params.tenantId,
              createdById: params.userId,
              code: row.code,
              name: row.name,
              nameKey: row.nameKey,
              category: row.category,
              subcategory: row.subcategory,
              shortName: row.shortName,
              specimenType: row.specimenType,
              unit: row.unit,
              referenceValue: row.referenceValue,
              method: row.method,
              price: row.price,
              requiresFasting: row.requiresFasting,
              isProfile: row.isProfile,
              active: row.active,
              observations: row.observations,
              searchText: row.searchText,
              source: catalogImport.sourceFileName,
            })),
          });
        }

        for (const row of rowsToUpdate) {
          await tx.laboratoryCatalog.update({
            where: {
              tenantId_code_nameKey: {
                tenantId: params.tenantId,
                code: row.code,
                nameKey: row.nameKey,
              },
            },
            data: {
              name: row.name,
              category: row.category,
              subcategory: row.subcategory,
              shortName: row.shortName,
              specimenType: row.specimenType,
              unit: row.unit,
              referenceValue: row.referenceValue,
              method: row.method,
              price: row.price,
              requiresFasting: row.requiresFasting,
              isProfile: row.isProfile,
              active: row.active,
              observations: row.observations,
              searchText: row.searchText,
              source: catalogImport.sourceFileName,
            },
          });
        }

        const componentLinks = Array.isArray(report?.componentLinks)
          ? (report.componentLinks as ProfileComponentLink[])
          : [];

        if (componentLinks.length > 0) {
          const linkedCodes = [
            ...new Set(
              componentLinks.flatMap((link) => [
                link.profileCode,
                link.componentCode,
              ]),
            ),
          ];
          const linkedItems = await tx.laboratoryCatalog.findMany({
            where: { tenantId: params.tenantId, code: { in: linkedCodes } },
            select: { id: true, code: true, nameKey: true, isProfile: true },
          });
          const linkedByIdentity = new Map(
            linkedItems.map((item) => [`${item.code}::${item.nameKey}`, item]),
          );
          const profileIds = [
            ...new Set(
              componentLinks
                .map((link) =>
                  linkedByIdentity.get(
                    `${link.profileCode}::${link.profileNameKey}`,
                  ),
                )
                .filter((item) => item?.isProfile)
                .map((item) => item!.id),
            ),
          ];

          await tx.laboratoryProfileComponent.deleteMany({
            where: { profileId: { in: profileIds } },
          });

          const linksToCreate = componentLinks.flatMap((link) => {
            const profile = linkedByIdentity.get(
              `${link.profileCode}::${link.profileNameKey}`,
            );
            const component = linkedByIdentity.get(
              `${link.componentCode}::${link.componentNameKey}`,
            );
            if (!profile?.isProfile || !component || component.isProfile) return [];
            return [{
              profileId: profile.id,
              componentId: component.id,
              order: link.order,
            }];
          });

          if (linksToCreate.length > 0) {
            await tx.laboratoryProfileComponent.createMany({
              data: linksToCreate,
              skipDuplicates: true,
            });
          }
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
      message: 'Catalogo de laboratorio importado correctamente.',
      importId: catalogImport.id,
      createdRows,
      updatedRows,
      skippedRows,
      invalidRows: catalogImport.invalidRows,
      codeCollisions: Array.isArray(report?.codeCollisions)
        ? report.codeCollisions.length
        : 0,
      componentLinks: Array.isArray(report?.componentLinks)
        ? report.componentLinks.length
        : 0,
    };
  }

  private canonicalHeader(value: string) {
    const normalized = this.normalizeHeader(value);
    return HEADER_ALIASES[normalized] || normalized;
  }

  private parseProfileComponentSheet(
    workbook: ExcelJS.Workbook,
    catalogRows: LaboratoryImportRow[],
  ) {
    const sheet = workbook.worksheets.find(
      (item) => this.normalizeHeader(item.name) === 'componentes_perfil',
    );
    if (!sheet) return { validLinks: [], invalidLinks: [] };

    const headers = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, columnNumber) => {
      const header = this.normalizeHeader(this.cellText(cell.value));
      if (header) headers.set(header, columnNumber);
    });

    const required = [
      'codigo_perfil',
      'nombre_perfil',
      'codigo_componente',
      'nombre_componente',
    ];
    const missing = required.filter((header) => !headers.has(header));
    if (missing.length > 0) {
      throw new BadRequestException({
        message: 'La hoja Componentes_Perfil no tiene todas las columnas obligatorias.',
        missingColumns: missing,
      });
    }

    const available = new Map(
      catalogRows.map((row) => [`${row.code}::${row.nameKey}`, row]),
    );
    const validLinks: ProfileComponentLink[] = [];
    const invalidLinks: Array<{ rowNumber: number; errors: string[] }> = [];
    const identities = new Set<string>();

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const value = (header: string) => {
        const column = headers.get(header);
        return column ? this.cellText(row.getCell(column).value).trim() : '';
      };
      const profileCode = this.normalizeCode(value('codigo_perfil'));
      const profileNameKey = this.normalizeNameKey(value('nombre_perfil'));
      const componentCode = this.normalizeCode(value('codigo_componente'));
      const componentNameKey = this.normalizeNameKey(value('nombre_componente'));
      if (!profileCode && !componentCode) return;

      const profile = available.get(`${profileCode}::${profileNameKey}`);
      const component = available.get(`${componentCode}::${componentNameKey}`);
      const errors: string[] = [];
      if (!profile?.isProfile) errors.push('El perfil no existe en la hoja principal.');
      if (!component || component.isProfile) {
        errors.push('El componente no existe o tambien es un perfil.');
      }
      const identity = `${profileCode}::${profileNameKey}::${componentCode}::${componentNameKey}`;
      if (identities.has(identity)) errors.push('Relacion duplicada.');

      if (errors.length > 0) {
        invalidLinks.push({ rowNumber, errors });
        return;
      }

      identities.add(identity);
      validLinks.push({
        rowNumber,
        profileCode,
        profileNameKey,
        componentCode,
        componentNameKey,
        order: Math.max(1, Number(value('orden')) || validLinks.length + 1),
      });
    });

    return { validLinks, invalidLinks };
  }

  private normalizeHeader(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private normalizeCode(value: string) {
    return value.trim().toUpperCase().replace(/\s+/g, '');
  }

  private isProfileCategory(value: string) {
    return this.normalizeNameKey(value) === 'perfiles';
  }

  private normalizeNameKey(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private nullableText(value: string) {
    const text = value.trim();
    return text || null;
  }

  private parseBoolean(value: string, defaultValue: boolean) {
    const normalized = value.trim().toUpperCase();
    if (!normalized) return defaultValue;
    if (['SI', 'SÍ', 'TRUE', '1', 'ACTIVO'].includes(normalized)) return true;
    if (['NO', 'FALSE', '0', 'INACTIVO'].includes(normalized)) return false;
    throw new Error('debe contener SI o NO.');
  }

  private parsePrice(value: string) {
    const text = value.trim();
    if (!text) return null;

    const normalized = text
      .replace(/S\/?/gi, '')
      .replace(/\s/g, '')
      .replace(',', '.');
    const price = Number(normalized);

    if (!Number.isFinite(price) || price < 0) {
      throw new Error('El precio debe ser un numero mayor o igual a cero.');
    }

    return Math.round(price * 100) / 100;
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

  private sameLaboratory(
    current: any,
    candidate: Omit<LaboratoryImportRow, 'action'>,
  ) {
    const currentPrice =
      current.price === null || current.price === undefined
        ? null
        : Number(current.price);

    return (
      current.name === candidate.name &&
      current.category === candidate.category &&
      (current.subcategory || null) === candidate.subcategory &&
      (current.shortName || null) === candidate.shortName &&
      (current.specimenType || null) === candidate.specimenType &&
      (current.unit || null) === candidate.unit &&
      (current.referenceValue || null) === candidate.referenceValue &&
      (current.method || null) === candidate.method &&
      currentPrice === candidate.price &&
      current.requiresFasting === candidate.requiresFasting &&
      current.isProfile === candidate.isProfile &&
      current.active === candidate.active &&
      (current.observations || null) === candidate.observations
    );
  }
}
