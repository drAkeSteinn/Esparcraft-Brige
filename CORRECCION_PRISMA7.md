# Corrección de Errores en start.bat - Prisma 7 vs Prisma 6

## Fecha: 2025-02-08

## Problemas Identificados

### Problema 1: Error de Etiqueta en Batch File
**Error:**
```
El sistema no encuentra la etiqueta por lotes especificada: install_with_npm
```

**Causa:**
El script `start.bat` usaba el comando `call :install_with_npm` para saltar a una etiqueta (label) en el archivo. Esto puede fallar en Windows debido a:
- Problemas de codificación del archivo
- Interferencia entre el contexto de ejecución y las etiquetas
- Problemas con el comando `call` en versiones específicas de Windows

**Código problemático:**
```batch
if "%PKG_MANAGER%"=="bun" (
    bun install
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la instalacion con bun
        echo [INFO] Intentando con npm...
        call :install_with_npm    // ❌ Puede fallar
    )
) else (
    call :install_with_npm        // ❌ Puede fallar
)
```

**Solución:**
Reemplazar el uso de etiquetas (labels) con código inline (directo en el bloque if):

```batch
if "%PKG_MANAGER%"=="bun" (
    bun install
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la instalacion con bun
        echo [INFO] Intentando con npm...
        npm install
        if %errorlevel% neq 0 (
            echo [ERROR] Fallo al instalar dependencias con npm
            pause
            exit /b 1
        )
        echo [OK] Dependencias instaladas con npm
    )
) else (
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al instalar dependencias con npm
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas con npm
)
```

### Problema 2: Prisma 7 Instalado Automáticamente por npx
**Error:**
```
Need to install the following packages:
prisma@7.3.0
Ok to proceed? (y) y

Prisma schema loaded from prisma\schema.prisma.
Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: The datasource property `url` is no longer supported in schema files.
Move connection URLs for Migrate to `prisma.config.ts` and pass either `adapter`
for a direct database connection or `accelerateUrl` for Accelerate to the
`PrismaClient` constructor.
```

**Causa:**
El comando `npx prisma generate` sin especificar versión busca e instala automáticamente la versión más reciente de Prisma (7.3.0), la cual tiene **cambios disruptivos** (breaking changes):

1. **Sintaxis del datasource cambió**: En Prisma 7, ya no se puede usar `url = env("DATABASE_URL")` en el schema. Ahora requiere:
   - Un archivo `prisma.config.ts` para las URLs de conexión
   - O pasar el `adapter` o `accelerateUrl` directamente al constructor de PrismaClient

2. **El proyecto usa Prisma 6.19.2**: El `package.json` tiene `prisma@6.19.2` instalado, pero `npx` ignora esto y busca la última versión disponible en el registro npm.

**Schema actual (Prisma 6):**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")    // ❌ No soportado en Prisma 7
}
```

**Lo que requeriría Prisma 7:**
```prisma
datasource db {
  provider = "sqlite"
  // Ya no se puede especificar url aquí en Prisma 7
}
```

Y un archivo `prisma.config.ts` adicional:
```typescript
export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL,
});
```

**Solución:**
Pinar (bloquear) la versión de Prisma a 6.19.2 en todos los comandos npx:

**En package.json:**
```json
"db:init:npm": "npx --yes prisma@6.19.2 generate && npx --yes prisma@6.19.2 db push",
"db:init-check:npm": "npx --yes prisma@6.19.2 generate",
```

**En start.bat:**
```batch
call npx --yes prisma@6.19.2 generate
call npx --yes prisma@6.19.2 db push
```

La bandera `--yes` evita que npx pregunte si desea confirmar la instalación.

## Cambios Realizados

### Archivo: package.json
**Líneas modificadas:** 20, 22

**Antes:**
```json
"db:init:npm": "npx prisma generate && npx prisma db push",
"db:init-check:npm": "npx prisma generate",
```

**Después:**
```json
"db:init:npm": "npx --yes prisma@6.19.2 generate && npx --yes prisma@6.19.2 db push",
"db:init-check:npm": "npx --yes prisma@6.19.2 generate",
```

### Archivo: start.bat
**Sección 1: Instalación de Dependencias (líneas 88-133)**

**Antes:**
```batch
echo.
echo [2/5] Verificando e instalando dependencias...

:: Verificar node_modules
if not exist node_modules (
    echo [INFO] node_modules no encontrado. Instalando dependencias...

    if "%PKG_MANAGER%"=="bun" (
        bun install
        if %errorlevel% neq 0 (
            echo [ERROR] Fallo la instalacion con bun
            echo [INFO] Intentando con npm...
            call :install_with_npm
        )
    ) else (
        call :install_with_npm
    )
) else (
    echo [OK] node_modules encontrado
    echo [INFO] Verificando LanceDB...

    :: Verificar LanceDB especificamente
    if not exist node_modules\lancedb (
        echo [INFO] LanceDB no encontrado, instalando...
        if "%PKG_MANAGER%"=="bun" (
            bun add lancedb
        ) else (
            npm install lancedb
        )
    ) else (
        echo [OK] LanceDB instalado
    )
)

goto :check_prisma

:install_with_npm
echo [INFO] Instalando dependencias con npm...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al instalar dependencias con npm
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas
goto :check_prisma
```

**Después:**
```batch
echo.
echo [2/5] Verificando e instalando dependencias...

