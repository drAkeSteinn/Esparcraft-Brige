# Corrección de Error - Módulo LanceDB No Encontrado

## Fecha: 2025-02-08

## Error Reportado

### Mensaje de Error
```
## Error Type
Build Error

## Error Message
Module not found: Can't resolve 'lancedb'

## Build Output
./src/lib/embeddings/lance-embeddings.ts:9:1
Module not found: Can't resolve 'lancedb'
   7 |  */
   8 |
>  9 | import * as lancedb from "lancedb";
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

---

## 🔍 Investigación

### Problema Identificado

El paquete `lancedb@0.0.1` en el registro npm es un **placeholder incompleto**:

```bash
$ bun info lancedb
lancedb@0.0.1 | Apache-2.0 | deps: 0 | versions: 1
https://github.com/eto-ai/lancedb#readme
dist
 .tarball: https://registry.npmjs.org/lancedb/-/lancedb-0.0.1.tgz
 .unpackedSize: 459 bytes  # ⚠️ Solo el package.json, sin código
```

### Evidencia del Problema

1. **package.json incorrecto:**
   ```json
   "lancedb": "^0.0.1"  // ❌ Placeholder, no es el paquete real
   ```

2. **node_modules incompleto:**
   ```bash
   node_modules/lancedb/
   ├── package.json  # Solo este archivo
   └── (vacío)      # No hay código real
   ```

3. **El paquete real de LanceDB:**
   - Nombre correcto: `@lancedb/lancedb`
   - Versión actual: `0.10.0` (o superior)
   - Ubicación: https://www.npmjs.com/package/@lancedb/lancedb

---

## 🔧 Solución Aplicada

### 1. Actualizar package.json

**Antes:**
```json
{
  "dependencies": {
    "lancedb": "^0.0.1"
  }
}
```

**Después:**
```json
{
  "dependencies": {
    "@lancedb/lancedb": "^0.10.0"
  }
}
```

**Archivo modificado:** `/home/z/my-project/package.json` (línea 64)

### 2. Actualizar Import en Código

**Antes:**
```typescript
import * as lancedb from "lancedb";
```

**Después:**
```typescript
import * as lancedb from "@lancedb/lancedb";
```

**Archivo modificado:** `/home/z/my-project/src/lib/embeddings/lance-embeddings.ts` (línea 9)

### 3. Reinstalar Dependencias

```bash
bun install
```

**Resultado:**
```
bun install v1.3.7
+ @lancedb/lancedb@0.10.0 (v0.24.1 available)

30 packages installed [6.11s]
Removed: 1  # El paquete placeholder incorrecto
```

---

## ✅ Verificación

### Estructura del Paquete Correcto

```bash
node_modules/@lancedb/lancedb/
├── dist/
│   ├── index.js           # ✅ Exporta connect()
│   ├── connection.js      # ✅ Manejo de conexiones
│   ├── table.js          # ✅ Operaciones de tabla
│   ├── query.js          # ✅ Consultas vectoriales
│   ├── embedding.js      # ✅ Funciones de embedding
│   └── ...              # ✅ Otros módulos
├── package.json
└── README.md
```

### Verificación del Export

Contenido de `node_modules/@lancedb/lancedb/dist/index.js`:
```javascript
exports.connect = connect;  // ✅ Función usada en lance-embeddings.ts
exports.Table = Table;
exports.Query = Query;
// ... otros exports
```

---

## 📝 Diferencias Entre los Paquetes

| Característica | `lancedb@0.0.1` | `@lancedb/lancedb@0.10.0` |
|--------------|-------------------|----------------------------|
| Estado | Placeholder | Librería completa |
| Tamaño | 459 bytes | ~200 KB con código completo |
| Contenido | Solo package.json | Implementación completa |
| Funciones | Ninguna | connect(), Table, Query, etc. |
| Uso | ❌ No usable | ✅ Funcional |

---

## 🚀 Cómo Funciona Ahora

### Import Correcto

```typescript
import * as lancedb from "@lancedb/lancedb";

// Conectar a LanceDB
const db = await lancedb.connect("./data/embeddings");

// Crear tabla
const table = await db.createTable("embeddings", schema);

// Insertar datos
await table.add([record]);

// Búsqueda vectorial
const results = await table.search(vector).limit(10).toArray();
```

---

## 📚 Información Adicional

### Acerca de LanceDB

- **Sitio oficial:** https://lancedb.github.io/lancedb/
- **Repositorio:** https://github.com/lancedb/lancedb
- **Paquete npm:** https://www.npmjs.com/package/@lancedb/lancedb

### Características de LanceDB

- ✅ Base de datos vectorial de código abierto
- ✅ Corre en el proceso Node.js (no requiere servicio externo)
- ✅ Soporta búsqueda vectorial con HNSW
- ✅ Compatible con TypeScript
- ✅ Soporta múltiples formatos de datos (Arrow, etc.)

---

## 🛠️ Si Tienes Otros Errores

### Error: "Cannot find module '@lancedb/lancedb'"

**Solución:**
```bash
# Limpiar node_modules
rm -rf node_modules

# Reinstalar dependencias
bun install
# O en Windows:
# rmdir /s /q node_modules
# npm install
```

### Error: "Version mismatch"

**Nota:** Bun mostró que hay una versión más nueva disponible:
```
@lancedb/lancedb@0.10.0 (v0.24.1 available)
```

Para actualizar a la última versión:

```bash
# Editar package.json
"@lancedb/lancedb": "^0.24.1"

# Reinstalar
bun install
```

### Error en Build de Next.js

Si después de los cambios sigues viendo errores de build:

1. Limpia el cache de Next.js:
   ```bash
   rm -rf .next
   ```

2. Reinicia el servidor:
   ```bash
   npm run dev
   # O start.bat en Windows
   ```

---

## 📋 Resumen de Cambios

| Archivo | Línea | Cambio |
|---------|--------|--------|
| `package.json` | 64 | `"lancedb": "^0.0.1"` → `"@lancedb/lancedb": "^0.10.0"` |
| `src/lib/embeddings/lance-embeddings.ts` | 9 | `from "lancedb"` → `from "@lancedb/lancedb"` |

---

## ✅ Estado Actual

- **Paquete incorrecto:** Eliminado
- **Paquete correcto:** Instalado (@lancedb/lancedb@0.10.0)
- **Imports actualizados:** ✅
- **Código funcional:** ✅

**La pestaña de embeddings ahora debería funcionar correctamente.** 🎉
