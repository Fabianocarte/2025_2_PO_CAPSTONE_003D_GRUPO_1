@echo off
setlocal EnableDelayedExpansion
echo ========================================
echo   PepsiCo Fleet - Configuracion de BD
echo ========================================
echo.
echo IMPORTANTE: Si tu password tiene caracteres especiales
echo como %%, $, ^, &, etc., usa el metodo manual:
echo.
echo   mysql -u root -p
echo   CREATE DATABASE pepsico_fleet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
echo   USE pepsico_fleet;
echo   SOURCE schema.sql;
echo   SOURCE seeders.sql;
echo.
echo ========================================
echo.
set /p DB_PASSWORD="Ingresa tu password de MySQL (root): "

echo.
echo Creando base de datos...
mysql -u root -p%DB_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS pepsico_fleet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if !ERRORLEVEL! NEQ 0 (
    echo.
    echo ERROR: No se pudo crear la base de datos
    echo.
    echo Probablemente tu password tiene caracteres especiales.
    echo Usa el metodo MANUAL:
    echo.
    echo 1. Abre una terminal y ejecuta: mysql -u root -p
    echo 2. Ingresa tu password cuando te lo pida
    echo 3. Ejecuta estos comandos:
    echo    CREATE DATABASE pepsico_fleet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    echo    USE pepsico_fleet;
    echo    SOURCE %~dp0schema.sql;
    echo    SOURCE %~dp0seeders.sql;
    echo    EXIT;
    echo.
    pause
    exit /b 1
)

echo Base de datos creada exitosamente!
echo.
echo Ejecutando schema.sql...
mysql -u root -p%DB_PASSWORD% pepsico_fleet < "%~dp0schema.sql"

if !ERRORLEVEL! NEQ 0 (
    echo ERROR: No se pudo ejecutar schema.sql
    echo Usa el metodo manual descrito arriba
    pause
    exit /b 1
)

echo Schema ejecutado exitosamente!
echo.
echo Cargando datos de prueba (seeders.sql)...
mysql -u root -p%DB_PASSWORD% pepsico_fleet < "%~dp0seeders.sql"

if !ERRORLEVEL! NEQ 0 (
    echo ERROR: No se pudo ejecutar seeders.sql
    echo Usa el metodo manual descrito arriba
    pause
    exit /b 1
)

echo.
echo ========================================
echo   COMPLETADO EXITOSAMENTE!
echo ========================================
echo Base de datos: pepsico_fleet
echo Tablas creadas: 7
echo Datos de prueba cargados
echo.
echo Ahora configura tu archivo .env en /backend
echo.
pause
endlocal
