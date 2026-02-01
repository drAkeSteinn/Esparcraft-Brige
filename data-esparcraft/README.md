# Sistema Completo de Backups de Base de Datos

Este directorio contiene los backups de la base de datos del proyecto con un sistema completo de gestión.

## 📁 Estructura

```
data-esparcraft/
├── db-backup/                    # Backups de base de datos
│   ├── custom.db.2026-01-31T14-43-42
│   ├── custom.db.2026-01-31T15-30-10-manual-Antes-de-cambios
│   ├── custom.db.before-restore-2026-01-31T16-00-00
│   └── ...
├── grimorio/                       # Grimorio (sistema de plantillas - sigue en JSON)
│   ├── GRIMORIO_1769410543476.json
│   └── GRIMORIO_1769548185721.json
└── README.md                       # Este archivo
```

## 🛠️ Comandos Disponibles

### 📦 Comandos de Inicialización

#### Crear base de datos desde cero (NUEVA INSTALACIÓN)

```bash
bun run db:init
```

Este comando:
1. ✅ Crea el directorio `db/` si no existe
2. ✅ Si `db/custom.db` existe, pregunta si quieres eliminarlo
3. ✅ Crea un archivo SQLite vacío
4. ✅ Genera el cliente de Prisma
5. ✅ Aplica el schema a la base de datos
6. ✅ Deja la base de datos vacía y lista para usar

**Úsalo cuando:**
- Instalas el proyecto en una nueva máquina
- Quieres empezar con una base de datos limpia
- Quieres resetear completamente el sistema

#### Verificar base de datos (automático al iniciar)

```bash
bun run db:init-check
```

Este comando se ejecuta automáticamente al hacer `bun run dev`:
- ✅ Verifica si `db/custom.db` existe
- ✅ Si NO existe, la crea automáticamente
- ✅ Aplica el schema de Prisma

### 💾 Comandos de Backups

#### Crear backup automático

```bash
bun run db:backup
```

Este comando:
- ✅ Hace una copia de `db/custom.db`
- ✅ Guarda el backup con timestamp automático (formato: `custom.db.YYYY-MM-DDTHH-MM-SS`)
- ✅ Mantiene solo los últimos 20 backups
- ✅ Guarda en `data-esparcraft/db-backup/`

**Ejemplo de nombre:**
```
custom.db.2026-01-31T14-43-42
```

#### Crear backup manual con nombre personalizado

```bash
bun run db:backup "descripción del backup"
```

Este comando:
- ✅ Hace una copia de `db/custom.db`
- ✅ Guarda el backup con timestamp + nombre personalizado
- ✅ Formato: `custom.db.timestamp-manual-NOMBRE`
- ✅ Útil para identificar backups importantes (ej: "Antes de migración", "Proyecto v1.0", etc.)

**Ejemplos:**

```bash
bun run db:backup "Antes de cambios importantes"
bun run db:backup "Versión 1.0 - Estable"
bun run db:backup "Backup diario - Lunes"
bun run db:backup "Migración a nuevo schema"
```

**Nombres generados:**
```
custom.db.2026-01-31T14-43-42-manual-Antes_de_cambios_importantes
custom.db.2026-01-31T15-30-10-manual-Versión_1.0_-_Estable
custom.db.2026-01-31T16-00-00-manual-Backup_diario_-_Lunes
```

#### Listar todos los backups disponibles

```bash
bun run db:list-backups
```

Este comando muestra:
- 📦 Lista completa de todos los backups
- 📅 Fecha y hora de cada backup
- 📊 Tamaño en KB/MB
- 🔄 Tipo (automático/manual)
- 📊 Estadísticas (total, manuales, automáticos)
- 💾 Backups en formato JSON para usar en scripts/APIs

**Salida de ejemplo:**
```
📦 Total de backups: 3

 🆕 [1] custom.db.2026-01-31T14-43-42
     📅 Fecha: 2026-01-31 14:43:42
     📊 Tamaño: 204 KB

   [2] 🔄 custom.db.2026-01-31T15-30-10
     📅 Fecha: 2026-01-31 15:30:10
     📊 Tamaño: 208 KB

   [3] 👤 custom.db.2026-01-31T16-00-00-manual-Antes_de_migración
     📅 Fecha: 2026-01-31 16:00:00
     📊 Tamaño: 210 KB
     👤 Manual
```

### 🔄 Comandos de Restauración

#### Restaurar un backup específico

```bash
bun run db:restore <nombre-del-archivo-backup>
```

Este comando:
- ✅ Crea un backup automático del estado ACTUAL (antes de restaurar)
  - Formato: `custom.db.before-restore-TIMESTAMP`
  - Esto protege contra restauraciones accidentales
- ✅ Reemplaza `db/custom.db` con el backup seleccionado
- ✅ Verifica integridad del archivo restaurado
- ✅ Muestra historial de restauraciones recientes

**Ejemplos:**

```bash
# Restaurar backup automático
bun run db:restore custom.db.2026-01-31T14-43-42

# Restaurar backup manual
bun run db:restore custom.db.2026-01-31T16-00-00-manual-Antes_de_migración
```

