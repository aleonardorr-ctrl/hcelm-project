$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Proyectos\hcelm-project"
$TargetFile = Join-Path $ProjectRoot "apps\web\src\pages\PharmacySales.tsx"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$TargetFile.backup_$Timestamp"

Write-Host ""
Write-Host "HCELM - Corrector seguro de interfaz de Ventas" -ForegroundColor Cyan
Write-Host "Archivo objetivo:" -ForegroundColor Yellow
Write-Host "  $TargetFile"
Write-Host ""

if (-not (Test-Path $TargetFile)) {
    throw "No se encontró el archivo: $TargetFile"
}

Copy-Item $TargetFile $BackupFile -Force
Write-Host "Respaldo creado:" -ForegroundColor Green
Write-Host "  $BackupFile"
Write-Host ""

$content = [System.IO.File]::ReadAllText($TargetFile)

function Replace-Required {
    param(
        [string]$Text,
        [string]$Old,
        [string]$New,
        [string]$Description
    )

    if (-not $Text.Contains($Old)) {
        throw "No se encontró el bloque esperado: $Description. Se conserva el respaldo en $BackupFile"
    }

    return $Text.Replace($Old, $New)
}

# 1. Corregir textos visibles con codificación dañada.
$encodingFixes = @(
    @("Suministros CrÃticos EIRL", "Suministros Críticos EIRL"),
    @("AlmacÃ©n principal", "Almacén principal"),
    @("AcciÃ³n", "Acción"),
    @("razÃ³n social", "razón social"),
    @("NÃºmero de documento", "Número de documento"),
    @("agrÃ©guelo", "agréguelo"),
    @("Numero de operacion", "Número de operación"),
    @("numero de operacion", "número de operación"),
    @("ConfirmaciÃ³n final", "Confirmación final"),
    @("facturacion", "facturación"),
    @("catalogo", "catálogo"),
    @("deposito", "depósito")
)

foreach ($pair in $encodingFixes) {
    $content = $content.Replace($pair[0], $pair[1])
}

# 2. Ampliar el ancho útil y mejorar espaciados responsivos.
$content = Replace-Required `
    -Text $content `
    -Old '<div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">' `
    -New '<div className="min-h-screen bg-slate-100 px-3 py-4 sm:px-4 md:px-6 md:py-6">' `
    -Description "contenedor exterior"

$content = Replace-Required `
    -Text $content `
    -Old '<div className="mx-auto max-w-7xl space-y-5">' `
    -New '<div className="mx-auto w-full max-w-[1800px] space-y-5">' `
    -Description "contenedor principal"

# 3. Reemplazar la cabecera completa.
$oldHeader = @'
        <header className="rounded-lg bg-white p-5 shadow-sm">
          <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            <Link to="/home" className="hover:text-emerald-700">
              Plataforma
            </Link>
            <span>/</span>
            <Link to="/pharmacy" className="hover:text-emerald-700">
              Botica Premium
            </Link>
            <span>/</span>
            <span className="text-slate-900">Nueva venta</span>
          </nav>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-700">
                Punto de venta
              </p>
              <h1 className="text-2xl font-bold text-slate-900">
                Venta OTC - Botica Premium
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Contexto: {OPERATING_COMPANY} / {OPERATING_UNIT} /{" "}
                {OPERATING_WAREHOUSE}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/pharmacy/inventory"
                className="rounded-lg border px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Inventario y Kardex
              </Link>
              <Link
                to="/pharmacy"
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-900"
              >
                Volver a Farmacia
              </Link>
            </div>
          </div>
        </header>
'@

$newHeader = @'
        <header className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto border-b border-slate-200 px-4 py-3 sm:px-5">
            <nav
              aria-label="Ruta de navegación"
              className="flex min-w-max items-center gap-2 text-sm font-semibold text-slate-500"
            >
              <Link
                to="/home"
                className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-emerald-700"
              >
                Plataforma
              </Link>
              <span aria-hidden="true">›</span>
              <Link
                to="/pharmacy"
                className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-emerald-700"
              >
                Botica Premium
              </Link>
              <span aria-hidden="true">›</span>
              <span className="px-2 py-1 text-slate-900">Ventas</span>
            </nav>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Punto de venta
                </p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                  Nueva venta
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  {OPERATING_COMPANY}
                  <span className="mx-1.5 text-slate-300">/</span>
                  {OPERATING_UNIT}
                  <span className="mx-1.5 text-slate-300">/</span>
                  {OPERATING_WAREHOUSE}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Link
                  to="/pharmacy"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  ← Farmacia
                </Link>
                <a
                  href="#buscar-productos"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-center text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Continuar venta ↓
                </a>
                <Link
                  to="/pharmacy/inventory"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Inventario
                </Link>
                <Link
                  to="/pharmacy/catalogs"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Catálogo
                </Link>
                <Link
                  to="/billing"
                  className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-center text-sm font-bold text-cyan-800 hover:bg-cyan-100 sm:col-span-1"
                >
                  Facturación
                </Link>
              </div>
            </div>
          </div>
        </header>
'@

$content = Replace-Required `
    -Text $content `
    -Old $oldHeader `
    -New $newHeader `
    -Description "cabecera de Ventas"

# 4. Agregar ancla a la búsqueda.
$content = Replace-Required `
    -Text $content `
    -Old '            <section className="overflow-hidden rounded-lg bg-white shadow-sm">' `
    -New @'
            <section
              id="buscar-productos"
              className="scroll-mt-4 overflow-hidden rounded-2xl bg-white shadow-sm"
            >
'@ `
    -Description "sección de búsqueda de productos"

# 5. Mejorar distribución responsiva.
$content = Replace-Required `
    -Text $content `
    -Old '<div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">' `
    -New '<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_420px]">' `
    -Description "rejilla principal de venta y carrito"

# 6. Mejorar el carrito en móviles y pantallas grandes.
$content = $content.Replace(
    '<aside className="self-start rounded-lg bg-white shadow-sm xl:sticky xl:top-4">',
    '<aside className="self-start rounded-2xl bg-white shadow-sm lg:sticky lg:top-4">'
)

# Guardar como UTF-8 sin BOM.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($TargetFile, $content, $utf8NoBom)

Write-Host "Cambios aplicados correctamente." -ForegroundColor Green
Write-Host ""
Write-Host "Compilando frontend..." -ForegroundColor Cyan

Push-Location $ProjectRoot
try {
    npm run build --workspace apps/web
    if ($LASTEXITCODE -ne 0) {
        throw "La compilación del frontend falló."
    }
}
catch {
    Write-Host ""
    Write-Host "La compilación falló. Restaurando automáticamente el respaldo..." -ForegroundColor Red
    Copy-Item $BackupFile $TargetFile -Force
    throw
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Proceso terminado correctamente." -ForegroundColor Green
Write-Host "Respaldo disponible en:" -ForegroundColor Yellow
Write-Host "  $BackupFile"
Write-Host ""
Write-Host "Archivo modificado:" -ForegroundColor Yellow
Write-Host "  $TargetFile"
