# HCELM — Bitácora oficial del proyecto

Última actualización: 23 de julio de 2026

Estado de referencia: rama `master`

## 1. Información general

**Proyecto:** HCELM — Historia Clínica Electrónica Las Mercedes

**Propietario:** Dr. Alfonso Leonardo Rodríguez Rojas

HCELM es una plataforma SaaS multiempresa orientada a integrar:

- Historia clínica electrónica.
- Consultorio y tópico de procedimientos.
- Pacientes, atenciones, diagnósticos y recetas.
- Laboratorio y exámenes auxiliares.
- Botica, farmacia, inventario, lotes, FEFO y ventas.
- Facturación electrónica.
- Administración organizacional y control global.
- Auditoría, seguridad y trazabilidad.
- Caja, droguería y reportes gerenciales.
- Integraciones institucionales.

## 2. Nomenclatura oficial

El módulo exclusivo para superadministradores se denomina:

**Centro de Control Global HCELM**

Términos relacionados:

- **Administración global:** tipo de acceso reservado para superadministradores.
- **Vista general:** página inicial del Centro de Control Global HCELM.
- **Acceso operativo:** ingreso al contexto de una empresa y unidad de negocio.

No deben utilizarse como nombre principal expresiones alternativas como
“Centro de Administración Global” o “Administración de plataforma”.

## 3. Reglas de desarrollo

1. Revisar esta bitácora, el último commit estable y los cambios locales antes
   de iniciar un desarrollo.
2. Mantener los módulos separados y con responsabilidades claras.
3. Evitar ampliar archivos monolíticos; refactorizar progresivamente.
4. Mantener cada generador PDF en un archivo independiente.
5. Proteger los cambios locales existentes y limitar cada avance a su alcance.
6. Ejecutar formato, pruebas relevantes, compilación y `git diff --check`.
7. No habilitar funciones de alto impacto sin una validación específica.
8. Actualizar esta bitácora al cerrar cada módulo o decisión estratégica.
9. Crear commits pequeños, verificables y con mensajes descriptivos.
10. Desarrollar el manual del usuario y los materiales audiovisuales junto con
    cada función; la documentación no debe postergarse hasta el final.

## 4. Definición de módulo terminado

Un módulo se considera terminado únicamente cuando incluye:

1. Flujo funcional implementado.
2. Permisos, seguridad y trazabilidad revisados.
3. Pruebas relevantes y compilación aprobadas.
4. Revisión visual y validación con el usuario.
5. Manual del usuario actualizado, con requisitos, procedimiento, capturas,
   advertencias y errores frecuentes.
6. Guion para un video corto de una tarea concreta.
7. Guion para un video instructivo completo del módulo.
8. Material de narración, escenas y subtítulos preparado.
9. Versión de HCELM identificada en el manual y los videos.
10. Bitácora y hoja de ruta actualizadas.

## 5. Decisiones arquitectónicas vigentes

### DA-001 — Arquitectura modular

Los dominios se desarrollan como módulos independientes y luego se integran.
La prioridad es:

1. Seguridad y estabilidad.
2. Integridad y trazabilidad de datos.
3. Modularidad.
4. Escalabilidad.
5. Nuevas funcionalidades.

### DA-002 — PDFs independientes

Los documentos clínicos y administrativos se generan desde utilidades
independientes. Actualmente existen, entre otros:

- Receta.
- Historia clínica.
- Alta voluntaria.
- Referencia.
- Observación.
- Pase clínico SINADEF.
- Orden de laboratorio.
- Orden de imágenes.

### DA-003 — Refactor progresivo de Anamnesis

No se deben seguir incorporando grandes funciones directamente en
`Anamnesis.tsx`. La estructura objetivo separará selección de paciente,
funciones vitales, diagnóstico, prescripción, exámenes auxiliares y destino.

### DA-004 — Separación de contextos de acceso

- El superadministrador utiliza el endpoint independiente
  `/api/auth/platform-login`.
- El usuario operativo ingresa mediante el contexto de empresa y unidad.
- Todo ingreso temporal de un superadministrador a una empresa debe quedar
  auditado.

### DA-005 — Reactivaciones seguras

El escaneo manual del Centro de Control Global HCELM funciona siempre en modo
observación. La ejecución automática real debe permanecer desactivada hasta
que exista aprobación y validación específicas:

`HCELM_AUTOMATIC_REACTIVATION_EXECUTION_ENABLED=false`

## 6. Estado actual por dominio

### 6.1 Centro de Control Global HCELM

**Implementado**