**Salida de ejemplo:**
```
🔄 Restaurando base de datos desde backup...

📋 Información del backup a restaurar:
   📝 Nombre: custom.db.2026-01-31T16-00-00-manual-Antes_de_migración
   📝 Tipo: Manual
   📅 Fecha: 2026-01-31T16-00-00
   📊 Tamaño: 210 KB

🔄 Restaurando base de datos...

💾 Haciendo backup del estado actual ANTES de restaurar...
✅ Backup pre-restauración creado
📍 Archivo: custom.db.before-restore-2026-01-31T16-05-30

✅ Base de datos restaurada exitosamente
📍 Ubicación: db/custom.db
📍 Backup original: data-esparcraft/db-backup/custom.db.2026-01-31T16-00-00-manual-Antes_de_migración

🔍 Verificación de integridad:
   📊 Tamaño restaurado: 210.00 KB
   ✅ Archivo válido y legible

📜 Historial de restauraciones recientes:

   🆕 [1] custom.db.before-restore-2026-01-31T16-05-30
     📅 2026-01-31T16-05-30
     📊 210 KB

   [2] custom.db.before-restore-2026-01-31T14-00-00
     📅 2026-01-31T14-00-00
     📊 205 KB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Restauración completada exitosamente

💡 Recomendaciones:
   • Verifica que los datos se cargan correctamente en la aplicación
   • Si encuentras errores, ejecuta: bun run db:push
   • Para ver todos los backups: bun run db:list-backups
   • Para crear un nuevo backup: bun run db:backup

⚠️  NOTA IMPORTANTE:
   • El servidor necesita reiniciarse para aplicar los cambios
   • El backup pre-restauración se guardó por seguridad
```

## 🔄 Flujo de Trabajo Recomendado

### Para una instalación NUEVA (sin base de datos):

1. Clona el proyecto
2. Ejecuta `bun install`
3. Ejecuta `bun run db:init` para crear la base de datos
4. Ejecuta `bun run dev` para iniciar el servidor
5. La base de datos se crea automáticamente con la estructura correcta

### Para hacer un backup ANTES de cambios importantes:

```bash
# Backup automático (rápido)
bun run db:backup

# O backup manual con descripción (recomendado)
bun run db:backup "Antes de migrar Grimorio"
```

### Para restaurar un backup específico:

1. Lista los backups disponibles:
   ```bash
   bun run db:list-backups
   ```

2. Selecciona el backup que quieres restaurar
3. Ejecuta:
   ```bash
   bun run db:restore custom.db.2026-01-31T14-43-42-manual-Antes_de_cambios
   ```

4. Reinicia el servidor (necesario para aplicar cambios)

### Sistema de Rollback:

El sistema mantiene automáticamente:
- 📦 **Últimos 20 backups** - Para rollback rápido
- 💾 **Backups pre-restauración** - Para deshacer restauraciones
- 📊 **Historial completo** - Ver todas las versiones

**Flujo de rollback típico:**

```bash
# 1. Restaurar versión anterior
bun run db:restore custom.db.2026-01-31T14-00-00

# 2. Verificar que funciona

# 3. Si no funciona, volver a la versión anterior
bun run db:restore custom.db.before-restore-2026-01-31T14-05-30

# 4. O volver a la versión original
bun run db:restore custom.db.2026-01-31T13-00-00
```

## 📊 Resumen de Comandos

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `bun run db:init` | Crear DB desde cero | Nueva instalación |
| `bun run db:init-check` | Verificar/crear DB (auto) | Se ejecuta con `dev` |
| `bun run db:backup` | Backup automático | Rápido, timestamp auto |
| `bun run db:backup "texto"` | Backup manual | Con nombre personalizado |
| `bun run db:list-backups` | Listar backups | Ver todos los disponibles |
| `bun run db:restore <archivo>` | Restaurar backup | Seleccionar versión específica |
| `bun run db:push` | Aplicar schema | Verificar DB |

## 🏷️ Nomenclatura de Backups

### Backups Automáticos
```
custom.db.YYYY-MM-DDTHH-MM-SS
```

Ejemplo: `custom.db.2026-01-31T14-43-42`

### Backups Manuales
```
custom.db.YYYY-MM-DDTHH-MM-SS-manual-NOMBRE_DESCRIPCIÓN
```

Ejemplo: `custom.db.2026-01-31T16-00-00-manual-Antes_de_migrar_Grimorio`

### Backups Pre-Restauración
```
custom.db.before-restore-TIMESTAMP
```

Creado automáticamente antes de restaurar cualquier backup.

## 💡 Recomendaciones

1. **Antes de cambios mayores:** Crea un backup manual con descripción
   ```bash
   bun run db:backup "Antes de migrar a versión 2.0"
   ```

2. **Copia de seguridad inicial:** Al instalar el proyecto, crea un backup "base"
   ```bash
   bun run db:backup "Instalación inicial - DB vacía"
   ```

