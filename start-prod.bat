@echo off
chcp 65001 >nul
title Next.js Dashboard - Entorno de Producción
color 0B

echo.
echo ========================================
echo   Compilando y Ejecutando Aplicación
echo   Modo: Producción
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
echo Configurando base de datos...
call npx prisma db push
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ADVERTENCIA] Hubo un problema con la base de datos
    echo La aplicación podría no funcionar correctamente
)
echo Base de datos configurada
echo.

REM Compilar aplicación
echo [5/5] Compilando aplicación...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Error al compilar la aplicación
    pause
    exit /b 1
)
echo Aplicación compilada correctamente
echo.

REM Limpiar log anterior si existe
if exist "server.log" (
    echo Limpiando log anterior...
    del server.log >nul 2>&1
)

echo.
echo ========================================
echo   Iniciando servidor de producción...
echo   La aplicación estará disponible en:
echo   http://localhost:3000
echo ========================================
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

REM Iniciar servidor de producción
call npm start

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] El servidor se detuvo con errores
    pause
)

color 0B
echo.
echo Servidor detenido
pause
