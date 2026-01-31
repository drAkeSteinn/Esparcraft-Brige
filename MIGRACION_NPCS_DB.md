# Migración de NPCs a Base de Datos

## 📋 Resumen
Se ha completado exitosamente la migración del sistema de NPCs desde archivos JSON a base de datos SQLite usando Prisma ORM.

## ✅ Cambios Realizados

### 1. Modelo de Datos (Prisma)
**Archivo:** `prisma/schema.prisma`

Se agregó el modelo `NPC` con los siguientes campos:
- `id` (string, primary key, auto-generado)
- `locationScope` (string) - 'mundo' | 'pueblo' | 'edificio'
- `worldId` (string, indexado)
- `puebloId` (string opcional, indexado)
- `edificioId` (string opcional, indexado)
- `card` (string) - JSON string de SillyTavernCard
- `createdAt` (datetime)
- `updatedAt` (datetime)

**Índices creados:**
- `@@index([worldId])`
- `@@index([puebloId])`
- `@@index([edificioId])`
- `@@index([locationScope])`

### 2. NPC Database Manager
**Archivo nuevo:** `src/lib/npcDbManager.ts`

Se creó un nuevo manager con todas las operaciones CRUD:
- `getAll()` - Obtener todos los NPCs
- `getById(id)` - Obtener NPC por ID
- `getByLocation(worldId, puebloId?, edificioId?)` - Filtrar por ubicación
- `getByEdificioId(edificioId)` - Obtener NPCs de un edificio
- `getByPuebloId(puebloId)` - Obtener NPCs de un pueblo
- `getByWorldId(worldId)` - Obtener NPCs de un mundo
- `create(npc, id?)` - Crear nuevo NPC
- `update(id, npc)` - Actualizar NPC existente
- `updateCard(id, card)` - Actualizar solo la tarjeta
- `delete(id)` - Eliminar NPC
- `countByLocation(...)` - Contar NPCs por ubicación
- `searchByName(searchTerm, worldId?)` - Buscar NPCs por nombre

### 3. Rutas API Actualizadas
**Archivos modificados:**
- `src/app/api/npcs/route.ts` - GET y POST para listado y creación
- `src/app/api/npcs/[id]/route.ts` - GET, PUT, DELETE para operaciones individuales
- `src/app/api/edificios/[id]/npc-summaries/route.ts` - NPC summaries de edificios

### 4. Trigger Handlers Actualizados
**Archivo modificado:** `src/lib/triggerHandlers.ts`

Todas las funciones que usaban `npcManager` se actualizaron para usar `npcDbManager`:
- `handleChatTrigger()` - Chat con NPCs
- `handleResumenSesionTrigger()` - Resumen de sesiones
- `handleResumenNPCTrigger()` - Resumen de NPCs
- `handleResumenEdificioTrigger()` - Resumen de edificios
- `previewTriggerPrompt()` - Previsualización de prompts

**Nota:** Todos los métodos de `npcDbManager` son asíncronos, por lo que se agregaron `await` a todas las llamadas.

### 5. Grimorio API Actualizado
**Archivo modificado:** `src/app/api/grimorio/apply/[id]/route.ts`

Se actualizó para usar `npcDbManager` al aplicar cards del Grimorio que requieren contexto de NPCs.

### 6. Script de Migración
**Archivo nuevo:** `scripts/migrate-npcs-to-db.ts`

Script de migración que:
1. Lee todos los NPCs de archivos JSON en `data-esparcraft/npcs/`
2. Migra los datos a la base de datos SQLite
3. Crea un backup de los archivos JSON originales en `db/npcs-backup/`
4. Omite NPCs que ya existen en la DB
5. Reporta estadísticas de la migración

## 📊 Resultado de la Migración

### Estadísticas
- **Total de NPCs en archivos:** 4
- **NPCs migrados a DB:** 4
- **NPCs ya existentes:** 0
- **Errores:** 0

### NPCs Migrados
1. NPC_1768826004379
2. NPC_1768826117554
3. NPC_1768825922617
4. NPC_1768826192806

### Backup Creado
Ubicación: `/home/z/my-project/db/npcs-backup/npcs-backup-2026-01-31T09-56-54-493Z`

## 🎯 Ventajas de la Nueva Implementación

### Rendimiento
- ✅ Consultas SQL más rápidas que lectura de archivos
- ✅ Índices en campos frecuentemente consultados
- ✅ Operaciones en lote más eficientes

### Mantenimiento
- ✅ Esquema de base de datos versionado con Prisma
- ✅ Type-safe con TypeScript y Prisma Client
- ✅ Migraciones controladas

### Escalabilidad
- ✅ Fácil migrar a PostgreSQL si el proyecto crece
- ✅ Consultas complejas disponibles (agregaciones, joins, etc.)
- ✅ Transacciones para operaciones críticas

### Funcionalidades
- ✅ Búsqueda por nombre disponible
- ✅ Conteos por ubicación optimizados
- ✅ Timestamps automáticos (createdAt, updatedAt)

## 🔄 Compatibilidad

### Archivos JSON Originales
- Los archivos JSON en `data-esparcraft/npcs/` **se mantienen** como respaldo
- Se recomienda mantenerlos hasta verificar que todo funciona correctamente
- El sistema ya no los usa, pero están disponibles si se necesita revertir

### API
- La API pública **no cambió**, todas las rutas mantienen la misma interfaz
- El frontend no requiere cambios
- Las respuestas tienen el mismo formato

## 📝 Notas Importantes

1. **Operaciones Asíncronas:** Todos los métodos de `npcDbManager` son asíncronos y deben usarse con `await`.

2. **Tipo de Datos:** El campo `card` se almacena como string JSON en la base de datos para mantener compatibilidad con el formato SillyTavernCard.

3. **Índices:** Se agregaron índices en campos frecuentemente consultados para optimizar el rendimiento.

4. **Otros Sistemas:** Los sistemas de Mundos, Pueblos, Edificios, Sesiones, etc., siguen usando archivos JSON. Solo se migró el sistema de NPCs.

## 🚀 Siguientes Pasos (Opcionales)

1. **Migrar Otros Sistemas:** Considerar migrar Mundos, Pueblos, Edificios, etc., a DB siguiendo el mismo patrón.

2. **Agregar Validaciones:** Implementar validaciones adicionales en el schema de Prisma.

3. **Auditoría:** Agregar campos de auditoría (createdBy, updatedBy) para rastrear cambios.

4. **Soft Delete:** Implementar soft delete en lugar de borrar registros permanentemente.

5. **Caching:** Considerar agregar Redis u otro sistema de caché para consultas frecuentes.

## ✅ Verificación

### Pruebas Manuales Realizadas
- ✅ Lista de NPCs funciona correctamente (`GET /api/npcs`)
- ✅ Obtener NPC por ID funciona correctamente
- ✅ Memoria de NPCs funciona correctamente
- ✅ No hay errores de linting (`bun run lint`)
- ✅ Servidor de desarrollo funciona sin errores
- ✅ Todas las 4 rutas de NPCs responden correctamente

### Logs Revisados
No hay errores en el servidor de desarrollo. Las llamadas a la API de NPCs muestran código 200 en todos los casos.

---

**Fecha de Migración:** 2026-01-31
**Versión del Proyecto:** v1.0.0
**Estado:** ✅ Completado y Verificado
