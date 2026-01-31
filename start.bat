@echo off
setlocal
cd /d "%~dp0"

echo ==============================
echo Iniciando Esparcraft LLM Bridge
echo ==============================

echo.
echo [1/2] Prisma db push (asegurar DB/tablas)
call npx prisma db push
if errorlevel 1 goto :err

echo.
echo [2/2] Arrancando Next dev server
call npm run dev
goto :end

:err
echo.
echo ==============================
echo ERROR al iniciar (ver arriba)
echo ==============================
pause
exit /b 1

:end
pause