- Login independiente para superadministradores.
- Vista general e indicadores obtenidos desde la API.
- Navegación a tenants y empresas, reactivaciones, usuarios, auditoría y
  seguridad.
- Visualización de tenants, empresas, unidades de negocio y usuarios.
- Suspensión y reactivación administrativa de tenants, empresas y usuarios.
- Fecha opcional de reactivación automática.
- Escaneo seguro de suspensiones vencidas en modo observación.
- Auditoría administrativa de suspensiones y reactivaciones.
- Ingreso temporal auditado al contexto de una empresa.
- Historial de accesos y cierre administrativo de sesiones.
- Exportación de auditorías.

**Pendiente**

- Gestión completa de módulos y suscripciones.
- Planes, pagos, vencimientos y límites contratados.
- Respaldos y recuperación.
- Herramientas formales de soporte.
- Configuración global editable.
- MFA, DNI electrónico y firma digital.
- Habilitación controlada de la ejecución automática real.

### 6.2 Autenticación y contexto operativo

**Implementado**

- Login institucional por RUC.
- Selección y validación del contexto operativo.
- Validación de empresa, unidad de negocio y almacén.
- Separación entre sesión operativa y sesión de plataforma.
- Protección del acceso del superadministrador.
- Pruebas unitarias y e2e del mensaje de estado de la API.

**Pendiente**

- MFA.
- DNI electrónico.
- Recuperación de credenciales y políticas avanzadas de sesión.

### 6.3 Pacientes y atención clínica

**Implementado**

- Registro, listado, búsqueda y actualización de pacientes.
- Generación de número de HCE.
- Anamnesis.
- Funciones vitales y alertas clínicas.
- Diagnósticos.
- Prescripciones.
- Destino final.
- Sala de espera.
- Nueva atención clínica.

**Siguiente prioridad**

- Construir una vista consolidada Paciente → Atenciones.
- Incorporar historial de atenciones.
- Incorporar historial de recetas y documentos.
- Adjuntar resultados y documentos al paciente.
- Mejorar búsqueda y filtros.
- Conectar de forma uniforme el paciente seleccionado con todos los módulos.
- Refactorizar progresivamente `Anamnesis.tsx`.

### 6.4 Laboratorio y exámenes auxiliares

**Implementado**

- Catálogo estructurado de laboratorio.
- Categorías y selector de exámenes.
- Integración del selector con la atención clínica.
- Generación de orden de laboratorio en PDF.

**Pendiente**

- Flujo completo de toma y procesamiento de muestras.
- Registro y validación de resultados.
- Adjuntar resultados de laboratorio a la atención y al paciente.
- Integración completa con imágenes diagnósticas.

### 6.5 Botica, farmacia e inventario

**Implementado**

- Acceso directo a operaciones de Botica desde `/home`.
- Catálogo de medicamentos.
- Inventario y lotes.
- Fechas de vencimiento.
- Reglas FEFO.
- Autorizaciones FEFO.
- Venta de farmacia.
- Contexto por empresa, unidad y almacén.

**Pendiente**

- Kardex integral.
- Compras y proveedores.
- Transferencias entre almacenes.
- Devoluciones.
- Cierre completo del flujo receta → dispensación → venta.
- Reportes de stock y valorización.

### 6.6 Facturación electrónica

**Implementado o preparado**

- Perfil fiscal de empresa.
- Clientes comerciales.
- Series y correlativos.
- Preparación de comprobantes en borrador.
- Base para trabajos de documentos electrónicos.

**Pendiente**

- Integración productiva con SUNAT u OSE.
- Firma y envío de comprobantes.
- CDR, estados y reintentos.
- Notas de crédito y débito.
- Validación integral en ambiente de homologación.

### 6.7 Institución, organización y calidad de datos

**Implementado**

- Configuración institucional.
- Estructura de empresas y unidades de negocio.
- Colaboración entre empresas.
- Verificación profesional.
- Herramientas de calidad de datos.

**Pendiente**

- Completar reglas de calidad y correcciones asistidas.
- Consolidar catálogos maestros.
- Completar permisos administrativos por rol.

### 6.8 Certificados y documentos PDF

**Implementado**

- Emisión de certificados.
- Receta.
- Historia clínica.
- Alta voluntaria.
- Referencia.
- Observación.
- Pase clínico SINADEF.
- Orden de laboratorio.
- Orden de imágenes.

**Pendiente**

- Historial central de documentos por paciente.
- Adjuntar documentos externos.
- Control de versiones y anulaciones.
- Firma digital.
- Integración operativa con SINADEF y otras entidades.

