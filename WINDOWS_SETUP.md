# Instrucciones de Instalación para Windows

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

## Instrucciones de Inicio

### Opción 1: Inicio Rápido (Recomendado)

Doble clic en `start.bat`

El script realizará automáticamente:
1. ✅ Detectar y usar Bun si está disponible
2. ✅ Verificar y crear archivos de configuración
3. ✅ Crear directorios necesarios
4. ✅ Instalar todas las dependencias
5. ✅ Instalar LanceDB (base de datos vectorial)
6. ✅ Instalar módulo nativo de Windows para LanceDB
7. ✅ Generar cliente Prisma
8. ✅ Aplicar schema de base de datos
9. ✅ Iniciar el servidor de desarrollo

### Opción 2: Uso de Scripts en package.json

**⚠️ Importante**: El comando `tee` NO es compatible con Windows.

Los scripts en `package.json` incluyen alternativas compatibles:

**Scripts compatibles con Windows**:
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

### Opción 3: Inicio Manual desde Línea de Comandos

Abre una terminal (PowerShell o CMD) en el directorio del proyecto y ejecuta:

```cmd
start.bat
```

### Opción 4: Pasos Individuales

Si prefieres ejecutar cada paso manualmente:

#### 1. Instalar Dependencias
```cmd
bun install
```
o con npm:
```cmd
npm install
```

#### 2. Instalar LanceDB y Módulo Nativo de Windows
```cmd
bun add @lancedb/lancedb@0.10.0
bun add @lancedb/lancedb-win32-x64-msvc@0.10.0
```

#### 3. Generar Cliente Prisma
```cmd
bunx --yes prisma@6.19.2 generate
```

#### 4. Aplicar Schema de Base de Datos
```cmd
bunx --yes prisma@6.19.2 db push
```

#### 5. Iniciar Servidor de Desarrollo
```cmd
bun run dev
```

## Archivos de Configuración

### .env y .env.local
Los archivos de configuración `.env` y `.env.local` se crean automáticamente la primera vez que ejecutas el script `start.bat` si no existen.

El script crea estos archivos con las siguientes configuraciones por defecto:

```env
# Configuración de Base de Datos
DATABASE_URL="file:./db/dev.db"

# Configuración de LanceDB
LANCEDB_PATH="./data/embeddings"
```

**Variables importantes:**
```
DATABASE_URL="file:./db/dev.db"      # Base de datos SQLite para Prisma
LANCEDB_PATH="./data/embeddings"     # Ruta de la base de datos vectorial LanceDB
```

**Nota**: No necesitas crear manualmente estos archivos. El script `start.bat` los genera automáticamente con valores adecuados para el desarrollo.

## Directorios Estructurados

El script crea automáticamente estos directorios:

```
project/
├── data/              # Almacenamiento general
│   └── embeddings/   # Base de datos vectorial LanceDB
├── db/               # Base de datos SQLite (Prisma)
├── logs/              # Logs de desarrollo
│   ├── dev.log
│   └── server.log
├── node_modules/     # Dependencias instaladas
└── .next/           # Build de Next.js
```

## Sistema de Embeddings

El proyecto ahora utiliza **LanceDB** en lugar de PostgreSQL:

### ¿Por qué LanceDB?
- ✅ Base de datos vectorial local (sin servidor externo)
- ✅ No requiere configuración compleja
- ✅ Búsqueda vectorial eficiente con índices HNSW
- ✅ Funciona directamente en Node.js
- ✅ Persistencia automática
- ✅ Soporte nativo para Windows

### Configuración en la App
La sección **"LanceDB"** en la configuración de la aplicación permite:
- Verificar el estado de conexión
- Ver estadísticas (total de embeddings, namespaces, fuentes)
- Configurar la ruta de la base de datos
- Por defecto: `./data/embeddings`

## Solución de Problemas Comunes

### Puerto 3000 ya en uso
**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solución**:
1. Cierra otras aplicaciones que usen el puerto 3000
2. O modifica el puerto en la configuración

### Error de Permiso
**Error**: `Error: EACCES: permission denied`

**Solución**:
1. Ejecuta la terminal como Administrador
2. Verifica permisos de escritura en el directorio del proyecto

### Error de Node.js/Bun no encontrado
**Error**: `[ERROR] Node.js no esta instalado` o `[ERROR] Ni Bun ni npm esta instalado`

**Solución**:
1. Instala Bun: https://bun.sh/
2. O instala Node.js: https://nodejs.org/

### LanceDB: Módulo nativo no encontrado
**Error**: `could not resolve "@lancedb/lancedb-win32-x64-msvc"`

**Solución**:
1. Ejecuta `start.bat` nuevamente para instalar dependencias
2. O instala manualmente:
   ```cmd
   bun add @lancedb/lancedb-win32-x64-msvc@0.10.0
   ```

### Prisma: Error de generación
**Error**: `Error: P3006`

**Solución**:
1. Verifica que `DATABASE_URL` está configurado en `.env`
2. Ejecuta: `bunx --yes prisma@6.19.2 db push`

## Logs

Los logs se guardan en el directorio `logs/`:
- `dev.log` - Logs del servidor de desarrollo Next.js
- `server.log` - Logs generales del servidor

### Ver Logs en Tiempo Real

**Windows:**
```batch
type logs\dev.log
```

o

```batch
type logs\server.log
```

**Linux/Mac:**
```bash
tail -f logs/dev.log
```

## Variables de Entorno

### Archivos de Configuración Automática
- `.env` - Configuración principal (creado automáticamente por `start.bat`)
- `.env.local` - Configuración local (creado automáticamente por `start.bat`)

El script de inicio crea estos archivos automáticamente si no existen. No necesitas configurar manualmente las variables de entorno para el desarrollo.

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

## Soporte

Si encuentras problemas:
1. Revisa los logs en el directorio `logs/`
2. Verifica que todos los requisitos están instalados
3. Asegúrate de usar el script de inicio apropiado para tu plataforma
4. Si el problema persiste, revisa la documentación del proyecto

## Comandos para Limpieza y Reinstalación

```bash
# Limpiar dependencias y cache
rm -rf node_modules .next bun.lockb package-lock.json

# Reinstalar
bun install
```

## Actualizaciones Recientes

### Versión Actual
- ✅ Migración completa de PostgreSQL a LanceDB
- ✅ Scripts compatibles con Windows (eliminado `tee`)
- ✅ Scripts alternativos para Windows con redirección de logs
- ✅ Mejor documentación de solución de problemas
- ✅ Compatibilidad total con Windows 10/11
- ✅ Creación automática de archivos `.env` y `.env.local` (ya no requiere `.env.example`)
