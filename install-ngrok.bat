@echo off
echo ============================================
echo Instalando ngrok
echo ============================================
echo.

REM Crear carpeta temporal
mkdir "%TEMP%\ngrok-install" 2>nul
cd /d "%TEMP%\ngrok-install"

echo [1/3] Descargando ngrok...
powershell -Command "Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile 'ngrok.zip'"

if %errorlevel% neq 0 (
    echo ERROR: No se pudo descargar ngrok
    pause
    exit /b 1
)

echo OK - Descargado
echo.
echo [2/3] Extrayendo archivos...
powershell -Command "Expand-Archive -Path 'ngrok.zip' -DestinationPath '.' -Force"

if %errorlevel% neq 0 (
    echo ERROR: No se pudo extraer
    pause
    exit /b 1
)

echo OK - Extraido
echo.
echo [3/3] Instalando en el sistema...
move /Y ngrok.exe "%USERPROFILE%\ngrok.exe" >nul

if %errorlevel% neq 0 (
    echo ERROR: No se pudo instalar
    pause
    exit /b 1
)

REM Agregar al PATH del usuario
setx PATH "%PATH%;%USERPROFILE%" >nul 2>&1

echo OK - Instalado
echo.
cd /d %~dp0
rmdir /s /q "%TEMP%\ngrok-install" 2>nul

echo ============================================
echo INSTALACION COMPLETADA!
echo ============================================
echo.
echo ngrok instalado en: %USERPROFILE%\ngrok.exe
echo.
echo IMPORTANTE: Cierra y vuelve a abrir PowerShell
echo.
echo Siguientes pasos:
echo 1. Registrate gratis en: https://ngrok.com/
echo 2. Copia tu authtoken
echo 3. Ejecuta: ngrok config add-authtoken TU_TOKEN
echo 4. Ejecuta: ngrok http 5000
echo.
pause