3. **Backups regulares:** Programa backups automáticos (cron, etc.) si es posible
   ```bash
   # Ejemplo: Backup diario a las 2 AM
   0 2 * * * bun run db:backup "Backup diario"
   ```

4. **Después de migraciones:** Verifica que los datos se cargan correctamente

5. **Espacio de backups:** Los scripts mantienen solo los últimos 20 backups para no llenar el disco

6. **Versiones del schema:** Si cambias el schema, asegúrate de ejecutar `bun run db:push`

7. **Testing:** Siempre testea los datos después de restaurar un backup

## ⚠️ Precauciones

1. **No edites manualmente** los archivos `.db` - usa los scripts de Prisma
2. **Copia de seguridad antes** de restaurar backups antiguos
3. **Verifica el schema** después de importar: `bun run db:push`
4. **El sistema crea automáticamente** un backup antes de restaurar
5. **El servidor necesita reiniciarse** después de restaurar un backup
6. **Los backups manuales** tienen prioridad visual (icono 👤) en la lista
7. **No elimines** los backups `before-restore` hasta que estés seguro de la restauración

## 🔍 Solución de Problemas

### La base de datos no se crea

```bash
# Ejecutar manualmente la inicialización
bun run db:init

# Verificar que el directorio existe
ls -la db/
```

### Error de schema al restaurar

```bash
# Forzar actualización del schema
bun run db:push

# O recrear completamente (¡ELIMINA TODOS LOS DATOS!)
bun run db:reset
```

### Verificar estado de la base de datos

```bash
# Verificar el schema
bun run db:push

# Verificar que Prisma esté generado
bun run db:generate

# Listar backups disponibles
bun run db:list-backups
```

### Restaurar una versión anterior

```bash
# 1. Listar backups
bun run db:list-backups

# 2. Seleccionar y restaurar
bun run db:restore custom.db.2026-01-31T12-00-00

# 3. Si no funciona, deshacer (se creó un backup antes)
bun run db:restore custom.db.before-restore-TIMESTAMP
```

### Recuperar datos después de un error

```bash
# El backup pre-restauración te protege de errores de restauración
# Busca el último backup con "before-restore"
bun run db:list-backups

# Restaura ese backup
bun run db:restore custom.db.before-restore-2026-01-31T16-05-30
```

## 📝 Estado del Grimorio

**IMPORTANTE:** El Grimorio **NO está migrado** a base de datos.

- 📁 **Ubicación:** `data-esparcraft/grimorio/`
- 📄 **Formato:** Archivos JSON individuales
- 🔧 **Gestión:** Sigue usando `fileManager.ts`
- 📦 **Plantillas:** Almacenadas como archivos `GRIMORIO_*.json`

**¿Por qué no se migró?**
- El Grimorio es un sistema de plantillas y variables
- Funciona correctamente con archivos JSON
- No tiene relaciones complejas como mundos/NPCs
- Migrarlo no ofrece beneficios significativos

**Si en el futuro quieres migrar el Grimorio:**
1. Crear modelo Prisma para `GrimorioCard`
2. Crear `grimorioDbManager` con operaciones CRUD
3. Ejecutar script de migración desde JSON a DB
4. Actualizar `triggerHandlers.ts` para usar el nuevo manager

## 📋 Resumen del Sistema

### ✅ Características Implementadas:

1. **Inicialización automática** de base de datos al iniciar
2. **Backups automáticos** con timestamp
3. **Backups manuales** con nombres personalizados
4. **Lista completa** de backups con metadatos
5. **Restauración selectiva** de cualquier backup
6. **Backups pre-restauración** automáticos para seguridad
7. **Limpieza automática** (mantiene solo últimos 20)
8. **Historial completo** de restauraciones
9. **Verificación de integridad** de backups

### 📊 Contenido de los Backups:

Cada backup incluye:
- 🌍 Todos los mundos (1)
- 🏘️ Todos los pueblos (2)
- 🏢 Todos los edificios (3)
- 👥 Todos los NPCs (4)
- 💬 Todas las sesiones (1)
- 📝 Todos los resúmenes de sesiones (3)
- 🔗 Todas las relaciones (Foreign Keys)

**Total:** 14 entidades en la base de datos actual

## 📦 Tabla de Referencia Rápida

| Situación | Comando |
|-----------|----------|
| Instalación nueva | `bun run db:init` |
| Backup rápido | `bun run db:backup` |
| Backup con descripción | `bun run db:backup "texto"` |
| Ver backups | `bun run db:list-backups` |
| Restaurar backup específico | `bun run db:restore archivo` |
| Rollback | `bun run db:restore before-restore` |
| Verificar schema | `bor run db:push` |
| Reset total | `bun run db:reset` |

---

## 📝 Historial de Cambios

- **2026-01-31:** Sistema de gestión de backups mejorado
  - Backups manuales con nombres personalizados
  - Lista detallada de backups con metadatos
  - Sistema de rollback con backups pre-restauración
  - Mantener solo últimos 20 backups
- **2026-01-31:** Inicialización automática implementada
- **2026-01-31:** Sistema de backups básico creado