### 6.9 Dominios aún no desarrollados completamente

- Caja: apertura, cierre, arqueo y medios de pago.
- Droguería: clientes, proveedores, cotizaciones, ventas y cuentas.
- Reportes gerenciales: ventas, stock valorizado, caja, CxC, CxP e
  indicadores.
- Integraciones externas: DNIe, SINADEF productivo, CMP y otros servicios
  institucionales.

## 7. Hoja de ruta priorizada

### Fase 1 — Revisión y afinamiento de HCE, pacientes e historial

1. Revisar el flujo completo Paciente → Atención → Anamnesis.
2. Auditar modelos, endpoints, permisos y relaciones existentes.
3. Revisar funciones vitales, alertas, diagnósticos, recetas, órdenes, destino
   final, sala de espera y cierre de atención.
4. Identificar datos duplicados, incompletos o desconectados.
5. Afinar la experiencia de médicos y personal asistencial.
6. Definir la vista consolidada del paciente.
7. Implementar el historial cronológico de atenciones.
8. Incorporar recetas, órdenes, PDFs y documentos relacionados.
9. Preparar adjuntos clínicos.
10. Refactorizar progresivamente `Anamnesis.tsx`.
11. Añadir pruebas y validar permisos multiempresa.
12. Producir el manual de Pacientes y HCE.
13. Preparar videos cortos de registro, búsqueda, inicio y cierre de atención.
14. Preparar el video largo del flujo clínico completo.

### Fase 2 — Resultados y documentos clínicos

1. Resultados de laboratorio.
2. Resultados de imágenes.
3. Adjuntos externos.
4. Historial documental.

### Fase 3 — Revisión, afinamiento y cierre operativo de Botica

1. Revisar catálogo, presentaciones, códigos, inventario, almacenes, lotes y
   vencimientos.
2. Revisar FEFO y autorizaciones excepcionales.
3. Clasificar medicamentos de venta libre, con receta y sujetos a control.
4. Afinar el flujo Receta → Validación → Dispensación → Venta.
5. Incorporar la trazabilidad del paciente, prescriptor y químico farmacéutico.
6. Implementar kardex integral.
7. Completar compras y proveedores.
8. Implementar transferencias, anulaciones y devoluciones.
9. Completar precios, impuestos, descuentos y reportes de inventario.
10. Preparar el comprobante interno antes de la integración electrónica.
11. Producir los manuales de catálogo, inventario, FEFO, dispensación y venta.
12. Preparar videos cortos de dispensación y venta.
13. Preparar el video largo Receta → Dispensación → Venta → Comprobante.

### Fase 4 — Facturación electrónica productiva

1. Homologación.
2. Firma y envío.
3. Respuestas y reintentos.
4. Notas de crédito y débito.

### Fase 5 — Administración comercial y gerencial

1. Suscripciones y planes.
2. Caja.
3. Droguería.
4. Reportes gerenciales.
5. Respaldos y soporte.

### Documentación paralela obligatoria

En todas las fases se desarrollarán simultáneamente:

- Manual del usuario por módulo y perfil.
- Capturas actualizadas de la interfaz.
- Videos cortos de 1 a 3 minutos para tareas concretas.
- Videos instructivos de 8 a 20 minutos para flujos completos.
- Guiones, narración, escenas y subtítulos.
- Registro de la versión de HCELM correspondiente.

## 8. Últimos avances estables

- `4695d80` — Unificación del Centro de Control Global HCELM y navegación.
- `c140c27` — Actualización de las pruebas del estado de la API.
- `9d622e0` — Panel seguro de reactivaciones automáticas.
- `5bca58f` — Operaciones de Botica directamente en `/home`.
- `e6ea173` — Contexto de unidades, módulos y FEFO.
- `963aa3f` — Validación del contexto operativo.
- `61b1817` — Login operativo por RUC dinámico.

## 9. Próximo trabajo acordado

**Tema:** Revisión y afinamiento de HCE, pacientes e historial de atenciones.

Antes de implementar:

1. Revisar modelos Prisma y endpoints existentes.
2. Revisar la pantalla actual de Pacientes.
3. Revisar el flujo actual de Anamnesis y cierre de atención.
4. Mapear la relación entre paciente, atención, receta, orden y PDF.
5. Inventariar pantallas, documentos y funciones ya incorporados.
6. Definir el índice inicial del manual de Pacientes y HCE.
7. Definir los primeros videos cortos y el video largo.
8. Proponer fases pequeñas antes de modificar código.
