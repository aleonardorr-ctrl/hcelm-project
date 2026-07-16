$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Proyectos\hcelm-project"
$TargetFile = Join-Path $ProjectRoot "apps\web\src\pages\PharmacySales.tsx"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$TargetFile.backup_cantidad_$Timestamp"

Write-Host ""
Write-Host "HCELM - Corrector de cantidad del carrito" -ForegroundColor Cyan
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

$oldBlock = @'
                        type="number"
                        min="0.001"
                        max={Number(item.product.availableStock)}
                        step="0.001"
'@

$newBlock = @'
                        type="number"
                        min="1"
                        max={Math.floor(Number(item.product.availableStock))}
                        step="1"
                        inputMode="numeric"
'@

if (-not $content.Contains($oldBlock)) {
    throw "No se encontró la configuración esperada del campo Cantidad. No se modificó el archivo."
}

$content = $content.Replace($oldBlock, $newBlock)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($TargetFile, $content, $utf8NoBom)

Write-Host "Cantidad corregida: ahora avanza de uno en uno." -ForegroundColor Green
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
    Write-Host "La compilación falló. Restaurando el respaldo..." -ForegroundColor Red
    Copy-Item $BackupFile $TargetFile -Force
    throw
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Proceso terminado correctamente." -ForegroundColor Green
Write-Host "Ahora las flechas del carrito deben mostrar: 1, 2, 3, 4..." -ForegroundColor Green
Write-Host ""
Write-Host "Respaldo disponible en:" -ForegroundColor Yellow
Write-Host "  $BackupFile"
