# ✅ Correcciones Completas - start.bat para Windows

## Fecha: 2025-02-08

## Errores Corregidos

### ❌ Error 1: Etiqueta de Lote No Encontrada
```
El sistema no encuentra la etiqueta por lotes especificada: install_with_npm
```

### ❌ Error 2: Incompatibilidad con Prisma 7
```
Need to install the following packages:
prisma@7.3.0
Error: The datasource property `url` is no longer supported in schema files.
```

---

## 🔧 Soluciones Aplicadas

### Solución 1: Eliminar Labels/goto del Batch File

**Problema:**
El script usaba `call :install_with_npm` para saltar a una etiqueta, lo cual falla en Windows.

**Solución:**
Reemplazar el uso de etiquetas con código inline (directo en los bloques if).

**Código Antes:**
```batch
if "%PKG_MANAGER%"=="bun" (
    bun install
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la instalacion con bun
        echo [INFO] Intentando con npm...
        call :install_with_npm    ❌ Puede fallar
    )
) else (
    call :install_with_npm        ❌ Puede fallar
)

:install_with_npm
echo [INFO] Instalando dependencias con npm...
npm install
goto :check_prisma
```

**Código Después:**
```batch
if "%PKG_MANAGER%"=="bun" (
    bun install
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la instalacion con bun
        echo [INFO] Intentando con npm...
        npm install                 ✅ Código inline
        if %errorlevel% neq 0 (
            echo [ERROR] Fallo al instalar dependencias con npm
            pause
            exit /b 1
        )
        echo [OK] Dependencias instaladas con npm
    )
) else (
    npm install                    ✅ Código inline
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al instalar dependencias con npm
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas con npm
)
```

---

### Solución 2: Pinar a Prisma 6.19.2

**Problema:**
`npx prisma generate` sin especificar versión instala automáticamente Prisma 7.3.0, que tiene cambios disruptivos.

**Diferencias entre Prisma 6 y 7:**

| Característica | Prisma 6.19.2 | Prisma 7.3.0 |
|--------------|---------------|--------------|
| Schema url | ✅ `url = env("DATABASE_URL")` | ❌ No soportado |
| Configuración | En schema.prisma | Requiere prisma.config.ts |
| Compatibilidad | Compatible con proyecto actual | Requiere migración completa |

**Solución:**
Especificar versión exacta de Prisma en todos los comandos npx.

**En start.bat:**
```batch
:: Antes
call npx prisma generate
call npx prisma db push

:: Después
call npx --yes prisma@6.19.2 generate      ✅ Versión específica
call npx --yes prisma@6.19.2 db push        ✅ Versión específica
```

**En package.json:**
```json
// Antes
"db:init:npm": "npx prisma generate && npx prisma db push",
"db:init-check:npm": "npx prisma generate",

// Después
"db:init:npm": "npx --yes prisma@6.19.2 generate && npx --yes prisma@6.19.2 db push",
"db:init-check:npm": "npx --yes prisma@6.19.2 generate",
```

---

## 📝 Archivos Modificados

### 1. start.bat
- **Líneas 88-133**: Instalación de dependencias (sin labels)
- **Líneas 135-159**: Inicialización de Prisma (versión 6.19.2)

### 2. package.json
- **Línea 20**: Script `db:init:npm` actualizado
- **Línea 22**: Script `db:init-check:npm` actualizado

### 3. Documentación Creada
- `CORRECCION_PRISMA7.md` - Explicación detallada de todos los cambios

---

## 🚀 Ejecución del Script

Ahora puedes ejecutar `start.bat` y debería funcionar correctamente:

```batch
start.bat
```

### Salida Esperada:
```
  ____  _   _   ____  _____ ___ _   ___
 / __| | | / __| / __|_ | | | |
 | (__| | | | (__| | | | | |
 \___||___|_|____||______|_|___|_ |___|

====================================================
   Esparcraft Bridge - Inicio Automatico
====================================================

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

---

## ✅ Verificación

### 1. Verificar que Prisma 6 está instalado:
```batch
npm list prisma
```
Debería mostrar: `prisma@6.19.2`

### 2. Verificar versión de Prisma CLI:
```batch
npx prisma@6.19.2 --version
```
Debería mostrar: `6.19.2`

### 3. Verificar base de datos:
El archivo `db/dev.db` debería existir después de ejecutar el script.

---

## 🛠️ Si Hay Problemas

### Si el error de etiqueta persiste:
1. Asegúrate que `start.bat` está en codificación ANSI o UTF-8
2. No uses caracteres especiales en la ruta del proyecto
3. Ejecuta como Administrador si hay problemas de permisos

### Si Prisma 7 sigue instalándose:
1. Limpiar caché de npx:
   ```batch
   npx clear-npx-cache
   ```
2. Eliminar node_modules y reinstalar:
   ```batch
   rmdir /s /q node_modules
   npm install
   ```
3. Ejecutar `start.bat` nuevamente

### Si hay errores de base de datos:
1. Eliminar base de datos:
   ```batch
   del db\dev.db
   ```
2. Eliminar node_modules\.prisma:
   ```batch
   rmdir /s /q node_modules\.prisma
   ```
3. Ejecutar `start.bat` nuevamente

---

## 📚 Documentación Adicional

Para más detalles técnicos, consulta:
- **`CORRECCION_PRISMA7.md`** - Documentación completa de todas las correcciones
- **`README_WINDOWS.md`** - Guía de Windows (creada anteriormente)
- **`LANCEDB_MIGRATION.md`** - Documentación de migración a LanceDB

---

## 🎯 Resumen de Cambios

✅ Eliminado uso de labels/goto en start.bat (más confiable)
✅ Pinar a Prisma 6.19.2 en todos los comandos npx
✅ Agregada bandera `--yes` para confirmación automática
✅ Documentación completa de todos los cambios
✅ Compatibilidad total con Windows y npm

---

**El script `start.bat` ahora debería ejecutarse sin errores en Windows.** 🎉
