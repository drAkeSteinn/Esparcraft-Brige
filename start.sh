#!/bin/bash

# ============================================================
# Esparcraft Bridge - Script de Inicio para Linux/Mac
# Versión Actualizada - Soporta LanceDB y Bun
# ============================================================

echo ""
echo "   ____  _   _   ____  _____ ___ _   ___ "
echo "  / __| | | / __| / __|_| | | | |"
echo " | | (__| | | | (__| | |(__| | | | |"
echo "  \___||___|_|____||______||___||___|"
echo ""
echo "============================================================"
echo "   Esparcraft Bridge - Inicio Automatico (Linux/Mac)"
echo "============================================================"
echo ""

# Detectar sistema operativo
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    echo "[INFO] Sistema detectado: Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    echo "[INFO] Sistema detectado: macOS"
else
    echo "[INFO] Sistema detectado: $OSTYPE"
fi

echo ""

# Verificar si Bun esta instalado (prioridad sobre npm)
if command -v bun &> /dev/null; then
    echo "[OK] Bun detectado - Usando Bun como gestor de paquetes"
    PACKAGE_MANAGER="bun"
elif command -v npm &> /dev/null; then
    echo "[OK] npm detectado (recomendado instalar Bun para mayor velocidad)"
    PACKAGE_MANAGER="npm"
else
    echo "[ERROR] Ni Bun ni npm esta instalado"
    echo ""
    echo "Por favor instala Bun desde:"
    echo "https://bun.sh/"
    echo ""
    echo "O instala Node.js con npm desde:"
    echo "https://nodejs.org/"
    echo ""
    exit 1
fi

echo ""
echo "[1/7] Verificando archivos de configuracion..."

# Verificar .env.local
if [ ! -f ".env.local" ]; then
    echo "[INFO] Creando .env.local con configuraciones por defecto..."
    cat > .env.local << EOF
# Configuración de Base de Datos
DATABASE_URL="file:./db/dev.db"

# Configuración de LanceDB
LANCEDB_PATH="./data/embeddings"
EOF
    echo "[OK] .env.local creado"
else
    echo "[OK] .env.local encontrado"
fi

# Verificar .env
if [ ! -f ".env" ]; then
    echo "[INFO] Creando .env con configuraciones por defecto..."
    cat > .env << EOF
# Configuración de Base de Datos
DATABASE_URL="file:./db/dev.db"

# Configuración de LanceDB
LANCEDB_PATH="./data/embeddings"
EOF
    echo "[OK] .env creado"
else
    echo "[OK] .env encontrado"
fi

echo ""
echo "[2/7] Verificando y creando directorios necesarios..."

# Crear directorios necesarios
mkdir -p data/embeddings
if [ $? -ne 0 ]; then
    echo "[ERROR] Fallo al crear directorio de datos"
    exit 1
fi
echo "[OK] Directorios creados: data/embeddings"

mkdir -p logs db
if [ $? -ne 0 ]; then
    echo "[ERROR] Fallo al crear directorios"
    exit 1
fi
echo "[OK] Directorios creados: logs, db"

echo ""
echo "[3/7] Verificando e instalando dependencias..."

# Verificar node_modules
if [ ! -d "node_modules" ]; then
    echo "[INFO] node_modules no encontrado. Instalando dependencias..."
    echo "Esto puede tardar varios minutos..."
    echo ""
    
    if [ "$PACKAGE_MANAGER" == "bun" ]; then
        bun install
        if [ $? -ne 0 ]; then
            echo ""
            echo "[ERROR] Fallo al instalar dependencias con Bun"
            echo ""
            exit 1
        fi
    else
        npm install
        if [ $? -ne 0 ]; then
            echo ""
            echo "[ERROR] Fallo al instalar dependencias con npm"
            echo ""
            echo "Posibles causas:"
            echo "- Conexion a internet interrumpida"
            echo "- Problemas de permisos en el directorio"
            echo "- Version antigua de npm"
            echo ""
            echo "Intenta ejecutar manualmente: npm install"
            echo ""
            exit 1
        fi
    fi
    
    echo "[OK] Dependencias instaladas correctamente"
else
    echo "[OK] node_modules encontrado"
    
    # Verificar LanceDB especificamente
    if [ ! -d "node_modules/@lancedb/lancedb" ]; then
        echo "[INFO] LanceDB core no encontrado, instalando..."
        
        if [ "$PACKAGE_MANAGER" == "bun" ]; then
            bun add @lancedb/lancedb@0.10.0
            if [ $? -ne 0 ]; then
                echo "[ERROR] Fallo al instalar LanceDB core"
                exit 1
            fi
        else
            npm install @lancedb/lancedb@0.10.0
            if [ $? -ne 0 ]; then
                echo "[ERROR] Fallo al instalar LanceDB core"
                exit 1
            fi
        fi
        echo "[OK] LanceDB core instalado"
    else
        echo "[OK] LanceDB core instalado"
    fi
    
    # Verificar modulo nativo del sistema operativo para LanceDB
    if [ "$OS" == "linux" ]; then
        LANCE_NATIVE_PKG="@lancedb/lancedb-linux-x64-gnu"
    elif [ "$OS" == "macos" ]; then
        LANCE_NATIVE_PKG="@lancedb/lancedb-darwin-arm64"
    else
        LANCE_NATIVE_PKG="@lancedb/lancedb"
    fi
    
    if [ ! -d "node_modules/@lancedb/$(basename $LANCE_NATIVE_PKG)" ]; then
        echo "[INFO] Modulo nativo de $OS para LanceDB no encontrado, instalando..."
        echo "Esto es necesario para que LanceDB funcione en $OS..."
        echo ""
        
        if [ "$PACKAGE_MANAGER" == "bun" ]; then
            bun add "$LANCE_NATIVE_PKG@0.10.0"
            if [ $? -ne 0 ]; then
                echo ""
                echo "[ERROR] Fallo al instalar modulo nativo de $OS para LanceDB"
                echo ""
                echo "Este modulo es necesario para que LanceDB funcione en $OS."
                echo "Intenta ejecutar manualmente:"
                echo "  bun add $LANCE_NATIVE_PKG@0.10.0"
                echo ""
                exit 1
            fi
        else
            npm install "$LANCE_NATIVE_PKG@0.10.0"
            if [ $? -ne 0 ]; then
                echo ""
                echo "[ERROR] Fallo al instalar modulo nativo de $OS para LanceDB"
                echo ""
                echo "Este modulo es necesario para que LanceDB funcione en $OS."
                echo "Intenta ejecutar manualmente:"
                echo "  npm install $LANCE_NATIVE_PKG@0.10.0"
                echo ""
                exit 1
            fi
        fi
        echo "[OK] Modulo nativo de $OS instalado"
    else
        echo "[OK] Modulo nativo de $OS para LanceDB instalado"
    fi
