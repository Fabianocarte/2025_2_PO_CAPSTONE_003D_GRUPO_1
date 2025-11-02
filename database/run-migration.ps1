# ================================================
# MIGRACION: Sistema de Gestion de Conversaciones
# ================================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " MIGRACION: Sistema de Gestion de Conversaciones" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Cargar variables de entorno desde .env
$envPath = Join-Path $PSScriptRoot "..\backend\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^#].+?)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Variable -Name $name -Value $value -Scope Script
        }
    }
    Write-Host "✅ Variables de entorno cargadas" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró archivo .env en backend/" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Base de datos: $DB_NAME" -ForegroundColor Yellow
Write-Host "Usuario: $DB_USER" -ForegroundColor Yellow
Write-Host ""

# Buscar MySQL
$mysqlPaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "mysql" # Por si está en PATH
)

$mysqlExe = $null
foreach ($path in $mysqlPaths) {
    if ($path -eq "mysql") {
        try {
            $null = Get-Command mysql -ErrorAction Stop
            $mysqlExe = "mysql"
            break
        } catch {
            continue
        }
    } elseif (Test-Path $path) {
        $mysqlExe = $path
        break
    }
}

if (-not $mysqlExe) {
    Write-Host "❌ ERROR: No se encontró MySQL" -ForegroundColor Red
    Write-Host ""
    Write-Host "Buscado en:" -ForegroundColor Yellow
    foreach ($path in $mysqlPaths) {
        if ($path -ne "mysql") {
            Write-Host "  - $path" -ForegroundColor Gray
        }
    }
    Write-Host ""
    Write-Host "Soluciones:" -ForegroundColor Yellow
    Write-Host "1. Instala MySQL desde https://dev.mysql.com/downloads/" -ForegroundColor White
    Write-Host "2. Ejecuta manualmente:" -ForegroundColor White
    Write-Host "   cd C:\ruta\a\mysql\bin" -ForegroundColor Cyan
    Write-Host "   .\mysql.exe -u $DB_USER -p$DB_PASSWORD $DB_NAME < migration_conversaciones.sql" -ForegroundColor Cyan
    Write-Host ""
    pause
    exit 1
}

Write-Host "✅ MySQL encontrado: $mysqlExe" -ForegroundColor Green
Write-Host ""

# Ejecutar migración
$migrationFile = Join-Path $PSScriptRoot "migration_conversaciones.sql"

Write-Host "Ejecutando migración..." -ForegroundColor Yellow

try {
    $arguments = @(
        "-u", $DB_USER,
        "-p$DB_PASSWORD",
        "-h", $DB_HOST,
        "-P", $DB_PORT,
        $DB_NAME
    )
    
    Get-Content $migrationFile | & $mysqlExe @arguments 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "================================================" -ForegroundColor Green
        Write-Host " ✅ MIGRACION EXITOSA" -ForegroundColor Green
        Write-Host "================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Tablas creadas:" -ForegroundColor Cyan
        Write-Host "  ✓ conversaciones" -ForegroundColor Green
        Write-Host "  ✓ historial_mensajes" -ForegroundColor Green
        Write-Host ""
        Write-Host "Verificar tablas:" -ForegroundColor Yellow
        Write-Host "   SHOW TABLES" -ForegroundColor Cyan
        Write-Host "   DESCRIBE conversaciones" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Siguiente paso: Reinicia el backend" -ForegroundColor Yellow
        Write-Host "   cd backend" -ForegroundColor Cyan
        Write-Host "   npm start" -ForegroundColor Cyan
        Write-Host ""
    } else {
        throw "Error ejecutando MySQL"
    }
} catch {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Red
    Write-Host " ❌ ERROR EN LA MIGRACION" -ForegroundColor Red
    Write-Host "================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifica:" -ForegroundColor Yellow
    Write-Host "1. MySQL está corriendo" -ForegroundColor White
    Write-Host "2. Las credenciales son correctas" -ForegroundColor White
    Write-Host "3. La base de datos '$DB_NAME' existe" -ForegroundColor White
    Write-Host ""
    Write-Host "Ejecutar manualmente:" -ForegroundColor Yellow
    $comando = "$mysqlExe -u $DB_USER -p$DB_PASSWORD $DB_NAME"
    Write-Host "   $comando" -ForegroundColor Cyan
    Write-Host "   Luego pegar el contenido de migration_conversaciones.sql" -ForegroundColor Cyan
    Write-Host ""
}

pause
