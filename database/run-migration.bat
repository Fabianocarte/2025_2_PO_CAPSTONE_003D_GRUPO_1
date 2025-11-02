@echo off
echo ================================================
echo  MIGRACION: Sistema de Gestion de Conversaciones
echo ================================================
echo.

REM Cargar variables de entorno
for /f "tokens=1,2 delims==" %%a in ('type ..\.env 2^>nul ^| findstr /v "^#"') do set %%a=%%b

echo Conectando a MySQL...
echo Base de datos: %DB_NAME%
echo Usuario: %DB_USER%
echo.

mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < migration_conversaciones.sql

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo  MIGRACION EXITOSA
    echo ================================================
    echo.
    echo Tablas creadas:
    echo - conversaciones
    echo - historial_mensajes
    echo.
    echo Ahora reinicia el backend para usar los nuevos modelos.
) else (
    echo.
    echo ================================================
    echo  ERROR EN LA MIGRACION
    echo ================================================
    echo Por favor verifica:
    echo 1. MySQL esta corriendo
    echo 2. Las credenciales en .env son correctas
    echo 3. La base de datos %DB_NAME% existe
)

echo.
pause