fi

echo ""
echo "[4/7] Verificando cliente Prisma..."

# Verificar si Prisma esta instalado localmente
if [ ! -d "node_modules/.prisma" ]; then
    if [ "$PACKAGE_MANAGER" == "bun" ]; then
        echo "[INFO] Cliente Prisma no encontrado, generando con Bun..."
        echo "[INFO] Esto puede tardar unos segundos..."
        echo ""
        
        bunx --yes prisma@6.19.2 generate
        if [ $? -ne 0 ]; then
            echo ""
            echo "[ERROR] Fallo al generar cliente Prisma"
            echo ""
            echo "Verifica que:"
            echo "- El archivo .env tiene la configuracion correcta"
            echo "- Hay conexion a internet (para descargar Prisma)"
            echo ""
            exit 1
        fi
    else
        echo "[INFO] Cliente Prisma no encontrado, generando con npm..."
        echo "[INFO] Esto puede tardar unos segundos..."
        echo ""
        
        npx --yes prisma@6.19.2 generate
        if [ $? -ne 0 ]; then
            echo ""
            echo "[ERROR] Fallo al generar cliente Prisma"
            echo ""
            echo "Verifica que:"
            echo "- El archivo .env tiene la configuracion correcta"
            echo "- Hay conexion a internet (para descargar Prisma)"
            echo ""
            exit 1
        fi
    fi
    
    echo "[OK] Prisma Client generado correctamente"
    
    echo ""
    echo "[INFO] Aplicando schema a la base de datos..."
    echo "[INFO] Ejecutando:"
    if [ "$PACKAGE_MANAGER" == "bun" ]; then
        echo "  bunx --yes prisma@6.19.2 db push"
        echo ""
        
        bunx --yes prisma@6.19.2 db push
    else
        echo "  npx --yes prisma@6.19.2 db push"
        echo ""
        
        npx --yes prisma@6.19.2 db push
    fi
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "[ERROR] Fallo al aplicar schema de base de datos"
        echo ""
        echo "Verifica que el archivo .env tiene la configuracion correcta:"
        echo "  DATABASE_URL=\"file:./db/dev.db\""
        echo ""
        echo "Tambien verifica que el archivo prisma/schema.prisma existe."
        echo ""
        exit 1
    fi
    
    echo "[OK] Schema aplicado correctamente"
else
    echo "[OK] Cliente Prisma encontrado"
fi

echo ""
echo "[5/7] Preparando servidor de desarrollo..."

# Limpiar logs antiguos
if [ -f "dev.log" ]; then
    echo "[INFO] Moviendo log anterior..."
    mv dev.log logs/dev.old.log
fi

if [ -f "server.log" ]; then
    mv server.log logs/server.old.log
fi

echo ""
echo "[6/7] Verificando configuracion de LanceDB..."

# Verificar si existe configuracion de LanceDB en el entorno
if [ -n "$LANCEDB_PATH" ]; then
    echo "[OK] LANCEDB_PATH configurado: $LANCEDB_PATH"
else
    echo "[INFO] LANCEDB_PATH no configurado, usando valor por defecto: ./data/embeddings"
fi

echo ""
echo "============================================================"
echo "   Iniciando servidor de desarrollo..."
echo "============================================================"
echo ""
echo "La aplicacion estara disponible en:"
echo "http://localhost:3000"
echo ""
echo "Notas importantes:"
echo "- Este servidor es para desarrollo solamente"
echo "- Presiona Ctrl+C para detener el servidor"
echo "- El servidor se recargara automaticamente cuando cambies el codigo"
echo "- LanceDB (base de datos vectorial) funcionara localmente"
echo "- La base de datos de embeddings se almacenara en: data/embeddings"
echo ""

# Iniciar servidor
echo "[INFO] Iniciando servidor con $PACKAGE_MANAGER..."
if [ "$PACKAGE_MANAGER" == "bun" ]; then
    bun run dev
else
    npm run dev
fi

# Si llego aqui, todo salio bien
echo ""
echo "============================================================"
echo "   Servidor iniciado correctamente"
echo "============================================================"
echo ""
echo "Presiona Ctrl+C para detener el servidor"
echo ""
echo "Logs disponibles:"
echo "  - Desarrollo: dev.log"
echo "  - Servidor: server.log"
echo ""
