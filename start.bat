@echo off
:: ====================================================
:: Esparcraft Bridge - Script de Inicio para Windows
:: Versión simplificada - Solo usa npm
:: ====================================================
setlocal enabledelayedexpansion

echo.
echo   ____  _   _   ____  _____ ___ _   ___ 
echo  ^/ __^| ^| ^| ^/ __^| ^/ __^|_ ^| ^| ^| ^|
echo  ^| ^(__^| ^| ^| ^| ^(__^| ^| ^| ^| ^| ^|
echo  ^\___^|^|___^|_^|____^|^|______^|_^|___^|_ ^|___^|
echo.
echo ====================================================
echo    Esparcraft Bridge - Inicio Automatico (Windows)
echo ====================================================
echo.

:: Detectar si Node.js esta instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado
    echo.
    echo Por favor instala Node.js desde:
    echo https://nodejs.org/
    echo.
    echo Asegurate de instalar la version LTS
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detectado

:: Detectar si npm esta instalado
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm no esta instalado
    echo.
    echo npm deberia venir con Node.js. Por favor reinstala Node.js.
    echo.
    pause
    exit /b 1
)

echo [OK] npm detectado

echo.
echo [1/5] Verificando archivos de configuracion...

:: Verificar .env.example
if not exist .env.example (
    echo [ERROR] No se encuentra el archivo .env.example
    echo El script necesita este archivo para crear los archivos de configuracion.
    echo.
    pause
    exit /b 1
)

:: Verificar .env.local
if not exist .env.local (
    echo [INFO] Creando .env.local desde ejemplo...
    copy .env.example .env.local
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al crear .env.local
        pause
        exit /b 1
    )
    echo [OK] .env.local creado
) else (
    echo [OK] .env.local encontrado
)

:: Verificar .env
if not exist .env (
    echo [INFO] Creando .env desde ejemplo...
    copy .env.example .env
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al crear .env
        pause
        exit /b 1
    )
    echo [OK] .env creado
) else (
    echo [OK] .env encontrado
)

:: Crear directorios necesarios
if not exist data (
    echo [INFO] Creando directorio data...
    mkdir data
    mkdir data\embeddings
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al crear directorios de datos
        pause
        exit /b 1
    )
    echo [OK] Directorios de datos creados
) else (
    if not exist data\embeddings (
        echo [INFO] Creando directorio data\embeddings...
        mkdir data\embeddings
        if %errorlevel% neq 0 (
            echo [ERROR] Fallo al crear directorio embeddings
            pause
            exit /b 1
        )
    )
    echo [OK] Directorios de datos existen
)

if not exist logs (
    echo [INFO] Creando directorio logs...
    mkdir logs
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al crear directorio logs
        pause
        exit /b 1
    )
    echo [OK] Directorio de logs creado
) else (
    echo [OK] Directorio de logs existe
)

if not exist db (
    echo [INFO] Creando directorio db...
    mkdir db
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al crear directorio db
        pause
        exit /b 1
    )
    echo [OK] Directorio de db creado
) else (
    echo [OK] Directorio de db existe
)

echo.
echo [2/5] Verificando e instalando dependencias...

:: Verificar node_modules
if not exist node_modules (
    echo [INFO] node_modules no encontrado. Instalando dependencias...
    echo Esto puede tardar varios minutos...
    echo.
    
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
    
    echo [OK] Dependencias instaladas correctamente
) else (
    echo [OK] node_modules encontrado
    
    :: Verificar LanceDB especificamente
    if not exist node_modules\@lancedb\lancedb (
        echo [INFO] LanceDB no encontrado, instalando...
        npm install @lancedb/lancedb@0.10.0
        if %errorlevel% neq 0 (
            echo [ERROR] Fallo al instalar LanceDB
            pause
            exit /b 1
        )
        echo [OK] LanceDB instalado
    ) else (
        echo [OK] LanceDB instalado
    )
    
    :: Verificar modulo nativo de Windows para LanceDB
    if not exist node_modules\@lancedb\lancedb-win32-x64-msvc (
        echo [INFO] Modulo nativo de Windows para LanceDB no encontrado, instalando...
        echo Esto es necesario para que LanceDB funcione en Windows...
        echo.
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
        echo [OK] Modulo nativo de Windows instalado
    ) else (
        echo [OK] Modulo nativo de Windows para LanceDB instalado
    )
)

echo.
echo [3/5] Verificando cliente Prisma...

:: Verificar si Prisma esta instalado localmente
if not exist node_modules\.prisma (
    echo [INFO] Cliente Prisma no encontrado, generando...
    echo [INFO] Esto puede tardar unos segundos...
    echo.
    
    echo [INFO] Ejecutando: npx --yes prisma@6.19.2 generate
    call npx --yes prisma@6.19.2 generate
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Fallo al generar cliente Prisma
        echo.
        echo Verifica que:
        echo - Node.js esta correctamente instalado
        echo - Las dependencias se instalaron correctamente
        echo - Hay conexion a internet (para descargar Prisma)
        echo.
        pause
        exit /b 1
    )
    
    echo [OK] Prisma Client generado correctamente
    
    echo.
    echo [INFO] Aplicando schema a la base de datos...
    echo [INFO] Ejecutando: npx --yes prisma@6.19.2 db push
    echo.
    
    call npx --yes prisma@6.19.2 db push
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Fallo al aplicar schema de base de datos
        echo.
        echo Verifica que el archivo .env tiene la configuracion correcta:
        echo DATABASE_URL="file:./db/dev.db"
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
echo [4/5] Preparando servidor de desarrollo...

:: Limpiar logs antiguos
if exist dev.log (
    echo [INFO] Moviendo log anterior...
    move dev.log logs\dev.old.log >nul 2>&1
)

if exist server.log (
    move server.log logs\server.old.log >nul 2>&1
)

:: Iniciar servidor
echo.
echo ====================================================
echo    Iniciando servidor de desarrollo...
echo ====================================================
echo.
echo La aplicacion estara disponible en:
echo    http://localhost:3000
echo.
echo Notas importantes:
echo - Este servidor es para desarrollo solamente
echo - Presiona Ctrl+C para detener el servidor
echo - El servidor se recargara automaticamente cuando cambies el codigo
echo.
echo Abriendo navegador...
echo.

:: Esperar un momento antes de iniciar
timeout /t 2 /nobreak >nul

:: Iniciar servidor con npm
npm run dev

if %errorlevel% neq 0 (
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
    echo - Intenta ejecutar: npm run dev
    echo.
    pause
    exit /b 1
)

:: Si llego aqui, todo salio bien
echo.
echo ====================================================
echo    Servidor detenido
echo ====================================================
echo.
pause
