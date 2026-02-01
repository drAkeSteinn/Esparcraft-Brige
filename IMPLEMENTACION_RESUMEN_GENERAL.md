# Implementación de Resumen General

**Estado del Sistema Actual de Reemplazo de Variables:**

✅ **Resumen de Sesión**:
- Usa `buildCompleteSessionSummaryPrompt` con `grimorioTemplates: []`
- Usa `replaceVariables(basePrompt, varContext)` - SOLO reemplaza variables primarias
- NO usa plantillas del Grimorio

✅ **Resumen de NPC**:
- Usa `buildNPCSummaryPrompt`
- Usa `resolveAllVariables(systemPromptRaw, varContext, grimorioCards)` - Reemplaza variables primarias Y plantillas del Grimorio

✅ **Resumen de Edificio**:
- Usa `buildEdificioSummaryPrompt`
- Usa `resolveAllVariables(systemPromptRaw, varContext, grimorioCards)` - Reemplaza variables primarias Y plantillas del Grimorio

✅ **Resumen de Pueblo**:
- Usa `buildPuebloSummaryPrompt`
- Usa `resolveAllVariables(systemPromptRaw, varContext, grimorioCards)` - Reemplaza variables primarias Y plantillas del Grimorio

✅ **Resumen de Mundo**:
- Usa `buildWorldSummaryPrompt`
- Usa `resolveAllVariables(systemPromptRaw, varContext, grimorioCards)` - Reemplaza variables primarias Y plantillas del Grimorio

---

## 📋 Índice de Implementación

