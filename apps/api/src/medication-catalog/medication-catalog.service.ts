/**
 * Archivo: medication-catalog.service.ts
 * Ruta: apps/api/src/medication-catalog/medication-catalog.service.ts
 * Funcion: Gestiona productos, lotes e importaciones para farmacia y drogueria.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { MedicationInventoryService } from './medication-inventory.service';
import {
  ADMINISTRATION_ROUTES,
  PHARMACEUTICAL_FORMS,
  PHARMACY_CATALOG_REFERENCES,
  PRODUCT_TYPES,
  UNIT_MEASURES,
} from './medication-catalog.references';
import {
  buildCompanySku,
  buildMasterCode,
  extractSequenceFromCode,
  resolveCompanyPrefix,
  resolveProductTypePrefix,
} from './medication-code-generator.util';

const CATALOG_TYPE = 'MEDICATION';
const MAX_PRODUCTS = 20_000;
const MAX_LOTS = 50_000;

type Action = 'CREATE' | 'UPDATE' | 'UNCHANGED';

type ProductRow = {
  rowNumber: number;
  masterCode: string | null;
  internalCode: string;
  barcode: string | null;
  productType: string;
  genericName: string;
  commercialName: string | null;
  concentration: string | null;
  pharmaceuticalForm: string | null;
  presentation: string;
  route: string | null;
  unitMeasure: string | null;
  laboratory: string | null;
  manufacturer: string | null;
  registrationHolder: string | null;
  sanitaryRegistration: string | null;
  atcCode: string | null;
  pnumCode: string | null;
  requiresPrescription: boolean;
  controlled: boolean;
  coldChain: boolean;
  taxable: boolean;
  active: boolean;
  observations: string | null;
  searchText: string;
  action: Action;
};

type LotRow = {
  rowNumber: number;
  internalCode: string;
  businessUnit: string;
  warehouse: string;
  shelfCode: string | null;
  shelfLevel: string | null;
  locationNotes: string | null;
  lotNumber: string;
  expirationDate: string | null;
  stock: number;
  minimumStock: number;
  purchasePrice: number | null;
  salePrice: number | null;
  wholesalePrice: number | null;
  currency: string;
  supplier: string | null;
  active: boolean;
};

@Injectable()
export class MedicationCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: MedicationInventoryService,
  ) {}

  async listCatalog(params: {
    tenantId: string;
    companyId: string;
    businessUnitId: string;
    query?: string;
    status?: string;
    productType?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Math.trunc(params.page || 1));
    const pageSize = Math.min(
      100,
      Math.max(10, Math.trunc(params.pageSize || 50)),
    );
    const where: any = { tenantId: params.tenantId };
    if (params.status === 'active') where.active = true;
    if (params.status === 'inactive') where.active = false;
    if (params.productType?.trim())
      where.productType = params.productType.trim().toUpperCase();
    if (params.query?.trim()) {
      const query = params.query.trim();
      where.OR = [
        { masterCode: { contains: query, mode: 'insensitive' } },
        { internalCode: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query, mode: 'insensitive' } },
        { genericName: { contains: query, mode: 'insensitive' } },
        { commercialName: { contains: query, mode: 'insensitive' } },
        { sanitaryRegistration: { contains: query, mode: 'insensitive' } },
        { searchText: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.medication.count({ where }),
      this.prisma.medication.findMany({
        where,
        orderBy: [{ genericName: 'asc' }, { commercialName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          inventoryLots: {
            where: {
              active: true,
              companyId: params.companyId,
              businessUnitId: params.businessUnitId,
            },
            orderBy: [{ businessUnit: 'asc' }, { expirationDate: 'asc' }],
          },
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

  listImports(tenantId: string) {
    return this.prisma.catalogImport.findMany({
      where: { tenantId, catalogType: CATALOG_TYPE },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async changeStatus(tenantId: string, id: string, active: boolean) {
    const result = await this.prisma.medication.updateMany({
      where: { id, tenantId },
      data: { active },
    });
    if (!result.count) throw new NotFoundException('Producto no encontrado.');
    return { message: active ? 'Producto activado.' : 'Producto inactivado.' };
  }

  async previewGeneratedCodes(params: {
    tenantId: string;
    productType: string;
  }) {
    const productType = this.code(params.productType || 'MEDICAMENTO');

    if (!(PRODUCT_TYPES as readonly string[]).includes(productType)) {
      throw new BadRequestException(
        'Tipo de producto no valido. Use MEDICAMENTO, DISPOSITIVO_MEDICO, PRODUCTO_SANITARIO u OTRO.',
      );
    }

    return this.nextAvailableCodes(params.tenantId, productType);
  }

  async createProduct(params: {
    tenantId: string;
    userId: string | null;
    data: any;
  }) {
    const productType = this.code(
      params.data.productType || params.data.tipo_producto || 'MEDICAMENTO',
    );
    const genericName = this.textValue(
      params.data.genericName || params.data.nombre_generico,
    );
    const presentation = this.textValue(
      params.data.presentation || params.data.presentacion,
    );

    if (!(PRODUCT_TYPES as readonly string[]).includes(productType)) {
      throw new BadRequestException(
        'Tipo de producto no valido. Use MEDICAMENTO, DISPOSITIVO_MEDICO, PRODUCTO_SANITARIO u OTRO.',
      );
    }

    if (!genericName)
      throw new BadRequestException('Nombre generico obligatorio.');
    if (!presentation)
      throw new BadRequestException('Presentacion obligatoria.');

    const generatedCodes = await this.nextAvailableCodes(
      params.tenantId,
      productType,
    );
    const internalCode =
      this.code(
        params.data.internalCode ||
          params.data.skuEmpresa ||
          params.data.sku_empresa,
      ) || generatedCodes.companySku;
    const masterCode = this.nullable(
      String(
        params.data.masterCode ||
          params.data.codigoMaestroHcelm ||
          params.data.codigo_maestro_hcelm ||
          generatedCodes.masterCode,
      ),
    );

    const existing = await this.prisma.medication.findFirst({
      where: {
        tenantId: params.tenantId,
        OR: [{ internalCode }, ...(masterCode ? [{ masterCode }] : [])],
      },
      select: { internalCode: true, masterCode: true },
    });

    if (existing?.internalCode === internalCode) {
      throw new ConflictException(
        `Ya existe un producto con SKU ${internalCode}.`,
      );
    }

    if (masterCode && existing?.masterCode === masterCode) {
      throw new ConflictException(
        `Ya existe un producto con codigo maestro ${masterCode}.`,
      );
    }

    const commercialName = this.nullable(
      String(params.data.commercialName || params.data.nombre_comercial || ''),
    );
    const concentration = this.nullable(
      String(params.data.concentration || params.data.concentracion || ''),
    );
    const pharmaceuticalForm = this.nullable(
      String(
        params.data.pharmaceuticalForm || params.data.forma_farmaceutica || '',
      ),
    );
    const route = this.nullable(
      String(params.data.route || params.data.via_administracion || ''),
    );
    const unitMeasure = this.nullable(
      String(params.data.unitMeasure || params.data.unidad_medida || ''),
    );
    const laboratory = this.nullable(
      String(params.data.laboratory || params.data.laboratorio || ''),
    );
    const sanitaryRegistration = this.nullable(
      String(
        params.data.sanitaryRegistration ||
          params.data.registro_sanitario ||
          '',
      ),
    );

    return this.prisma.medication.create({
      data: {
        tenantId: params.tenantId,
        masterCode,
        internalCode,
        barcode: this.nullable(
          String(params.data.barcode || params.data.codigo_barra || ''),
        ),
        productType,
        genericName,
        commercialName,
        concentration,
        pharmaceuticalForm,
        presentation,
        route,
        unitMeasure,
        laboratory,
        manufacturer: this.nullable(
          String(params.data.manufacturer || params.data.fabricante || ''),
        ),
        registrationHolder: this.nullable(
          String(
            params.data.registrationHolder ||
              params.data.titular_registro ||
              '',
          ),
        ),
        sanitaryRegistration,
        atcCode: this.nullable(
          String(params.data.atcCode || params.data.codigo_atc || ''),
        ),
        pnumCode: this.nullable(
          String(params.data.pnumCode || params.data.codigo_pnum || ''),
        ),
        requiresPrescription: this.boolean(
          String(
            params.data.requiresPrescription ??
              params.data.requiere_receta ??
              '',
          ),
          true,
        ),
        controlled: this.boolean(
          String(params.data.controlled ?? params.data.controlado ?? ''),
          false,
        ),
        coldChain: this.boolean(
          String(params.data.coldChain ?? params.data.cadena_frio ?? ''),
          false,
        ),
        taxable: this.boolean(
          String(params.data.taxable ?? params.data.afecto_igv ?? ''),
          true,
        ),
        active: params.data.active === false ? false : true,
        observations: this.nullable(
          String(params.data.observations || params.data.observaciones || ''),
        ),
        searchText: [
          masterCode,
          internalCode,
          params.data.barcode || params.data.codigo_barra,
          genericName,
          commercialName,
          concentration,
          pharmaceuticalForm,
          presentation,
          route,
          laboratory,
          sanitaryRegistration,
        ]
          .filter(Boolean)
          .join(' '),
        source: 'Registro manual',
        createdById: params.userId,
      },
    });
  }

  async createOrUpdateLot(params: {
    tenantId: string;
    userId: string | null;
    medicationId: string;
    data: any;
  }) {
    const medication = await this.prisma.medication.findFirst({
      where: { id: params.medicationId, tenantId: params.tenantId },
      select: { id: true, internalCode: true, genericName: true },
    });

    if (!medication) {
      throw new NotFoundException('Producto no encontrado.');
    }

    const businessUnit = this.code(
      params.data.businessUnit || params.data.unidad_negocio || 'BOTICA',
    );
    const warehouse = this.textValue(
      params.data.warehouse || params.data.almacen || 'PRINCIPAL',
    ).toUpperCase();
    const lotNumber = this.textValue(
      params.data.lotNumber || params.data.lote || 'SIN_LOTE',
    ).toUpperCase();
    const currency = this.code(
      params.data.currency || params.data.moneda || 'PEN',
    );

    if (
      !['BOTICA', 'FARMACIA', 'DROGUERIA', 'CONSULTORIO'].includes(businessUnit)
    ) {
      throw new BadRequestException(
        'Unidad de negocio no valida. Use BOTICA, DROGUERIA o CONSULTORIO. FARMACIA se acepta solo como alias legado.',
      );
    }

    if (!warehouse) throw new BadRequestException('Almacen obligatorio.');
    if (!lotNumber) throw new BadRequestException('Lote obligatorio.');
    if (!['PEN', 'USD'].includes(currency))
      throw new BadRequestException('Moneda no valida. Use PEN o USD.');

    const stock = this.number(
      String(params.data.stock ?? params.data.stock_inicial ?? ''),
      0,
    );
    const minimumStock = this.number(
      String(params.data.minimumStock ?? params.data.stock_minimo ?? ''),
      0,
    );
    const purchasePrice = this.nullableNumber(
      String(params.data.purchasePrice ?? params.data.precio_compra ?? ''),
    );
    const salePrice = this.nullableNumber(
      String(params.data.salePrice ?? params.data.precio_venta ?? ''),
    );
    const wholesalePrice = this.nullableNumber(
      String(params.data.wholesalePrice ?? params.data.precio_mayorista ?? ''),
    );

    if (stock < 0 || minimumStock < 0) {
      throw new BadRequestException(
        'Stock y stock minimo no pueden ser negativos.',
      );
    }

    if (
      [purchasePrice, salePrice, wholesalePrice].some(
        (price) => price !== null && price < 0,
      )
    ) {
      throw new BadRequestException('Los precios no pueden ser negativos.');
    }

    let expirationDate: Date | null = null;
    const expirationDateText = this.textValue(
      params.data.expirationDate || params.data.fecha_vencimiento,
    );

    if (expirationDateText) {
      const parsed = this.date(expirationDateText);
      expirationDate = parsed ? new Date(`${parsed}T00:00:00`) : null;
    }

    const lotData = {
      businessUnit,
      warehouse,
      shelfCode:
        this.nullable(
          String(params.data.shelfCode || params.data.andamio || ''),
        )?.toUpperCase() || null,
      shelfLevel:
        this.nullable(
          String(params.data.shelfLevel || params.data.nivel_andamio || ''),
        )?.toUpperCase() || null,
      locationNotes: this.nullable(
        String(
          params.data.locationNotes || params.data.ubicacion_referencia || '',
        ),
      ),
      lotNumber,
      expirationDate,
      stock,
      minimumStock,
      purchasePrice,
      salePrice,
      wholesalePrice,
      currency,
      supplier: this.nullable(
        String(params.data.supplier || params.data.proveedor || ''),
      ),
      active: params.data.active === false ? false : true,
      source: 'Registro manual de lote',
    };

    const { lot, movement } = await this.inventoryService.upsertManualLot({
      tenantId: params.tenantId,
      userId: params.userId,
      medicationId: medication.id,
      businessUnit,
      warehouse,
      lotNumber,
      lotData,
      idempotencyKey: this.nullable(String(params.data.idempotencyKey || '')),
      reason: this.nullable(
        String(params.data.reason || params.data.motivo || ''),
      ),
    });

    return {
      message: 'Lote/stock registrado correctamente.',
      product: medication,
      lot,
      movement,
    };
  }

  async generateTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HCELM - AME HEALTH SAC';

    const lists = workbook.addWorksheet('Listas');
    const listColumns: Array<[string, readonly string[]]> = [
      ['TIPO_PRODUCTO', PRODUCT_TYPES],
      ['FORMA_FARMACEUTICA', PHARMACEUTICAL_FORMS],
      ['VIA_ADMINISTRACION', ADMINISTRATION_ROUTES],
      ['UNIDAD_MEDIDA', UNIT_MEASURES],
      ['SI_NO', ['SI', 'NO']],
      ['UNIDAD_NEGOCIO', ['BOTICA', 'DROGUERIA', 'CONSULTORIO']],
      ['MONEDA', ['PEN', 'USD']],
    ];
    listColumns.forEach(([title, values], columnIndex) => {
      const column = columnIndex + 1;
      lists.getCell(1, column).value = title;
      values.forEach((value, index) => {
        lists.getCell(index + 2, column).value = value;
      });
      lists.getColumn(column).width = Math.max(20, title.length + 2);
    });
    this.styleHeader(lists, 'FF475569', 'A1:G1');
    workbook.definedNames.add(
      `Listas!$A$2:$A$${PRODUCT_TYPES.length + 1}`,
      'HCELM_TIPOS_PRODUCTO',
    );
    workbook.definedNames.add(
      `Listas!$B$2:$B$${PHARMACEUTICAL_FORMS.length + 1}`,
      'HCELM_FORMAS_FARMACEUTICAS',
    );
    workbook.definedNames.add(
      `Listas!$C$2:$C$${ADMINISTRATION_ROUTES.length + 1}`,
      'HCELM_VIAS_ADMINISTRACION',
    );
    workbook.definedNames.add(
      `Listas!$D$2:$D$${UNIT_MEASURES.length + 1}`,
      'HCELM_UNIDADES_MEDIDA',
    );
    workbook.definedNames.add('Listas!$E$2:$E$3', 'HCELM_SI_NO');
    workbook.definedNames.add('Listas!$F$2:$F$4', 'HCELM_UNIDADES_NEGOCIO');
    workbook.definedNames.add('Listas!$G$2:$G$3', 'HCELM_MONEDAS');

    const products = workbook.addWorksheet('Productos', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const productColumns: Array<[string, number]> = [
      ['codigo_maestro_hcelm', 22],
      ['sku_empresa', 18],
      ['codigo_barra', 20],
      ['tipo_producto', 22],
      ['nombre_generico', 34],
      ['nombre_comercial', 34],
      ['concentracion', 20],
      ['forma_farmaceutica', 24],
      ['presentacion', 30],
      ['via_administracion', 22],
      ['unidad_medida', 18],
      ['laboratorio', 28],
      ['fabricante', 28],
      ['titular_registro', 28],
      ['registro_sanitario', 22],
      ['codigo_atc', 16],
      ['codigo_pnum', 18],
      ['requiere_receta', 18],
      ['controlado', 14],
      ['cadena_frio', 14],
      ['afecto_igv', 14],
      ['activo', 12],
      ['observaciones', 38],
    ];
    products.columns = productColumns.map(([header, width]) => ({
      header,
      key: header,
      width,
    }));
    this.styleHeader(products, 'FF0F766E', 'A1:X1');
    products.autoFilter = { from: 'A1', to: 'X1' };
    products.getColumn('A').numFmt = '@';
    products.getColumn('B').numFmt = '@';
    products.getColumn('C').numFmt = '@';
    products.getCell('A1').note =
      'Codigo maestro global de HCELM. Puede dejarse vacio en esta fase; sirve para consolidar productos entre empresas/RUC.';
    products.getCell('B1').note =
      'SKU o codigo interno de la empresa/RUC. Debe ser unico dentro de la empresa.';
    products.getCell('D1').note =
      'Clasificacion general. Seleccione MEDICAMENTO, DISPOSITIVO_MEDICO, PRODUCTO_SANITARIO u OTRO.';
    products.getCell('H1').note =
      'Forma fisica del producto. Ejemplos: TABLETA, CAPSULA, JARABE o SOLUCION INYECTABLE.';
    for (let row = 2; row <= 5000; row += 1) {
      products.getCell(`D${row}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['HCELM_TIPOS_PRODUCTO'],
        showErrorMessage: true,
        errorTitle: 'Tipo de producto no valido',
        error: 'Seleccione una opcion de la lista.',
      };
      products.getCell(`H${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['HCELM_FORMAS_FARMACEUTICAS'],
        showErrorMessage: true,
        errorTitle: 'Forma farmaceutica no valida',
        error: 'Seleccione una opcion de la lista.',
      };
      products.getCell(`J${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['HCELM_VIAS_ADMINISTRACION'],
        showErrorMessage: true,
        errorTitle: 'Via no valida',
        error: 'Seleccione una opcion de la lista.',
      };
      products.getCell(`K${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['HCELM_UNIDADES_MEDIDA'],
        showErrorMessage: true,
        errorTitle: 'Unidad no valida',
        error: 'Seleccione una opcion de la lista.',
      };
      for (const column of ['S', 'T', 'U', 'V', 'W']) {
        products.getCell(`${column}${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['HCELM_SI_NO'],
        };
      }
    }

    const inventory = workbook.addWorksheet('Inventario_Inicial', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const inventoryColumns: Array<[string, number]> = [
      ['sku_empresa', 18],
      ['unidad_negocio', 18],
      ['almacen', 22],
      ['andamio', 18],
      ['nivel_andamio', 18],
      ['ubicacion_referencia', 34],
      ['lote', 18],
      ['fecha_vencimiento', 20],
      ['stock_inicial', 16],
      ['stock_minimo', 16],
      ['precio_compra', 16],
      ['precio_venta', 16],
      ['precio_mayorista', 18],
      ['moneda', 12],
      ['proveedor', 30],
      ['activo', 12],
    ];
    inventory.columns = inventoryColumns.map(([header, width]) => ({
      header,
      key: header,
      width,
    }));
    this.styleHeader(inventory, 'FF2563EB', 'A1:P1');
    inventory.autoFilter = { from: 'A1', to: 'P1' };
    inventory.getColumn('A').numFmt = '@';
    inventory.getColumn('D').numFmt = '@';
    inventory.getColumn('E').numFmt = '@';
    inventory.getColumn('H').numFmt = 'yyyy-mm-dd';
    for (let row = 2; row <= 10000; row += 1) {
      inventory.getCell(`B${row}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['HCELM_UNIDADES_NEGOCIO'],
      };
      inventory.getCell(`N${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['HCELM_MONEDAS'],
      };
      inventory.getCell(`P${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['HCELM_SI_NO'],
      };
    }

    const instructions = workbook.addWorksheet('Instrucciones');
    instructions.columns = [{ width: 26 }, { width: 18 }, { width: 90 }];
    instructions.addRows([
      ['SECCION', 'OBLIGATORIO', 'INDICACION'],
      [
        'Productos.codigo_maestro_hcelm',
        'No',
        'Codigo global para consolidar el mismo producto entre varias empresas/RUC.',
      ],
      [
        'Productos.sku_empresa',
        'Si',
        'SKU o codigo interno unico dentro de la empresa/RUC. Antes se llamaba codigo_interno.',
      ],
      [
        'Productos.tipo_producto',
        'Si',
        'MEDICAMENTO, DISPOSITIVO_MEDICO, PRODUCTO_SANITARIO u OTRO.',
      ],
      [
        'Productos.forma_farmaceutica',
        'Segun producto',
        'Seleccione TABLETA, CAPSULA, JARABE, SOLUCION INYECTABLE u otra forma de la lista.',
      ],
      [
        'Hoja Listas',
        'Consulta',
        'Contiene las opciones normalizadas que alimentan los desplegables de la plantilla.',
      ],
      [
        'Productos.nombre_generico',
        'Si',
        'Denominacion comun internacional o nombre principal.',
      ],
      [
        'Productos.presentacion',
        'Si',
        'Ejemplo: caja x 20 tabletas, frasco x 120 mL.',
      ],
      [
        'Inventario_Inicial',
        'No',
        'Una fila por producto, unidad de negocio, almacen y lote.',
      ],
      [
        'Inventario_Inicial.andamio',
        'Recomendado',
        'Codigo de andamio, vitrina, anaquel o ubicacion fisica. Ejemplo: F-A01 o D-B04.',
      ],
      [
        'Inventario_Inicial.nivel_andamio',
        'Recomendado',
        'Nivel exacto del andamio. Ejemplo: N01, N02, SUPERIOR, INFERIOR.',
      ],
      [
        'Inventario_Inicial.ubicacion_referencia',
        'Opcional',
        'Detalle adicional para ubicar rapidamente el producto al escanear.',
      ],
      [
        'Relacion entre hojas',
        'Si usa inventario',
        'Cada sku_empresa de Inventario_Inicial debe existir tambien en la hoja Productos.',
      ],
      [
        'fecha_vencimiento',
        'No',
        'Usar fecha real de Excel o formato AAAA-MM-DD.',
      ],
      ['precios', 'No', 'Valores numericos sin simbolos monetarios.'],
      ['stock', 'No', 'Permite decimales para productos fraccionables.'],
      [
        'Gerencia',
        '',
        'Podra consolidar stock, valorizacion, margen y proximos vencimientos.',
      ],
    ]);
    this.styleHeader(instructions, 'FF475569', 'A1:C1');
    instructions.getColumn(3).alignment = { wrapText: true, vertical: 'top' };

    const example = workbook.addWorksheet('Ejemplo');
    example.columns = [{ width: 22 }, { width: 24 }, { width: 68 }];
    example.addRows([
      ['HOJA', 'CAMPO', 'EJEMPLO'],
      [
        'Productos',
        'Producto',
        'HCELM-MED-000001 | AME-MED-0001 | 775000000001 | MEDICAMENTO | Paracetamol | Panadol | 500 mg | TABLETA | Caja x 100',
      ],
      [
        'Inventario_Inicial',
        'Lote botica',
        'BTP-MED-0001 | BOTICA | PRINCIPAL | B-A01 | N02 | Analgesicos | L24001 | 2027-12-31 | 100 | 20 | 0.10 | 0.30',
      ],
      [
        'Inventario_Inicial',
        'Lote drogueria',
        'AME-MED-0001 | DROGUERIA | CENTRAL | D-B04 | N03 | Zona analgesicos | L24001 | 2027-12-31 | 1000 | 100 | 0.09 | 0.25 | 0.18',
      ],
    ]);
    this.styleHeader(example, 'FFB45309', 'A1:C1');
    example.getColumn(3).alignment = { wrapText: true, vertical: 'top' };

    const bibliography = workbook.addWorksheet('Bibliografia');
    bibliography.columns = [
      { header: 'INSTITUCION', key: 'institution', width: 42 },
      { header: 'FUENTE', key: 'title', width: 48 },
      { header: 'USO EN HCELM', key: 'use', width: 65 },
      { header: 'ENLACE', key: 'url', width: 80 },
      { header: 'CONSULTADO', key: 'accessedAt', width: 16 },
    ];
    PHARMACY_CATALOG_REFERENCES.forEach((reference) =>
      bibliography.addRow(reference),
    );
    this.styleHeader(bibliography, 'FF334155', 'A1:E1');
    bibliography.getColumn('D').eachCell((cell, rowNumber) => {
      if (rowNumber === 1 || !cell.value) return;
      const url = String(cell.value);
      cell.value = { text: url, hyperlink: url };
      cell.font = { color: { argb: 'FF2563EB' }, underline: true };
    });
    bibliography.eachRow((row) => {
      row.alignment = { vertical: 'top', wrapText: true };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      fileName: 'plantilla_maestro_corporativo_farmacia.xlsx',
      buffer: Buffer.from(buffer),
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
      throw new BadRequestException(
        'El archivo Excel esta dañado o no es valido.',
      );
    }
    const sheet = workbook.getWorksheet('Productos') || workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Falta la hoja Productos.');
    if (Math.max(0, sheet.actualRowCount - 1) > MAX_PRODUCTS) {
      throw new BadRequestException(
        `El archivo supera ${MAX_PRODUCTS} productos.`,
      );
    }

    const headers = this.headers(sheet);
    const required = ['tipo_producto', 'nombre_generico', 'presentacion'];
    const missing = required.filter((item) => !headers.has(item));
    if (missing.length) {
      throw new BadRequestException({
        message: 'Faltan columnas obligatorias en Productos.',
        missingColumns: missing,
      });
    }

    const institution = await this.prisma.institution.findUnique({
      where: { tenantId: params.tenantId },
    });

    const companyPrefix = resolveCompanyPrefix({
      legalName: institution?.legalName,
      tradeName: institution?.name,
      ruc: institution?.ruc,
    });

    const existingCodes = await this.prisma.medication.findMany({
      where: { tenantId: params.tenantId },
      select: { masterCode: true, internalCode: true, productType: true },
    });

    const masterCounters = new Map<string, number>();
    const skuCounters = new Map<string, number>();

    for (const item of existingCodes) {
      const typePrefix = resolveProductTypePrefix(item.productType);
      masterCounters.set(
        typePrefix,
        Math.max(
          masterCounters.get(typePrefix) || 0,
          extractSequenceFromCode(item.masterCode),
        ),
      );
      skuCounters.set(
        typePrefix,
        Math.max(
          skuCounters.get(typePrefix) || 0,
          extractSequenceFromCode(item.internalCode),
        ),
      );
    }

    const nextMasterCode = (productType: string) => {
      const typePrefix = resolveProductTypePrefix(productType);
      const next = (masterCounters.get(typePrefix) || 0) + 1;
      masterCounters.set(typePrefix, next);
      return buildMasterCode(productType, next);
    };

    const nextCompanySku = (productType: string) => {
      const typePrefix = resolveProductTypePrefix(productType);
      const next = (skuCounters.get(typePrefix) || 0) + 1;
      skuCounters.set(typePrefix, next);
      return buildCompanySku({ companyPrefix, productType, sequence: next });
    };

    const invalidRows: Array<{
      rowNumber: number;
      code: string | null;
      name: string | null;
      errors: string[];
    }> = [];
    const parsed: Array<Omit<ProductRow, 'action'>> = [];
    const codes = new Set<string>();
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const value = (key: string) => this.cell(row, headers, key);
      let internalCode = this.code(
        this.firstValue(row, headers, ['sku_empresa', 'codigo_interno']),
      );
      let masterCode = this.nullable(
        this.firstValue(row, headers, [
          'codigo_maestro_hcelm',
          'codigo_maestro',
          'master_code',
        ]),
      );
      const productType = this.code(value('tipo_producto'));
      const genericName = value('nombre_generico').trim();
      const presentation = value('presentacion').trim();
      if (
        !productType &&
        !genericName &&
        !presentation &&
        !internalCode &&
        !masterCode
      )
        return;
      if (!internalCode && productType)
        internalCode = nextCompanySku(productType);
      if (!masterCode && productType) masterCode = nextMasterCode(productType);
      const errors: string[] = [];
      if (codes.has(internalCode)) errors.push('SKU empresa duplicado.');
      if (!(PRODUCT_TYPES as readonly string[]).includes(productType)) {
        errors.push(
          'Tipo de producto no valido. Use MEDICAMENTO, DISPOSITIVO_MEDICO, PRODUCTO_SANITARIO u OTRO. TABLETA o CAPSULA corresponden a forma_farmaceutica.',
        );
      }
      if (!genericName) errors.push('Nombre generico obligatorio.');
      if (!presentation) errors.push('Presentacion obligatoria.');
      if (errors.length) {
        invalidRows.push({
          rowNumber,
          code: internalCode || null,
          name: genericName || null,
          errors,
        });
        return;
      }
      codes.add(internalCode);
      const commercialName = this.nullable(value('nombre_comercial'));
      const concentration = this.nullable(value('concentracion'));
      const pharmaceuticalForm = this.nullable(value('forma_farmaceutica'));
      const route = this.nullable(value('via_administracion'));
      const unitMeasure = this.nullable(value('unidad_medida'));
      const laboratory = this.nullable(value('laboratorio'));
      const manufacturer = this.nullable(value('fabricante'));
      const registrationHolder = this.nullable(value('titular_registro'));
      const sanitaryRegistration = this.nullable(value('registro_sanitario'));
      const atcCode = this.nullable(value('codigo_atc'));
      const pnumCode = this.nullable(value('codigo_pnum'));
      let requiresPrescription: boolean;
      let controlled: boolean;
      let coldChain: boolean;
      let taxable: boolean;
      let active: boolean;
      try {
        requiresPrescription = this.boolean(value('requiere_receta'), true);
        controlled = this.boolean(value('controlado'), false);
        coldChain = this.boolean(value('cadena_frio'), false);
        taxable = this.boolean(value('afecto_igv'), true);
        active = this.boolean(value('activo'), true);
      } catch (error: any) {
        invalidRows.push({
          rowNumber,
          code: internalCode,
          name: genericName,
          errors: [error.message],
        });
        return;
      }
      parsed.push({
        rowNumber,
        masterCode,
        internalCode,
        barcode: this.nullable(value('codigo_barra')),
        productType,
        genericName,
        commercialName,
        concentration,
        pharmaceuticalForm,
        presentation,
        route,
        unitMeasure,
        laboratory,
        manufacturer,
        registrationHolder,
        sanitaryRegistration,
        atcCode,
        pnumCode,
        requiresPrescription,
        controlled,
        coldChain,
        taxable,
        active,
        observations: this.nullable(value('observaciones')),
        searchText: [
          masterCode,
          internalCode,
          value('codigo_barra'),
          genericName,
          commercialName,
          concentration,
          pharmaceuticalForm,
          presentation,
          laboratory,
          sanitaryRegistration,
        ]
          .filter(Boolean)
          .join(' '),
      });
    });

    const existing = await this.prisma.medication.findMany({
      where: { tenantId: params.tenantId, internalCode: { in: [...codes] } },
    });
    const existingByCode = new Map(
      existing.map((item) => [item.internalCode, item]),
    );
    const productRows: ProductRow[] = parsed.map((row) => {
      const current = existingByCode.get(row.internalCode);
      return {
        ...row,
        action: !current
          ? 'CREATE'
          : this.sameProduct(current, row)
            ? 'UNCHANGED'
            : 'UPDATE',
      };
    });

    const lotResult = this.parseLots(workbook, productRows);
    const summary = {
      totalRows: productRows.length + invalidRows.length,
      validRows: productRows.length,
      invalidRows: invalidRows.length + lotResult.invalidRows.length,
      toCreate: productRows.filter((row) => row.action === 'CREATE').length,
      toUpdate: productRows.filter((row) => row.action === 'UPDATE').length,
      unchanged: productRows.filter((row) => row.action === 'UNCHANGED').length,
      inventoryLots: lotResult.rows.length,
      invalidInventoryLots: lotResult.invalidRows.length,
    };
    const report = {
      summary,
      validRows: productRows,
      invalidRows,
      inventoryRows: lotResult.rows,
      invalidInventoryRows: lotResult.invalidRows,
    };
    const record = await this.prisma.catalogImport.create({
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
      previewId: record.id,
      summary,
      validRows: productRows.slice(0, 100),
      invalidRows: invalidRows.slice(0, 100),
      inventoryRows: lotResult.rows.slice(0, 100),
      invalidInventoryRows: lotResult.invalidRows.slice(0, 100),
    };
  }

  async applyImport(params: {
    tenantId: string;
    userId: string | null;
    previewId: string;
  }) {
    const record = await this.prisma.catalogImport.findFirst({
      where: {
        id: params.previewId,
        tenantId: params.tenantId,
        catalogType: CATALOG_TYPE,
      },
    });
    if (!record) throw new NotFoundException('Previsualizacion no encontrada.');
    if (record.status !== 'PREVIEWED')
      throw new ConflictException('La importacion no esta disponible.');
    const report: any = record.validationReport || {};
    if (report.invalidRows?.length || report.invalidInventoryRows?.length) {
      throw new BadRequestException(
        'Corrija los errores antes de confirmar la importacion.',
      );
    }
    const rows = (report.validRows || []) as ProductRow[];
    const lots = (report.inventoryRows || []) as LotRow[];

    const createdRows = rows.filter((row) => row.action === 'CREATE').length;
    const updatedRows = rows.filter((row) => row.action === 'UPDATE').length;
    const skippedRows = rows.filter((row) => row.action === 'UNCHANGED').length;
    await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.catalogImport.updateMany({
          where: { id: record.id, status: 'PREVIEWED' },
          data: { status: 'APPLYING' },
        });
        if (claimed.count !== 1)
          throw new ConflictException('La importacion ya fue procesada.');
        for (const row of rows) {
          const data = this.productData(
            row,
            record.sourceFileName,
            params.userId,
          );
          if (row.action === 'CREATE')
            await tx.medication.create({
              data: { tenantId: params.tenantId, ...data },
            });
          if (row.action === 'UPDATE') {
            await tx.medication.update({
              where: {
                tenantId_internalCode: {
                  tenantId: params.tenantId,
                  internalCode: row.internalCode,
                },
              },
              data,
            });
          }
        }
        const products = await tx.medication.findMany({
          where: {
            tenantId: params.tenantId,
            internalCode: {
              in: [...new Set(lots.map((lot) => lot.internalCode))],
            },
          },
          select: { id: true, internalCode: true },
        });
        const byCode = new Map(
          products.map((item) => [item.internalCode, item.id]),
        );
        const inventoryScopeCache = new Map<string, any>();
        for (const lot of lots) {
          const medicationId = byCode.get(lot.internalCode);
          if (!medicationId) continue;
          await this.inventoryService.upsertImportedLot(tx, {
            tenantId: params.tenantId,
            userId: params.userId,
            medicationId,
            businessUnit: lot.businessUnit,
            warehouse: lot.warehouse,
            lotNumber: lot.lotNumber,
            lotData: this.lotData(lot, record.sourceFileName),
            importId: record.id,
            rowNumber: lot.rowNumber,
            scopeCache: inventoryScopeCache,
          });
        }
        await tx.catalogImport.update({
          where: { id: record.id },
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
      message: 'Maestro corporativo de farmacia importado.',
      createdRows,
      updatedRows,
      skippedRows,
      inventoryLots: lots.length,
    };
  }

  private async nextAvailableCodes(tenantId: string, productType: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { tenantId },
    });

    const companyPrefix = resolveCompanyPrefix({
      legalName: institution?.legalName,
      tradeName: institution?.name,
      ruc: institution?.ruc,
    });

    const typePrefix = resolveProductTypePrefix(productType);
    const existingCodes = await this.prisma.medication.findMany({
      where: { tenantId },
      select: { masterCode: true, internalCode: true, productType: true },
    });

    let masterSequence = 0;
    let skuSequence = 0;

    for (const item of existingCodes) {
      if (resolveProductTypePrefix(item.productType) !== typePrefix) continue;
      masterSequence = Math.max(
        masterSequence,
        extractSequenceFromCode(item.masterCode),
      );
      skuSequence = Math.max(
        skuSequence,
        extractSequenceFromCode(item.internalCode),
      );
    }

    return {
      productType,
      companyPrefix,
      masterCode: buildMasterCode(productType, masterSequence + 1),
      companySku: buildCompanySku({
        companyPrefix,
        productType,
        sequence: skuSequence + 1,
      }),
    };
  }

  private textValue(value: unknown) {
    return String(value || '').trim();
  }

  private parseLots(workbook: ExcelJS.Workbook, productRows: ProductRow[]) {
    const sheet = workbook.getWorksheet('Inventario_Inicial');
    if (!sheet) return { rows: [] as LotRow[], invalidRows: [] as any[] };
    if (Math.max(0, sheet.actualRowCount - 1) > MAX_LOTS) {
      throw new BadRequestException(
        `La hoja Inventario_Inicial supera ${MAX_LOTS} filas.`,
      );
    }

    const productCodes = new Set(productRows.map((row) => row.internalCode));
    const productsByRowNumber = new Map(
      productRows.map((row) => [row.rowNumber, row.internalCode]),
    );

    const headers = this.headers(sheet);
    const required = ['unidad_negocio', 'almacen', 'lote'];
    const missing = required.filter((item) => !headers.has(item));
    if (missing.length)
      throw new BadRequestException({
        message: 'Faltan columnas en Inventario_Inicial.',
        missingColumns: missing,
      });
    const rows: LotRow[] = [];
    const invalidRows: Array<{ rowNumber: number; errors: string[] }> = [];
    const identities = new Set<string>();
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const value = (key: string) => this.cell(row, headers, key);
      let internalCode = this.code(
        this.firstValue(row, headers, ['sku_empresa', 'codigo_interno']),
      );
      const generatedCodeForSameRow = productsByRowNumber.get(rowNumber);

      if (
        (!internalCode || !productCodes.has(internalCode)) &&
        generatedCodeForSameRow
      ) {
        internalCode = generatedCodeForSameRow;
      }

      const businessUnit = this.code(value('unidad_negocio')) || 'BOTICA';
      const warehouse = value('almacen').trim().toUpperCase() || 'PRINCIPAL';
      const shelfCode = this.nullable(value('andamio'))?.toUpperCase() || null;
      const shelfLevel =
        this.nullable(value('nivel_andamio'))?.toUpperCase() || null;
      const locationNotes = this.nullable(value('ubicacion_referencia'));
      const lotNumber = value('lote').trim().toUpperCase() || 'SIN_LOTE';
      if (!internalCode && !value('stock_inicial')) return;
      const errors: string[] = [];
      if (!productCodes.has(internalCode))
        errors.push('El producto no existe en la hoja Productos.');
      if (
        !['BOTICA', 'FARMACIA', 'DROGUERIA', 'CONSULTORIO'].includes(
          businessUnit,
        )
      )
        errors.push('Unidad de negocio no valida.');
      const currency = this.code(value('moneda')) || 'PEN';
      if (!['PEN', 'USD'].includes(currency))
        errors.push('Moneda no valida. Use PEN o USD.');
      const identity = `${internalCode}|${businessUnit}|${warehouse}|${lotNumber}`;
      if (identities.has(identity)) errors.push('Lote duplicado.');
      let expirationDate: string | null = null;
      try {
        expirationDate = this.date(value('fecha_vencimiento'));
      } catch (error: any) {
        errors.push(error.message);
      }
      let stock = 0;
      let minimumStock = 0;
      let purchasePrice: number | null = null;
      let salePrice: number | null = null;
      let wholesalePrice: number | null = null;
      let active = true;
      try {
        stock = this.number(value('stock_inicial'), 0);
        minimumStock = this.number(value('stock_minimo'), 0);
        purchasePrice = this.nullableNumber(value('precio_compra'));
        salePrice = this.nullableNumber(value('precio_venta'));
        wholesalePrice = this.nullableNumber(value('precio_mayorista'));
        active = this.boolean(value('activo'), true);
      } catch (error: any) {
        errors.push(error.message);
      }
      if (stock < 0 || minimumStock < 0)
        errors.push('Stock y stock minimo no pueden ser negativos.');
      if (
        [purchasePrice, salePrice, wholesalePrice].some(
          (price) => price !== null && price < 0,
        )
      ) {
        errors.push('Los precios no pueden ser negativos.');
      }
      if (errors.length) {
        invalidRows.push({ rowNumber, errors });
        return;
      }
      identities.add(identity);
      rows.push({
        rowNumber,
        internalCode,
        businessUnit,
        warehouse,
        shelfCode,
        shelfLevel,
        locationNotes,
        lotNumber,
        expirationDate,
        stock,
        minimumStock,
        purchasePrice,
        salePrice,
        wholesalePrice,
        currency,
        supplier: this.nullable(value('proveedor')),
        active,
      });
    });
    return { rows, invalidRows };
  }

  private productData(
    row: ProductRow,
    source: string,
    createdById: string | null,
  ) {
    return {
      masterCode: row.masterCode,
      internalCode: row.internalCode,
      barcode: row.barcode,
      productType: row.productType,
      genericName: row.genericName,
      commercialName: row.commercialName,
      concentration: row.concentration,
      pharmaceuticalForm: row.pharmaceuticalForm,
      presentation: row.presentation,
      route: row.route,
      unitMeasure: row.unitMeasure,
      laboratory: row.laboratory,
      manufacturer: row.manufacturer,
      registrationHolder: row.registrationHolder,
      sanitaryRegistration: row.sanitaryRegistration,
      atcCode: row.atcCode,
      pnumCode: row.pnumCode,
      requiresPrescription: row.requiresPrescription,
      controlled: row.controlled,
      coldChain: row.coldChain,
      taxable: row.taxable,
      active: row.active,
      observations: row.observations,
      searchText: row.searchText,
      source,
      createdById,
    };
  }

  private lotData(row: LotRow, source: string) {
    return {
      businessUnit: row.businessUnit,
      warehouse: row.warehouse,
      shelfCode: row.shelfCode,
      shelfLevel: row.shelfLevel,
      locationNotes: row.locationNotes,
      lotNumber: row.lotNumber,
      expirationDate: row.expirationDate
        ? new Date(`${row.expirationDate}T00:00:00`)
        : null,
      stock: row.stock,
      minimumStock: row.minimumStock,
      purchasePrice: row.purchasePrice,
      salePrice: row.salePrice,
      wholesalePrice: row.wholesalePrice,
      currency: row.currency,
      supplier: row.supplier,
      active: row.active,
      source,
    };
  }

  private sameProduct(current: any, row: Omit<ProductRow, 'action'>) {
    const data = this.productData(
      row as ProductRow,
      current.source || '',
      current.createdById || null,
    );
    return Object.entries(data).every(
      ([key, value]) =>
        ['source', 'createdById'].includes(key) ||
        String(current[key] ?? '') === String(value ?? ''),
    );
  }

  private styleHeader(sheet: ExcelJS.Worksheet, color: string, _range: string) {
    const header = sheet.getRow(1);
    header.height = 26;
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color },
    };
    header.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
  }

  private headers(sheet: ExcelJS.Worksheet) {
    const result = new Map<string, number>();
    sheet
      .getRow(1)
      .eachCell((cell, column) =>
        result.set(this.header(this.text(cell.value)), column),
      );
    return result;
  }

  private cell(row: ExcelJS.Row, headers: Map<string, number>, key: string) {
    const column = headers.get(key);
    return column ? this.text(row.getCell(column).value) : '';
  }

  private firstValue(
    row: ExcelJS.Row,
    headers: Map<string, number>,
    keys: string[],
  ) {
    for (const key of keys) {
      const value = this.cell(row, headers, key).trim();
      if (value) return value;
    }
    return '';
  }

  private header(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private text(value: ExcelJS.CellValue) {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object') {
      if ('text' in value) return String(value.text || '');
      if ('result' in value) return String(value.result ?? '');
      if ('richText' in value)
        return value.richText.map((item) => item.text).join('');
    }
    return String(value);
  }

  private code(value: string) {
    return value.trim().toUpperCase().replace(/\s+/g, '_');
  }
  private nullable(value: string) {
    const text = value.trim();
    return text || null;
  }

  private boolean(value: string, defaultValue: boolean) {
    const normalized = value.trim().toUpperCase();
    if (!normalized) return defaultValue;
    if (['SI', 'SÍ', 'TRUE', '1', 'ACTIVO'].includes(normalized)) return true;
    if (['NO', 'FALSE', '0', 'INACTIVO'].includes(normalized)) return false;
    throw new BadRequestException(
      `Valor booleano no valido: ${value}. Use SI o NO.`,
    );
  }

  private number(value: string, defaultValue: number) {
    if (!value.trim()) return defaultValue;
    const result = Number(value.replace(',', '.'));
    if (!Number.isFinite(result))
      throw new BadRequestException(`Valor numerico no valido: ${value}.`);
    return result;
  }

  private nullableNumber(value: string) {
    return value.trim() ? this.number(value, 0) : null;
  }

  private date(value: string) {
    const text = value.trim();
    if (!text) return null;
    const date = new Date(text.length === 10 ? `${text}T00:00:00` : text);
    if (Number.isNaN(date.getTime()))
      throw new Error(`Fecha no valida: ${value}.`);
    return date.toISOString().slice(0, 10);
  }
}
