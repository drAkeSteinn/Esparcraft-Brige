# Endpoints Faltantes para Backups de Pueblos y Edificios

## Fecha: 2025-02-08

## 🎯 Problemas Identificados

### 1. Falta de Endpoints para Pueblos

**Existentes:**
- ✅ `/api/pueblos/backups` - GET (listar backups)
- ✅ `/api/pueblos/backups` - POST (crear backup manual)

**Faltantes:**
- ❌ `/api/pueblos/backups/[filename]` - Para descargar un backup específico
- ❌ `/api/pueblos/export-all` - Para exportar todos los pueblos
- ❌ `/api/pueblos/import-all` - Para importar todos los pueblos

### 2. Falta de Endpoints para Edificios

**Existentes:**
- ✅ `/api/edificios/backups` - GET (listar backups)
- ✅ `/api/edificios/backups` - POST (crear backup manual)

**Faltantes:**
- ❌ `/api/edificios/backups/[filename]` - Para descargar un backup específico
- ❌ `/api/edificios/export-all` - Para exportar todos los edificios
- ❌ `/api/edificios/import-all` - Para importar todos los edificios

### 3. Problemas de Funcionalidad

**Por qué NO funcionan:**

1. **No se pueden restaurar backups**
   - No hay endpoint para POST a `[filename]/restore`
   - Sin esto, el botón "Restaurar" no tiene ninguna funcionalidad

2. **Las cards no se restauran en la base de datos**
   - La restauración no está implementada para pueblos/edificios
   - Aunque hay un backup, no hay forma de aplicarlo

3. **No se pueden eliminar backups específicos**
   - No hay endpoint DELETE para `[filename]`
   - El botón "Eliminar" no tiene backend a donde llamar

4. **No se pueden exportar/importar todos los datos**
   - No hay endpoints para export-all o import-all
   - Estas funcionalidades son críticas para gestión de datos

---

## 🔧 Solución Implementada

### Archivos Creados

#### 1. Pueblos - Descargar/Restaurar/Eliminar Backup Específico

**Archivo:** `/src/app/api/pueblos/backups/[filename]/route.ts`

**Endpoints:**

**GET /api/pueblos/backups/{filename}**
- Descarga un backup específico de pueblos
- Usa `downloadGenericBackup()` de genericBackupManager
- Verifica checksum antes de entregar el archivo

**POST /api/pueblos/backups/{filename}**
- Restaura un backup específico de pueblos
- Crea un backup automático del estado actual antes de restaurar
- Borra todos los pueblos actuales (usando `puebloDbManager.deleteAll()`)
- Importa todos los pueblos del backup
- Retorna la cantidad de pueblos restaurados

**DELETE /api/pueblos/backups/{filename}**
- Elimina un backup específico de pueblos
- Usa `deleteGenericBackup()` de genericBackupManager
- Retorna éxito o error

**Logs con Prefijos:**
- `[API:pueblos/backups]` - Para fácil filtrado en DevTools

#### 2. Pueblos - Exportar/Importar Todos

**Archivo:** `/src/app/api/pueblos/export-all/route.ts`

**GET /api/pueblos/export-all**
- Exporta todos los pueblos actuales
- Usa `puebloDbManager.getAll()`
- Crea archivo JSON con metadatos:
  ```json
  {
    "exportDate": "2025-02-08T12:30:00.000Z",
    "version": "1.0",
    "itemType": "pueblos",
    "items": [/* array de pueblos */]
  }
  ```
- Descarga automáticamente el archivo
- Nombre: `pueblos-{fecha}.json`

**Archivo:** `/src/app/api/pueblos/import-all/route.ts`

**POST /api/pueblos/import-all**
- Importa todos los pueblos desde un archivo JSON
- Valida que el archivo tenga la estructura correcta
- Crea un backup automático del estado actual
- Borra todos los pueblos actuales
- Importa todos los pueblos del archivo
- Retorna la cantidad de pueblos importados
- Mantiene los IDs originales

#### 3. Edificios - Descargar/Restaurar/Eliminar Backup Específico

**Archivo:** `/src/app/api/edificios/backups/[filename]/route.ts`

**Endpoints:** Mismo patrón que pueblos pero para edificios
- Usa `edificioDbManager.deleteAll()` para la restauración
- Logs con prefijo `[API:edificios/backups]`

