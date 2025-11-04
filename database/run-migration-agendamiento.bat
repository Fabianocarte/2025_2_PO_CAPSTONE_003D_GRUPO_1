@echo off
echo ============================================
echo EJECUTANDO MIGRACION DE SISTEMA DE AGENDAMIENTO
echo ============================================

echo.
echo Conectando a la base de datos...

mysql -h localhost -u root -p pepsico_fleet < migration_agendamiento.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Migracion ejecutada exitosamente!
    echo.
    echo Las siguientes tablas fueron modificadas:
    echo - citas_taller [CREADA]
    echo - ordenes_trabajo [MODIFICADA - agregado campo cita_id]
    echo.
    echo El sistema de agendamiento esta listo para usar.
    echo.
) else (
    echo.
    echo ❌ Error ejecutando la migracion.
    echo Verifica la conexion a la base de datos.
    echo.
)

pause