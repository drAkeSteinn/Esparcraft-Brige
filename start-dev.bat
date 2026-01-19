@echo off
chcp 65001 >nul
title Next.js Dashboard - Entorno de Desarrollo
color 0A

echo.
echo ========================================
echo   Iniciando Aplicación Next.js
echo   Modo: Desarrollo
echo ========================================
echo.

REM Verificar que Node.js está instalado
echo [1/5] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Node.js no está instalado o no está en el PATH
    echo Por favor, instala Node.js desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
node --version
echo Node.js verificado correctamente
echo.

REM Verificar que npm está instalado
echo [2/5] Verificando npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] npm no está instalado
    pause
    exit /b 1
)
npm --version
echo npm verificado correctamente
echo.

REM Instalar dependencias si no existen
echo [3/5] Verificando dependencias...
if not exist "node_modules\" (
    echo Instalando dependencias...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERROR] Error al instalar dependencias
        pause
        exit /b 1
    )
    echo Dependencias instaladas correctamente
) else (
    echo Dependencias ya instaladas, omitiendo...
)
echo.

REM Generar cliente Prisma
echo [4/5] Generando cliente Prisma...
call npx prisma generate
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Error al generar cliente Prisma
    pause
    exit /b 1
)
echo Cliente Prisma generado correctamente
echo.

REM Hacer push de la base de datos
echo [5/5] Configurando base de datos...
call npx prisma db push
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ADVERTENCIA] Hubo un problema con la base de datos
    echo La aplicación podría no funcionar correctamente
    pause
)
echo Base de datos configurada
echo.

REM Limpiar log anterior si existe
if exist "dev.log" (
    echo Limpiando log anterior...
    del dev.log >nul 2>&1
)

echo.
echo ========================================
echo   Iniciando servidor de desarrollo...
echo   La aplicación estará disponible en:
echo   http://localhost:3000
echo ========================================
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

REM Iniciar servidor de desarrollo
call npm run dev

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] El servidor se detuvo con errores
    pause
)

color 0A
echo.
echo Servidor detenido
pause