:: Verificar node_modules
if not exist node_modules (
    echo [INFO] node_modules no encontrado. Instalando dependencias...

    if "%PKG_MANAGER%"=="bun" (
        bun install
        if %errorlevel% neq 0 (
            echo [ERROR] Fallo la instalacion con bun
            echo [INFO] Intentando con npm...
            npm install
            if %errorlevel% neq 0 (
                echo [ERROR] Fallo al instalar dependencias con npm
                pause
                exit /b 1
            )
            echo [OK] Dependencias instaladas con npm
        )
    ) else (
        npm install
        if %errorlevel% neq 0 (
            echo [ERROR] Fallo al instalar dependencias con npm
            pause
            exit /b 1
        )
        echo [OK] Dependencias instaladas con npm
    )
) else (
    echo [OK] node_modules encontrado
    echo [INFO] Verificando LanceDB...

    :: Verificar LanceDB especificamente
    if not exist node_modules\lancedb (
        echo [INFO] LanceDB no encontrado, instalando...
        if "%PKG_MANAGER%"=="bun" (
            bun add lancedb
        ) else (
            npm install lancedb
        )
        echo [OK] LanceDB instalado
    ) else (
        echo [OK] LanceDB instalado
    )
)
```

**Sección 2: Inicialización de Prisma (líneas 135-159)**

**Antes:**
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

**Después:**
```batch
:check_prisma
echo.
echo [3/5] Verificando cliente Prisma...

if not exist node_modules\.prisma (
    echo [INFO] Cliente Prisma no encontrado, generando...
    echo [INFO] Ejecutando prisma generate (version 6.19.2)...
    call npx --yes prisma@6.19.2 generate
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al generar cliente Prisma
        pause
        exit /b 1
    )
    echo [OK] Prisma Client generado
    echo [INFO] Aplicando schema a la base de datos...
    call npx --yes prisma@6.19.2 db push
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

## Por Qué Usar Prisma 6.19.2 En Lugar de Migrar a Prisma 7

### Ventajas de Mantener Prisma 6:
1. **Estabilidad**: El proyecto ya está configurado y probado con Prisma 6.19.2
2. **Compatibilidad**: Todos los scripts TypeScript (db/create-db.ts, etc.) usan la sintaxis de Prisma 6
3. **Menos cambios**: Migrar a Prisma 7 requeriría:
   - Crear archivo `prisma.config.ts`
   - Modificar todos los scripts de base de datos
   - Actualizar el schema
   - Actualizar el código que usa Prisma Client
4. **Menos riesgo**: Evitar errores potenciales en una migración compleja

### ¿Qué es npx --yes?
- `npx`: Ejecuta paquetes npm sin instalarlos globalmente
- `--yes`: Auto-confirma cualquier pregunta (como "Ok to proceed?")
- `prisma@6.19.2`: Especifica la versión exacta a usar, evitando que instale la última versión

## Verificación de Correcciones

### Paso 1: Ejecutar start.bat
```batch
start.bat
```

### Salida esperada:
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
[INFO] Ejecutando prisma generate (version 6.19.2)...
Prisma schema loaded from prisma\schema.prisma
✔ Generated Prisma Client to node_modules\.prisma\client in 123ms
[OK] Prisma Client generado
[INFO] Aplicando schema a la base de datos...
🚀  Your database is now in sync with your Prisma schema.
[OK] Schema aplicado correctamente

[4/5] Iniciando servidor de desarrollo...
```

### Paso 2: Verificar la base de datos
El archivo `db/dev.db` debería haberse creado correctamente.

### Paso 3: Verificar que no hay errores de versión
```batch
npx prisma@6.19.2 --version
```
Debería mostrar: `6.19.2`

## Resolución de Problemas

### Si sigue habiendo errores:

1. **Limpiar caché de npx:**
   ```batch
   npx clear-npx-cache
   ```

2. **Eliminar node_modules y reinstalar:**
   ```batch
   rmdir /s /q node_modules
   npm install
   ```

3. **Verificar que Prisma 6.19.2 está instalado:**
   ```batch
   npm list prisma
   ```
   Debería mostrar: `prisma@6.19.2`

4. **Eliminar la base de datos si está corrupta:**
   ```batch
   del db\dev.db
   ```

5. **Ejecutar start.bat nuevamente:**
   ```batch
   start.bat
   ```

### Si hay problemas con LanceDB:
- Verificar que el archivo `.env` tiene la línea:
  ```env
  LANCEDB_PATH=./data/embeddings
  ```
- Asegurarse que el directorio `data/embeddings` existe
- Verificar que `lancedb` está instalado en node_modules

## Notas Importantes

1. **Nunca mezclar versiones de Prisma**: Si usas Prisma 6.19.2 en un lugar, úsalo en todos los comandos
2. **Siempre especificar la versión en npx**: `npx prisma@6.19.2` en lugar de `npx prisma`
3. **Usar --yes en scripts automatizados**: Evita que el script se detenga pidiendo confirmación
4. **Evitar labels/goto en batch files**: Es más confiable usar código inline para lógica condicional
5. **Verificar DATABASE_URL**: Debe apuntar a `file:./db/dev.db` (no `prisma/dev.db`)

## Información Adicional

- **Documentación de Prisma 6**: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference
- **Changelog de Prisma 7**: https://www.prisma.io/docs/reference/changelog/prisma-7-changelog
- **Configuración de datasource en Prisma 7**: https://www.prisma.io/docs/concepts/components/prisma-schema/datasources
