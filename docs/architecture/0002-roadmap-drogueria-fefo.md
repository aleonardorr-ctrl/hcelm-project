# Droguería AME: estado y continuidad funcional

Fecha de corte: 2026-07-22 (`America/Lima`).

## Límites organizacionales permanentes

- `AME HEALTH SAC` es una empresa real.
- `Droguería AME HEALTH SAC` es una unidad real de AME.
- `Consultorio Médico y Tópico Las Mercedes` es una unidad real de AME.
- `Suministros Críticos EIRL (SUMCRIT)` es una empresa real.
- `Botica Premium` es una unidad real de SUMCRIT.
- Botica y Droguería comparten principios técnicos de inventario y FEFO, pero
  mantienen flujos, permisos y políticas comerciales separados.
- Los datos operativos usados durante el desarrollo son ficticios y se
  conservan hasta la limpieza controlada previa a producción.

## Avance implementado

### Contexto operativo

- El login operativo devuelve las unidades activas después de validar RUC,
  usuario, contraseña y membresía empresarial.
- Cuando una empresa tiene varias unidades, la web solicita una selección
  explícita antes de guardar el token.
- La API valida que la unidad seleccionada pertenezca a la empresa y esté
  activa.
- El JWT conserva empresa y unidad seleccionadas.
- Se añadieron pruebas automatizadas para selección válida, unidad ajena y
  compatibilidad con clientes que todavía no envían unidad.

### Módulos por unidad

- La API mantiene `enabled` como configuración global del tenant.
- La API añade `effectiveEnabled` para representar la intersección entre el
  módulo global y la instalación activa de la unidad autenticada.
- Las rutas y el menú operativo usan `effectiveEnabled`.
- El inicio diferencia las tarjetas de Botica, Droguería y Consultorio.
- Administración SaaS se oculta a usuarios cuyo rol no sea administrativo.

### Inventario y FEFO

- Botica conserva `Inventario de Botica - Kardex y FEFO minorista` enlazado a
  `/pharmacy/inventory`.
- Droguería tiene tarjetas separadas para inventario y FEFO.
- `/drugstore/fefo` carga una primera versión funcional de consulta y
  simulación.
- El catálogo y el Kardex reciben empresa y unidad desde el token y limitan
  lotes y movimientos al contexto autenticado.
- La simulación FEFO valida empresa, unidad y almacén antes de procesar lotes.
- La consulta ordena lotes por vencimiento y no descuenta stock.
- Las reglas predeterminadas de Droguería no aplican descuentos minoristas.
- Los rangos críticos pueden exigir autorización y los rangos intermedios
  generan alertas de rotación.

## Validaciones completadas

- Selección manual de `AME / CONSULTORIO` aprobada.
- Selección manual de `AME / DROGUERIA` aprobada.
- Menús contextuales de Consultorio y Droguería aprobados visualmente.
- Build de API aprobado.
- Build de web aprobado.
- Ocho pruebas automatizadas de autenticación aprobadas.
- `git diff --check` aprobado.

## Pendiente de prueba al retomar Droguería

- Abrir `/drugstore/fefo` con una sesión de Droguería.
- Confirmar que solo aparezcan lotes de AME/Droguería.
- Seleccionar producto, almacén y cantidad.
- Ejecutar una simulación FEFO sin modificar stock.
- Confirmar el orden por vencimiento, alertas y rango crítico.
- Confirmar que no se apliquen promociones ni descuentos de Botica.
- Confirmar el Kardex limitado a empresa y unidad.

## Backlog funcional de Droguería

El diseño completo debe retomarse como una fase propia. Como mínimo debe
evaluar y completar:

- Recepción de mercadería y compras.
- Proveedores y clientes empresariales.
- Almacenes y ubicaciones internas.
- Cadena de frío y condiciones de conservación.
- Inventario mayorista y stock valorizado.
- Kardex por producto, lote, almacén y operación.
- FEFO de despacho y transferencias.
- Autorizaciones de excepción FEFO.
- Transferencias entre almacenes y hacia otras empresas autorizadas.
- Ventas y distribución mayorista.
- Trazabilidad, retiros y alertas sanitarias.
- Documentación logística, comprobantes y facturación.
- Indicadores, vencimientos y reportes gerenciales.

## Deuda técnica antes de producción

- Añadir pruebas específicas para el alcance de catálogo, Kardex y FEFO.
- Aplicar instalaciones de módulo por unidad también en los guards del backend,
  no únicamente en el menú y las rutas web.
- Validar membresía empresarial activa en cada contexto operativo sensible.
- Diseñar reglas FEFO persistentes propias de distribución, sin depender del
  nombre histórico `PharmacyFefoRule`.
- Crear una interfaz dedicada de Droguería; la primera versión reutiliza el
  componente visual de inventario para acelerar la validación técnica.
- Definir selección explícita de almacén cuando una unidad tenga varios.
- Completar pruebas de autorización y aislamiento multiempresa.

## Estado de entrega

La implementación actual es una base funcional de desarrollo. No debe
considerarse un módulo completo de Droguería ni habilitarse para producción sin
completar las pruebas y el backlog descritos.
