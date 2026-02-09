@echo off
:: ====================================================
:: Esparcraft Bridge - Script de Inicio para Windows
:: Versión Actualizada - Soporta LanceDB y Bun
:: ====================================================
setlocal enabledelayedexpansion

echo.
echo   ____  _   _   ____  _____ ___ _   ___ 
echo  ^/ __^| ^| ^/ __^| ^/ __^|_ ^| ^| ^|
echo  ^| ^(__^| ^| ^| ^(__^| ^| ^(__^| ^| ^| ^|
echo  ^\___^|^|___^|_^|____^|^|______^|^|______^|_^|___^|_ ^|___^|
echo.
echo ====================================================
::    Esparcraft Bridge - Inicio Automatico (Windows)
:: ====================================================
echo.

:: Detectar si Bun esta instalado (prioridad sobre npm)
where bun >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Bun detectado - Usando Bun como gestor de paquetes
    set "PACKAGE_MANAGER=bun"
    goto :skip_npm_check
)

:: Fallback a npm si no hay bun
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Ni Bun ni npm esta instalado
    echo.
    echo Por favor instala Bun desde:
    echo https://bun.sh/
    echo.
    echo O instala Node.js con npm desde:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

set "PACKAGE_MANAGER=npm"
echo [OK] npm detectado (recomendado instalar Bun para mayor velocidad)

:skip_npm_check
echo.

echo [1/7] Verificando archivos de configuracion...

:: Verificar .env.local
if not exist .env.local (
    echo [INFO] Creando .env.local con configuraciones por defecto...
    (
        echo # Configuración de Base de Datos
        echo DATABASE_URL="file:./db/dev.db"
        echo.
        echo # Configuración de LanceDB
        echo LANCEDB_PATH="./data/embeddings"
    ) > .env.local
    echo [OK] .env.local creado
) else (
    echo [OK] .env.local encontrado
)

:: Verificar .env
if not exist .env (
    echo [INFO] Creando .env con configuraciones por defecto...
    (
        echo # Configuración de Base de Datos
        echo DATABASE_URL="file:./db/dev.db"
        echo.
        echo # Configuración de LanceDB
        echo LANCEDB_PATH="./data/embeddings"
    ) > .env
    echo [OK] .env creado
) else (
    echo [OK] .env encontrado
)

:: Crear directorios necesarios
echo.
echo [2/7] Verificando y creando directorios necesarios...

if not exist data (
    echo [INFO] Creando directorio data...
    mkdir data >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al crear directorio de datos
        pause
        exit /b 1
    )
    echo [OK] Directorio data creado
)

if not exist data\embeddings (
    echo [INFO] Creando directorio data\embeddings...
    mkdir data\embeddings >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al crear directorio embeddings
        pause
        exit /b 1
    )
    echo [OK] Directorio data\embeddings creado
) else (
    echo [OK] Directorio data\embeddings existe
)

if not exist logs (
    echo [INFO] Creando directorio logs...
    mkdir logs >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al crear directorio logs
        pause
        exit /b 1
    )
    echo [OK] Directorio logs creado
) else (
    echo [OK] Directorio logs existe
)

if not exist db (
    echo [INFO] Creando directorio db...
    mkdir db >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al crear directorio db
        pause
        exit /b 1
    )
    echo [OK] Directorio db creado
) else (
    echo [OK] Directorio db existe
)

echo.
echo [3/7] Verificando e instalando dependencias...

:: Verificar node_modules
if not exist node_modules (
    echo [INFO] node_modules no encontrado. Instalando dependencias...
    echo Esto puede tardar varios minutos...
    echo.
    
    if "%PACKAGE_MANAGER%"=="bun" (
        bun install
        if %errorlevel% neq 0 (
            echo.
            echo [ERROR] Fallo al instalar dependencias con Bun
            echo.
            pause
            exit /b 1
        )
    ) else (
        npm install
        if %errorlevel% neq 0 (
            echo.
            echo [ERROR] Fallo al instalar dependencias con npm
            echo.
            echo Posibles causas:
            echo - Conexion a internet interrumpida
            echo - Problemas de permisos en el directorio
            echo - Version antigua de npm
            echo.
            echo Intenta ejecutar manualmente: npm install
            echo.
            pause
            exit /b 1
        )
    )
    
    echo [OK] Dependencias instaladas correctamente
) else (
    echo [OK] node_modules encontrado
    
    :: Verificar LanceDB especificamente
    if not exist node_modules\@lancedb\lancedb (
        echo [INFO] LanceDB core no encontrado, instalando...
        
        if "%PACKAGE_MANAGER%"=="bun" (
            bun add @lancedb/lancedb@0.10.0
            if %errorlevel% neq 0 (
                echo [ERROR] Fallo al instalar LanceDB core
                pause
                exit /b 1
            )
        ) else (
            npm install @lancedb/lancedb@0.10.0
            if %errorlevel% neq 0 (
                echo [ERROR] Fallo al instalar LanceDB core
                pause
                exit /b 1
            )
        )
        echo [OK] LanceDB core instalado
    ) else (
        echo [OK] LanceDB core instalado
    )
    
    :: Verificar modulo nativo de Windows para LanceDB
    if not exist node_modules\@lancedb\lancedb-win32-x64-msvc (
        echo [INFO] Modulo nativo de Windows para LanceDB no encontrado, instalando...
        echo Esto es necesario para que LanceDB funcione en Windows...
        echo.
        
        if "%PACKAGE_MANAGER%"=="bun" (
            bun add @lancedb/lancedb-win32-x64-msvc@0.10.0
            if %errorlevel% neq 0 (
                echo.
                echo [ERROR] Fallo al instalar modulo nativo de Windows para LanceDB
                echo.
                echo Este modulo es necesario para que LanceDB funcione en Windows.
                echo Intenta ejecutar manualmente:
                echo   bun add @lancedb/lancedb-win32-x64-msvc@0.10.0
                echo.
                pause
                exit /b 1
            )
        ) else (
            npm install @lancedb/lancedb-win32-x64-msvc@0.10.0
            if %errorlevel% neq 0 (
                echo.
                echo [ERROR] Fallo al instalar modulo nativo de Windows para LanceDB
                echo.
                echo Este modulo es necesario para que LanceDB funcione en Windows.
                echo Intenta ejecutar manualmente:
                echo   npm install @lancedb/lancedb-win32-x64-msvc@0.10.0
                echo.
                pause
                exit /b 1
            )
        )
        echo [OK] Modulo nativo de Windows instalado
    ) else (
        echo [OK] Modulo nativo de Windows para LanceDB instalado
    )
)

