@echo off
echo ============================================
echo Configurando Base de Datos PepsiCo Fleet
echo ============================================
echo.

REM Solicitar password de MySQL
set /p MYSQL_PASSWORD="Ingresa tu password de MySQL root: "

echo.
echo [1/3] Creando base de datos...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p%MYSQL_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS pepsico_fleet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if %errorlevel% neq 0 (
    echo ERROR: No se pudo crear la base de datos
    echo Verifica tu password de MySQL
    pause
    exit /b 1
)

echo OK - Base de datos creada
echo.
echo [2/3] Creando tablas y estructura...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p%MYSQL_PASSWORD% pepsico_fleet < "..\database\schema.sql"

if %errorlevel% neq 0 (
    echo ERROR: No se pudo ejecutar schema.sql
    pause
    exit /b 1
)

echo OK - Tablas creadas
echo.
echo [3/3] Insertando datos de prueba...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p%MYSQL_PASSWORD% pepsico_fleet < "..\database\seeders.sql"

if %errorlevel% neq 0 (
    echo ERROR: No se pudo ejecutar seeders.sql
    pause
    exit /b 1
)

echo OK - Datos insertados
echo.
echo ============================================
echo SETUP COMPLETADO EXITOSAMENTE!
echo ============================================
echo.
echo Ahora ejecuta:
echo 1. node scripts\seed-users.js
echo 2. npm run dev
echo.
pause
