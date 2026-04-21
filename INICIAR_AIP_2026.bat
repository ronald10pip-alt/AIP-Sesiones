@echo off
setlocal enabledelayedexpansion

title Iniciar Plataforma AIP Primaria 2026
echo ==================================================
echo   INICIANDO PLATAFORMA MERINENSE DIGITAL 2026     
echo ==================================================
echo.

:: Obtener la ruta del script sin la barra final
set "BASE_DIR=%~dp0"
if "!BASE_DIR:~-1!"=="\" set "BASE_DIR=!BASE_DIR:~0,-1!"

:: 1. Iniciar el Servidor (Backend)
echo [+] Iniciando Corazon del Sistema (Backend)...
start "AIP-SERVIDOR" /D "!BASE_DIR!\server" cmd /k npm start

:: 2. Iniciar la Interfaz (Frontend)
echo [+] Iniciando Portal de Innovacion (Frontend)...
start "AIP-INTERFAZ" /D "!BASE_DIR!\client" cmd /k npm run dev

:: 3. Abrir Navegador
echo.
echo [!] Esperando que los motores calienten (12 segundos)...
timeout /t 12 /nobreak > nul

echo.
echo [OK] Intentando abrir el portal en el navegador...
start http://localhost:5173

echo.
echo ==================================================
echo   Si la web no abre sola, ve a: http://localhost:5173
echo   NO CIERRES las otras dos ventanas que se abrieron.
echo ==================================================
echo.
pause
