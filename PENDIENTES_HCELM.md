# HCELM - BITÁCORA OFICIAL DEL PROYECTO

## Información general

Proyecto: HCELM (Historia Clínica Electrónica Las Mercedes)

Propietario: Dr. Alfonso Leonardo Rodríguez Rojas

Objetivo:

Construir una plataforma integral para:

* Historia Clínica Electrónica
* Consultorio
* Tópico de procedimientos
* Botica
* Droguería
* Inventario
* Caja
* Reportes gerenciales
* Facturación electrónica
* Integraciones institucionales

---

# REGLAS DE DESARROLLO

## Regla 1

Antes de iniciar cualquier desarrollo:

* Revisar esta bitácora.
* Revisar el último commit estable.
* Revisar pendientes relacionados.

## Regla 2

Evitar modificar archivos grandes directamente.

## Regla 3

Todo desarrollo nuevo debe construirse como módulo independiente.

## Regla 4

Todo PDF debe mantenerse en archivo independiente.

## Regla 5

Antes de cambios importantes:

git add .
git commit -m "checkpoint"

## Regla 6

Actualizar esta bitácora al terminar cada módulo.

---

# DECISIONES ARQUITECTÓNICAS

## DA-001

Se acuerda desarrollar HCELM mediante módulos independientes.

Objetivo:

Evitar que un cambio rompa funcionalidades ya implementadas.

---

## DA-002

Los documentos PDF se desarrollarán en archivos independientes.

Estado actual:

* recipePdf.ts
* hcePdf.ts
* voluntaryDischargePdf.ts
* referralPdf.ts
* observationPdf.ts
* sinadefReferralPdf.ts
* labOrderPdf.ts

---

## DA-003

Se acuerda refactorizar progresivamente Anamnesis.tsx.

Objetivo:

Dividirlo en componentes más pequeños.

Estructura objetivo:

modules/clinical/anamnesis/

* AnamnesisPage.tsx
* PatientSelector.tsx
* VitalSignsSection.tsx
* DiagnosisSection.tsx
* PrescriptionSection.tsx
* AuxiliaryExamsSection.tsx
* DestinationSection.tsx

---

## DA-004

Los módulos deberán desarrollarse por separado y luego integrarse.

Prioridades:

1. Estabilidad
2. Modularidad
3. Escalabilidad
4. Nuevas funcionalidades

---

# FUNCIONALIDADES IMPLEMENTADAS

## Acceso

🟢 Login institucional

🟢 Validación profesional

---

## Clínica

🟢 Pacientes básicos

🟢 Anamnesis

🟢 Diagnósticos

🟢 Receta

🟢 Destino final

---

## PDFs

🟢 Receta

🟢 Historia clínica completa

🟢 Alta voluntaria

🟢 Referencia

🟢 Observación

🟢 Pase clínico SINADEF

🟢 Orden de laboratorio

---

# PENDIENTES PRIORIDAD ALTA

🔴 Refactor modular de Anamnesis

🔴 Mejorar módulo Pacientes

🔴 Historial de atenciones

🔴 Historial de recetas

🔴 Historial de documentos PDF

🔴 Adjuntar documentos al paciente

🔴 Buscador avanzado de pacientes

🔴 Orden de imágenes PDF

🔴 Catálogo de exámenes auxiliares

🔴 Buscador de exámenes por categoría

🔴 Resultados de laboratorio adjuntos

🔴 Resultados de imágenes adjuntos

---

# INTEGRACIONES EXTERNAS

## DNI Electrónico

🔴 Inicio de sesión con DNIe

🔴 Identificación profesional mediante DNIe

---

## SINADEF

🔴 Integración operativa mediante DNIe

🟢 Pase clínico para certificación

🔴 Adjuntar certificado oficial emitido por SINADEF

---

## Colegio Médico del Perú

🔴 Conexión con certificados médicos digitales CMP

🔴 Evaluar integración mediante API o portal institucional

---

# FARMACIA Y BOTICA

🔵 Pendiente

* Productos
* Lotes
* Vencimientos
* Kardex
* FEFO
* Stock por almacén
* Venta por receta

---

# DROGUERÍA

🔵 Pendiente

* Clientes
* Proveedores
* Cotizaciones
* Ventas
* Facturación
* Cuentas por cobrar
* Cuentas por pagar

---

# CAJA

🔵 Pendiente

* Apertura
* Cierre
* Arqueo
* Yape
* Plin
* Transferencias
* Tarjetas

---

# REPORTES GERENCIALES

🔵 Pendiente

* Ventas
* Stock valorizado
* CXC
* CXP
* Flujo de caja
* Indicadores

---

# ÚLTIMO ACUERDO DE DESARROLLO

Fecha: Junio 2026

Se acuerda:

1. No continuar agregando grandes funcionalidades sobre Anamnesis.tsx monolítico.
2. Modularizar progresivamente.
3. Mantener checkpoints frecuentes mediante Git.
4. Desarrollar módulos completos y luego integrarlos.
5. Utilizar esta bitácora como documento obligatorio de referencia antes de iniciar nuevos desarrollos.
