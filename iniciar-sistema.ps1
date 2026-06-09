Write-Host "[1/6] Iniciando sistema HCELM..." -ForegroundColor Cyan

# Detener procesos anteriores
Write-Host "[2/6] Limpiando procesos..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
docker stop hcelm-postgres -ErrorAction SilentlyContinue | Out-Null
Start-Sleep -Seconds 3

# Iniciar PostgreSQL
Write-Host "[3/6] Iniciando PostgreSQL..." -ForegroundColor Yellow
if (-not (docker ps -q -f name=hcelm-postgres)) {
    docker run -d --name hcelm-postgres -e POSTGRES_USER=hcelm_admin -e POSTGRES_PASSWORD=hcelm_secure_2026 -e POSTGRES_DB=hcelm_dev -p 5432:5432 postgres:15
}
Start-Sleep -Seconds 8

# Sincronizar Prisma
Write-Host "[4/6] Sincronizando base de datos..." -ForegroundColor Yellow
Set-Location "C:\Proyectos\hcelm-project\apps\api"
$env:DATABASE_URL = "postgresql://hcelm_admin:hcelm_secure_2026@localhost:5432/hcelm_dev?schema=public"
npx prisma db push --accept-data-loss

# Insertar datos via archivo SQL
Write-Host "[5/6] Insertando datos clinicos..." -ForegroundColor Yellow
Get-Content "C:\Proyectos\hcelm-project\seed.sql" | docker exec -i hcelm-postgres psql -U hcelm_admin -d hcelm_dev
Write-Host "    Datos insertados correctamente." -ForegroundColor Green

# Iniciar Backend y Frontend
Write-Host "[6/6] Iniciando servicios..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Proyectos\hcelm-project\apps\api'; `$env:DATABASE_URL='postgresql://hcelm_admin:hcelm_secure_2026@localhost:5432/hcelm_dev?schema=public'; npm run start:dev" -WindowStyle Minimized
Start-Sleep -Seconds 5
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Proyectos\hcelm-project\apps\web'; npm run dev" -WindowStyle Minimized

Write-Host "`n[OK] Sistema listo. Acceda a: http://localhost:5173" -ForegroundColor Green
Write-Host "    Usuario: admin@amehealth.pe"
Write-Host "    Contraseña: AME2026"
Start-Process "http://localhost:5173"