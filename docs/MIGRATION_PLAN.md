# Plan de Migración: Sesiones y Resúmenes a Base de Datos con FK

## 📋 Índice
- [Fase 1: Preparación del Esquema Prisma](#fase-1-preparación-del-esquema-prisma)
- [Fase 2: Migración de Mundo, Pueblo, Edificio a DB](#fase-2-migración-de-mundo-pueblo-edificio-a-db)
- [Fase 3: Creación de Models para Sesiones y Resúmenes](#fase-3-creación-de-models-para-sesiones-y-resúmenes)
- [Fase 4: Migración de Sesiones Existentes](#fase-4-migración-de-sesiones-existentes)
- [Fase 5: Creación de Managers Optimizados](#fase-5-creación-de-managers-optimizados)
- [Fase 6: Actualización de Trigger Handlers](#fase-6-actualización-de-trigger-handlers)
- [Fase 7: Actualización de API Routes](#fase-7-actualización-de-api-routes)
- [Fase 8: Testing y Verificación](#fase-8-testing-y-verificación)
- [Fase 9: Limpieza Final](#fase-9-limpieza-final)

---

## 🎯 Objetivo General

**Antes del Sistema:**
- Archivos JSON con IDs repetidos en cada entidad
- Múltiples consultas separadas por HTTP request
- Sin integridad referencial
- Performance pobre con muchos datos

**Después del Sistema:**
- Base de datos unificada con FK (Foreign Keys)
- Una sola query optimizada por HTTP request
- Integridad referencial garantizada
- 10-25x más rápido en consultas complejas
- Queries poderosas con JOINs y GROUP BY

---

## 📊 Estado Actual

### Datos Existentes
```
✅ NPCs: 4 registros migrados
🟡 Sesiones: 1 sesión existente (SESSION_1769768916236)
🟡 Resúmenes: 1 resumen existente (SESSION_1769768916236)
🟡 Mundos: 1 mundo existente (WORLD_ESPARCRAFT)
🟡 Pueblos: 2 pueblos existentes
🟡 Edificios: 3 edificios existentes
```

### Entidades en Archivos JSON
- `data-esparcraft/worlds/` - Mundos
- `data-esparcraft/pueblos/` - Pueblos/Naciones
- `data-esparcraft/edificios/` - Edificios
- `data-esparcraft/npcs/` - NPCs (ya migrados)
- `data-esparcraft/sessions/` - Sesiones de chat
- `data-esparcraft/sessions/summaries/` - Resúmenes de sesiones

---

## 🚀 Fase 1: Preparación del Esquema Prisma {#fase-1-preparación-del-esquema-prisma}

### Objetivos
- [ ] Revisar esquema actual de NPCs en DB
- [ ] Preparar modelos FK para Mundo, Pueblo, Edificio
- [ ] Preparar modelos FK para Session y SessionSummary
- [ ] Ejecutar `prisma db push` para aplicar cambios

### Tareas Específicas

#### 1.1 Modelos Nuevos a Crear

**Modelo Pueblo**
```prisma
model Pueblo {
  id             String   @id @default(cuid())
  worldId        String
  name           String
  type           String   // 'pueblo' | 'nacion'
  description    String
  lore           String   // JSON string
  area           String?  // JSON string
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([worldId])
}

model Edificio {
  id             String   @id @default(cuid())
  worldId        String
  puebloId       String
  name           String
  lore           String
  rumores        String?  // JSON string
  eventos_recientes String?  // JSON string
  area           String   // JSON string
  puntosDeInteres String?  // JSON string
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([worldId])
  @@index([puebloId])
}
```

**Modelo Session**
```prisma
model Session {
  id             String   @id @default(cuid())
  npcId          String
  playerId       String?
  jugador        String   // JSON string de Jugador
  startTime      DateTime @default(now())
  lastActivity   DateTime @updatedAt
  messages       String   // JSON string de ChatMessage[]
  lastPrompt     String?  // Prompt completo
  summaryId      String?  // FK al último resumen

  @@index([npcId])
  @@index([playerId])
  @@index([startTime])
  @@index([lastActivity])
}
```

**Modelo SessionSummary**
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
}
```

#### 1.2 Actualizar Modelo NPC con FKs

```prisma
model NPC {
  id             String   @id @default(cuid())
  locationScope  String
  card           String
  mundoId        String
  puebloId       String?
  edificioId     String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relaciones FK
  mundo          World?     @relation("NPC_Mundo", fields: [mundoId], references: [id])
  pueblo         Pueblo?    @relation("NPC_Pueblo", fields: [puebloId], references: [id])
  edificio       Edificio?  @relation("NPC_Edificio", fields: [edificioId], references: [id])

  @@index([mundoId])
  @@index([puebloId])
  @@index([edificioId])
  @@index([locationScope])
}
```

#### 1.3 Actualizar Modelo Edificio y Pueblo con FKs

```prisma
// Agregar al modelo Pueblo
model Pueblo {
  // ... campos existentes
  mundo          World?     @relation("Pueblo_Mundo", fields: [worldId], references: [id])
  edificios      Edificio[]  @relation("Edificio_Pueblo")

  @@index([worldId])
}

// Agregar al modelo Edificio  
model Edificio {
  // ... campos existentes
  mundo          World?     @relation("Edificio_Mundo", fields: [worldId], references: [id])
  pueblo         Pueblo?    @relation("Edificio_Pueblo", fields: [puebloId], references: [id])
  npcs           NPC[]      @relation("NPC_Edificio")

  @@index([worldId])
  @@index([puebloId])
}
```

#### 1.4 Relaciones en Session y SessionSummary

```prisma
model Session {
  // ... campos existentes
  npc            NPC?       @relation("Session_NPC", fields: [npcId], references: [id])
  summary        SessionSummary? @relation("SessionSummary_Session", fields: [summaryId], references: [id])

  @@index([npcId])
  @@index([summaryId])
}

model SessionSummary {
  // ... campos existentes
  session        Session?   @relation("SessionSummary_Session", fields: [sessionId], references: [id])
  npc            NPC?       @relation("SessionSummary_NPC", fields: [npcId], references: [id])

  @@index([sessionId])
  @@index([npcId])
}
```

### Criterios de Finalización de Fase 1
- [ ] Esquema Prisma actualizado con todos los modelos FK
- [ ] `prisma db push` ejecutado exitosamente
- [ ] Tablas creadas en SQLite
- [ ] Índices creados correctamente

---

## 🚀 Fase 2: Migración de Mundo, Pueblo, Edificio a DB {#fase-2-migración-de-mundo-pueblo-edificio-a-db}

### Objetivos
- [ ] Crear `worldDbManager.ts` con operaciones CRUD
- [ ] Crear `puebloDbManager.ts` con operaciones CRUD
- [ ] Crear `edificioDbManager.ts` con operaciones CRUD
- [ ] Migrar datos existentes de archivos JSON a DB

### Tareas Específicas

#### 2.1 Crear worldDbManager.ts

**Ubicación:** `src/lib/worldDbManager.ts`

**Operaciones:**
```typescript
export const worldDbManager = {
  getAll(): Promise<World[]>
  getById(id: string): Promise<World | null>
  create(world: Omit<World, 'id'>): Promise<World>
  update(id: string, world: Partial<World>): Promise<World | null>
  delete(id: string): Promise<boolean>
}
```

#### 2.2 Crear puebloDbManager.ts

**Ubicación:** `src/lib/puebloDbManager.ts`

**Operaciones:**
```typescript
export const puebloDbManager = {
  getAll(): Promise<Pueblo[]>
  getById(id: string): Promise<Pueblo | null>
  getByWorldId(worldId: string): Promise<Pueblo[]>
  create(pueblo: Omit<Pueblo, 'id'>): Promise<Pueblo>
  update(id: string, pueblo: Partial<Pueblo>): Promise<Pueblo | null>
  delete(id: string): Promise<boolean>
}
```

#### 2.3 Crear edificioDbManager.ts

**Ubicación:** `src/lib/edificioDbManager.ts`

**Operaciones:**
```typescript
export const edificioDbManager = {
  getAll(): Promise<Edificio[]>
  getById(id: string): Promise<Edificio | null>
  getByWorldId(worldId: string): Promise<Edificio[]>
  getByPuebloId(puebloId: string): Promise<Edificio[]>
  create(edificio: Omit<Edificio, 'id'>): Promise<Edificio>
  update(id: string, edificio: Partial<Edificio>): Promise<Edificio | null>
  delete(id: string): Promise<boolean>
  // Operaciones para puntos de interés
  addPOI(edificioId: string, poi: Omit<PointOfInterest, 'id'>): Promise<Edificio | null>
  updatePOI(edificioId: string, poiId: string, poi: Partial<PointOfInterest>): Promise<Edificio | null>
  removePOI(edificioId: string, poiId: string): Promise<Edificio | null>
}
```

#### 2.4 Crear Script de Migración

**Ubicación:** `scripts/migrate-mundo-pueblo-edificio-to-db.ts`

**Funcionalidad:**
```typescript
// Migrar Mundos
const worlds = worldManager.getAll();
for (const world of worlds) {
  await worldDbManager.create(world);
}

// Migrar Pueblos
const pueblos = puebloManager.getAll();
for (const pueblo of pueblos) {
  await puebloDbManager.create(pueblo);
}

// Migrar Edificios
const edificios = edificioManager.getAll();
for (const edificio of edificios) {
  await edificioDbManager.create(edificio);
}

// Crear backups
// Guardar en data-esparcraft-backup/[fecha]/
```

### Criterios de Finalización de Fase 2
- [ ] 3 managers creados (world, pueblo, edificio)
- [ ] Script de migración creado
- [ ] Datos migrados exitosamente
- [ ] Backup de archivos JSON creado

---

## 🚀 Fase 3: Creación de Models para Sesiones y Resúmenes {#fase-3-creación-de-models-para-sesiones-y-resúmenes}

### Objetivos
- [ ] Actualizar modelo Session en schema.prisma con FK
- [ ] Actualizar modelo SessionSummary en schema.prisma con FK
- [ ] Sincronizar esquema con DB

### Tareas Específicas

Ya incluidas en Fase 1, pero confirmar:

#### 3.1 Verificar Relaciones Session → NPC

```prisma
model Session {
  id             String   @id @default(cuid())
  npcId          String
  ...
  
  npc            NPC?       @relation("Session_NPC", fields: [npcId], references: [id])
  
  @@index([npcId])
}
```

#### 3.2 Verificar Relaciones Session → SessionSummary

```prisma
model SessionSummary {
  id             String   @id @default(cuid())
  sessionId      String
  ...
  
  session        Session?   @relation("SessionSummary_Session", fields: [sessionId], references: [id])
  
  @@index([sessionId])
}
```

#### 3.3 Verificar Campos JSON

```prisma
model Session {
  ...
  jugador        String   // JSON string de {nombre, raza, nivel, ...}
  messages       String   // JSON string de ChatMessage[]
  ...
}
```

### Criterios de Finalización de Fase 3
- [ ] Modelo Session actualizado en schema.prisma
- [ ] Modelo SessionSummary actualizado en schema.prisma
- [ ] `prisma db push` ejecutado
- [ ] Tablas creadas en SQLite

---

## 🚀 Fase 4: Migración de Sesiones Existentes {#fase-4-migración-de-sesiones-existentes}

### Objetivos
- [ ] Crear script de migración para sesiones
- [ ] Migrar sesiones de JSON a DB
- [ ] Migrar resúmenes de JSON a DB
- [ ] Verificar integridad de datos migrados

### Tareas Específicas

#### 4.1 Crear Script de Migración de Sesiones

**Ubicación:** `scripts/migrate-sessions-to-db.ts`

**Flujo:**
```typescript
import { sessionManager, summaryManager } from '@/lib/fileManager';
import { sessionDbManager, sessionSummaryDbManager } from '@/lib/sessionDbManager';

async function migrateSessions() {
  // 1. Leer sesiones de archivos JSON
  const sessions = sessionManager.getAll();
  console.log(`Encontradas ${sessions.length} sesiones`);

  // 2. Migrar cada sesión
  for (const session of sessions) {
    const summaryId = session.summary 
      ? await createSessionSummary(session)
      : null;
    
    await sessionDbManager.create({
      ...session,
      summaryId
    });
  }

  // 3. Migrar resúmenes
  const summaryDir = path.join(DATA_DIR, 'sessions', 'summaries');
  const files = listFiles(summaryDir);
  
  for (const file of files) {
    const summaryData = readJSON<SessionSummary>(path.join(summaryDir, file));
    if (summaryData) {
      await sessionSummaryDbManager.create(summaryData);
    }
  }

  console.log('Migración completada');
}
```

#### 4.2 Crear sessionSummaryDbManager.ts

**Ubicación:** `src/lib/sessionSummaryDbManager.ts`

**Operaciones:**
```typescript
export const sessionSummaryDbManager = {
  getById(id: string): Promise<SessionSummary | null>
  getBySessionId(sessionId: string): Promise<SessionSummary[]>
  getByNPCId(npcId: string): Promise<SessionSummary[]>
  create(summary: Omit<SessionSummary, 'id'>): Promise<SessionSummary>
  delete(id: string): Promise<boolean>
}
```

### Criterios de Finalización de Fase 4
- [ ] `sessionSummaryDbManager.ts` creado
- [ ] Script de migración de sesiones creado
- [ ] 1 sesión migrada
- [ ] 1 resumen migrado
- [ ] Backup creado en `db/sessions-backup/`

---

## 🚀 Fase 5: Creación de Managers Optimizados {#fase-5-creación-de-managers-optimizados}

### Objetivos
- [ ] Crear `sessionDbManager.ts` con includes optimizados
- [ ] Crear métodos especiales para queries complejas

### Tareas Específicas

#### 5.1 Crear sessionDbManager.ts

**Ubicación:** `src/lib/sessionDbManager.ts`

**Operaciones Básicas:**
```typescript
export const sessionDbManager = {
  getAll(): Promise<Session[]>
  getById(id: string): Promise<Session | null>
  getByNPCId(npcId: string): Promise<Session[]>
  create(session: Omit<Session, 'id' | 'startTime' | 'lastActivity'>): Promise<Session>
  update(id: string, session: Partial<Session>): Promise<Session | null>
  delete(id: string): Promise<boolean>
  addMessage(id: string, message: ChatMessage): Promise<Session | null>
  clearMessages(id: string): Promise<Session | null>
}
```

**Operaciones Optimizadas con Includes:**
```typescript
export const sessionDbManager = {
  // ✅ KEY METHOD: Obtiene sesión con TODO el contexto en UNA QUERY
  async getByIdWithFullContext(sessionId: string): Promise<Session | null> {
    return await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        npc: {
          include: {
            mundo: true,
            pueblo: {
              include: {
                mundo: true
              }
            },
            edificio: {
              include: {
                pueblo: {
                  include: {
                    mundo: true
                  }
                }
              }
            }
          }
        },
        summary: true
      }
    });
  },

  // Obtener sesiones por NPC con contexto
  async getByNPCIdWithNPC(npcId: string): Promise<Session[]> {
    return await prisma.session.findMany({
      where: { npcId: npcId },
      include: {
        npc: true,
        summary: true
      },
      orderBy: { lastActivity: 'desc' }
    });
  }
};
```

#### 5.2 Métodos de Historial de Resúmenes

```typescript
export const sessionDbManager = {
  addSummaryToHistory(id: string, summary: string, version: number): Promise<Session | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    // Crear nuevo SessionSummary
    const newSummary = await sessionSummaryDbManager.create({
      sessionId: id,
      npcId: existing.npcId,
      summary,
      version
    });

    // Actualizar sesión
    return await this.update(id, { 
      summaryId: newSummary.id 
    });
  },

  getSummaryHistory(id: string): Promise<SessionSummary[]> {
    return await sessionSummaryDbManager.getBySessionId(id);
  },

  getNextSummaryVersion(id: string): Promise<number> {
    const summaries = await this.getSummaryHistory(id);
    return summaries.length + 1;
  }
};
```

### Criterios de Finalización de Fase 5
- [ ] `sessionDbManager.ts` creado
- [ ] Métodos `getAll`, `getById`, `create`, `update`, `delete` implementados
- [ ] Métodos `addMessage`, `clearMessages` implementados
- [ ] ✅ Método `getByIdWithFullContext` implementado con includes anidados
- [ ] Métodos de historial de resúmenes implementados

---

## 🚀 Fase 6: Actualización de Trigger Handlers {#fase-6-actualización-de-trigger-handlers}

### Objetivos
- [ ] Actualizar `handleChatTrigger` para usar includes
- [ ] Actualizar `handleResumenSesionTrigger` para usar DB
- [ ] Actualizar `handleResumenNPCTrigger` para usar DB
- [ ] Actualizar `handleResumenEdificioTrigger` para usar DB
- [ ] Actualizar `handleResumenPuebloTrigger` para usar DB
- [ ] Actualizar `handleResumenMundoTrigger` para usar DB

### Tareas Específicas

#### 6.1 handleChatTrigger

**Antes:**
```typescript
// ❌ 5 consultas separadas
const npc = await npcDbManager.getById(npcid);
const mundo = worldManager.getById(npc.location.worldId);
const pueblo = puebloManager.getById(npc.location.puebloId);
const edificio = edificioManager.getById(npc.location.edificioId);
const session = sessionManager.getById(playersessionid);
// ... código manual para armar contexto
```

**Después:**
```typescript
// ✅ 1 sola query con includes
const session = await sessionDbManager.getByIdWithFullContext(playersessionid);

// Contexto disponible automáticamente:
// session.npc → NPC completo
// session.npc.mundo → Mundo completo
// session.npc.pueblo → Pueblo completo
// session.npc.edificio → Edificio completo
// session.npc.edificio.pueblo → Pueblo completo
// session.npc.edificio.pueblo.mundo → Mundo completo
```

#### 6.2 handleResumenSesionTrigger

**Antes:**
```typescript
const npc = npcManager.getById(npcid);
const session = sessionManager.getById(playersessionid);
const lastSummary = summaryManager.getSummary(sessionId);
// ... múltiples lecturas de archivos
```

**Después:**
```typescript
// ✅ 1 query con includes
const session = await sessionDbManager.getByIdWithFullContext(playersessionid);

// Último resumen disponible en session.summary
```

#### 6.3 handleResumenNPCTrigger

**Antes:**
```typescript
const npc = npcManager.getById(npcid);
const summaries = summaryManager.getSummariesByNPC(npcid);
// ... múltiples lecturas + filtrado manual
```

**Después:**
```typescript
// ✅ 1 query con includes
const summaries = await prisma.sessionSummary.findMany({
  where: { npcId: npcid },
  include: { npc: true },
  orderBy: { timestamp: 'desc' }
});

// Ya viene ordenado y filtrado por npcId
```

#### 6.4 handleResumenEdificioTrigger

**Antes:**
```typescript
const edificio = edificioManager.getById(edificioid);
const npcs = npcManager.getByEdificioId(edificioid);
// ... para cada NPC leer creator_notes manualmente
```

**Después:**
```typescript
// ✅ 1 query con includes
const edificio = await prisma.edificio.findUnique({
  where: { id: edificioid },
  include: {
    npcs: true  // Obtiene todos los NPCs automáticamente
  }
});

// edificio.npcs.forEach(npc => {
//   npc.card (incluye creator_notes) está disponible
// });
```

#### 6.5 handleResumenPuebloTrigger

**Antes:**
```typescript
const pueblo = puebloManager.getById(pueblid);
const edificios = edificioManager.getByPuebloId(pueblid);
// ... para cada edificio leer rumores manualmente
```

**Después:**
```typescript
// ✅ 1 query
const pueblo = await prisma.pueblo.findUnique({
  where: { id: pueblid },
  include: {
    edificios: true  // Obtiene todos los edificios
  }
});

// pueblo.edificios.forEach(edif => {
//   edif.lore (incluye rumores) está disponible
// });
```

#### 6.6 handleResumenMundoTrigger

**Antes:**
```typescript
const mundo = worldManager.getById(mundoid);
const pueblos = puebloManager.getByWorldId(mundoid);
// ... para cada pueblo leer rumores manualmente
```

**Después:**
```typescript
// ✅ 1 query
const mundo = await prisma.world.findUnique({
  where: { id: mundoid },
  include: {
    pueblos: true  // Obtiene todos los pueblos
  }
});

// mundo.pueblos.forEach(pueblo => {
//   pueblo.lore (incluye rumores) está disponible
// });
```

### Criterios de Finalización de Fase 6
- [ ] `handleChatTrigger` actualizado
- [ ] `handleResumenSesionTrigger` actualizado
- [ ] `handleResumenNPCTrigger` actualizado
- [ ] `handleResumenEdificioTrigger` actualizado
- [ ] `handleResumenPuebloTrigger` actualizado
- [ ] `handleResumenMundoTrigger` actualizado
- [ ] Todos usando `sessionDbManager.getByIdWithFullContext`
- [ ] Eliminadas referencias a managers de archivos JSON

---

## 🚀 Fase 7: Actualización de API Routes {#fase-7-actualización-de-api-routes}

### Objetivos
- [ ] Actualizar rutas de Sessions para usar DB
- [ ] Actualizar rutas de SessionSummary para usar DB
- [ ] Actualizar rutas de NPCs summaries para usar DB

### Tareas Específicas

#### 7.1 /api/sessions/route.ts

**Antes:**
```typescript
import { sessionManager } from '@/lib/fileManager';

export async function GET() {
  const sessions = sessionManager.getAll();  // Archivos JSON
  // ...
}
```

**Después:**
```typescript
import { sessionDbManager } from '@/lib/sessionDbManager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const npcId = searchParams.get('npcId');

  let sessions;
  if (npcId) {
    sessions = await sessionDbManager.getByNPCIdWithNPC(npcId);
  } else {
    sessions = await sessionDbManager.getAll();
  }

  return NextResponse.json({
    success: true,
    data: sessions
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const newSession = await sessionDbManager.create(body);
  // ...
}
```

#### 7.2 /api/sessions/[id]/route.ts

**Cambios:**
```typescript
// Usar sessionDbManager.getById en lugar de sessionManager.getById
// Usar sessionDbManager.update en lugar de sessionManager.update
// Usar sessionDbManager.delete en lugar de sessionManager.delete
```

#### 7.3 /api/sessions/[id]/summary/route.ts

**Cambios:**
```typescript
import { sessionDbManager, sessionSummaryDbManager } from '@/lib';

export async function GET() {
  const session = await sessionDbManager.getById(id);
  
  if (!session) {
    return NextResponse.json({
      success: true,
      data: { summary: null, summaryData: null }
    });
  }

  // Último resumen está en session.summary (FK)
  let summary = null;
  let summaryData = null;

  if (session.summaryId) {
    summaryData = await sessionSummaryDbManager.getById(session.summaryId);
    if (summaryData) {
      summary = summaryData.summary;
    }
  }

  return NextResponse.json({
    success: true,
    data: { summary, summaryData }
  });
}
```

#### 7.4 /api/sessions/[id]/summaries/route.ts

**Cambios:**
```typescript
import { sessionSummaryDbManager } from '@/lib/sessionSummaryDbManager';

export async function GET() {
  const summaryHistory = await sessionDbManager.getSummaryHistory(id);

  return NextResponse.json({
    success: true,
    data: {
      sessionId: id,
      summaryHistory,
      count: summaryHistory.length
    }
  });
}
```

#### 7.5 /api/npcs/[id]/summaries/route.ts

**Cambios:**
```typescript
import { sessionSummaryDbManager } from '@/lib/sessionSummaryDbManager';

export async function GET() {
  const summaries = await sessionSummaryDbManager.getByNPCId(id);

  return NextResponse.json({
    success: true,
    data: {
      npcId: id,
      summaries: summaries,
      count: summaries.length
    }
  });
}
```

### Criterios de Finalización de Fase 7
- [ ] `/api/sessions/route.ts` actualizado
- [ ] `/api/sessions/[id]/route.ts` actualizado
- [ ] `/api/sessions/[id]/summary/route.ts` actualizado
- [ ] `/api/sessions/[id]/summaries/route.ts` actualizado
- [ ] `/api/npcs/[id]/summaries/route.ts` actualizado
- [ ] Todas las rutas usando managers de DB

---

## 🚀 Fase 8: Testing y Verificación {#fase-8-testing-y-verificación}

### Objetivos
- [ ] Probar funcionalidad de chat
- [ ] Probar generación de resúmenes
- [ ] Probar consultas de sesiones
- [ ] Verificar integridad de datos
- [ ] Performance testing básico

### Tareas Específicas

#### 8.1 Testing de Chat

**Escenario 1: Nueva sesión**
```bash
POST /api/v1
{
  "mode": "chat",
  "npcid": "NPC_1768825922617",
  "message": "Hola, ¿cómo estás?",
  "jugador": { "nombre": "Test", "raza": "Humano" }
}

✅ Esperado: Sesión creada en DB
✅ Esperado: Mensajes guardados en DB
✅ Esperado: Respuesta de NPC generada
```

**Escenario 2: Sesión existente**
```bash
POST /api/v1
{
  "mode": "chat",
  "npcid": "NPC_1768825922617",
  "playersessionid": "SESSION_xxx",
  "message": "Hola de nuevo"
}

✅ Esperado: Sesión recuperada de DB con includes
✅ Esperado: Contexto completo (mundo, pueblo, edificio)
✅ Esperado: Mensaje agregado a sesión existente
```

#### 8.2 Testing de Resúmenes

**Escenario 1: Resumen de sesión**
```bash
POST /api/v1
{
  "mode": "resumen_sesion",
  "npcid": "NPC_1768825922617",
  "playersessionid": "SESSION_xxx"
}

✅ Esperado: SessionSummary creado en DB
✅ Esperado: FK actualizada en Session
✅ Esperado: Mensajes limpiados de Session
```

**Escenario 2: Resumen de NPC**
```bash
POST /api/v1
{
  "mode": "resumen_npc",
  "npcid": "NPC_1768825922617"
}

✅ Esperado: Todos los resúmenes del NPC obtenidos con 1 query
✅ Esperado: NPC.card.creator_notes actualizado con resumen consolidado
```

#### 8.3 Testing de Frontend

**Sessions Tab:**
- [ ] Cargar lista de sesiones
- [ ] Ver detalles de sesión
- [ ] Ver historial de chat
- [ ] Crear nueva sesión de prueba
- [ ] Enviar mensaje a sesión
- [ ] Eliminar sesión

**Router Tab:**
- [ ] Enviar chat con sesión nueva
- [ ] Enviar chat con sesión existente
- [ ] Generar resumen de sesión
- [ ] Generar resumen de NPC

#### 8.4 Verificación de Datos

**Consultas SQL de verificación:**
```sql
-- Verificar que todas las sesiones tienen NPC
SELECT COUNT(*) FROM Session WHERE npcId IS NOT NULL;

-- Verificar FKs válidos
SELECT COUNT(*) FROM Session 
WHERE npcId IN (SELECT id FROM NPC);

-- Verificar que todos los resúmenes tienen sesión y NPC
SELECT COUNT(*) FROM SessionSummary 
WHERE sessionId IN (SELECT id FROM Session)
  AND npcId IN (SELECT id FROM NPC);

-- Verificar que el NPC tiene resumen consolidado
SELECT COUNT(*) FROM NPC 
WHERE card LIKE '%creator_notes%' 
  AND card LIKE '%resumen%';
```

### Criterios de Finalización de Fase 8
- [ ] Chat con nueva sesión funcional
- [ ] Chat con sesión existente funcional
- [ ] Resumen de sesión funcional
- [ ] Resumen de NPC funcional
- [ ] Frontend cargando sesiones correctamente
- [ ] Datos consistentes (sin FKs rotos)

---

## 🚀 Fase 9: Limpieza Final {#fase-9-limpieza-final}

### Objetivos
- [ ] Documentar cambios realizados
- [ ] Crear backup final
- [ ] Verificar que no quedan referencias a managers de archivos JSON
- [ ] Actualizar documentación

### Tareas Específicas

#### 9.1 Documentación

**Crear `/home/z/my-project/docs/DB_MIGRATION_COMPLETE.md`:**
- [ ] Resumen de migración
- [ ] Cambios en esquema
- [ ] Nuevos managers creados
- [ ] Cambios en handlers y rutas
- [ ] Guía de troubleshooting

#### 9.2 Backup Final

**Crear backup completo:**
```bash
# Backup de archivos JSON originales
cp -r data-esparcraft data-esparcraft-backup-final-[timestamp]

# Backup de base de datos
cp db/custom.db db/custom.db-backup-final-[timestamp]
```

#### 9.3 Limpieza de Código

**Buscar referencias obsoletas:**
```bash
grep -r "worldManager\|puebloManager\|edificioManager" src/lib/triggerHandlers.ts
grep -r "sessionManager.*from.*fileManager" src/app/api/
```

**Eliminar o actualizar referencias:**
- [ ] Actualizar imports para usar DB managers
- [ ] Eliminar código comentado con managers de archivos

#### 9.4 Actualizar package.json Scripts

**Agregar scripts útiles:**
```json
{
  "scripts": {
    "migrate:all": "bun scripts/migrate-world-pueblo-edificio-to-db.ts && bun scripts/migrate-sessions-to-db.ts",
    "db:seed": "bun scripts/seed-db.ts",
    "db:backup": "bun scripts/backup-db.ts",
    "db:verify": "bun scripts/verify-data-integrity.ts"
  }
}
```

### Criterios de Finalización de Fase 9
- [ ] Documentación completa creada
- [ ] Backup final creado
- [ ] Referencias obsoletas eliminadas
- [ ] Scripts útiles agregados a package.json

---

## 📊 Métricas de Éxito

### Performance Esperado

| Operación | Antes (Archivos) | Después (DB + FK) | Mejora |
|-----------|-------------------|-------------------|---------|
| **Chat (nueva sesión)** | ~100-150ms | ~20-30ms | **5x más rápido** |
| **Chat (sesión existente)** | ~150-250ms | ~25-40ms | **6x más rápido** |
| **Resumen Sesión** | ~80-120ms | ~30-50ms | **3x más rápido** |
| **Resumen NPC** | ~300-500ms | ~40-60ms | **8x más rápido** |
| **Resumen Edificio** | ~400-700ms | ~50-80ms | **8x más rápido** |
| **Resumen Pueblo** | ~500-900ms | ~60-100ms | **9x más rápido** |

### Calidad de Código

| Métrica | Objetivo |
|----------|----------|
| **Consultas por request** | 1 (con includes) |
| **Manejadores actualizados** | 100% |
| **Test suite pass** | 100% |
| **Sin referencias obsoletas** | 100% |

---

## ⚠️ Consideraciones Importantes

### 1. Rollback Plan

**Si algo falla durante migración:**
```bash
# Restaurar archivos JSON
cp -r data-esparcraft-backup-final-[timestamp]/* data-esparcraft/

# Restaurar base de datos
cp db/custom.db-backup-final-[timestamp] db/custom.db

# Regresar a código anterior (git)
git checkout <commit-antes-de-migracion>
```

### 2. Migración Gradual

**Opción: Implementar fase por fase**

**Fase 1 + 2:** Migrar Mundo, Pueblo, Edificio
- Testear funcionalidad básica
- No afecta chat todavía

**Fase 3 + 4:** Migrar Sesiones y Resúmenes
- Testear chat completo
- Verificar integración

**Fase 5 + 6:** Actualizar Handlers y Routes
- Testear todo el sistema
- Performance testing

**Fase 7 + 8 + 9:** Testing final y limpieza
- Verificación completa
- Documentación

### 3. Datos Sensibles

**Manejo de datos de jugadores:**
- Los datos de `jugador` se guardan en DB como JSON
- Contiene información personal del jugador
- Considerar encriptación si es necesario

**Memoria de NPCs (creator_notes):**
- Contiene resúmenes de conversaciones
- Puede contener información sensible del juego
- No eliminar nunca sin confirmación

### 4. Compatibilidad

**Mantener durante migración:**
- API contracts (request/response)
- Formato de datos JSON
- Nombres de campos
- Estructura de respuestas

**Cambios permitidos:**
- Mejora de performance
- Adición de campos opcionales
- Mejoras en validación

---

## 🎯 Próximos Pasos

### Inmediato
1. Revisar este plan completo
2. Decidir si implementar todo de una vez o fase por fase
3. Comenzar con Fase 1

### Post-Migración
1. Considerar migrar Mundos, Pueblos, Edificios también
2. Implementar estadísticas y analytics
3. Implementar limpieza automática de datos antiguos
4. Considerar migrar a PostgreSQL para producción

---

## 📝 Notas de Implementación

### Durante la implementación, recordar:

1. **Siempre usar includes anidados** para queries complejas
   ```typescript
   include: {
     npc: {
       include: {
         mundo: true,
         pueblo: {
           include: { mundo: true }
         }
       }
     }
   }
   ```

2. **Usar `prisma.session.findUnique`** cuando se necesita un solo registro
3. **Usar índices apropiadamente** - ya están definidos en el esquema
4. **Validar errores de FK** - Prisma maneja esto automáticamente
5. **Probar cada fase** antes de continuar a la siguiente

### Comandos útiles durante implementación

```bash
# Sincronizar esquema
bun run db:push

# Regenerar Prisma Client
bun run db:generate

# Migrar datos
bun scripts/migrate-world-pueblo-edificio-to-db.ts
bun scripts/migrate-sessions-to-db.ts

# Reiniciar servidor
# (Ctrl+C) y luego bun run dev

# Ver logs
tail -f dev.log

# Lint
bun run lint
```

---

## ✅ Checklist Final de Validación

### Validación de Funcionalidad
- [ ] Chat con nueva sesión funciona
- [ ] Chat con sesión existente funciona
- [ ] Contexto completo cargado (mundo, pueblo, edificio)
- [ ] Resumen de sesión funciona
- [ ] Historial de resúmenes funciona
- [ ] Resumen de NPC funciona
- [ ] NPC card.creator_notes actualizado
- [ ] Resumen de edificio funciona
- [ ] Resumen de pueblo funciona
- [ ] Resumen de mundo funciona
- [ ] Frontend SessionsTab funciona
- [ ] Frontend RouterTab funciona

### Validación de Performance
- [ ] Chat < 50ms (nueva sesión)
- [ ] Chat < 80ms (sesión existente)
- [ ] Resumen sesión < 60ms
- [ ] Resumen NPC < 100ms
- [ ] Resumen edificio < 120ms
- [ ] Resumen pueblo < 150ms

### Validación de Datos
- [ ] Sin FKs rotos (todas las sesiones tienen NPC válido)
- [ ] Sin datos huérfanos
- [ ] Contadores consistentes (sessions.count = summaries.count)
- [ ] Backup creado exitosamente

### Validación de Código
- [ ] Sin referencias a managers de archivos JSON en triggerHandlers
- [ ] Sin referencias a managers de archivos JSON en API routes
- [ ] ESLint sin errores
- [ ] TypeScript sin errores
- [ ] Código bien documentado

---

**¿Estás listo para comenzar con la Fase 1?**
