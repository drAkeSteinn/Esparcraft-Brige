@echo off
chcp 65001 >nul
title Instalar Dependencias - Next.js Dashboard
color 0E

echo.
echo ========================================
echo   Instalando Dependencias
echo ========================================
echo.

REM Verificar que Node.js está instalado
echo [1/4] Verificando Node.js...
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
echo [2/4] Verificando npm...
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

REM Limpiar node_modules si se solicita
echo ¿Deseas limpiar node_modules y reinstalar todo?
echo (S) Si - (N) No
choice /c SN /n /m "Selecciona una opción: "
if %errorlevel% equ 1 (
    echo.
    echo Limpiando node_modules...
    if exist "node_modules\" (
        rmdir /s /q node_modules
    )
    if exist "package-lock.json" (
        del package-lock.json
    )
    echo node_modules limpiado
    echo.
)

REM Instalar dependencias
echo [3/4] Instalando dependencias...
echo Esto puede tardar varios minutos, por favor espera...
echo.
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Error al instalar dependencias
    echo.
    pause
    exit /b 1
)
echo.
echo Dependencias instaladas correctamente
echo.

REM Generar cliente Prisma
echo [4/4] Generando cliente Prisma...
call npx prisma generate
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Error al generar cliente Prisma
    echo.
    pause
    exit /b 1
)
echo Cliente Prisma generado correctamente
echo.

color 0A
echo.
echo ========================================
echo   ¡Instalación Completada!
echo ========================================
echo.
echo Ahora puedes ejecutar:
echo   - start-dev.bat para modo desarrollo
echo   - start-prod.bat para modo producción
echo.
pause
