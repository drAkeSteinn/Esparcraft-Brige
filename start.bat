@echo off
setlocal
cd /d "%~dp0"

echo ==============================
echo Iniciando Esparcraft LLM Bridge
echo ==============================

echo.
echo [0/3] Verificando .env y DATABASE_URL
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
echo [1/3] Prisma db push (6.19.2)
call npx --yes prisma@6.19.2 db push
if errorlevel 1 goto :err

echo.
echo [2/3] Prisma generate (6.19.2)
call npx --yes prisma@6.19.2 generate
if errorlevel 1 goto :err

echo.
echo [3/3] Arrancando Next dev server (Windows)
echo URL: http://localhost:3000
call npm run dev:win
if errorlevel 1 goto :err

echo.
echo ==============================
echo Servidor detenido (o cerrado)
echo ==============================
pause
exit /b 0

:err
echo.
echo ==============================
echo ERROR al iniciar (ver arriba)
echo ==============================
pause
exit /b 1