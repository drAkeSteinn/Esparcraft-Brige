# Esparcraft Bridge - Guía de Inicio

## Inicio Rápido

### Windows
```batch
start.bat
```

### Linux/Mac
```bash
./start.sh
```

## ¿Qué hacen los Scripts de Inicio?

Los scripts (`start.bat` para Windows y `start.sh` para Linux/Mac) automatizan todo el proceso de configuración e inicio:

1. ✅ **Detectan el gestor de paquetes** (prioridad: Bun → npm)
2. ✅ **Verifican y crean archivos de configuración** (.env, directorios)
3. ✅ **Instalan todas las dependencias** automáticamente
4. ✅ **Instalan LanceDB** y el módulo nativo del sistema operativo
5. ✅ **Generan el cliente Prisma**
6. ✅ **Aplican el schema de base de datos**
7. ✅ **Inician el servidor de desarrollo**

## Requisitos Previos

### Requisitos de Sistema
- **Windows 10 o superior** (Windows 11 recomendado)
- **Arquitectura**: x64 (recomendado) o ARM64
- **Node.js** 18+ o **Bun** (gestor de paquetes rápido)

### Opcionales (Recomendados para Mayor Velocidad)
- **Bun** (gestor de paquetes ultrarrápido)
  - Descarga: https://bun.sh/
  - Instalación automática incluida en `start.bat`

### Alternativos (Si no se usa Bun)
- **Node.js** (versión 18 o superior)
  - Descarga: https://nodejs.org/

## Plataformas Soportadas

### ✅ Windows
- Windows 10+
- Soporte nativo con `@lancedb/lancedb-win32-x64-msvc`

### ✅ Linux
- Distribuciones modernas (Ubuntu 20.04+, Debian 11+, etc.)
- Soporte nativo con `@lancedb/lancedb-linux-x64-gnu`

### ✅ macOS
- macOS 11+ (Big Sur y posteriores)
- Soporte nativo con `@lancedb/lancedb-darwin-arm64`

## Sistema de Embeddings

El proyecto utiliza **LanceDB** como base de datos vectorial para embeddings.

### ¿Por qué LanceDB?
- ✅ Base de datos vectorial local (sin servidor externo)
- ✅ No requiere configuración compleja
- ✅ Búsqueda vectorial eficiente con índices HNSW
- ✅ No requiere servidor externo
- ✅ Soporta múltiples plataformas con módulos nativos
- ✅ Persistencia automática
- ✅ Soporte nativo para Windows

### Configuración por Defecto
- Ruta: `./data/embeddings`
- Dimensiones: 768 (Ollama por defecto)
- Índices: HNSW para búsqueda rápida

### Configuración en la App
La sección **"LanceDB"** en la configuración de la aplicación permite:
- Verificar el estado de conexión
- Estadísticas de embeddings, namespaces, fuentes únicas
- Personalización de ruta de almacenamiento
- Función de prueba de conexión
- Función para guardar configuración

## Uso de Scripts en package.json

**⚠️ Importante**: El comando `tee` NO es compatible con Windows.

Los scripts en `package.json` incluyen alternativas compatibles:

**Scripts compatibles con Windows:**
```json
"dev": "node setup.js && npx --yes prisma@6.19.2 generate && next dev -p 3000",
"dev:quick": "npx --yes prisma@6.19.2 generate && next dev -p 3000",
"dev:windows": "node setup.js && npx --yes prisma@6.19.2 generate && next dev -p 3000 > dev.log 2>&1",
"start:windows": "set NODE_ENV=production && node .next/standalone/server.js > server.log 2>&1"
```

**Uso en línea de comandos:**
```cmd
npm run dev:windows
```

## Estructura del Proyecto

```
esparcraft-bridge/
├── data/                      # Almacenamiento general
│   └── embeddings/           # Base de datos vectorial LanceDB
├── db/                       # Base de datos SQLite (Prisma)
├── logs/                     # Logs de desarrollo
│   ├── dev.log               # Logs del servidor Next.js
│   └── server.log            # Logs generales
├── node_modules/             # Dependencias instaladas
├── prisma/                  # Configuración de Prisma
├── src/                     # Código fuente
│   ├── app/                # APIs de Next.js
│   ├── components/           # Componentes React
│   └── lib/                # Utilidades y lógica
├── start.bat / start.sh       # Scripts de inicio
└── *.md                      # Documentación
```

