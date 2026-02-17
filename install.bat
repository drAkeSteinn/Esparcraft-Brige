@echo off
setlocal
cd /d "%~dp0"

echo ==============================
echo Instalando dependencias...
echo ==============================
call npm install --include=optional
if errorlevel 1 goto :err

echo.
echo ==============================
echo Asegurando carpetas requeridas
echo ==============================
if not exist "data" mkdir "data"
if not exist "data\lancedb" mkdir "data\lancedb"
if not exist "prisma" (
  echo WARN: No existe carpeta prisma. Verifica tu proyecto.
)

echo.
echo ==============================
echo Configurando Prisma DATABASE_URL en .env
echo ==============================
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$envFile='.env'; if(!(Test-Path $envFile)){ New-Item $envFile -ItemType File | Out-Null }; " ^
  "$c=Get-Content $envFile -Raw; " ^
  "if($c -notmatch '(^|\r?\n)DATABASE_URL='){ Add-Content $envFile \"`nDATABASE_URL=`\"file:./prisma/dev.db`\"\"; Write-Host 'DATABASE_URL agregado.' } else { Write-Host 'DATABASE_URL ya existe.' }"
if errorlevel 1 goto :err

echo.
echo ==============================
echo Configurando .env.local (si falta)
echo ==============================
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$f='.env.local'; if(!(Test-Path $f)){ New-Item $f -ItemType File | Out-Null }; " ^
  "$c=Get-Content $f -Raw; " ^
  "if($c -notmatch '(^|\r?\n)DATABASE_URL='){ Add-Content $f \"`nDATABASE_URL=`\"file:./prisma/dev.db`\"\"; Write-Host 'DATABASE_URL agregado en .env.local.' } else { Write-Host 'DATABASE_URL ya existe en .env.local.' }"

echo.
echo ==============================
echo Prisma generate + db push (6.19.2)
echo ==============================
call npx --yes prisma@6.19.2 generate
if errorlevel 1 goto :err
call npx --yes prisma@6.19.2 db push
if errorlevel 1 goto :err

echo.
echo ==============================
echo Smoke test LanceDB import (ESM)
echo ==============================
node -e "import('@lancedb/lancedb').then(()=>console.log('LanceDB OK')).catch(e=>{console.error(e);process.exit(1);})"
if errorlevel 1 goto :err

echo.
echo ==============================
echo Instalacion finalizada OK
echo ==============================
pause
exit /b 0

:err
echo.
echo ==============================
echo ERROR: revisa el mensaje de arriba
echo ==============================
pause
exit /b 1
