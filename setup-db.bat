@echo off
chcp 65001 >nul
title Configurar Base de Datos - Prisma
color 0D

echo.
echo ========================================
echo   Configuración de Base de Datos
echo   Prisma ORM
echo ========================================
echo.

REM Verificar que Node.js está instalado
echo Verificando Node.js...
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

REM Opciones de configuración
echo Selecciona una operación:
echo   1 - Generar cliente Prisma
echo   2 - Hacer push del esquema a la base de datos
echo   3 - Crear una nueva migración
echo   4 - Resetear la base de datos (PELIGROSO: borra todos los datos)
echo   5 - Hacer todo (generar + push)
echo   6 - Salir
echo.

choice /c 123456 /n /m "Selecciona una opción (1-6): "
set opcion=%errorlevel%

if %opcion% equ 6 (
    echo Saliendo...
    pause
    exit /b 0
)

if %opcion% equ 1 (
    echo.
    echo [1/2] Generando cliente Prisma...
    call npx prisma generate
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERROR] Error al generar cliente Prisma
        pause
        exit /b 1
    )
    echo Cliente Prisma generado correctamente
)

if %opcion% equ 2 (
    echo.
    echo [2/2] Haciendo push del esquema a la base de datos...
    call npx prisma db push
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERROR] Error al hacer push del esquema
        pause
        exit /b 1
    )
    echo Esquema enviado a la base de datos correctamente
)

if %opcion% equ 3 (
    echo.
    echo [3/3] Creando nueva migración...
    set /p nombre="Nombre de la migración: "
    if "%nombre%"=="" (
        echo [ERROR] Debes proporcionar un nombre para la migración
        pause
        exit /b 1
    )
    call npx prisma migrate dev --name %nombre%
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERROR] Error al crear migración
        pause
        exit /b 1
    )
    echo Migración creada correctamente
)

if %opcion% equ 4 (
    echo.
    echo [ADVERTENCIA] Esta operación borrará TODOS los datos de la base de datos
    echo ¿Estás seguro que deseas continuar?
    choice /c SN /n /m "(S) Sí, (N) No: "
    if %errorlevel% neq 1 (
        echo Operación cancelada
        pause
        exit /b 0
    )

    echo.
    echo Reseteando base de datos...
    call npx prisma migrate reset
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERROR] Error al resetear la base de datos
        pause
        exit /b 1
    )
    echo Base de datos reseteada correctamente
)

if %opcion% equ 5 (
    echo.
    echo [1/2] Generando cliente Prisma...
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
    echo [2/2] Haciendo push del esquema a la base de datos...
    call npx prisma db push
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERROR] Error al hacer push del esquema
        pause
        exit /b 1
    )
    echo Esquema enviado a la base de datos correctamente
)

color 0A
echo.
echo ========================================
echo   ¡Operación Completada!
echo ========================================
echo.
pause
