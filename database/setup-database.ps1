# Script PowerShell para configurar la base de datos
# Uso: .\setup-database.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PepsiCo Fleet - Configuracion de BD" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$password = Read-Host "Ingresa tu password de MySQL (root)" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Creando base de datos..." -ForegroundColor Yellow

$createDB = "CREATE DATABASE IF NOT EXISTS pepsico_fleet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
$createDB | mysql -u root -p"$plainPassword" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: No se pudo crear la base de datos" -ForegroundColor Red
    Write-Host "Verifica tu password de MySQL" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Base de datos creada exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Ejecutando schema.sql..." -ForegroundColor Yellow

Get-Content ".\schema.sql" | mysql -u root -p"$plainPassword" pepsico_fleet 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No se pudo ejecutar schema.sql" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Schema ejecutado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Cargando datos de prueba (seeders.sql)..." -ForegroundColor Yellow

Get-Content ".\seeders.sql" | mysql -u root -p"$plainPassword" pepsico_fleet 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No se pudo ejecutar seeders.sql" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  COMPLETADO EXITOSAMENTE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Base de datos: pepsico_fleet"
Write-Host "Tablas creadas: 7"
Write-Host "Datos de prueba cargados"
Write-Host ""
Write-Host "Ahora configura tu archivo .env en /backend" -ForegroundColor Yellow
Write-Host ""
pause
