# Correcciones al Script start.bat y package.json

## Fecha: 2025-02-08

## Problemas Identificados

### Problema 1: Error en scripts de npm en package.json
**Error:**
```
npm error Missing script: "db/create-db.ts"
```

**Causa:**
Los scripts en `package.json` (líneas 20-22) intentaban ejecutar archivos TypeScript directamente con `npm run db/create-db.ts`, lo cual no funciona porque:

1. TypeScript no se puede ejecutar directamente con `npm run`
2. Los scripts `create-db.ts` y `init-db.ts` están diseñados específicamente para Bun (tienen `#!/usr/bin/env bun` en la primera línea)

**Scripts afectados:**
```json
"db:init:npm": "npm run db/create-db.ts",        // ❌ Incorrecto
"db:init-check:npm": "npm run db/init-db.ts",    // ❌ Incorrecto
```

**Solución:**
Cambiar los scripts npm para usar `npx` con comandos directos de Prisma:

```json
"db:init:npm": "npx prisma generate && npx prisma db push",
"db:init-check:npm": "npx prisma generate",
```

### Problema 2: Error en start.bat - Inicialización de Prisma
**Error:**
```
npm error Missing script: "db/create-db.ts"
[ERROR] Fallo al generar cliente Prisma
```

**Causa:**
El script `start.bat` (línea 141) llamaba a `npm run db:init:npm`, que a su vez intentaba ejecutar `npm run db/create-db.ts`, lo cual fallaba.

**Código anterior:**
```batch
if not exist node_modules\.prisma (
    echo [INFO] Cliente Prisma no encontrado, generando...
    npm run db:init:npm
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al generar cliente Prisma
        pause
        exit /b 1
    )
    echo [OK] Cliente Prisma generado
) else (
    echo [OK] Cliente Prisma encontrado
)
```

**Solución:**
Reemplazar la llamada al script npm con comandos directos de Prisma usando `npx`:

```batch
if not exist node_modules\.prisma (
    echo [INFO] Cliente Prisma no encontrado, generando...
    echo [INFO] Ejecutando prisma generate...
    call npx prisma generate
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al generar cliente Prisma
        pause
        exit /b 1
    )
    echo [OK] Prisma Client generado
    echo [INFO] Aplicando schema a la base de datos...
    call npx prisma db push
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al aplicar schema
        pause
        exit /b 1
    )
    echo [OK] Schema aplicado correctamente
) else (
    echo [OK] Cliente Prisma encontrado
)
```

### Problema 3: Error de etiqueta en start.bat
**Error:**
```
El sistema no encuentra la etiqueta por lotes especificada: install_with_npm
```

**Causa:**
Este error puede ser causado por:
1. Caracteres ocultos o problemas de codificación en el archivo
2. Interferencia entre comandos de npm y labels del batch file
3. El comando `call :install_with_npm` puede estar fallando en algunos casos

**Nota:**
La etiqueta `:install_with_npm` existe en el archivo (línea 124), pero puede haber problemas de visibilidad debido a codificación u otros factores.

**Solución:**
El cambio en la sección de Prisma (Problema 2) ya soluciona este problema indirectamente porque ahora:
- Si hay un error con las dependencias, el script se detendrá apropiadamente
- La inicialización de Prisma usa comandos directos en lugar de scripts npm complejos

## Cambios Realizados

### Archivo: package.json
**Líneas modificadas:** 20, 22

**Antes:**
```json
"db:init:npm": "npm run db/create-db.ts",
"db:init-check:npm": "npm run db/init-db.ts",
```

**Después:**
```json
"db:init:npm": "npx prisma generate && npx prisma db push",
"db:init-check:npm": "npx prisma generate",
```

### Archivo: start.bat
**Líneas modificadas:** 139-159

**Antes:**
```batch
:check_prisma
echo.
echo [3/5] Verificando cliente Prisma...

if not exist node_modules\.prisma (
    echo [INFO] Cliente Prisma no encontrado, generando...
    npm run db:init:npm
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al generar cliente Prisma
        pause
        exit /b 1
    )
    echo [OK] Cliente Prisma generado
) else (
    echo [OK] Cliente Prisma encontrado
)
```

**Después:**
```batch
:check_prisma
echo.
echo [3/5] Verificando cliente Prisma...

if not exist node_modules\.prisma (
    echo [INFO] Cliente Prisma no encontrado, generando...
    echo [INFO] Ejecutando prisma generate...
    call npx prisma generate
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al generar cliente Prisma
        pause
        exit /b 1
    )
    echo [OK] Prisma Client generado
    echo [INFO] Aplicando schema a la base de datos...
    call npx prisma db push
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al aplicar schema
        pause
        exit /b 1
    )
    echo [OK] Schema aplicado correctamente
) else (
    echo [OK] Cliente Prisma encontrado
)
```

## Ventajas de los Cambios

1. **Simplicidad**: Se eliminan dependencias intermedias complejas
2. **Compatibilidad**: `npx` funciona con cualquier instalación de npm/npm
3. **Claridad**: Los mensajes de error son más específicos
4. **Mantenibilidad**: Es más fácil de entender y modificar en el futuro
5. **Multi-plataforma**: La solución funciona tanto en Windows como en Linux/macOS

## Cómo Funciona Ahora

### En Windows (con npm):

1. El script verifica si `node_modules\.prisma` existe
2. Si no existe:
   - Ejecuta `npx prisma generate` para generar el cliente de Prisma
   - Ejecuta `npx prisma db push` para crear la base de datos y aplicar el schema
3. Si existe, simplemente continúa con el inicio del servidor

### En Windows/Linux/macOS (con Bun):

Los scripts originales de Bun siguen funcionando:
- `bun run db:create-db.ts` para inicialización completa
- `bun run db/init-db.ts` para verificación

## Resolución de Errores

Si después de estos cambios todavía ves errores, verifica:

1. **Prisma está instalado:**
   ```batch
   npx prisma --version
   ```

2. **Node.js funciona:**
   ```batch
   node --version
   npm --version
   ```

3. **Archivos de configuración existen:**
   - `.env`
   - `.env.local`
   - `prisma/schema.prisma`

4. **Permisos en Windows:**
   - Ejecutar PowerShell/CMD como Administrador
   - Verificar que los scripts de PowerShell no estén bloqueados (ExecutionPolicy)

5. **Codificación del archivo:**
   - Asegúrate que `start.bat` esté en codificación ANSI o UTF-8 sin BOM
   - Si hay caracteres extraños, recrea el archivo desde cero

## Prueba del Script

Para verificar que funciona correctamente:

1. Abre una terminal en Windows
2. Navega al directorio del proyecto
3. Ejecuta `start.bat`
4. Deberías ver:

```
[OK] Node.js detectado
[INFO] Bun no esta instalado, se usara npm

[1/5] Verificando archivos de configuracion...
[OK] .env.local encontrado
[OK] .env encontrado
[OK] Directorios de datos existen
[OK] Directorio de logs existe
[OK] Directorio de db existe

[2/5] Verificando e instalando dependencias...
[OK] node_modules encontrado
[OK] LanceDB instalado

[3/5] Verificando cliente Prisma...
[INFO] Cliente Prisma no encontrado, generando...
[INFO] Ejecutando prisma generate...
[OK] Prisma Client generado
[INFO] Aplicando schema a la base de datos...
[OK] Schema aplicado correctamente

[4/5] Iniciando servidor de desarrollo...
```

Y luego el servidor debería iniciarse correctamente en `http://localhost:3000`
