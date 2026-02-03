@echo off
setlocal
cd /d "%~dp0"

echo ==============================
echo Iniciando Esparcraft LLM Bridge
echo ==============================

call npm run dev

echo.
echo ==============================
echo Servidor detenido
echo ==============================
pause