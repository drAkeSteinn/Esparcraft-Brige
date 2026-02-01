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
import { db } from './db';
import { npcDbManager } from './npcDbManager';
import { sessionDbManagerSingleton } from './sessionDbManager';
import { worldDbManager } from './worldDbManager';
import { puebloDbManager } from './puebloDbManager';
import { edificioDbManager } from './edificioDbManager';
import { sessionSummaryDbManager } from './resumenSummaryDbManager';
import { npcStateManager, grimorioManager } from './fileManager';
import { getCardField } from './types';
import {
  buildCompleteSessionSummaryPrompt,
  buildNPCSummaryPrompt,
  buildEdificioSummaryPrompt,
  buildPuebloSummaryPrompt,
  buildWorldSummaryPrompt,
  buildCompleteChatPrompt,
  buildNuevoLorePrompt
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

    // Verificar si resumen general está corriendo (solo para chat)
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

  const session = await sessionDbManagerSingleton.getById(playersessionid);
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
  const llmResponse = await callLLM(messages);

  const summary = llmResponse;

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
  const llmResponse = await callLLM(messages);

  const summary = llmResponse;

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
  const llmResponse = await callLLM(messages);

  const summary = llmResponse;

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
  const llmResponse = await callLLM(messages);

  const summary = llmResponse;

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
  const llmResponse = await callLLM(messages);

  const summary = llmResponse;

  return {
    success: true,
    data: { summary }
  };
}

// ========================================================================
// OTROS TRIGGERS (CHAT, NUEVO LORE)
// ========================================================================

async function executeChat(payload: ChatTriggerPayload): Promise<TriggerExecutionResult> {
  // Importar dinámicamente para evitar dependencia circular
  const { handleChatTrigger } = await import('./triggerHandlers');
  const result = await handleChatTrigger(payload);
  return result;
}

async function executeNuevoLore(payload: NuevoLoreTriggerPayload): Promise<TriggerExecutionResult> {
  // Importar dinámicamente para evitar dependencia circular
  const { handleNuevoLoreTrigger } = await import('./triggerHandlers');
  const result = await handleNuevoLoreTrigger(payload);
  return result;
}

// ========================================================================
// LLM SERVICE
// ========================================================================

const LLM_API_URL = process.env.LLM_API_URL || 'http://127.0.0.1:5000/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'local-model';
const LLM_TEMPERATURE = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
const LLM_MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || '2000');

async function callLLM(messages: ChatMessage[]): Promise<any> {
  try {
    const response = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: LLM_TEMPERATURE,
        max_tokens: LLM_MAX_TOKENS
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error calling LLM:', error);
    throw error;
  }
}
