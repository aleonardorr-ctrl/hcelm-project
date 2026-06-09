Write-Host "[1/6] Limpiando procesos anteriores..."
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
docker stop hcelm-postgres -ErrorAction SilentlyContinue
Start-Sleep 3

Write-Host "[2/6] Iniciando PostgreSQL..."
docker run -d --name hcelm-postgres -e POSTGRES_USER=hcelm_admin -e POSTGRES_PASSWORD=hcelm_secure_2026 -e POSTGRES_DB=hcelm_dev -p 5432:5432 postgres:15 2>$null
Start-Sleep 10

Write-Host "[3/6] Sincronizando esquema..."
Set-Location C:\Proyectos\hcelm-project\apps\api
$env:DATABASE_URL="postgresql://hcelm_admin:hcelm_secure_2026@localhost:5432/hcelm_dev?schema=public"
npx prisma db push --accept-data-loss 2>&1 | Out-Null

Write-Host "[4/6] Insertando datos clinicos..."
Get-Content C:\Proyectos\hcelm-project\seed.sql | docker exec -i hcelm-postgres psql -U hcelm_admin -d hcelm_dev

Write-Host "[5/6] Iniciando Backend..."
Start-Process powershell -WindowStyle Minimized -ArgumentList '-NoExit','-Command','cd C:\Proyectos\hcelm-project\apps\api; $env:DATABASE_URL="postgresql://hcelm_admin:hcelm_secure_2026@localhost:5432/hcelm_dev?schema=public"; npm run start:dev'
Start-Sleep 6

Write-Host "[6/6] Iniciando Frontend..."
Start-Process powershell -WindowStyle Minimized -ArgumentList '-NoExit','-Command','cd C:\Proyectos\hcelm-project\apps\web; npm run dev'
Start-Sleep 4

Write-Host "`n[OK] Sistema listo. Abra http://localhost:5173" -ForegroundColor Green
Start-Process http://localhost:5173