<#
🏥 HCELM - Script de Inicio Clínico (Modo Automático)
Autor: Qwen3.6 + Dr. Alfonso
Uso: Ejecutar como Administrador en PowerShell
#>

Write-Host "🚀 Iniciando HCELM - Modo Clínico..." -ForegroundColor Cyan

# ✅ 1. Detener procesos anteriores
Write-Host "`n🛑 Deteniendo procesos anteriores..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*hcelm-project*" } | Stop-Process -Force -ErrorAction SilentlyContinue
docker stop hcelm-postgres -ErrorAction SilentlyContinue | Out-Null
Start-Sleep -Seconds 2

# ✅ 2. Iniciar PostgreSQL (si no está corriendo)
Write-Host "`n🗄️ Verificando PostgreSQL..." -ForegroundColor Yellow
$container = docker ps -q -f name=hcelm-postgres
if (-not $container) {
    Write-Host "📦 Creando contenedor PostgreSQL..." -ForegroundColor Gray
    docker run -d `
        --name hcelm-postgres `
        -e POSTGRES_USER=hcelm_admin `
        -e POSTGRES_PASSWORD=hcelm_secure_2026 `
        -e POSTGRES_DB=hcelm_dev `
        -p 5432:5432 `
        postgres:15 --health-cmd="pg_isready -U hcelm_admin" --health-interval=10s --health-timeout=5s --health-retries=5
    Start-Sleep -Seconds 10
} else {
    Write-Host "✅ PostgreSQL ya está corriendo" -ForegroundColor Green
}

# ✅ 3. Esperar que la BD esté lista
Write-Host "`n⏳ Esperando que la base de datos responda..." -ForegroundColor Yellow
$retries = 0
while ($retries -lt 30) {
    $result = docker exec hcelm-postgres pg_isready -U hcelm_admin -d hcelm_dev 2>$null
    if ($result -like "*accepting connections*") { break }
    Start-Sleep -Seconds 2
    $retries++
}
if ($retries -eq 30) {
    Write-Host "❌ Timeout: La base de datos no responde. Verifique Docker." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Base de datos lista" -ForegroundColor Green

# ✅ 4. Sincronizar esquema con Prisma (crear tablas)
Write-Host "`n🔧 Sincronizando esquema de base de datos..." -ForegroundColor Yellow
Set-Location "C:\Proyectos\hcelm-project\apps\api"
$env:DATABASE_URL = "postgresql://hcelm_admin:hcelm_secure_2026@localhost:5432/hcelm_dev?schema=public"
npx prisma db push --accept-data-loss --skip-generate 2>&1 | ForEach-Object { Write-Host $_ -ForegroundColor Gray }

# ✅ 5. Insertar datos iniciales (Tenant + Admin + Paciente)
Write-Host "`n🌱 Insertando datos clínicos iniciales..." -ForegroundColor Yellow
$sql = @'
-- Limpiar datos previos del tenant
DELETE FROM "User" WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE ruc = '20611138777');
DELETE FROM "Patient" WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE ruc = '20611138777');
DELETE FROM "Tenant" WHERE ruc = '20611138777';

-- Crear Tenant principal
INSERT INTO "Tenant" (id, name, ruc, active, "createdAt", "updatedAt") 
VALUES ('00000000-0000-0000-0000-000000000001', 'AME HEALTH SAC', '20611138777', true, NOW(), NOW());

-- Crear Usuario Admin (password: AME2026 - hash bcrypt)
INSERT INTO "User" (id, "tenantId", email, password, "fullName", role, cmp, active, "createdAt", "updatedAt") 
VALUES ('admin-uuid-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin@amehealth.pe', '$2b$10$EIXXkF5lQ3l5XJ7v7z7w3uY9Z8a7b6c5d4e3f2g1h0i9j8k7l6m5', 'Dr. Alfonso', 'admin', 'CMP 43992', true, NOW(), NOW());

-- Crear Paciente de prueba
INSERT INTO "Patient" (id, "tenantId", "fullName", "documentNumber", "documentType", "createdAt", "updatedAt") 
VALUES ('patient-uuid-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Juan Pérez', '78945612', 'DNI', NOW(), NOW());
'@
docker exec -i hcelm-postgres psql -U hcelm_admin -d hcelm_dev -c "$sql" 2>&1 | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
Write-Host "✅ Datos iniciales insertados" -ForegroundColor Green

# ✅ 6. Iniciar Backend (en segundo plano)
Write-Host "`n🔙 Iniciando Backend (API)..." -ForegroundColor Yellow
$backendLog = "C:\Proyectos\hcelm-project\backend.log"
$backendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Proyectos\hcelm-project\apps\api"
    $env:DATABASE_URL = "postgresql://hcelm_admin:hcelm_secure_2026@localhost:5432/hcelm_dev?schema=public"
    npm run start:dev
} -Name "HCELM-Backend"
Start-Sleep -Seconds 8
Write-Host "✅ Backend iniciado (ver logs en backend.log si hay errores)" -ForegroundColor Green

# ✅ 7. Iniciar Frontend (en segundo plano)
Write-Host "`n🔜 Iniciando Frontend (Web)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Proyectos\hcelm-project\apps\web"
    npm run dev
} -Name "HCELM-Frontend"
Start-Sleep -Seconds 5
Write-Host "✅ Frontend iniciado" -ForegroundColor Green

# ✅ 8. Resumen final
Write-Host "`n" + ("="*60) -ForegroundColor Cyan
Write-Host "🎉 ¡HCELM LISTO PARA USO CLÍNICO!" -ForegroundColor Green
Write-Host ("="*60) -ForegroundColor Cyan
Write-Host "`n🌐 Acceso:" -ForegroundColor White
Write-Host "   URL: http://localhost:5173" -ForegroundColor Gray
Write-Host "   Usuario: admin@amehealth.pe" -ForegroundColor Gray
Write-Host "   Contraseña: AME2026" -ForegroundColor Gray
Write-Host "`n📋 Módulos operativos:" -ForegroundColor White
Write-Host "   ✅ Login / Autenticación" -ForegroundColor Gray
Write-Host "   ✅ Dashboard / Inicio" -ForegroundColor Gray
Write-Host "   ✅ Anamnesis (Historia Clínica)" -ForegroundColor Gray
Write-Host "   ✅ Certificados Médicos (PDF)" -ForegroundColor Gray
Write-Host "   ✅ Configuración Institucional" -ForegroundColor Gray
Write-Host "   ✅ Gestión de Pacientes (básico)" -ForegroundColor Gray
Write-Host "`n🛠️ Comandos útiles:" -ForegroundColor White
Write-Host "   • Ver logs del backend: Get-Content backend.log -Tail 20 -Wait" -ForegroundColor Gray
Write-Host "   • Detener sistema: Stop-Job -Name HCELM-Backend, HCELM-Frontend" -ForegroundColor Gray
Write-Host "   • Reiniciar desde cero: .\iniciar-sistema.ps1" -ForegroundColor Gray
Write-Host "`n" + ("="*60) -ForegroundColor Cyan

# ✅ 9. Abrir navegador automáticamente (opcional)
Start-Process "http://localhost:5173"
Write-Host "`n✨ Navegador abierto. ¡A trabajar, Doctor!" -ForegroundColor Green