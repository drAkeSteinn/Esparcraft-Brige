# Análisis del Sistema de Sesiones - Propuesta de Migración a DB

## 📋 Índice
1. [Estructura Actual del Sistema](#estructura-actual)
2. [Flujo de Datos](#flujo-de-datos)
3. [Análisis de Componentes](#análisis-de-componentes)
4. [Propuesta de Migración a DB](#propuesta-de-migración)
5. [Esquema Propuesto en Prisma](#esquema-propuesto)
6. [Ventajas de la Migración](#ventajas)

---

## 📁 Estructura Actual {#estructura-actual}

### Sistema Basado en Archivos JSON

#### Sesiones (Sessions)
```
data-esparcraft/sessions/
├── SESSION_1769768916236.json    ← Archivo individual por sesión
└── summaries/                      ← Subdirectorio para resúmenes
    └── SESSION_1769768916236.json  ← Resumen de la sesión
```

#### Modelo de Sesión (Session)
```typescript
interface Session {
  id: string;                              // ID único de la sesión
  npcId: string;                           // ID del NPC asociado
  playerId?: string;                         // ID del jugador (opcional)
  jugador?: Jugador;                        // Snapshot del jugador en esta sesión
  startTime: string;                         // ISO timestamp de inicio
  lastActivity: string;                      // ISO timestamp de última actividad
  messages: ChatMessage[];                   // Array de mensajes del chat
  summary?: string;                           // Resumen actual de la sesión
  lastPrompt?: string;                        // Último prompt completo usado
  summaryHistory?: SessionSummaryEntry[];     // Historial de resúmenes de la sesión
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;                        // ISO timestamp
}

interface SessionSummaryEntry {
  summary: string;
  timestamp: string;
  version: number;                            // Número de versión del resumen
}

interface Jugador {
  nombre?: string;
  raza?: string;
  nivel?: string;
  almakos?: string;
  deuda?: string;
  piedras_del_alma?: string;
  salud_actual?: string;
  reputacion?: string;
  hora?: string;
  clima?: string;
}
```

#### Resúmenes de Sesión (SessionSummary)
```typescript
interface SessionSummary {
  sessionId: string;                          // ID de la sesión
  npcId: string;                             // ID del NPC
  playerId?: string;                           // ID del jugador (opcional)
  playerName?: string;                          // Nombre del jugador
  npcName?: string;                             // Nombre del NPC
  summary: string;                              // Texto del resumen
  timestamp: string;                           // ISO timestamp
  version: number;                               // Número de versión del resumen
}
```

---

## 🔄 Flujo de Datos {#flujo-de-datos}

### 1. Flujo de Chat (HTTP Request)

```
RouterTab (Frontend)
  ↓ POST /api/v1
  ↓
/api/v1/route.ts
  ↓
handleTrigger(payload)
  ↓
handleChatTrigger(payload)
  ↓
sessionManager.getById() / sessionManager.create()
  ↓
Guarda en: data-esparcraft/sessions/SESSION_xxx.json
```

#### Payload de Chat
```json
{
  "mode": "chat",
  "npcid": "NPC_1768825922617",
  "playersessionid": "SESSION_1769768916236",  // "nueva" o ID existente
  "message": "Hola, ¿cómo estás?",
  "jugador": {
    "nombre": "Gerardo Lopez",
    "raza": "Humano",
    "nivel": "10",
    "almakos": "1000",
    "deuda": "100",
    "piedras_del_alma": "5",
    "salud_actual": "10",
    "reputacion": "6",
    "hora": "10:30pm",
    "clima": "soleado"
  },
  "lastSummary": "Resumen anterior..."  // Opcional
}
```

### 2. Flujo de Resumen de Sesión (Trigger)

```
RouterTab (Frontend)
  ↓ POST /api/v1
  ↓
handleTrigger(payload: {mode: 'resumen_sesion'})
  ↓
handleResumenSesionTrigger(payload)
  ↓
1. sessionManager.getById(playersessionid)
2. summaryManager.getSummary(sessionId) - Lee resumen anterior
3. LLM genera nuevo resumen
4. summaryManager.saveSummary(sessionId, summary) - Guarda resumen
5. sessionManager.addSummaryToHistory(sessionId, summary, version)
6. sessionManager.clearMessages(sessionId) - Limpia mensajes
  ↓
Guarda en:
  - data-esparcraft/sessions/summaries/SESSION_xxx.json
  - data-esparcraft/sessions/SESSION_xxx.json (actualiza summaryHistory)
```

#### Payload de Resumen de Sesión
```json
{
  "mode": "resumen_sesion",
  "npcid": "NPC_1768825922617",
  "playersessionid": "SESSION_1769768916236",
  "systemPrompt": "...",  // Opcional, carga de archivo si no se provee
  "lastSummary": "...",  // Opcional, último resumen conocido
  "chatHistory": "..."  // Opcional, historial de mensajes
}
```

---

## 🏗️ Análisis de Componentes {#análisis-de-componentes}

### 1. sessionManager (fileManager.ts)

**Ubicación:** `src/lib/fileManager.ts` (líneas ~387-501)

**Operaciones:**
- `getAll()` - Obtiene todas las sesiones
- `getById(id)` - Obtiene sesión por ID
- `getByNPCId(npcId)` - Filtra sesiones por NPC
- `create(session, id?)` - Crea nueva sesión
- `update(id, session)` - Actualiza sesión existente
- `addMessage(id, message)` - Agrega mensaje al chat
- `delete(id)` - Elimina sesión
- `clearMessages(id)` - Limpia todos los mensajes
- `addSummaryToHistory(id, summary, version)` - Agresa resumen al historial
- `getSummaryHistory(id)` - Obtiene historial completo de resúmenes
- `getNextSummaryVersion(id)` - Obtiene siguiente número de versión

**Almacenamiento:** Archivos JSON individuales en `data-esparcraft/sessions/{id}.json`

### 2. summaryManager (fileManager.ts)

**Ubicación:** `src/lib/fileManager.ts` (líneas ~521-620)

**Operaciones:**
- `getSummary(sessionId)` - Obtiene solo texto del resumen
- `getSummaryData(sessionId)` - Obtiene resumen con metadata completa
- `saveSummary(sessionId, npcId, playerName, npcName, summary, version?)` - Guarda resumen
- `getSummariesByNPC(npcId)` - Obtiene todos los resúmenes de un NPC

**Almacenamiento:** Archivos JSON en `data-esparcraft/sessions/summaries/{id}.json`

**Características:**
- Soporta formato antiguo (solo summary + timestamp) y nuevo (con metadata)
- Migración automática de formato antiguo a nuevo

### 3. API Routes

#### /api/sessions/route.ts
- `GET` - Obtiene todas las sesiones o filtra por npcId
- `POST` - Crea nueva sesión

#### /api/sessions/[id]/route.ts
- `GET` - Obtiene sesión específica
- `PUT` - Actualiza sesión
- `DELETE` - Elimina sesión

#### /api/sessions/[id]/summary/route.ts
- `GET` - Obtiene resumen de sesión (texto y datos completos)

#### /api/sessions/[id]/summaries/route.ts
- `GET` - Obtiene historial completo de resúmenes de una sesión

#### /api/npcs/[id]/summaries/route.ts
- `GET` - Obtiene todos los resúmenes de sesiones de un NPC

### 4. Frontend Components

#### RouterTab.tsx
- Formulario de chat con NPC y datos de jugador
- Selección de sesión: "nueva" o "existente"
- Envía POST a `/api/v1`
- Genera scripts de Denizen para testing

#### SessionsTab.tsx
- Lista todas las sesiones
- Muestra resúmenes asociados
- Permite ver historial de chat
- Permite crear nueva sesión de prueba
- Permite eliminar sesiones

---

## 🚀 Propuesta de Migración a DB {#propuesta-de-migración}

### Estrategia de Migración

Similar a la migración de NPCs, con los siguientes pasos:

#### 1. Modelos Prisma
Crear dos modelos en `prisma/schema.prisma`:

```prisma
model Session {
  id             String   @id @default(cuid())
  npcId          String
  playerId       String?
  jugador        String   // JSON string of Jugador
  startTime      DateTime @default(now())
  lastActivity   DateTime @updatedAt
  messages       String   // JSON string of ChatMessage[]
  summary        String?  // Resumen actual
  lastPrompt     String?  // Último prompt completo
  summaryHistory  String   // JSON string of SessionSummaryEntry[]

  @@index([npcId])
  @@index([playerId])
  @@index([startTime])
}

model SessionSummary {
  id             String   @id @default(cuid())
  sessionId      String   // FK a Session
  npcId          String
  playerId       String?
  playerName     String?
  npcName        String?
  summary        String
  timestamp      DateTime @default(now())
  version        Int      @default(1)

  @@index([sessionId])
  @@index([npcId])
  @@index([playerId])
}
```

#### 2. sessionDbManager.ts

Crear manager de sesiones similar a `npcDbManager.ts`:

**Operaciones de Session:**
- `getAll()` - Obtiene todas las sesiones
- `getById(id)` - Obtiene sesión por ID
- `getByNPCId(npcId)` - Obtiene sesiones por NPC
- `create(session, id?)` - Crea nueva sesión
- `update(id, session)` - Actualiza sesión
- `addMessage(id, message)` - Agrega mensaje
- `delete(id)` - Elimina sesión
- `clearMessages(id)` - Limpia mensajes
- `addSummaryToHistory(id, summary, version)` - Agrega resumen al historial
- `getSummaryHistory(id)` - Obtiene historial
- `getNextSummaryVersion(id)` - Obtiene siguiente versión

**Operaciones de SessionSummary:**
- `getSummary(sessionId)` - Obtiene último resumen
- `getSummaryData(sessionId)` - Obtiene resumen con metadata
- `saveSummary(sessionId, summaryData)` - Guarda resumen
- `getSummariesByNPC(npcId)` - Obtiene resúmenes por NPC

#### 3. Actualizar API Routes

Cambiar las siguientes rutas para usar `sessionDbManager`:
- `/api/sessions/route.ts`
- `/api/sessions/[id]/route.ts`
- `/api/sessions/[id]/summary/route.ts`
- `/api/sessions/[id]/summaries/route.ts`
- `/api/npcs/[id]/summaries/route.ts`

#### 4. Actualizar triggerHandlers.ts

Cambiar las siguientes funciones para usar `sessionDbManager`:
- `handleChatTrigger()` - Usa sessionDbManager en lugar de sessionManager
- `handleResumenSesionTrigger()` - Usa sessionDbManager y summaryDbManager

#### 5. Script de Migración

Crear script `scripts/migrate-sessions-to-db.ts`:
- Lee todas las sesiones de archivos JSON
- Lee todos los resúmenes de archivos JSON
- Migra a base de datos
- Crea backup de archivos originales

---

## 📊 Esquema Propuesto en Prisma {#esquema-propuesto}

### Modelo Session

```prisma
model Session {
  id             String   @id @default(cuid())
  npcId          String
  playerId       String?
  jugador        String   // JSON string of Jugador
  startTime      DateTime @default(now())
  lastActivity   DateTime @updatedAt
  messages       String   // JSON string of ChatMessage[]
  summary        String?
  lastPrompt     String?
  summaryHistory  String   // JSON string of SessionSummaryEntry[]

  @@index([npcId])
  @@index([playerId])
  @@index([startTime])
  @@index([lastActivity])

  // Relación con NPC (opcional para queries)
  // npc           NPC?      @relation("SessionNPC")
}
```

### Modelo SessionSummary

```prisma
model SessionSummary {
  id             String   @id @default(cuid())
  sessionId      String
  npcId          String
  playerId       String?
  playerName     String?
  npcName        String?
  summary        String
  timestamp      DateTime @default(now())
  version        Int      @default(1)

  @@index([sessionId])
  @@index([npcId])
  @@index([playerId])
  @@index([timestamp])

  // Relación con Session (opcional para queries)
  // session        Session    @relation("SessionSummary")
}
```

### Consideraciones Importantes

1. **JSON Storage:**
   - `jugador` → String (JSON de Jugador)
   - `messages` → String (JSON de ChatMessage[])
   - `summaryHistory` → String (JSON de SessionSummaryEntry[])
   - SQLite no soporta arrays directamente en Prisma

2. **Índices:**
   - `npcId` → Para queries de sesiones por NPC
   - `playerId` → Para queries de sesiones por jugador
   - `startTime` / `lastActivity` → Para ordenamiento
   - `sessionId` → Para resúmenes de sesión específica

3. **Timestamps:**
   - `startTime` → Fecha de creación
   - `lastActivity` → Auto-update con `@updatedAt`
   - `timestamp` → Fecha del resumen

---

## 💡 Ventajas de la Migración {#ventajas}

### Comparación: Archivos vs Base de Datos

| Aspecto | Archivos JSON | Base de Datos |
|---------|--------------|---------------|
| **Rendimiento** | Leer/escritura de archivos (I/O) | Queries SQL con índices (memoria) |
| **Búsquedas** | Lineal O(n) | Con índices O(log n) |
| **Consultas complejas** | Muy difícil | Queries SQL potentes |
| **Relaciones** | Manual | FK automáticas y JOINs |
| **Concurrencia** | Bloqueos de archivo | Transacciones ACID |
| **Escalabilidad** | Cientos de archivos | Miles/millones de registros |
| **Backup** | Copiar directorios | Export/Import SQL |
| **Migraciones** | Manual | Controladas por Prisma |
| **Type Safety** | Parcial | Total con Prisma |
| **Historial** | Separado en archivos | Integrado en la DB |

### Beneficios Específicos para Sesiones

1. **Queries por NPC:**
   ```typescript
   // Archivos: Debe leer todos los archivos y filtrar
   const sessions = sessionManager.getByNPCId(npcId);

   // DB: Query con índice
   const sessions = await sessionDbManager.getByNPCId(npcId);
   ```

2. **Resúmenes por NPC:**
   ```typescript
   // Archivos: Debe leer todos los resúmenes y filtrar
   const summaries = summaryManager.getSummariesByNPC(npcId);

   // DB: Query con índice optimizado
   const summaries = await sessionDbManager.getSummariesByNPC(npcId);
   ```

3. **Historial de Sesión:**
   ```typescript
   // Archivos: Requiere leer el archivo de sesión + archivos de resúmenes
   const summaryHistory = sessionManager.getSummaryHistory(sessionId);

   // DB: Una sola query
   const summaryHistory = await sessionDbManager.getSummaryHistory(sessionId);
   ```

4. **Estadísticas:**
   ```sql
   -- Sesiones por NPC (últimas 30 días)
   SELECT npcId, COUNT(*) as count
   FROM Session
   WHERE lastActivity >= datetime('now', '-30 days')
   GROUP BY npcId;

   -- Resúmenes por NPC
   SELECT npcId, COUNT(*) as count
   FROM SessionSummary
   WHERE timestamp >= datetime('now', '-30 days')
   GROUP BY npcId;
   ```

---

## 🎯 Plan de Implementación

### Fase 1: Preparación
- [ ] Definir modelos Prisma (Session, SessionSummary)
- [ ] Ejecutar `prisma db push`
- [ ] Crear `sessionDbManager.ts`

### Fase 2: Migración de Datos
- [ ] Crear script de migración
- [ ] Migrar sesiones existentes (1 sesión actualmente)
- [ ] Migrar resúmenes existentes (1 resumen actualmente)
- [ ] Crear backup de archivos JSON

### Fase 3: Actualizar API
- [ ] Actualizar `/api/sessions/route.ts`
- [ ] Actualizar `/api/sessions/[id]/route.ts`
- [ ] Actualizar `/api/sessions/[id]/summary/route.ts`
- [ ] Actualizar `/api/sessions/[id]/summaries/route.ts`
- [ ] Actualizar `/api/npcs/[id]/summaries/route.ts`

### Fase 4: Actualizar Handlers
- [ ] Actualizar `handleChatTrigger()` en `triggerHandlers.ts`
- [ ] Actualizar `handleResumenSesionTrigger()` en `triggerHandlers.ts`

### Fase 5: Testing
- [ ] Probar creación de sesiones
- [ ] Probar envío de mensajes
- [ ] Probar generación de resúmenes
- [ ] Probar historial de resúmenes
- [ ] Probar queries por NPC
- [ ] Verificar integridad de datos

### Fase 6: Documentación
- [ ] Actualizar `docs/DATABASE_SETUP.md`
- [ ] Crear guía de migración de sesiones
- [ ] Actualizar documentación de APIs

---

## 📝 Notas Importantes

1. **Mantener Compatibilidad:**
   - Los resúmenes deben mantener compatibilidad con código existente
   - Soportar formatos antiguos durante migración

2. **Backups:**
   - Crear backup automático de archivos JSON antes de migrar
   - Mantener archivos JSON como respaldo adicional

3. **Testing Gradual:**
   - No eliminar archivos JSON inmediatamente
   - Verificar funcionamiento con DB antes de eliminar
   - Posibilidad de rollback si hay problemas

4. **Performance:**
   - Los queries deben usar índices apropiadamente
   - Considerar paginación para listas grandes

5. **Future:**
   - Considerar relación FK entre Session y NPC
   - Considerar relación FK entre SessionSummary y Session
   - Considerar limpieza automática de sesiones antiguas

---

## 🔗 Archivos Relacionados

- `/prisma/schema.prisma` - Esquema de base de datos
- `/src/lib/fileManager.ts` - Manager actual (archivos JSON)
- `/src/lib/triggerHandlers.ts` - Handlers de triggers
- `/src/app/api/sessions/` - Rutas API de sesiones
- `/src/components/dashboard/SessionsTab.tsx` - Frontend de sesiones
- `/src/components/dashboard/RouterTab.tsx` - Frontend de router/chat

---

## ✅ Conclusión

La migración del sistema de sesiones a base de datos sigue el mismo patrón que la migración de NPCs:

1. **Crear modelo Prisma** con los campos necesarios
2. **Crear sessionDbManager** con operaciones CRUD
3. **Migrar datos existentes** desde JSON a DB
4. **Actualizar todas las referencias** para usar el nuevo manager
5. **Mantener compatibilidad** durante el proceso de migración

**Beneficio principal:** Consultas más rápidas y escalables para:
- Sesiones por NPC
- Resúmenes por NPC
- Historial de sesiones
- Estadísticas y analytics

¿Deseas que proceda con la implementación?
