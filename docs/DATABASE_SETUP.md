# Configuración de Base de Datos - NPCs

## 🚀 Inicialización Automática

La base de datos se inicializa automáticamente cuando ejecutas:

```bash
bun run dev
```

Este comando:
1. ✅ Genera Prisma Client automáticamente
2. ✅ Sincroniza la base de datos con el esquema
3. ✅ Crea la DB si no existe
4. ✅ Inicia el servidor de desarrollo

## 🔧 Comandos Disponibles

```bash
# Inicializar base de datos (crear y sincronizar)
bun run db:init

# Generar Prisma Client
bun run db:generate

# Sincronizar esquema con la DB
bun run db:push

# Crear una migración
bun run db:migrate

# Resetear la base de datos (cuidado: borra todos los datos)
bun run db:reset
```

## 📁 Ubicación de la Base de Datos

- **Tipo:** SQLite
- **Archivo:** `/home/z/my-project/db/custom.db`
- **Esquema:** `/home/z/my-project/prisma/schema.prisma`

## 🔄 Migración de NPCs de JSON a DB

Ya se migraron los NPCs al sistema de base de datos. Los archivos JSON originales se conservaron como respaldo en:

```
db/npcs-backup/
```

Para re-migrar NPCs de archivos JSON a DB (si agregas nuevos NPCs manualmente):

```bash
bun scripts/migrate-npcs-to-db.ts
```

## ✅ Respuestas a Preguntas Comunes

### ¿Los NPCs se guardan en archivos JSON o en la DB?

**Todos los NPCs se guardan en la BASE DE DATOS (SQLite)**

- ❌ Los archivos JSON en `data-esparcraft/npcs/` ya NO se usan
- ✅ Los NPCs se guardan en `/home/z/my-project/db/custom.db`
- ✅ Las rutas API leen y escriben en la DB

### ¿Qué pasa si borro la base de datos?

Si borras `db/custom.db`, se creará automáticamente la próxima vez que ejecutes `bun run dev` o `bun run db:init`.

⚠️ **Perderás todos los NPCs** que hayas creado o editado a menos que:
- Tengas un respaldo en `db/npcs-backup/`
- Re-ejecutes el script de migración desde los archivos JSON originales

### ¿Puedo volver a usar archivos JSON?

No directamente. El sistema ahora usa Prisma y SQLite. Para volver a archivos JSON necesitarías:

1. Deshacer los cambios en las rutas API
2. Volver a usar `npcManager` en lugar de `npcDbManager`

No recomendado: La base de datos es más rápida, segura y escalable.

## 🐛 Solución de Problemas

### Error: "@prisma/client did not initialize yet"

**Causa:** Prisma Client no se ha generado.

**Solución:**
```bash
bun run db:generate
```

O simplemente reinicia el servidor:
```bash
bun run dev
```

### Error: "Database is corrupted" o "SQLITE_ERROR"

**Causa:** El archivo de base de datos está corrupto.

**Solución:**
```bash
# Opción 1: Borrar y recrear
rm db/custom.db
bun run db:init

# Opción 2: Resetear (más agresivo)
bun run db:reset
```

⚠️ **Ambas opciones borran todos los datos.** Ten un respaldo primero.

### Los NPCs no aparecen en la interfaz

**Posibles causas:**

1. **Prisma Client no inicializado:**
   ```bash
   bun run db:generate
   ```

2. **Base de datos no sincronizada:**
   ```bash
   bun run db:push
   ```

3. **Servidor no reiniciado después de cambios:**
   - Detén el servidor (Ctrl+C)
   - Inicia nuevamente: `bun run dev`

4. **Error en el navegador:**
   - Abre la consola del navegador (F12)
   - Busca errores rojos
   - Revisa el log del servidor: `tail -f dev.log`

## 📊 Estructura del Modelo NPC en DB

```prisma
model NPC {
  id             String   @id @default(cuid())
  locationScope  String   // 'mundo' | 'pueblo' | 'edificio'
  worldId        String
  puebloId       String?
  edificioId     String?
  card           String   // JSON string of SillyTavernCard
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([worldId])
  @@index([puebloId])
  @@index([edificioId])
  @@index([locationScope])
}
```

## 🎯 Ventajas de Usar Base de Datos vs Archivos JSON

| Característica | Archivos JSON | Base de Datos (Prisma) |
|--------------|---------------|-------------------------|
| **Velocidad** | Lento (lectura de archivos) | Rápido (índices SQL) |
| **Búsquedas** | Lineal (O(n)) | Con índices (O(log n)) |
| **Consultas complejas** | Difícil | SQL potente |
| **Concurrencia** | Bloqueos de archivo | Manejo transaccional |
| **Escalabilidad** | Mala (miles de archivos) | Excelente |
| **Type Safety** | Manual | Automático (TypeScript) |
| **Migraciones** | Manual | Controlado por Prisma |
| **Backup** | Copiar directorio | Exportar/importar SQL |

## 📝 Notas Importantes

1. **Los archivos JSON originales** en `data-esparcraft/npcs/` ya NO se usan pero pueden mantenerse como respaldo adicional.

2. **Los datos migrados** están en `db/custom.db`. No uses los archivos JSON para editar NPCs.

3. **Prisma Client usa singleton pattern** para evitar múltiples instancias en desarrollo (hot reload).

4. **Auto-generación:** El script `dev` ahora genera Prisma Client automáticamente cada vez que inicias el servidor.

## 🔗 Recursos Útiles

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma SQLite Setup](https://www.prisma.io/docs/concepts/database-connectors/sqlite)
- [Next.js with Prisma](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases/using-nextjs)
