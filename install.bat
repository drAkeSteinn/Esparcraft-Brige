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
echo Configurando Prisma DATABASE_URL en .env
echo ==============================
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$envFile='.env'; if(!(Test-Path $envFile)){ New-Item $envFile -ItemType File | Out-Null }; " ^
  "$c=Get-Content $envFile -Raw; " ^
  "if($c -notmatch '(^|\r?\n)DATABASE_URL='){ Add-Content $envFile \"`nDATABASE_URL=`\"file:./prisma/dev.db`\"\"; Write-Host 'DATABASE_URL agregado.' } else { Write-Host 'DATABASE_URL ya existe.' }"
if errorlevel 1 goto :err

echo.
echo ==============================
echo Prisma generate + db push
echo ==============================
call .\node_modules\.bin\prisma generate
if errorlevel 1 goto :err
call .\node_modules\.bin\prisma db push
if errorlevel 1 goto :err

echo.
echo ==============================
echo Smoke test LanceDB import
echo ==============================
node -e "require('@lancedb/lancedb'); console.log('LanceDB OK')"
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
