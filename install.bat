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
echo Corrigiendo script dev en package.json (Windows)
echo ==============================
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='package.json'; if(!(Test-Path $p)){ Write-Host 'No existe package.json'; exit 1 }; $c=Get-Content $p -Raw; $old='""dev"": ""next dev -p 3000 2>&1 | tee dev.log""'; $new='""dev"": ""next dev -p 3000""'; if($c.Contains($old)){ $c=$c.Replace($old,$new); Set-Content $p $c -NoNewline; Write-Host 'dev corregido.' } else { Write-Host 'dev no requiere cambio (o ya esta corregido).' }"
if errorlevel 1 goto :err

echo.
echo ==============================
echo Configurando Prisma DATABASE_URL_ en .env
echo ==============================
powershell -NoProfile -ExecutionPolicy Bypass -Command "$envFile='.env'; if(!(Test-Path $envFile)){ New-Item $envFile -ItemType File | Out-Null }; $c=Get-Content $envFile -Raw; if($c -notmatch 'DATABASE_URL_'){ Add-Content $envFile \"`nDATABASE_URL_=`\"file:./prisma/dev.db`\"\"; Write-Host 'DATABASE_URL_ agregado.' } else { Write-Host 'DATABASE_URL_ ya existe.' }"
if errorlevel 1 goto :err

echo.
echo ==============================
echo Prisma generate + db push (crea DB/tablas si faltan)
echo ==============================
call npx prisma generate
if errorlevel 1 goto :err
call npx prisma db push
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
