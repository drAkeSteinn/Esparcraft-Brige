@echo off
setlocal
cd /d "%~dp0"

echo ==============================
echo Iniciando Esparcraft LLM Bridge
echo ==============================

echo.
echo [0/2] Verificando .env y DATABASE_URL
if not exist ".env" (
  echo ERROR: No existe .env. Ejecuta install.bat primero.
  goto :err
)
findstr /C:"DATABASE_URL=" ".env" >nul
if errorlevel 1 (
  echo ERROR: Falta DATABASE_URL en .env
  echo Agrega: DATABASE_URL="file:./prisma/dev.db"
  goto :err
)

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