echo.
echo [4/7] Verificando cliente Prisma...

:: Verificar si Prisma esta instalado localmente
if not exist node_modules\.prisma (
    if "%PACKAGE_MANAGER%"=="bun" (
        echo [INFO] Cliente Prisma no encontrado, generando con Bun...
        echo [INFO] Esto puede tardar unos segundos...
        echo.
        
        bunx --yes prisma@6.19.2 generate
        if %errorlevel% neq 0 (
            echo.
            echo [ERROR] Fallo al generar cliente Prisma
            echo.
            echo Verifica que:
            echo - El archivo .env tiene la configuracion correcta
            echo - Hay conexion a internet (para descargar Prisma)
            echo.
            pause
            exit /b 1
        )
    ) else (
        echo [INFO] Cliente Prisma no encontrado, generando con npm...
        echo [INFO] Esto puede tardar unos segundos...
        echo.
        
        npx --yes prisma@6.19.2 generate
        if %errorlevel% neq 0 (
            echo.
            echo [ERROR] Fallo al generar cliente Prisma
            echo.
            echo Verifica que:
            echo - El archivo .env tiene la configuracion correcta
            echo - Hay conexion a internet (para descargar Prisma)
            echo.
            pause
            exit /b 1
        )
    )
    
    echo [OK] Prisma Client generado correctamente
    
    echo.
    echo [INFO] Aplicando schema a la base de datos...
    echo [INFO] Ejecutando:
    if "%PACKAGE_MANAGER%"=="bun" (
        echo   bunx --yes prisma@6.19.2 db push
        echo.
        
        bunx --yes prisma@6.19.2 db push
    ) else (
        echo   npx --yes prisma@6.19.2 db push
        echo.
        
        npx --yes prisma@6.19.2 db push
    )
    
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Fallo al aplicar schema de base de datos
        echo.
        echo Verifica que el archivo .env tiene la configuracion correcta:
        echo   DATABASE_URL="file:./db/dev.db"
        echo.
        echo Tambien verifica que el archivo prisma\schema.prisma existe.
        echo.
        pause
        exit /b 1
    )
    
    echo [OK] Schema aplicado correctamente
) else (
    echo [OK] Cliente Prisma encontrado
)

echo.
echo [5/7] Preparando servidor de desarrollo...

:: Limpiar logs antiguos
if exist dev.log (
    echo [INFO] Moviendo log anterior...
    move dev.log logs\dev.old.log >nul 2>&1
)

if exist server.log (
    move server.log logs\server.old.log >nul 2>&1
)

echo.
echo [6/7] Verificando configuracion de LanceDB...

:: Verificar si existe configuracion de LanceDB en el entorno
if defined LANCEDB_PATH (
    echo [OK] LANCEDB_PATH configurado: %LANCEDB_PATH%
) else (
    echo [INFO] LANCEDB_PATH no configurado, usando valor por defecto: ./data/embeddings
)

echo.
echo ====================================================
::    Iniciando servidor de desarrollo...
echo ====================================================
echo.
echo La aplicacion estara disponible en:
echo http://localhost:3000
echo.
echo Notas importantes:
echo - Este servidor es para desarrollo solamente
echo - Presiona Ctrl+C para detener el servidor
echo - El servidor se recargara automaticamente cuando cambies el codigo
echo - LanceDB (base de datos vectorial) funcionara localmente
echo - La base de datos de embeddings se almacenara en: data\embeddings
echo.

:: Esperar un momento antes de iniciar
timeout /t 3 /nobreak >nul

:: Iniciar servidor
if "%PACKAGE_MANAGER%"=="bun" (
    echo [INFO] Iniciando servidor con Bun...
    bun run dev
) else (
    echo [INFO] Iniciando servidor con npm...
    npm run dev
)

if %errorlevel% neq 0 (
    echo.
    echo ====================================================
    echo    Servidor detenido
    echo ====================================================
    echo.
    echo [ERROR] El servidor fallo al iniciar
    echo.
    echo Posibles causas:
    echo - El puerto 3000 ya esta en uso
    echo - Error en el codigo de la aplicacion
    echo - Problemas con las dependencias
    echo.
    echo Soluciones:
    echo - Cierra otros programas que usen el puerto 3000
    echo - Revisa los logs en: dev.log
    echo - Intenta ejecutar: bun run dev
    echo.
    pause
    exit /b 1
)

:: Si llego aqui, todo salio bien
echo.
echo ====================================================
echo    Servidor iniciado correctamente
echo ====================================================
echo.
echo Presiona Ctrl+C para detener el servidor
echo.
echo Logs disponibles:
echo   - Desarrollo: dev.log
echo   - Servidor: server.log
echo.
pause