- [FASE 0: Base de Datos](#fase-0-base-de-datos)
- [FASE 1: Utilidades de Hash](#fase-1-utilidades-de-hash)
- [FASE 2: DbManagers para Resúmenes](#fase-2-dbmanagers-para-resúmenes)
- [FASE 3: TriggerExecutor](#fase-3-triggerexecutor)
- [FASE 4: ResumenGeneralService](#fase-4-resumengeneralservice)
- [FASE 5: Bloqueo en API de Chat](#fase-5-bloqueo-en-api-de-chat)
- [FASE 6: API Routes](#fase-6-api-routes)
- [FASE 7: Frontend - RouterTab UI](#fase-7-frontend---routertab-ui)

---

## 🗄 FASE 0: Base de Datos

### Archivo: `prisma/schema.prisma`

Agregar estos modelos al final del schema:

```prisma
// SystemConfig - Configuración y estado del sistema
model SystemConfig {
  id             String   @id @default(cuid())
  key            String   @unique // 'resumen_general_status'
  value          String   // 'idle' | 'running' | 'error'
  updatedAt      DateTime @updatedAt
  metadata       String?  // JSON con información adicional (fase actual, progreso, configuración)

  @@index([key])
}

// NPC Summary - Resúmenes consolidados de NPCs
model NPCSummary {
  id             String   @id @default(cuid())
  npcId          String
  summary        String
  version        Int      @default(1)
  sessionHash    String   // Hash de los resúmenes de sesiones usados para generar este resumen
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([npcId])
  @@index([sessionHash])
}

// Edificio Summary - Resúmenes consolidados de edificios
model EdificioSummary {
  id             String   @id @default(cuid())
  edificioId     String
  summary        String
  version        Int      @default(1)
  npcHash        String   // Hash de los resúmenes de NPCs usados
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([edificioId])
  @@index([npcHash])
}

// Pueblo Summary - Resúmenes consolidados de pueblos
model PuebloSummary {
  id             String   @id @default(cuid())
  puebloId       String
  summary        String
  version        Int      @default(1)
  edificioHash   String   // Hash de los resúmenes de edificios usados
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([puebloId])
  @@index([edificioHash])
}

// World Summary - Resúmenes consolidados de mundos
model WorldSummary {
  id             String   @id @default(cuid())
  worldId        String
  summary        String
  version        Int      @default(1)
  puebloHash     String   // Hash de los resúmenes de pueblos usados
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([worldId])
  @@index([puebloHash])
}
```

**Ejecutar después de modificar schema:**
```bash
bun run db:push
```

---

## 🔐 FASE 1: Utilidades de Hash

### Archivo: `src/lib/hashUtils.ts`

Crear nuevo archivo:

```typescript
import crypto from 'crypto';

/**
 * Genera un hash SHA256 de un string
 */
export function generateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Genera un hash de los resúmenes de sesiones de un NPC
 * Se usa para detectar si hubo cambios entre ejecuciones
 */
export function generateSessionSummariesHash(summaries: any[]): string {
  if (!summaries || summaries.length === 0) {
    return generateHash('empty');
  }

  // Ordenar por timestamp para consistencia
  const sortedSummaries = [...summaries].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Concatenar de forma determinista
  const concatenated = sortedSummaries.map(s => 
    `${s.sessionId}:${s.summary}:${s.timestamp}`
  ).join('|||');

  return generateHash(concatenated);
}

/**
 * Genera un hash de los resúmenes de NPCs de un edificio
 */
export function generateNPCSummariesHash(summaries: any[]): string {
  if (!summaries || summaries.length === 0) {
    return generateHash('empty');
  }

  const sortedSummaries = [...summaries].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const concatenated = sortedSummaries.map(s => 
    `${s.npcId}:${s.summary}:${s.version}:${s.createdAt}`
  ).join('|||');

  return generateHash(concatenated);
}

/**
 * Genera un hash de los resúmenes de edificios de un pueblo
 */
export function generateEdificioSummariesHash(summaries: any[]): string {
  if (!summaries || summaries.length === 0) {
    return generateHash('empty');
  }

  const sortedSummaries = [...summaries].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const concatenated = sortedSummaries.map(s => 
    `${s.edificioId}:${s.summary}:${s.version}:${s.createdAt}`
  ).join('|||');

  return generateHash(concatenated);
}

/**
 * Genera un hash de los resúmenes de pueblos de un mundo
 */
export function generatePuebloSummariesHash(summaries: any[]): string {
  if (!summaries || summaries.length === 0) {
    return generateHash('empty');
  }

  const sortedSummaries = [...summaries].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const concatenated = sortedSummaries.map(s => 
    `${s.puebloId}:${s.summary}:${s.version}:${s.createdAt}`
  ).join('|||');

  return generateHash(concatenated);
}
```

---

## 💾 FASE 2: DbManagers para Resúmenes

### Archivo: `src/lib/resumenSummaryDbManager.ts`

Crear nuevo archivo:

```typescript
import { db } from './db';

/**
 * NPC Summary Manager
 */
export class NPCSummaryManager {
  static async getLatest(npcId: string) {
    return await db.nPCSummary.findFirst({
      where: { npcId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async create(data: {
    npcId: string;
    summary: string;
    sessionHash: string;
    version: number;
  }) {
    return await db.nPCSummary.create({
      data
    });
  }

  static async getAll() {
    return await db.nPCSummary.findMany();
  }

  static async getAllByNPCId(npcId: string) {
    return await db.nPCSummary.findMany({
      where: { npcId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getByHash(hash: string) {
    return await db.nPCSummary.findFirst({
      where: { sessionHash: hash }
    });
  }
}

/**
 * Edificio Summary Manager
 */
export class EdificioSummaryManager {
  static async getLatest(edificioId: string) {
    return await db.edificioSummary.findFirst({
      where: { edificioId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async create(data: {
    edificioId: string;
    summary: string;
    npcHash: string;
    version: number;
  }) {
    return await db.edificioSummary.create({
      data
    });
  }

  static async getAll() {
    return await db.edificioSummary.findMany();
  }

  static async getByHash(hash: string) {
    return await db.edificioSummary.findFirst({
      where: { npcHash: hash }
    });
  }
}

/**
 * Pueblo Summary Manager
 */
export class PuebloSummaryManager {
  static async getLatest(puebloId: string) {
    return await db.puebloSummary.findFirst({
      where: { puebloId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async create(data: {
    puebloId: string;
    summary: string;
    edificioHash: string;
    version: number;
  }) {
    return await db.puebloSummary.create({
      data
    });
  }

  static async getAll() {
    return await db.puebloSummary.findMany();
  }

  static async getByHash(hash: string) {
    return await db.puebloSummary.findFirst({
      where: { edificioHash: hash }
    });
  }
}

/**
 * World Summary Manager
 */
export class WorldSummaryManager {
  static async getLatest(worldId: string) {
    return await db.worldSummary.findFirst({
      where: { worldId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async create(data: {
    worldId: string;
    summary: string;
    puebloHash: string;
    version: number;
  }) {
    return await db.worldSummary.create({
      data
    });
  }

  static async getAll() {
    return await db.worldSummary.findMany();
  }

  static async getByHash(hash: string) {
    return await db.worldSummary.findFirst({
      where: { puebloHash: hash }
    });
  }
}

// Exportar instancias singleton
export const npcSummaryDbManager = new NPCSummaryManager();
export const edificioSummaryDbManager = new EdificioSummaryManager();
export const puebloSummaryDbManager = new PuebloSummaryManager();
export const worldSummaryDbManager = new WorldSummaryManager();
```

---

## ⚡ FASE 3: TriggerExecutor

### Archivo: `src/lib/triggerExecutor.ts`

Este archivo contiene la lógica de ejecución de triggers, reutilizable por:
1. `/api/reroute/route.ts` - Para HTTP requests normales
2. `resumenGeneralService.ts` - Para ejecutar resúmenes en background

```typescript
import {
  AnyTriggerPayload,
  TriggerMode,
  ChatTriggerPayload,
  ResumenSesionTriggerPayload,
  ResumenNPCTriggerPayload,
  ResumenEdificioTriggerPayload,
  ResumenPuebloTriggerPayload,
  ResumenMundoTriggerPayload,
  NuevoLoreTriggerPayload,
  ChatMessage,
  VariableContext
} from './types';
import {
  npcDbManager,
  sessionDbManager,
  worldDbManager,
  puebloDbManager,
  edificioDbManager,
  sessionSummaryDbManager
} from './db';
import { npcStateManager, grimorioManager } from './fileManager';
import {
  handleResumenSesionTrigger,
  handleResumenNPCTrigger,
  handleResumenEdificioTrigger,
  handleResumenPuebloTrigger,
  handleResumenMundoTrigger
} from './triggerHandlers';
import { callLLM } from './llmService';
import { getCardField } from './types';
import {
  buildCompleteSessionSummaryPrompt,
  buildNPCSummaryPrompt,
  buildEdificioSummaryPrompt,
  buildPuebloSummaryPrompt,
  buildWorldSummaryPrompt
} from './promptBuilder';
import { replaceVariables, resolveAllVariables } from './grimorioUtils';

/**
 * Resultado de ejecución de un trigger
 */
export interface TriggerExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * ✅ FUNCIÓN CENTRAL DE EJECUCIÓN
 * 
 * Esta función hace EXACTAMENTE lo mismo que /api/reroute/route.ts
 * pero sin la capa HTTP/NextResponse
 * 
 * Garantiza:
 * ✅ Construcción de prompts idéntica
 * ✅ Reemplazo de variables primarias (usando replaceVariables)
 * ✅ Reemplazo de plantillas del Grimorio (usando resolveAllVariables)
 * ✅ Misma lógica de LLM
 * 
 * @param payload - Payload completo del trigger
 * @returns Resultado de la ejecución
 */
export async function executeTrigger(
  payload: AnyTriggerPayload
): Promise<TriggerExecutionResult> {
  try {
    const { mode } = payload;

    // Verificar si resumen general está corriendo
    const systemConfig = await db.systemConfig.findUnique({
      where: { key: 'resumen_general_status' }
    });

    if (systemConfig?.value === 'running' && mode === 'chat') {
      return {
        success: true,
        data: { response: "resumen_general" }
      };
    }

    // ✅ DELEGAR AL HANDLER CORRECTO
    switch (mode) {
      case 'chat':
        return await executeChat(payload as ChatTriggerPayload);
      
      case 'resumen_sesion':
        return await executeResumenSesion(payload as ResumenSesionTriggerPayload);
      
      case 'resumen_npc':
        return await executeResumenNPC(payload as ResumenNPCTriggerPayload);
      
      case 'resumen_edificio':
        return await executeResumenEdificio(payload as ResumenEdificioTriggerPayload);
      
      case 'resumen_pueblo':
        return await executeResumenPueblo(payload as ResumenPuebloTriggerPayload);
      
      case 'resumen_mundo':
        return await executeResumenMundo(payload as ResumenMundoTriggerPayload);
      
      case 'nuevo_lore':
        return await executeNuevoLore(payload as NuevoLoreTriggerPayload);
      
      default:
        return {
          success: false,
          error: `Unknown trigger mode: ${mode}`
        };
    }
  } catch (error) {
    console.error('[executeTrigger] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// ========================================================================
// RESUMEN DE SESIÓN
// ========================================================================

async function executeResumenSesion(
  payload: ResumenSesionTriggerPayload
): Promise<TriggerExecutionResult> {
  const { npcid, playersessionid, systemPrompt, lastSummary, chatHistory } = payload;

  // Get NPC and session
  const npc = await npcDbManager.getById(npcid);
  if (!npc) {
    return { success: false, error: `NPC with id ${npcid} not found` };
  }

  const session = await sessionDbManager.getById(playersessionid);
  if (!session) {
    return { success: false, error: `Session ${playersessionid} not found` };
  }

  // Get context (world, pueblo, edificio)
  const world = await worldDbManager.getById(npc.location.worldId);
  const pueblo = npc.location.puebloId ? await puebloDbManager.getById(npc.location.puebloId) : undefined;
  const edificio = npc.location.edificioId ? await edificioDbManager.getById(npc.location.edificioId) : undefined;

  // ✅ LEER CONFIGURACIÓN DE SYSTEM PROMPT
  let configSystemPrompt = systemPrompt;
  if (!configSystemPrompt) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'resumen-sesion-trigger-config.json');
      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        configSystemPrompt = config.systemPrompt || '';
      } catch (error) {
        configSystemPrompt = '';
      }
    } catch (error) {
      configSystemPrompt = '';
    }
  }

  // ✅ CONSTRUIR EL PROMPT COMPLETO
  // NOTA: NO usa plantillas del Grimorio (grimorioTemplates: [])
  const basePrompt = buildCompleteSessionSummaryPrompt({
    world,
    pueblo,
    edificio,
    npc,
    session
  }, {
    systemPrompt: configSystemPrompt,
    lastSummary,
    chatHistory: chatHistory || session.messages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
    grimorioTemplates: [] // ✅ NO USAR PLANTILLAS DE GRIMORIO
  });

  // ✅ REEMPLAZAR VARIABLES PRIMARIAS
  const varContext: VariableContext = {
    npc,
    world,
    pueblo,
    edificio,
    session,
    char: getCardField(npc?.card, 'name', ''),
    lastSummary
  };
  const resolvedPrompt = replaceVariables(basePrompt, varContext);

  // ✅ CONSTRUIR MENSAJES
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: resolvedPrompt,
      timestamp: new Date().toISOString()
    }
  ];

  // ✅ LLAMAR AL LLM
  const llmResponse = await callLLM({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 4000
  });

  const summary = llmResponse.choices[0].message.content;

  // ✅ GUARDAR EN DB
  await sessionSummaryDbManager.create({
    sessionId: playersessionid,
    npcId: npcid,
    playerName: session.playerName,
    npcName: getCardField(npc.card, 'name', ''),
    summary,
    timestamp: new Date().toISOString(),
    version: 1
  });

  return {
    success: true,
    data: { summary }
  };
}

// ========================================================================
// RESUMEN DE NPC
// ========================================================================

async function executeResumenNPC(
  payload: ResumenNPCTriggerPayload
): Promise<TriggerExecutionResult> {
  const { npcid, systemPrompt, allSummaries } = payload;

  // Get NPC
  const npc = await npcDbManager.getById(npcid);
  if (!npc) {
    return { success: false, error: `NPC with id ${npcid} not found` };
  }

  // Get context (world, pueblo, edificio)
  const world = await worldDbManager.getById(npc.location.worldId);
  const pueblo = npc.location.puebloId ? await puebloDbManager.getById(npc.location.puebloId) : undefined;
  const edificio = npc.location.edificioId ? await edificioDbManager.getById(npc.location.edificioId) : undefined;

  // ✅ LEER CONFIGURACIÓN
  let configSystemPrompt = systemPrompt;
  if (!configSystemPrompt) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'resumen-npc-trigger-config.json');
      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        configSystemPrompt = config.systemPrompt || '';
      } catch (error) {
        configSystemPrompt = '';
      }
    } catch (error) {
      configSystemPrompt = '';
    }
  }

  // ✅ OBTENER RESÚMENES DE SESIONES DEL NPC
  const npcSummaries = await sessionSummaryDbManager.getByNPCId(npcid);
  let formattedSummaries = allSummaries;

  if (!formattedSummaries && npcSummaries.length > 0) {
    const summariesByPlayer = npcSummaries.reduce((acc, s) => {
      const playerName = s.playerName || 'Unknown';
      if (!acc[playerName]) acc[playerName] = [];
      acc[playerName].push(s);
      return acc;
    }, {} as Record<string, any[]>);

    const memoriesSections: string[] = [];
    for (const [playerName, summaries] of Object.entries(summariesByPlayer)) {
      memoriesSections.push(`Memoria de ${playerName}`);
      summaries.forEach(s => memoriesSections.push(s.summary));
    }

    formattedSummaries = `***
MEMORIAS DE LOS AVENTUREROS
${memoriesSections.join('\n')}
***`;
  }

  // ✅ CONSTRUIR EL PROMPT COMPLETO
  const existingMemory = npcStateManager.getMemory(npcid) || {};
  const npcName = getCardField(npc?.card, 'name', '');
  const varContext: VariableContext = {
    npc,
    world,
    pueblo,
    edificio,
    char: npcName
  };

  let messages = buildNPCSummaryPrompt(
    npc,
    [],
    existingMemory,
    {
      systemPrompt: configSystemPrompt,
      allSummaries: formattedSummaries
    }
  );

  // ✅ REEMPLAZAR VARIABLES PRIMARIAS Y PLANTILLAS DE GRIMORIO
  const grimorioCards = grimorioManager.getAll();
  const systemPromptRaw = messages[0]?.content || '';
  const { result: systemPromptResolved } = resolveAllVariables(
    systemPromptRaw, 
    varContext, 
    grimorioCards
  );

  messages = [
    {
      role: 'system',
      content: systemPromptResolved,
      timestamp: new Date().toISOString()
    },
    ...messages.slice(1)
  ];

  // ✅ LLAMAR AL LLM
  const llmResponse = await callLLM({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 4000
  });

  const summary = llmResponse.choices[0].message.content;

  // ✅ ACTUALIZAR MEMORIA DEL NPC
  npcStateManager.updateMemory(npcid, {
    ...existingMemory,
    last_summary: summary
  });

  return {
    success: true,
    data: { summary }
  };
}

// ========================================================================
// RESUMEN DE EDIFICIO
// ========================================================================

async function executeResumenEdificio(
  payload: ResumenEdificioTriggerPayload
): Promise<TriggerExecutionResult> {
  const { edificioid, systemPrompt } = payload;

  const edificio = await edificioDbManager.getById(edificioid);
  if (!edificio) {
    return { success: false, error: `Edificio with id ${edificioid} not found` };
  }

  // Get context (world, pueblo)
  const world = await worldDbManager.getById(edificio.worldId);
  const pueblo = edificio.puebloId ? await puebloDbManager.getById(edificio.puebloId) : undefined;

  // ✅ LEER CONFIGURACIÓN
  let configSystemPrompt = systemPrompt;
  if (!configSystemPrompt) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'resumen-edificio-trigger-config.json');
      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        configSystemPrompt = config.systemPrompt || '';
      } catch (error) {
        configSystemPrompt = '';
      }
    } catch (error) {
      configSystemPrompt = '';
    }
  }

  // ✅ OBTENER creator_notes DE LOS NPCs
  const npcs = await npcDbManager.getByEdificioId(edificioid);
  const npcSummaries = npcs
    .map(npc => {
      const creatorNotes = npc?.card?.data?.creator_notes || '';
      return {
        npcId: npc.id,
        npcName: npc.card?.data?.name || npc.card?.name || 'Unknown',
        consolidatedSummary: creatorNotes
      };
    })
    .filter(n => n.consolidatedSummary !== '');

  // ✅ CONSTRUIR EL PROMPT COMPLETO
  const edificioName = edificio.name;
  const varContext: VariableContext = {
    edificio,
    world,
    pueblo,
    char: edificioName
  };

  let messages = buildEdificioSummaryPrompt(
    edificio,
    [],
    undefined,
    {
      systemPrompt: configSystemPrompt
    }
  );

  // ✅ REEMPLAZAR VARIABLES PRIMARIAS Y PLANTILLAS DE GRIMORIO
  const grimorioCards = grimorioManager.getAll();
  const systemPromptRaw = messages[0]?.content || '';
  const { result: systemPromptResolved } = resolveAllVariables(
    systemPromptRaw, 
    varContext, 
    grimorioCards
  );

  messages = [
    {
      role: 'system',
      content: systemPromptResolved,
      timestamp: new Date().toISOString()
    },
    ...messages.slice(1)
  ];

  // ✅ LLAMAR AL LLM
  const llmResponse = await callLLM({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 4000
  });

  const summary = llmResponse.choices[0].message.content;

  return {
    success: true,
    data: { summary }
  };
}

// ========================================================================
// RESUMEN DE PUEBLO
// ========================================================================

async function executeResumenPueblo(
  payload: ResumenPuebloTriggerPayload
): Promise<TriggerExecutionResult> {
  const { pueblid, systemPrompt } = payload;

  const pueblo = await puebloDbManager.getById(pueblid);
  if (!pueblo) {
    return { success: false, error: `Pueblo with id ${pueblid} not found` };
  }

  // Get context (world)
  const world = await worldDbManager.getById(pueblo.worldId);

  // ✅ LEER CONFIGURACIÓN
  let configSystemPrompt = systemPrompt;
  if (!configSystemPrompt) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'resumen-pueblo-trigger-config.json');
      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        configSystemPrompt = config.systemPrompt || '';
      } catch (error) {
        configSystemPrompt = '';
      }
    } catch (error) {
      configSystemPrompt = '';
    }
  }

  // ✅ OBTENER eventos_recientes DE LOS EDIFICIOS
  const edificios = await edificioDbManager.getByPuebloId(pueblid);
  const edificioSummaries = edificios
    .map(edificio => {
      const eventosRecientes = edificio.eventos_recientes || [];
      const consolidatedSummary = eventosRecientes.length > 0
        ? eventosRecientes.join('\n')
        : '';
      return {
        edificioId: edificio.id,
        edificioName: edificio.name,
        consolidatedSummary
      };
    })
    .filter(e => e.consolidatedSummary !== '');

  // ✅ CONSTRUIR EL PROMPT COMPLETO
  const puebloName = pueblo.name;
  const varContext: VariableContext = {
    pueblo,
    world,
    char: puebloName
  };

  let messages = buildPuebloSummaryPrompt(
    pueblo,
    [],
    undefined,
    {
      systemPrompt: configSystemPrompt
    }
  );

  // ✅ REEMPLAZAR VARIABLES PRIMARIAS Y PLANTILLAS DE GRIMORIO
  const grimorioCards = grimorioManager.getAll();
  const systemPromptRaw = messages[0]?.content || '';
  const { result: systemPromptResolved } = resolveAllVariables(
    systemPromptRaw, 
    varContext, 
    grimorioCards
  );

  messages = [
    {
      role: 'system',
      content: systemPromptResolved,
      timestamp: new Date().toISOString()
    },
    ...messages.slice(1)
  ];

  // ✅ LLAMAR AL LLM
  const llmResponse = await callLLM({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 4000
  });

  const summary = llmResponse.choices[0].message.content;

  return {
    success: true,
    data: { summary }
  };
}

// ========================================================================
// RESUMEN DE MUNDO
// ========================================================================

async function executeResumenMundo(
  payload: ResumenMundoTriggerPayload
): Promise<TriggerExecutionResult> {
  const { mundoid, systemPrompt } = payload;

  const world = await worldDbManager.getById(mundoid);
  if (!world) {
    return { success: false, error: `World with id ${mundoid} not found` };
  }

  // ✅ LEER CONFIGURACIÓN
  let configSystemPrompt = systemPrompt;
  if (!configSystemPrompt) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'resumen-mundo-trigger-config.json');
      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        configSystemPrompt = config.systemPrompt || '';
      } catch (error) {
        configSystemPrompt = '';
      }
    } catch (error) {
      configSystemPrompt = '';
    }
  }

  // ✅ OBTENER rumores DE LOS PUEBLOS
  const pueblos = await puebloDbManager.getByWorldId(mundoid);
  const puebloSummaries = pueblos
    .map(pueblo => {
      const rumores = pueblo.lore.rumores || [];
      const consolidatedSummary = rumores.length > 0
        ? rumores.join('\n')
        : '';
      return {
        puebloId: pueblo.id,
        puebloName: pueblo.name,
        consolidatedSummary
      };
    })
    .filter(p => p.consolidatedSummary !== '');

  // ✅ CONSTRUIR EL PROMPT COMPLETO
  const mundoName = world.name;
  const varContext: VariableContext = {
    world,
    char: mundoName
  };

  let messages = buildWorldSummaryPrompt(
    world,
    [],
    undefined,
    {
      systemPrompt: configSystemPrompt
    }
  );

  // ✅ REEMPLAZAR VARIABLES PRIMARIAS Y PLANTILLAS DE GRIMORIO
  const grimorioCards = grimorioManager.getAll();
  const systemPromptRaw = messages[0]?.content || '';
  const { result: systemPromptResolved } = resolveAllVariables(
    systemPromptRaw, 
    varContext, 
    grimorioCards
  );

  messages = [
    {
      role: 'system',
      content: systemPromptResolved,
      timestamp: new Date().toISOString()
    },
    ...messages.slice(1)
  ];

  // ✅ LLAMAR AL LLM
  const llmResponse = await callLLM({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 4000
  });

  const summary = llmResponse.choices[0].message.content;

  return {
    success: true,
    data: { summary }
  };
}

// ========================================================================
// OTROS TRIGGERS (CHAT, NUEVO LORE)
// ========================================================================

async function executeChat(payload: ChatTriggerPayload): Promise<TriggerExecutionResult> {
  // Reutilizar lógica existente de handleChatTrigger
  const { handleChatTrigger } = await import('./triggerHandlers');
  const result = await handleChatTrigger(payload);
  return result;
}

async function executeNuevoLore(payload: NuevoLoreTriggerPayload): Promise<TriggerExecutionResult> {
  // Reutilizar lógica existente
  const { handleNuevoLoreTrigger } = await import('./triggerHandlers');
  const result = await handleNuevoLoreTrigger(payload);
  return result;
}
```

---

## 🔧 FASE 4: ResumenGeneralService

### Archivo: `src/lib/resumenGeneralService.ts`

```typescript
import { db } from './db';
import { sessionDbManager } from './db';
import { sessionSummaryDbManager } from './sessionSummaryDbManager';
import { npcDbManager } from './npcDbManager';
import { edificioDbManager } from './edificioDbManager';
import { puebloDbManager } from './puebloDbManager';
import { worldDbManager } from './worldDbManager';
import { npcSummaryDbManager, edificioSummaryDbManager, puebloSummaryDbManager, worldSummaryDbManager } from './resumenSummaryDbManager';
import { executeTrigger } from './triggerExecutor';
import {
  ResumenSesionTriggerPayload,
  ResumenNPCTriggerPayload,
  ResumenEdificioTriggerPayload,
  ResumenPuebloTriggerPayload,
  ResumenMundoTriggerPayload
} from './types';
import {
  generateSessionSummariesHash,
  generateNPCSummariesHash,
  generateEdificioSummariesHash,
  generatePuebloSummariesHash
} from './hashUtils';

/**
 * Configuración del resumen general
 */
export interface ResumenGeneralConfig {
  minMessages: number;        // Mínimo de mensajes para resumir sesión
  phases: {
    sesiones: boolean;
    npcs: boolean;
    edificios: boolean;
    pueblos: boolean;
    mundos: boolean;
  };
}

/**
 * Progreso del resumen general
 */
export interface ResumenGeneralProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  currentPhase?: string;
  phaseProgress?: {
    phase: string;
    current: number;
    total: number;
    message: string;
  }[];
  overallProgress: number;  // 0-100
  startedAt?: string;
  completedAt?: string;
  error?: string;
  config?: ResumenGeneralConfig;
}

export class ResumenGeneralService {
  private static readonly STATUS_KEY = 'resumen_general_status';
  private static readonly LOCK_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas en ms

  /**
   * Verificar si está corriendo
   */
  static async isRunning(): Promise<boolean> {
    const config = await db.systemConfig.findUnique({
      where: { key: this.STATUS_KEY }
    });
    
    if (!config || config.value === 'idle' || config.value === 'error') {
      return false;
    }

    // Verificar timeout (si está corriendo por más de 24 horas, marcar como error)
    const metadata = JSON.parse(config.metadata || '{}');
    if (metadata.startedAt) {
      const runningTime = Date.now() - new Date(metadata.startedAt).getTime();
      if (runningTime > this.LOCK_TIMEOUT) {
        await this.setError('Timeout: El resumen general ha estado corriendo por más de 24 horas');
        return false;
      }
    }

    return config.value === 'running';
  }

  /**
   * Marcar como running
   */
  static async setRunning(config: ResumenGeneralConfig) {
    await db.systemConfig.upsert({
      where: { key: this.STATUS_KEY },
      update: { 
        value: 'running',
        metadata: JSON.stringify({
          startedAt: new Date().toISOString(),
          config: config || {},
          currentPhase: 'iniciando',
          phaseProgress: [],
          overallProgress: 0
        })
      },
      create: {
        key: this.STATUS_KEY,
        value: 'running',
        metadata: JSON.stringify({
          startedAt: new Date().toISOString(),
          config: config || {},
          currentPhase: 'iniciando',
          phaseProgress: [],
          overallProgress: 0
        })
      }
    });
  }

  /**
   * Obtener estado actual
   */
  static async getStatus(): Promise<ResumenGeneralProgress> {
    const config = await db.systemConfig.findUnique({
      where: { key: this.STATUS_KEY }
    });

    if (!config) {
      return { status: 'idle', overallProgress: 0 };
    }

    const metadata = JSON.parse(config.metadata || '{}');

    if (config.value === 'error') {
      return {
        status: 'error',
        error: metadata.error || 'Error desconocido',
        startedAt: metadata.startedAt,
        overallProgress: metadata.overallProgress || 0,
        config: metadata.config
      };
    }

    if (config.value === 'idle') {
      return { status: 'idle', overallProgress: 0 };
    }

    // Running - devolver progreso
    return {
      status: 'running',
      currentPhase: metadata.currentPhase,
      phaseProgress: metadata.phaseProgress || [],
      overallProgress: metadata.overallProgress || 0,
      startedAt: metadata.startedAt,
      config: metadata.config
    };
  }

  /**
   * Marcar error
   */
  static async setError(error: Error | string) {
    const errorMsg = typeof error === 'string' ? error : error.message;
    
    const config = await db.systemConfig.findUnique({
      where: { key: this.STATUS_KEY }
    });
    
    const metadata = JSON.parse(config?.metadata || '{}');
    
    await db.systemConfig.update({
      where: { key: this.STATUS_KEY },
      data: {
        value: 'error',
        metadata: JSON.stringify({
          ...metadata,
          error: errorMsg,
          completedAt: new Date().toISOString()
        })
      }
    });
  }

  /**
   * Marcar como idle (terminado)
   */
  static async setIdle(results: any) {
    const config = await db.systemConfig.findUnique({
      where: { key: this.STATUS_KEY }
    });
    
    const metadata = JSON.parse(config?.metadata || '{}');
    
    await db.systemConfig.update({
      where: { key: this.STATUS_KEY },
      data: {
        value: 'idle',
        metadata: JSON.stringify({
          ...metadata,
          completedAt: new Date().toISOString(),
          results,
          overallProgress: 100
        })
      }
    });
  }

  /**
   * Actualizar progreso en DB
   */
  static async updateProgress(
    currentPhase: string,
    phaseProgress: { current: number; total: number; message: string },
    overallProgress: number
  ) {
    const config = await db.systemConfig.findUnique({
      where: { key: this.STATUS_KEY }
    });

    const metadata = JSON.parse(config?.metadata || '{}');
    const phaseProgressHistory = metadata.phaseProgress || [];

    // Actualizar o agregar progreso de esta fase
    const existingIndex = phaseProgressHistory.findIndex(
      (p: any) => p.phase === currentPhase
    );

    if (existingIndex >= 0) {
      phaseProgressHistory[existingIndex] = {
        phase: currentPhase,
        ...phaseProgress
      };
    } else {
      phaseProgressHistory.push({
        phase: currentPhase,
        ...phaseProgress
      });
    }

    await db.systemConfig.update({
      where: { key: this.STATUS_KEY },
      data: {
        metadata: JSON.stringify({
          ...metadata,
          currentPhase,
          phaseProgress: phaseProgressHistory,
          overallProgress
        })
      }
    });
  }

  /**
   * EJECUTAR TODAS LAS FASES
   * 
   * Esta función se ejecuta en background (sin await)
   * para no bloquear la respuesta HTTP
   */
  static async execute(config: ResumenGeneralConfig) {
    const startTime = Date.now();
    const enabledPhases = Object.values(config.phases).filter(Boolean);
    const totalPhases = enabledPhases.length;
    let completedPhases = 0;

    try {
      console.log('[ResumenGeneral] Iniciando ejecución con configuración:', config);

      // FASE 1: Resumen de Sesiones
      if (config.phases.sesiones) {
        console.log('[ResumenGeneral] FASE 1: Resumen de sesiones');
        await this.executePhase1(config);
        completedPhases++;
        const progress = (completedPhases / totalPhases) * 100;
        await this.updateProgress('sesiones', 
          { current: 0, total: 0, message: 'Completada' }, 
          progress
        );
      }

      // FASE 2: Resumen de NPCs
      if (config.phases.npcs) {
        console.log('[ResumenGeneral] FASE 2: Resumen de NPCs');
        await this.executePhase2();
        completedPhases++;
        const progress = (completedPhases / totalPhases) * 100;
        await this.updateProgress('npcs', 
          { current: 0, total: 0, message: 'Completada' }, 
          progress
        );
      }

      // FASE 3: Resumen de Edificios
      if (config.phases.edificios) {
        console.log('[ResumenGeneral] FASE 3: Resumen de edificios');
        await this.executePhase3();
        completedPhases++;
        const progress = (completedPhases / totalPhases) * 100;
        await this.updateProgress('edificios', 
          { current: 0, total: 0, message: 'Completada' }, 
          progress
        );
      }

      // FASE 4: Resumen de Pueblos
      if (config.phases.pueblos) {
        console.log('[ResumenGeneral] FASE 4: Resumen de pueblos');
        await this.executePhase4();
        completedPhases++;
        const progress = (completedPhases / totalPhases) * 100;
        await this.updateProgress('pueblos', 
          { current: 0, total: 0, message: 'Completada' }, 
          progress
        );
      }

      // FASE 5: Resumen de Mundos
      if (config.phases.mundos) {
        console.log('[ResumenGeneral] FASE 5: Resumen de mundos');
        await this.executePhase5();
        completedPhases++;
        const progress = (completedPhases / totalPhases) * 100;
        await this.updateProgress('mundos', 
          { current: 0, total: 0, message: 'Completada' }, 
          progress
        );
      }

      // ✅ MARCAR COMO COMPLETADO
      const duration = Date.now() - startTime;
      await this.setIdle({
        duration,
        totalPhases,
        completedPhases,
        enabledPhases: config.phases
      });

      console.log(`[ResumenGeneral] ✅ Completado exitosamente en ${duration}ms`);

    } catch (error) {
      console.error('[ResumenGeneral] ❌ Error en ejecución:', error);
      await this.setError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // ========================================================================
  // FASE 1: Resumen de Sesiones
  // ========================================================================

  private static async executePhase1(config: ResumenGeneralConfig) {
    const sessions = await sessionDbManager.getAll();
    const eligibleSessions = sessions.filter(s => s.messages.length >= config.minMessages);
    
    console.log(`[ResumenGeneral] ${eligibleSessions.length} sesiones elegibles (>= ${config.minMessages} mensajes)`);

    for (let i = 0; i < eligibleSessions.length; i++) {
      const session = eligibleSessions[i];
      
      try {
        // ✅ SIMULAR HTTP REQUEST DE RESUMEN DE SESIÓN
        const result = await executeTrigger({
          mode: 'resumen_sesion',
          npcid: session.npcId,
          playersessionid: session.id
        } as ResumenSesionTriggerPayload);

        if (!result.success) {
          console.error(`[ResumenGeneral] ❌ Error resumen sesión ${session.id}:`, result.error);
        }

        // Actualizar progreso
        const progress = ((i + 1) / eligibleSessions.length) * 100;
        const overallProgress = (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('sesiones', 
          { current: i + 1, total: eligibleSessions.length, message: `Sesión ${i + 1}/${eligibleSessions.length}` },
          overallProgress
        );
      } catch (error) {
        console.error(`[ResumenGeneral] ❌ Error procesando sesión ${session.id}:`, error);
      }
    }
  }

  // ========================================================================
  // FASE 2: Resumen de NPCs
  // ========================================================================

  private static async executePhase2() {
    const npcs = await npcDbManager.getAll();
    const summariesByNPC = new Map<string, any[]>();

    // Agrupar resúmenes por NPC
    for (const summary of await sessionSummaryDbManager.getAll()) {
      const existing = summariesByNPC.get(summary.npcId) || [];
      existing.push(summary);
      summariesByNPC.set(summary.npcId, existing);
    }

    console.log(`[ResumenGeneral] Procesando ${npcs.length} NPCs`);

    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const summaries = summariesByNPC.get(npc.id) || [];

      // Calcular hash de los resúmenes
      const currentHash = generateSessionSummariesHash(summaries);
      
      // Obtener último resumen de NPC
      const lastNPCSummary = await npcSummaryDbManager.getLatest(npc.id);
      
      // Verificar si hubo cambios
      if (lastNPCSummary?.sessionHash === currentHash) {
        console.log(`[ResumenGeneral] NPC ${npc.id} sin cambios, SKIP`);
        continue;
      }

      try {
        // ✅ SIMULAR HTTP REQUEST DE RESUMEN DE NPC
        const result = await executeTrigger({
          mode: 'resumen_npc',
          npcid: npc.id
        } as ResumenNPCTriggerPayload);

        if (!result.success) {
          console.error(`[ResumenGeneral] ❌ Error resumen NPC ${npc.id}:`, result.error);
          continue;
        }

        // Guardar nuevo resumen con hash
        await npcSummaryDbManager.create({
          npcId: npc.id,
          summary: result.data.summary,
          sessionHash: currentHash,
          version: (lastNPCSummary?.version || 0) + 1
        });

        // Actualizar progreso
        const progress = ((i + 1) / npcs.length) * 100;
        const overallProgress = 20 + (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('npcs', 
          { current: i + 1, total: npcs.length, message: `NPC ${i + 1}/${npcs.length}` },
          overallProgress
        );
      } catch (error) {
        console.error(`[ResumenGeneral] ❌ Error procesando NPC ${npc.id}:`, error);
      }
    }
  }

  // ========================================================================
  // FASE 3: Resumen de Edificios
  // ========================================================================

  private static async executePhase3() {
    const edificios = await edificioDbManager.getAll();
    const summariesByEdificio = new Map<string, any[]>();

    // Agrupar resúmenes de NPCs por edificio
    for (const summary of await npcSummaryDbManager.getAll()) {
      const existing = summariesByEdificio.get(summary.npcId) || [];
      existing.push(summary);
      summariesByEdificio.set(summary.npcId, existing);
    }

    console.log(`[ResumenGeneral] Procesando ${edificios.length} edificios`);

    for (let i = 0; i < edificios.length; i++) {
      const edificio = edificios[i];
      
      // Obtener resúmenes de NPCs que pertenecen a este edificio
      const npcsInEdificio = await npcDbManager.getByEdificioId(edificio.id);
      const npcSummaries: any[] = [];
      
      for (const npc of npcsInEdificio) {
        const summary = await npcSummaryDbManager.getLatest(npc.id);
        if (summary) npcSummaries.push(summary);
      }

      const currentHash = generateNPCSummariesHash(npcSummaries);
      const lastEdificioSummary = await edificioSummaryDbManager.getLatest(edificio.id);
      
      if (lastEdificioSummary?.npcHash === currentHash) {
        console.log(`[ResumenGeneral] Edificio ${edificio.id} sin cambios, SKIP`);
        continue;
      }

      try {
        // ✅ SIMULAR HTTP REQUEST DE RESUMEN DE EDIFICIO
        const result = await executeTrigger({
          mode: 'resumen_edificio',
          edificioid: edificio.id
        } as ResumenEdificioTriggerPayload);

        if (!result.success) {
          console.error(`[ResumenGeneral] ❌ Error resumen edificio ${edificio.id}:`, result.error);
          continue;
        }

        await edificioSummaryDbManager.create({
          edificioId: edificio.id,
          summary: result.data.summary,
          npcHash: currentHash,
          version: (lastEdificioSummary?.version || 0) + 1
        });

        const progress = ((i + 1) / edificios.length) * 100;
        const overallProgress = 40 + (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('edificios', 
          { current: i + 1, total: edificios.length, message: `Edificio ${i + 1}/${edificios.length}` },
          overallProgress
        );
      } catch (error) {
        console.error(`[ResumenGeneral] ❌ Error procesando edificio ${edificio.id}:`, error);
      }
    }
  }

  // ========================================================================
  // FASE 4: Resumen de Pueblos
  // ========================================================================

  private static async executePhase4() {
    const pueblos = await puebloDbManager.getAll();
    const summariesByPueblo = new Map<string, any[]>();

    // Agrupar resúmenes de edificios por pueblo
    for (const summary of await edificioSummaryDbManager.getAll()) {
      const existing = summariesByPueblo.get(summary.edificioId) || [];
      existing.push(summary);
      summariesByPueblo.set(summary.edificioId, existing);
    }

    console.log(`[ResumenGeneral] Procesando ${pueblos.length} pueblos`);

    for (let i = 0; i < pueblos.length; i++) {
      const pueblo = pueblos[i];
      
      // Obtener resúmenes de edificios que pertenecen a este pueblo
      const edificiosInPueblo = await edificioDbManager.getByPuebloId(pueblo.id);
      const edificioSummaries: any[] = [];
      
      for (const edificio of edificiosInPueblo) {
        const summary = await edificioSummaryDbManager.getLatest(edificio.id);
        if (summary) edificioSummaries.push(summary);
      }

      const currentHash = generateEdificioSummariesHash(edificioSummaries);
      const lastPuebloSummary = await puebloSummaryDbManager.getLatest(pueblo.id);
      
      if (lastPuebloSummary?.edificioHash === currentHash) {
        console.log(`[ResumenGeneral] Pueblo ${pueblo.id} sin cambios, SKIP`);
        continue;
      }

      try {
        // ✅ SIMULAR HTTP REQUEST DE RESUMEN DE PUEBLO
        const result = await executeTrigger({
          mode: 'resumen_pueblo',
          pueblid: pueblo.id
        } as ResumenPuebloTriggerPayload);

        if (!result.success) {
          console.error(`[ResumenGeneral] ❌ Error resumen pueblo ${pueblo.id}:`, result.error);
          continue;
        }

        await puebloSummaryDbManager.create({
          puebloId: pueblo.id,
          summary: result.data.summary,
          edificioHash: currentHash,
          version: (lastPuebloSummary?.version || 0) + 1
        });

        const progress = ((i + 1) / pueblos.length) * 100;
        const overallProgress = 60 + (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('pueblos', 
          { current: i + 1, total: pueblos.length, message: `Pueblo ${i + 1}/${pueblos.length}` },
          overallProgress
        );
      } catch (error) {
        console.error(`[ResumenGeneral] ❌ Error procesando pueblo ${pueblo.id}:`, error);
      }
    }
  }

  // ========================================================================
  // FASE 5: Resumen de Mundos
  // ========================================================================

  private static async executePhase5() {
    const mundos = await worldDbManager.getAll();
    const summariesByMundo = new Map<string, any[]>();

    // Agrupar resúmenes de pueblos por mundo
    for (const summary of await puebloSummaryDbManager.getAll()) {
      const existing = summariesByMundo.get(summary.puebloId) || [];
      existing.push(summary);
      summariesByMundo.set(summary.puebloId, existing);
    }

    console.log(`[ResumenGeneral] Procesando ${mundos.length} mundos`);

    for (let i = 0; i < mundos.length; i++) {
      const mundo = mundos[i];
      
      // Obtener resúmenes de pueblos que pertenecen a este mundo
      const pueblosInMundo = await puebloDbManager.getByWorldId(mundo.id);
      const puebloSummaries: any[] = [];
      
      for (const pueblo of pueblosInMundo) {
        const summary = await puebloSummaryDbManager.getLatest(pueblo.id);
        if (summary) puebloSummaries.push(summary);
      }

      const currentHash = generatePuebloSummariesHash(puebloSummaries);
      const lastWorldSummary = await worldSummaryDbManager.getLatest(mundo.id);
      
      if (lastWorldSummary?.puebloHash === currentHash) {
        console.log(`[ResumenGeneral] Mundo ${mundo.id} sin cambios, SKIP`);
        continue;
      }

      try {
        // ✅ SIMULAR HTTP REQUEST DE RESUMEN DE MUNDO
        const result = await executeTrigger({
          mode: 'resumen_mundo',
          mundoid: mundo.id
        } as ResumenMundoTriggerPayload);

        if (!result.success) {
          console.error(`[ResumenGeneral] ❌ Error resumen mundo ${mundo.id}:`, result.error);
          continue;
        }

        await worldSummaryDbManager.create({
          worldId: mundo.id,
          summary: result.data.summary,
          puebloHash: currentHash,
          version: (lastWorldSummary?.version || 0) + 1
        });

        const progress = ((i + 1) / mundos.length) * 100;
        const overallProgress = 80 + (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('mundos', 
          { current: i + 1, total: mundos.length, message: `Mundo ${i + 1}/${mundos.length}` },
          overallProgress
        );
      } catch (error) {
        console.error(`[ResumenGeneral] ❌ Error procesando mundo ${mundo.id}:`, error);
      }
    }
  }
}
```

---

## 🔒 FASE 5: Bloqueo en API de Chat

### Archivo: `src/app/api/reroute/route.ts`

Modificar la función POST para verificar el estado del resumen general:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AnyTriggerPayload } from '@/lib/types';
import { handleTrigger, previewTriggerPrompt } from '@/lib/triggerHandlers';
import { resumenGeneralService } from '@/lib/resumenGeneralService';

export async function POST(request: NextRequest) {
  try {
    // Get preview flag from query
    const preview = request.nextUrl.searchParams.get('preview') === 'true';

    const body = await request.json();

    // Validate basic payload structure
    if (!body.mode) {
      return NextResponse.json(
        { error: 'Missing required field: mode' },
        { status: 400 }
      );
    }

    const payload = body as AnyTriggerPayload;

    // ✅ VERIFICAR SI RESUMEN GENERAL ESTÁ CORRIENDO (SOLO PARA CHAT)
    if (payload.mode === 'chat') {
      const isRunning = await resumenGeneralService.isRunning();
      if (isRunning) {
        return NextResponse.json({
          success: true,
          data: { response: "resumen_general" }
        });
      }
    }

    // If preview mode, return prompt preview without calling LLM
    if (preview) {
      const previewData = await previewTriggerPrompt(payload);
      return NextResponse.json({
        success: true,
        preview: true,
        data: previewData
      });
    }

    // Execute the trigger
    const result = await handleTrigger(payload);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in /api/reroute:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
```

---

## 🌐 FASE 6: API Routes

### Archivo: `src/app/api/resumen-general/route.ts`

Crear nuevo endpoint:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { resumenGeneralService, ResumenGeneralConfig } from '@/lib/resumenGeneralService';

/**
 * POST /api/resumen-general
 * Inicia el resumen general en background
 * 
 * Body:
 * {
 *   minMessages: number,
 *   phases: {
 *     sesiones: boolean,
 *     npcs: boolean,
 *     edificios: boolean,
 *     pueblos: boolean,
 *     mundos: boolean
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { minMessages, phases } = body;

    // Validar
    if (typeof minMessages !== 'number' || minMessages < 1) {
      return NextResponse.json({
        success: false,
        error: 'minMessages debe ser un número mayor o igual a 1'
      }, { status: 400 });
    }

    if (!phases || typeof phases !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'phases debe ser un objeto con booleanos'
      }, { status: 400 });
    }

    // Verificar si ya está corriendo
    const isRunning = await resumenGeneralService.isRunning();
    if (isRunning) {
      return NextResponse.json({
        success: false,
        error: 'Resumen general ya está en ejecución'
      }, { status: 400 });
    }

    // Configurar validación
    const config: ResumenGeneralConfig = {
      minMessages,
      phases: {
        sesiones: !!phases.sesiones,
        npcs: !!phases.npcs,
        edificios: !!phases.edificios,
        pueblos: !!phases.pueblos,
        mundos: !!phases.mundos
      }
    };

    // ✅ MARCAR COMO RUNNING EN DB
    await resumenGeneralService.setRunning(config);

    // ✅ EJECUTAR EN BACKGROUND (sin await)
    resumenGeneralService.execute(config)
      .then((results) => {
        console.log('[ResumenGeneral API] Completado exitosamente:', results);
      })
      .catch((error) => {
        console.error('[ResumenGeneral API] Error:', error);
        resumenGeneralService.setError(error);
      });

    // ✅ RESPUESTA INMEDIATA (no esperar a que termine)
    return NextResponse.json({
      success: true,
      message: 'Resumen general iniciado en background',
      status: 'running'
    });

  } catch (error) {
    console.error('Error in POST /api/resumen-general:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
```

### Archivo: `src/app/api/resumen-general/status/route.ts`

Crear nuevo endpoint:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { resumenGeneralService } from '@/lib/resumenGeneralService';

/**
 * GET /api/resumen-general/status
 * Obtiene el estado actual del resumen general
 */
export async function GET() {
  try {
    const status = await resumenGeneralService.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error in GET /api/resumen-general/status:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
```

---

## 🎨 FASE 7: Frontend - RouterTab UI

### Modificar: `src/components/dashboard/RouterTab.tsx`

Agregar estos estados y componentes:

```typescript
// Estados para el resumen general
const [resumenGeneralConfig, setResumenGeneralConfig] = useState({
  minMessages: 10,
  phases: {
    sesiones: true,
    npcs: true,
    edificios: true,
    pueblos: true,
    mundos: true
  }
});

const [resumenGeneralStatus, setResumenGeneralStatus] = useState(null);
const [isStartingResumenGeneral, setIsStartingResumenGeneral] = useState(false);

// Polling para el estado
const pollingRef = useRef(null);

// Iniciar resumen general
const startResumenGeneral = async () => {
  setIsStartingResumenGeneral(true);

  try {
    const response = await fetch('/api/resumen-general', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resumenGeneralConfig)
    });

    const data = await response.json();

    if (data.success) {
      // Iniciar polling para ver el progreso
      startPolling();
    } else {
      console.error('Error iniciando resumen general:', data.error);
      toast.error(data.error);
    }
  } catch (error) {
    console.error('Error iniciando resumen general:', error);
    toast.error('Error al iniciar resumen general');
  } finally {
    setIsStartingResumenGeneral(false);
  }
};

// Polling para ver el estado
const startPolling = () => {
  pollingRef.current = setInterval(async () => {
    try {
      const response = await fetch('/api/resumen-general/status');
      const status = await response.json();
      
      setResumenGeneralStatus(status);

      // Si terminó o error, detener polling
      if (status.status === 'idle' || status.status === 'error') {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        
        if (status.status === 'error') {
          toast.error('Error en resumen general: ' + status.error);
        } else {
          toast.success('Resumen general completado');
        }
      }
    } catch (error) {
      console.error('Error polling status:', error);
    }
  }, 2000); // Cada 2 segundos
};

// Limpiar al desmontar
useEffect(() => {
  return () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
  };
}, []);

// UI para configurar el resumen general
<Card>
  <CardHeader>
    <CardTitle>Resumen General</CardTitle>
    <CardDescription>
      Ejecuta resúmenes en cascada: Sesiones → NPCs → Edificios → Pueblos → Mundos
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Máximo de mensajes */}
    <div>
      <Label htmlFor="minMessages">
        Máximo de mensajes para resumir sesiones
      </Label>
      <Input
        id="minMessages"
        type="number"
        min="1"
        value={resumenGeneralConfig.minMessages}
        onChange={(e) => setResumenGeneralConfig({
          ...resumenGeneralConfig,
          minMessages: parseInt(e.target.value)
        })}
        placeholder="Ej: 10"
      />
    </div>

    {/* Switches para fases */}
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Switch
          checked={resumenGeneralConfig.phases.sesiones}
          onCheckedChange={(checked) => setResumenGeneralConfig({
            ...resumenGeneralConfig,
            phases: { ...resumenGeneralConfig.phases, sesiones: checked }
          })}
        />
        <Label>FASE 1: Resumen de Sesiones</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={resumenGeneralConfig.phases.npcs}
          onCheckedChange={(checked) => setResumenGeneralConfig({
            ...resumenGeneralConfig,
            phases: { ...resumenGeneralConfig.phases, npcs: checked }
          })}
        />
        <Label>FASE 2: Resumen de NPCs</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={resumenGeneralConfig.phases.edificios}
          onCheckedChange={(checked) => setResumenGeneralConfig({
            ...resumenGeneralConfig,
            phases: { ...resumenGeneralConfig.phases, edificios: checked }
          })}
        />
        <Label>FASE 3: Resumen de Edificios</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={resumenGeneralConfig.phases.pueblos}
          onCheckedChange={(checked) => setResumenGeneralConfig({
            ...resumenGeneralConfig,
            phases: { ...resumenGeneralConfig.phases, pueblos: checked }
          })}
        />
        <Label>FASE 4: Resumen de Pueblos</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={resumenGeneralConfig.phases.mundos}
          onCheckedChange={(checked) => setResumenGeneralConfig({
            ...resumenGeneralConfig,
            phases: { ...resumenGeneralConfig.phases, mundos: checked }
          })}
        />
        <Label>FASE 5: Resumen de Mundos</Label>
      </div>
    </div>

    {/* Botón para iniciar */}
    <Button
      onClick={startResumenGeneral}
      disabled={isStartingResumenGeneral || (resumenGeneralStatus?.status === 'running')}
    >
      {isStartingResumenGeneral ? 'Iniciando...' : 
       resumenGeneralStatus?.status === 'running' ? 'Ejecutando...' : 
       'Iniciar Resumen General'}
    </Button>
  </CardContent>
</Card>

{/* Sección de progreso (visible cuando está corriendo) */}
{resumenGeneralStatus?.status === 'running' && (
  <Card>
    <CardHeader>
      <CardTitle>Progreso del Resumen General</CardTitle>
      <CardDescription>
        {resumenGeneralStatus.currentPhase || 'Iniciando...'}
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Barra de progreso general */}
      <div>
        <Progress value={resumenGeneralStatus.overallProgress} />
        <p className="text-sm text-gray-500 mt-2">
          {resumenGeneralStatus.overallProgress.toFixed(1)}% completado
        </p>
      </div>

      {/* Detalles de cada fase */}
      {resumenGeneralConfig.phases.sesiones && resumenGeneralStatus.phaseProgress?.find(p => p.phase === 'sesiones') && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">FASE 1</Badge>
            <span className="font-medium">Resumen de Sesiones</span>
          </div>
          <Progress 
            value={(resumenGeneralStatus.phaseProgress.find(p => p.phase === 'sesiones').current / 
                    resumenGeneralStatus.phaseProgress.find(p => p.phase === 'sesiones').total) * 100} 
          />
          <p className="text-sm text-gray-500 mt-2">
            {resumenGeneralStatus.phaseProgress.find(p => p.phase === 'sesiones').message}
          </p>
        </div>
      )}

      {/* Similar para las otras fases */}
      {resumenGeneralConfig.phases.npcs && resumenGeneralStatus.phaseProgress?.find(p => p.phase === 'npcs') && (
        <PhaseProgressCard phase="FASE 2" title="Resumen de NPCs" data={resumenGeneralStatus.phaseProgress.find(p => p.phase === 'npcs')} />
      )}
      {resumenGeneralConfig.phases.edificios && resumenGeneralStatus.phaseProgress?.find(p => p.phase === 'edificios') && (
        <PhaseProgressCard phase="FASE 3" title="Resumen de Edificios" data={resumenGeneralStatus.phaseProgress.find(p => p.phase === 'edificios')} />
      )}
      {resumenGeneralConfig.phases.pueblos && resumenGeneralStatus.phaseProgress?.find(p => p.phase === 'pueblos') && (
        <PhaseProgressCard phase="FASE 4" title="Resumen de Pueblos" data={resumenGeneralStatus.phaseProgress.find(p => p.phase === 'pueblos')} />
      )}
      {resumenGeneralConfig.phases.mundos && resumenGeneralStatus.phaseProgress?.find(p => p.phase === 'mundos') && (
        <PhaseProgressCard phase="FASE 5" title="Resumen de Mundos" data={resumenGeneralStatus.phaseProgress.find(p => p.phase === 'mundos')} />
      )}
    </CardContent>
  </Card>
)}

{/* Error */}
{resumenGeneralStatus?.status === 'error' && (
  <Alert variant="destructive">
    <AlertTitle>Error en Resumen General</AlertTitle>
    <AlertDescription>
      {resumenGeneralStatus.error}
    </AlertDescription>
  </Alert>
)}
```

---

## ✅ Resumen de Implementación

### Archivos a crear/modificar:

| Archivo | Fase | Acción |
|---------|-------|---------|
| `prisma/schema.prisma` | 0 | Agregar 5 nuevos modelos |
| `src/lib/hashUtils.ts` | 1 | Crear nuevo archivo |
| `src/lib/resumenSummaryDbManager.ts` | 2 | Crear nuevo archivo |
| `src/lib/triggerExecutor.ts` | 3 | Crear nuevo archivo |
| `src/lib/resumenGeneralService.ts` | 4 | Crear nuevo archivo |
| `src/app/api/reroute/route.ts` | 5 | Modificar para bloquear chats |
| `src/app/api/resumen-general/route.ts` | 6 | Crear nuevo endpoint |
| `src/app/api/resumen-general/status/route.ts` | 6 | Crear nuevo endpoint |
| `src/components/dashboard/RouterTab.tsx` | 7 | Agregar UI de resumen general |

### Comandos a ejecutar:

```bash
# 1. Actualizar schema de Prisma
bun run db:push

# 2. Verificar linting
bun run lint

# 3. Iniciar dev server
# (ya está corriendo)
```

### Garantías de la implementación:

✅ **Cada resumen usa el constructor de prompts correcto** (igual que HTTP normal)
✅ **Reemplazo de variables primarias** usando `replaceVariables()`
✅ **Reemplazo de plantillas del Grimorio** usando `resolveAllVariables()`
✅ **Simula HTTP requests completas** con payload completo
✅ **Solo regenera resúmenes cuando hay cambios** (usando hashes)
✅ **Bloqueo de chats durante ejecución** (verificación en DB)
✅ **Ejecución en background** sin timeout de HTTP
✅ **Progreso visible en UI** con polling
✅ **Fases configurables** con switches en UI
✅ **App totalmente autosuficiente** (solo DB, no mini-servicios)

---

## 📝 Notas Importantes

1. **Variables Primarias vs Plantillas del Grimorio**:
   - ✅ `resumen_sesion`: SOLO usa variables primarias (NO usa Grimorio)
   - ✅ `resumen_npc`, `resumen_edificio`, `resumen_pueblo`, `resumen_mundo`: Usan variables primarias Y plantillas del Grimorio

2. **Comportamiento de Hashes**:
   - Los hashes permiten detectar eficientemente si hubo cambios
   - Si el hash es igual al último, el resumen se SKIPEA
   - Esto ahorra llamadas al LLM cuando no hay cambios

3. **Timeout Protection**:
   - Si un resumen general queda corriendo por más de 24 horas, se marca como error automáticamente
   - Esto previene bloqueos permanentes por errores

4. **Error Handling**:
   - Los errores en resúmenes individuales NO detienen el proceso
   - Solo se registran en logs
   - El proceso continúa con la siguiente entidad

5. **Background Execution**:
   - El proceso se ejecuta en background sin await
   - La respuesta HTTP es inmediata
   - El frontend puede cerrar y volver sin perder progreso