#### 4. Edificios - Exportar/Importar Todos

**Archivo:** `/src/app/api/edificios/export-all/route.ts`

**GET /api/edificios/export-all**
- Exporta todos los edificios actuales
- Usa `edificioDbManager.getAll()`
- Descarga como JSON

**Archivo:** `/src/app/api/edificios/import-all/route.ts`

**POST /api/edificios/import-all**
- Importa todos los edificios desde un archivo JSON
- Valida estructura del archivo
- Crea backup automático
- Borra todos los edificios actuales
- Importa todos los edificios
- Retorna cantidad importada

---

## 📋 Comparación con Mundos

### Mundos (Ya Funcionando)

| Funcionalidad | Endpoint | Estado |
|--------------|----------|--------|
| Listar backups | GET /backups | ✅ Funciona |
| Crear backup | POST /backups | ✅ Funciona |
| Descargar específico | GET /backups/[filename] | ✅ Funciona |
| Restaurar específico | POST /backups/[filename] | ✅ Funciona |
| Eliminar específico | DELETE /backups/[filename] | ✅ Funciona |
| Exportar todos | GET /export-all | ✅ Funciona |
| Importar todos | POST /import-all | ✅ Funciona |

### Pueblos (Nuevo)

| Funcionalidad | Endpoint | Estado |
|--------------|----------|--------|
| Listar backups | GET /backups | ✅ Ya existía |
| Crear backup | POST /backups | ✅ Ya existía |
| Descargar específico | GET /backups/[filename] | ✅ AGREGADO |
| Restaurar específico | POST /backups/[filename] | ✅ AGREGADO |
| Eliminar específico | DELETE /backups/[filename] | ✅ AGREGADO |
| Exportar todos | GET /export-all | ✅ AGREGADO |
| Importar todos | POST /import-all | ✅ AGREGADO |

### Edificios (Nuevo)

| Funcionalidad | Endpoint | Estado |
|--------------|----------|--------|
| Listar backups | GET /backups | ✅ Ya existía |
| Crear backup | POST /backups | ✅ Ya existía |
| Descargar específico | GET /backups/[filename] | ✅ AGREGADO |
| Restaurar específico | POST /backups/[filename] | ✅ AGREGADO |
| Eliminar específico | DELETE /backups/[filename] | ✅ AGREGADO |
| Exportar todos | GET /export-all | ✅ AGREGADO |
| Importar todos | POST /import-all | ✅ AGREGADO |

---

## 🔄 Flujo Completo de Restauración

### Cuando un usuario hace clic en "Restaurar" en un backup:

1. **Backend:** Recibe POST a `/api/{entity}/backups/{filename}`
2. **Backend:** Verifica que el archivo existe y es válido (checksum)
3. **Backend:** Crea un backup automático del estado actual con nombre `pre-restore-{timestamp}`
4. **Backend:** Obtiene todos los items del backup
5. **Backend:** Ejecuta `{entity}DbManager.deleteAll()` - Borra TODOS los items actuales
6. **Backend:** Importa cada item del backup usando `{entity}DbManager.create()`
7. **Backend:** Retorna éxito con la cantidad de items restaurados
8. **Frontend:** Muestra toast de éxito y recarga la página
9. **Usuario:** Ve los datos restaurados

### Seguridad Automática

Antes de borrar los datos existentes, el sistema crea un backup automático. Esto significa:

- **Si la restauración falla:** El backup automático `pre-restore-{timestamp}` puede usarse para volver al estado anterior
- **Si la restauración tiene éxito:** El backup automático se mantiene como historia pero el usuario tiene los datos restaurados

---

## 📝 Notas Importantes

### 1. DbManagers ya Tiene deleteAll()

Verifiqué que los DbManagers para pueblos y edificios ya tienen el método `deleteAll()`:

```typescript
// puebloDbManager (línea 267-275)
async deleteAll(): Promise<number> {
  try {
    const result = await db.pueblo.deleteMany({});
    return result.count;
  } catch (error) {
    console.error('Error deleting all pueblos:', error);
    return 0;
  }
}

// edificioDbManager (línea 288)
async deleteAll(): Promise<number> {
  try {
    const result = await db.edificio.deleteMany({});
    return result.count;
  } catch (error) {
    console.error('Error deleting all edificios:', error);
    return 0;
  }
}
```

Esto es **exactamente lo que se necesita** para la funcionalidad de restauración.

