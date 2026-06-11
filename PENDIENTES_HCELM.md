# Bitácora de pendientes HCELM

## Leyenda de estado

| Estado         | Significado                    |
| -------------- | ------------------------------ |
| 🟢 HECHO       | Ya implementado y probado      |
| 🟡 EN TRABAJO  | En desarrollo actual           |
| 🔴 PENDIENTE   | Falta implementar              |
| 🔵 PLANIFICADO | Se hará en una etapa posterior |
| ⚫ POSTERGADO   | Se deja para versión avanzada  |

## Tabla general de pendientes

| Estado         | Módulo         | Pendiente                                                              | Prioridad | Observación                                                     |
| -------------- | -------------- | ---------------------------------------------------------------------- | --------- | --------------------------------------------------------------- |
| 🟢 HECHO       | Acceso         | Login institucional mejorado                                           | Alta      | Login actual funcional                                          |
| 🟢 HECHO       | Acceso         | Validación profesional previa a atención                               | Alta      | Permite médico, enfermería, QF, administrador, etc.             |
| 🔴 PENDIENTE   | Acceso         | Inicio del sistema con DNI electrónico                                 | Alta      | Integrar lector DNIe para identificación fuerte del profesional |
| 🔴 PENDIENTE   | SINADEF        | Identificación con DNI electrónico para acceso a SINADEF               | Alta      | Dejar acceso externo y flujo preparado                          |
| 🔴 PENDIENTE   | CMP            | Conexión con página/plataforma CMP para certificados médicos digitales | Alta      | Preparar enlace o integración futura                            |
| 🟢 HECHO       | Institución    | Logo institucional                                                     | Alta      | Configurable                                                    |
| 🟢 HECHO       | Institución    | Firma y sello institucional                                            | Alta      | Configurable                                                    |
| 🟢 HECHO       | Receta         | Receta PDF independiente                                               | Alta      | Archivo `recipePdf.ts`                                          |
| 🟢 HECHO       | Anamnesis      | Diagnóstico principal y secundarios mejorados                          | Alta      | Sin duplicados visuales                                         |
| 🟢 HECHO       | Destino final  | Alta voluntaria PDF                                                    | Alta      | Archivo independiente                                           |
| 🟢 HECHO       | Destino final  | Hoja de referencia PDF                                                 | Alta      | Archivo independiente                                           |
| 🟢 HECHO       | Destino final  | Orden de observación PDF                                               | Alta      | Archivo independiente                                           |
| 🟢 HECHO       | Destino final  | Pase clínico para SINADEF                                              | Alta      | No reemplaza certificado oficial                                |
| 🔴 PENDIENTE   | HCE            | PDF completo de Historia Clínica                                       | Alta      | Siguiente desarrollo recomendado                                |
| 🔴 PENDIENTE   | HCE            | Separar “Guardar cambios” y “Finalizar atención”                       | Alta      | Finalizar debe limpiar formulario                               |
| 🔴 PENDIENTE   | Pacientes      | Mejorar módulo Pacientes                                               | Alta      | Búsqueda, edición, historial, adjuntos                          |
| 🔴 PENDIENTE   | Pacientes      | Historial de documentos PDF por paciente                               | Alta      | Recetas, referencias, altas, observaciones                      |
| 🔵 PLANIFICADO | Observación    | Controles seriados por enfermería                                      | Media     | PA, FC, FR, SatO₂, T°, Glasgow, dolor                           |
| 🔵 PLANIFICADO | Administración | Roles y permisos por módulo                                            | Alta      | Base para sistema modular                                       |
| 🔵 PLANIFICADO | Administración | Módulos activables por institución                                     | Alta      | HCE, farmacia, droguería, caja, etc.                            |
| 🔵 PLANIFICADO | Farmacia       | Módulo farmacia/botica                                                 | Alta      | Productos, stock, lotes, vencimientos                           |
| 🔵 PLANIFICADO | Inventario     | Inventario FEFO                                                        | Alta      | Por lote, vencimiento y almacén                                 |
| 🔵 PLANIFICADO | Caja           | Apertura, cierre y arqueo                                              | Media     | Efectivo, Yape, Plin, tarjeta, crédito                          |
| 🔵 PLANIFICADO | Droguería      | Clientes, cotizaciones y ventas crédito                                | Media     | AME HEALTH SAC                                                  |
| 🔵 PLANIFICADO | Reportes       | Reportes gerenciales                                                   | Media     | Excel/PDF                                                       |
| 🔵 PLANIFICADO | SUNAT          | Preparar facturación electrónica futura                                | Baja      | Boleta, factura, guía, CDR                                      |
