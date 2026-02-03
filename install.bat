@echo off
setlocal
cd /d "%~dp0"

echo ==============================
echo Instalando dependencias...
echo ==============================
call npm install
if errorlevel 1 goto :err

echo.
echo ==============================
echo Verificando archivo .env y DATABASE_URL
echo ==============================
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$envFile='.env'; ^
 if(!(Test-Path $envFile)){ New-Item $envFile -ItemType File | Out-Null }; ^
 $c = Get-Content $envFile -Raw; ^
 if($c -notmatch 'DATABASE_URL='){ ^
   Add-Content $envFile \"`nDATABASE_URL=`\"file:./prisma/dev.db`\"\"; ^
   Write-Host 'DATABASE_URL agregado.' ^
 } else { ^
   Write-Host 'DATABASE_URL ya existe.' ^
 }"

echo.
echo ==============================
echo Generando Prisma Client
echo ==============================
call npx prisma generate
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
echo ERROR durante install
echo ==============================
pause
exit /b 1