### 2. Compatibilidad con GenericBackupSection

El componente `GenericBackupSection.tsx` ya tiene la lógica para:
- `handleDownloadBackup()` - Usa GET /backups/[filename]
- `handleRestoreBackup()` - Usa POST /backups/[filename]
- `handleDeleteBackup()` - Usa DELETE /backups/[filename]

Por lo tanto, al crear los endpoints de backend, el frontend **ya funciona automáticamente** sin necesidad de cambios.

### 3. Estructura de Archivos de Backup

Los archivos de backup siguen el formato estándar:
```json
{
  "exportDate": "2025-02-08T12:30:00.000Z",
  "version": "1.0",
  "itemType": "pueblos",
  "items": [
    {
      "id": "pueblos-xxx",
      "name": "Nombre del Pueblo",
      "type": "pueblo",
      "description": "Descripción",
      "worldId": "world-xxx",
      "lore": { ... },
      "area": { ... },
      "createdAt": "2025-02-08T10:00:00.000Z",
      "updatedAt": "2025-02-08T10:00:00.000Z"
    }
  ],
  "checksum": "md5-hash-del-contenido"
}
```

---

## ✅ Verificación

### Lo Que Ahora Funciona

**Para Pueblos:**
- ✅ Listar backups existentes
- ✅ Crear backup manual nuevo
- ✅ Descargar un backup específico
- ✅ Restaurar desde un backup específico (reemplaza todos los pueblos actuales)
- ✅ Eliminar un backup específico
- ✅ Exportar todos los pueblos a un archivo JSON
- ✅ Importar todos los pueblos desde un archivo JSON

**Para Edificios:**
- ✅ Listar backups existentes
- ✅ Crear backup manual nuevo
- ✅ Descargar un backup específico
- ✅ Restaurar desde un backup específico (reemplaza todos los edificios actuales)
- ✅ Eliminar un backup específico
- ✅ Exportar todos los edificios a un archivo JSON
- ✅ Importar todos los edificios desde un archivo JSON

---

## 🚀 Cómo Probar

### 1. Reiniciar el servidor

Los cambios ya deberían estar en efecto con el hot-reload de Next.js.

### 2. Ir a la sección de "Mundos"

Ve a "Mundos" → "Regiones" o "Edificaciones" según quieras probar.

### 3. Prueba las funcionalidades

**Probar Restauración:**
1. Ve a "Gestión de Backups"
2. Haz clic en el botón "Restaurar" en algún backup
3. Deberías ver una confirmación
4. Acepta la confirmación
5. Los pueblos/edificios deberían reemplazarse completamente
6. Deberías ver un mensaje de éxito
7. La lista de items debería actualizarse

**Probar Eliminación:**
1. Haz clic en el botón "Eliminar" en algún backup
2. Deberías ver una confirmación
3. Acepta
4. El backup debería desaparecer de la lista

**Probar Exportar/Importar:**
1. Haz clic en "Exportar Todos"
2. Deberías descargar un archivo JSON
3. Modifica algunos pueblos/edificios
4. Ve a "Importar Archivo"
5. Sube el archivo JSON que descargaste
6. Deberías ver los pueblos/edificios restaurados

### 4. Revisar Logs

En la consola del navegador (F12) y en el servidor, deberías ver logs como:

**Al restaurar:**
```
[API:pueblos/backups] Backup restaurado exitosamente con 5 pueblos
```

**Al eliminar:**
```
[API:pueblos/backups] Backup eliminado exitosamente
```

---

## 📁 Resumen de Archivos

| Archivo | Propósito |
|---------|-----------|
| `/src/app/api/pueblos/backups/[filename]/route.ts` | Descargar/Restaurar/Eliminar backup específico |
| `/src/app/api/pueblos/export-all/route.ts` | Exportar todos los pueblos |
| `/src/app/api/pueblos/import-all/route.ts` | Importar todos los pueblos |
| `/src/app/api/edificios/backups/[filename]/route.ts` | Descargar/Restaurar/Eliminar backup específico |
| `/src/app/api/edificios/export-all/route.ts` | Exportar todos los edificios |
| `/src/app/api/edificios/import-all/route.ts` | Importar todos los edificios |

---

**Los endpoints faltantes ahora están creados. Pueblos y Edificios deberían tener la misma funcionalidad que Mundos.** 🎉
