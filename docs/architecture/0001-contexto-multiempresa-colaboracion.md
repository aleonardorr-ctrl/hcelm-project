# ADR 0001: Contexto multiempresa, módulos y colaboración autorizada

Fecha: 2026-06-28

## Decisión

HCELM separa tres niveles:

1. **Tenant**: grupo o espacio empresarial. No se usará como empresa fiscal.
2. **Company**: entidad legal con RUC propio.
3. **BusinessUnit / Warehouse / ModuleInstallation**: unidad operativa, almacén y módulo habilitado.

Cada módulo opera bajo una empresa y unidad concreta. Caja, ventas, inventario, kardex, clientes, series y comprobantes pertenecen siempre a una empresa/RUC.

## Aplicación al grupo actual

- AME HEALTH SAC, RUC 20611138777:
  - Consultorio Las Mercedes.
  - Droguería.
- SUMINISTROS CRÍTICOS EIRL, RUC 20613895354:
  - Botica Premium.

Los inventarios oficiales de botica y droguería se ingresarán después. Los productos actuales de desarrollo no son inventario oficial.

## Colaboración interempresa

La independencia fiscal no impide colaboración. Las empresas pueden activar acuerdos explícitos, por ejemplo:

- Recetas emitidas por el consultorio AME HEALTH pueden ser vistas como pendientes por Botica Premium.
- Botica Premium dispensa con su propio inventario y emite su propio comprobante.
- AME HEALTH conserva la propiedad clínica de la receta.
- Botica Premium solo recibe los datos mínimos necesarios.

Cada colaboración debe tener:

- Empresa origen y destino.
- Recurso permitido.
- Dirección.
- Estado y vigencia.
- Consentimiento del paciente cuando corresponda.
- Auditoría de acceso y atención.

## Restricciones

No se compartirá por defecto HCE completa, caja, inventario, clientes fiscales, series ni comprobantes de otra empresa. Toda colaboración debe configurarse expresamente.