## Solución de Problemas Comunes

### Puerto 3000 ya en uso
```
Error: Error: listen EADDRINUSE: address already in use :::3000
```

**Solución:**
1. Cierra otras aplicaciones que usen el puerto 3000
2. O modifica el puerto en la configuración

### Error de Permiso
```
Error: Error: EACCES: permission denied
```

**Solución:**
- **Linux/Mac**: Ejecuta `chmod +x start.sh` antes de ejecutar
- Ejecuta con permisos de administrador si es necesario
- **Windows**: Ejecuta como Administrador

### LanceDB: Módulo nativo no encontrado
```
Error: could not resolve "@lancedb/lancedb-win32-x64-msvc"
Error: could not resolve "@lancedb/lancedb-linux-x64-gnu"
```

**Solución:**
1. Ejecuta el script de inicio nuevamente
2. O instala manualmente el módulo correspondiente a tu plataforma

### Prisma: Error de generación
```
Error: Error: P3006
```

**Solución:**
1. Verifica que `DATABASE_URL` está configurado en `.env`
2. Ejecuta: `bunx --yes prisma@6.19.2 db push`

## Variables de Entorno

### Archivos de Configuración Automática
- `.env` - Configuración principal (creado automáticamente por los scripts de inicio)
- `.env.local` - Configuración local (creado automáticamente por los scripts de inicio)

Los scripts de inicio (`start.bat` y `start.sh`) crean estos archivos automáticamente si no existen, con los valores por defecto apropiados. No necesitas configurar manualmente las variables de entorno para el desarrollo.

### Variables Importantes
```bash
# Base de datos Prisma (SQLite)
DATABASE_URL="file:./db/dev.db"

# LanceDB (base de datos vectorial)
LANCEDB_PATH=./data/embeddings

# Proveedor de Embeddings
EMBEDDING_PROVIDER=textgen

# Modelos de Embeddings
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIMENSION=768
```

**Nota**: Solo necesitas editar estos archivos si deseas cambiar los valores por defecto.

## Comandos de Desarrollo

### Instalación de Dependencias
```bash
# Con Bun (recomendado)
bun install

# Con npm
npm install
```

### Generación de Cliente Prisma
```bash
bunx --yes prisma@6.19.2 generate
```

### Aplicar Schema a Base de Datos
```bash
bunx --yes prisma@6.19.2 db push
```

### Iniciar Servidor de Desarrollo
```bash
bun run dev
```

### Verificación de Código
```bash
bun run lint
```

## Logs

### Ubicación de Logs
- **Desarrollo**: `logs/dev.log`
- **Servidor**: `logs/server.log`

### Ver Logs en Tiempo Real

**Windows:**
```batch
type logs\dev.log
```

**Linux/Mac:**
```bash
tail -f logs/dev.log
```

## Acceso a la Aplicación

Una vez iniciado el servidor:
- **URL**: http://localhost:3000
- **Panel de Configuración**: Disponible en la aplicación
  - Configuración de LanceDB
  - Configuración de LLM
  - Configuración de Embeddings
  - General (Servidor, Interfaz, etc.)

## Tecnologías Utilizadas

- **Framework**: Next.js 16.1.3
- **Lenguaje**: TypeScript 5
- **Base de datos**: SQLite (Prisma 6.19.2)
- **Embeddings**: LanceDB 0.10.0
- **Gestor de Paquetes**: Bun o npm
- **UI**: React con shadcn/ui y Tailwind CSS

## Actualizaciones Recientes

### Versión Actual
- ✅ Migración completa de PostgreSQL a LanceDB
- ✅ Scripts de inicio para Windows, Linux y Mac
- ✅ Soporte completo para LanceDB multiplataforma
- ✅ Scripts compatibles con Windows (eliminado `tee`)
- ✅ Detección automática de gestor de paquetes (Bun/npm)
- ✅ Instalación automática de módulos nativos por plataforma
- ✅ Mejoras en manejo de errores y logs
- ✅ Configuración simplificada sin necesidad de servidor externo
- ✅ Creación automática de archivos `.env` y `.env.local` (ya no requiere `.env.example`)

## Soporte

Si encuentras problemas:
1. Revisa los logs en el directorio `logs/`
2. Verifica que todos los requisitos están instalados
3. Asegúrate de usar el script de inicio apropiado para tu plataforma
4. Si el problema persiste, revisa la documentación del proyecto
