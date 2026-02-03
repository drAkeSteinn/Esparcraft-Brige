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
import { handleChatTrigger, handleNuevoLoreTrigger } from './triggerHandlers';
import { db } from './db';
import { npcDbManager } from './npcDbManager';
import { sessionDbManagerSingleton } from './sessionDbManager';
import { worldDbManager } from './worldDbManager';
import { puebloDbManager } from './puebloDbManager';
import { edificioDbManager } from './edificioDbManager';
import {
  npcSummaryDbManager,
  edificioSummaryDbManager,
  puebloSummaryDbManager,
  worldSummaryDbManager
} from './summaryManagers';
import { grimorioManager } from './fileManager';
import { sessionSummaryDbManager } from './resumenSummaryDbManager';
import { getCardField } from './types';
import {
  generateSessionSummariesHash,
  generateNPCSummariesHash,
  generateEdificioSummariesHash,
  generatePuebloSummariesHash
} from './hashUtils';
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
 * FIXED v2 - Multiple nextVersion definitions resolved
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

  // ✅ LEER CONFIGURACIÓN DE minMessages (misma configuración que usa Resumen General)
  let minMessages = 10; // Valor por defecto
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const configPath = path.join(process.cwd(), 'db', 'resumen-general-config.json');
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      minMessages = config.minMessages || 10;
      console.log(`[executeResumenSesion] minMessages leído: ${minMessages}`);
    } catch (error) {
      console.log('[executeResumenSesion] No se pudo leer config de minMessages, usando valor por defecto: 10');
    }
  } catch (error) {
    console.log('[executeResumenSesion] Error al leer config de minMessages, usando valor por defecto: 10');
  }

  // ✅ VERIFICAR QUE LA SESIÓN TENGA SUFICIENTES MENSAJES
  if (session.messages.length < minMessages) {
    console.log(`[executeResumenSesion] Sesión ${playersessionid} tiene ${session.messages.length} mensajes (< ${minMessages}), OMITIENDO resumen`);
    return {
      success: false,
      error: `La sesión tiene solo ${session.messages.length} mensajes. Se requieren al menos ${minMessages} mensajes para generar el resumen.`
    };
  }

  console.log(`[executeResumenSesion] Sesión ${playersessionid} tiene ${session.messages.length} mensajes (>= ${minMessages}), PROCEDIENDO con resumen`);

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
  const summary = llmResponse?.data?.response || llmResponse?.response || '';

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

  // ✅ LIMPIAR MENSAJES DE LA SESIÓN DESPUÉS DE RESUMIR
  await sessionDbManagerSingleton.clearMessages(playersessionid);
  console.log(`[executeResumenSesion] Sesión ${playersessionid}: ${session.messages.length} mensajes eliminados después de resumir`);

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

  // ✅ CALCULAR HASH ACTUAL DE LOS RESÚMENES DE SESIONES DEL NPC
  const currentHash = generateSessionSummariesHash(npcSummaries);

  // ✅ OBTENER ÚLTIMO RESUMEN GUARDADO DEL NPC
  const lastNPCSummary = await npcSummaryDbManager.getLatest(npcid);

  console.log(`[executeResumenNPC] NPC ${npcid} - Resúmenes: ${npcSummaries.length}, Hash actual: ${currentHash}`);

  // ✅ VERIFICAR SI HUBO CAMBIOS
  if (lastNPCSummary?.sessionHash === currentHash) {
    console.log(`[executeResumenNPC] NPC ${npcid} - SIN CAMBIOS, SKIP`);
    return {
      success: false,
      error: `No hubo cambios en las sesiones del NPC ${npcid}. Los resúmenes son iguales.`
    };
  }

  console.log(`[executeResumenNPC] NPC ${npcid} - HAY CAMBIOS, PROCEDIENDO CON RESUMEN`);

  // ✅ CONSTRUIR EL PROMPT COMPLETO
  const existingMemory = {};
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
  const summary = llmResponse?.data?.response || llmResponse?.response || '';

  // ✅ GUARDAR RESUMEN EN creator_notes DE LA CARD DEL NPC (EN LA DB)
  if (npc?.card) {
    const updatedCard: any = { ...npc.card };

    if (updatedCard.data) {
      updatedCard.data = {
        ...updatedCard.data,
        creator_notes: summary
      };
    } else {
      updatedCard.data = {
        creator_notes: summary
      };
    }

    await npcDbManager.update(npcid, { card: updatedCard });
    console.log(`[executeResumenNPC] Resumen guardado en creator_notes de la card del NPC ${npcid}`);
  }

  // ✅ GUARDAR EN TABLA NPCSummary PARA HISTÓRICO (CON VERSIÓN)
  const nextVersion = (lastNPCSummary?.version || 0) + 1;
  await npcSummaryDbManager.create({
    npcId: npcid,
    summary,
    sessionHash: currentHash,
    version: nextVersion
  });
  console.log(`[executeResumenNPC] NPC ${npcid} - Resumen guardado en DB con versión ${nextVersion}`);

  return {
    success: true,
    data: { summary, version: nextVersion }
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

  // ✅ CALCULAR HASH DE LOS RESÚMENES DE NPCs DEL EDIFICIO
  const allNPCSummaries = [];

  for (const npc of npcs) {
    const npcSummaries = await npcSummaryDbManager.getAllByNPCId(npc.id);
    if (npcSummaries && npcSummaries.length > 0) {
      allNPCSummaries.push(...npcSummaries);
    }
  }

  const currentHash = generateNPCSummariesHash(allNPCSummaries);

  // ✅ OBTENER ÚLTIMO RESUMEN GUARDADO DEL EDIFICIO
  const lastEdificioSummary = await edificioSummaryDbManager.getLatest(edificioid);

  console.log(`[executeResumenEdificio] Edificio ${edificioid} - NPCs: ${npcs.length}, Hash actual: ${currentHash}`);

  // ✅ VERIFICAR SI HUBO CAMBIOS EN LOS RESÚMENES DE NPCs
  if (lastEdificioSummary?.npcHash === currentHash) {
    console.log(`[executeResumenEdificio] Edificio ${edificioid} - SIN CAMBIOS, SKIP`);
    return {
      success: false,
      error: `No hubo cambios en los resúmenes de NPCs del edificio ${edificioid}. Los resúmenes son iguales.`
    };
  }

  console.log(`[executeResumenEdificio] Edificio ${edificioid} - HAY CAMBIOS, PROCEDIENDO CON RESUMEN`);

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
  const summary = llmResponse?.data?.response || llmResponse?.response || '';

  // ✅ GUARDAR RESUMEN EN eventos_recientes DEL EDIFICIO (EN LA DB)
  await edificioDbManager.update(edificioid, {
    eventos_recientes: [summary]
  });
  console.log(`[executeResumenEdificio] Resumen guardado en eventos_recientes del edificio ${edificioid}`);

  // ✅ GUARDAR EN TABLA EdificioSummary PARA HISTÓRICO (CON VERSIÓN)
  const nextVersion = (lastEdificioSummary?.version || 0) + 1;
  await edificioSummaryDbManager.create({
    edificioId: edificioid,
    summary,
    npcHash: currentHash,
    version: nextVersion
  });
  console.log(`[executeResumenEdificio] Edificio ${edificioid} - Resumen guardado en DB con versión ${nextVersion}`);

  return {
    success: true,
    data: { summary, version: nextVersion }
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

  // ✅ CALCULAR HASH DE LOS RESÚMENES DE EDIFICIOS DEL PUEBLO
  const allEdificioSummaries = [];

  for (const edificio of edificios) {
    const edificioSummaries = await edificioSummaryDbManager.getAllByEdificioId(edificio.id);
    if (edificioSummaries && edificioSummaries.length > 0) {
      allEdificioSummaries.push(...edificioSummaries);
    }
  }

  const currentHash = generateEdificioSummariesHash(allEdificioSummaries);

  // ✅ OBTENER ÚLTIMO RESUMEN GUARDADO DEL PUEBLO
  const lastPuebloSummary = await puebloSummaryDbManager.getLatest(pueblid);

  console.log(`[executeResumenPueblo] Pueblo ${pueblid} - Edificios: ${edificios.length}, Hash actual: ${currentHash}`);

  // ✅ VERIFICAR SI HUBO CAMBIOS EN LOS RESÚMENES DE EDIFICIOS
  if (lastPuebloSummary?.edificioHash === currentHash) {
    console.log(`[executeResumenPueblo] Pueblo ${pueblid} - SIN CAMBIOS, SKIP`);
    return {
      success: false,
      error: `No hubo cambios en los resúmenes de edificios del pueblo ${pueblid}. Los resúmenes son iguales.`
    };
  }

  console.log(`[executeResumenPueblo] Pueblo ${pueblid} - HAY CAMBIOS, PROCEDIENDO CON RESUMEN`);

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
  const summary = llmResponse?.data?.response || llmResponse?.response || '';

  // ✅ GUARDAR RESUMEN EN lore.eventos DEL PUEBLO (EN LA DB)
  const loreActual = pueblo.lore || {};
  await puebloDbManager.update(pueblid, {
    lore: {
      ...loreActual,
      eventos: [summary]
    }
  });
  console.log(`[executeResumenPueblo] Resumen guardado en lore.eventos del pueblo ${pueblid}`);

  // ✅ GUARDAR EN TABLA PuebloSummary PARA HISTÓRICO (CON VERSIÓN)
  const nextVersion = (lastPuebloSummary?.version || 0) + 1;
  await puebloSummaryDbManager.create({
    puebloId: pueblid,
    summary,
    edificioHash: currentHash,
    version: nextVersion
  });
  console.log(`[executeResumenPueblo] Pueblo ${pueblid} - Resumen guardado en DB con versión ${nextVersion}`);

  return {
    success: true,
    data: { summary, version: nextVersion }
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

  // ✅ OBTENER eventos DE LOS PUEBLOS
  const pueblos = await puebloDbManager.getByWorldId(mundoid);
  const puebloSummaries = pueblos
    .map(pueblo => {
      const lore = pueblo.lore || {};
        const eventos = lore.eventos || [];
      const consolidatedSummary = eventos.length > 0
        ? eventos.join('\n')
        : '';
      return {
        puebloId: pueblo.id,
        puebloName: pueblo.name,
        consolidatedSummary
      };
    })
    .filter(p => p.consolidatedSummary !== '');


  // ✅ CALCULAR HASH DE LOS RESÚMENES DE PUEBLOS DEL MUNDO
  const allPuebloSummaries = [];

  for (const pueblo of pueblos) {
    const puebloSummaries = await puebloSummaryDbManager.getAllByPuebloId(pueblo.id);
    if (puebloSummaries && puebloSummaries.length > 0) {
      allPuebloSummaries.push(...puebloSummaries);
    }
  }

  const currentHash = generatePuebloSummariesHash(allPuebloSummaries);

  // ✅ OBTENER ÚLTIMO RESUMEN GUARDADO DEL MUNDO
  const lastWorldSummary = await worldSummaryDbManager.getLatest(mundoid);

  console.log(`[executeResumenMundo] Mundo ${mundoid} - Pueblos: ${pueblos.length}, Hash actual: ${currentHash}`);

  // ✅ VERIFICAR SI HUBO CAMBIOS EN LOS RESÚMENES DE PUEBLOS
  if (lastWorldSummary?.puebloHash === currentHash) {
    console.log(`[executeResumenMundo] Mundo ${mundoid} - SIN CAMBIOS, SKIP`);
    return {
      success: false,
      error: `No hubo cambios en los resúmenes de pueblos del mundo ${mundoid}. Los resúmenes son iguales.`
    };
  }

  console.log(`[executeResumenMundo] Mundo ${mundoid} - HAY CAMBIOS, PROCEDIENDO CON RESUMEN`);

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
  const summary = llmResponse?.data?.response || llmResponse?.response || '';


  // ✅ GUARDAR RESUMEN EN lore.eventos DEL MUNDO (EN LA DB)
  const loreActual = world.lore || {};
  await worldDbManager.update(mundoid, {
    lore: {
      ...loreActual,
      eventos: [summary]
    }
  });
  console.log(`[executeResumenMundo] Resumen guardado en lore.eventos del mundo ${mundoid}`);

  // ✅ GUARDAR EN TABLA WorldSummary PARA HISTÓRICO (CON VERSIÓN)
  const nextVersion = (lastWorldSummary?.version || 0) + 1;
  await worldSummaryDbManager.create({
    worldId: mundoid,
    summary,
    puebloHash: currentHash,
    version: nextVersion
  });
  console.log(`[executeResumenMundo] Mundo ${mundoid} - Resumen guardado en DB con versión ${nextVersion}`);


  

  return {
    success: true,
    data: { summary }
  };
}

// ========================================================================
// OTROS TRIGGERS (CHAT, NUEVO LORE)
// ========================================================================

async function executeChat(payload: ChatTriggerPayload): Promise<TriggerExecutionResult> {
  const result = await handleChatTrigger(payload);
  return result;
}

async function executeNuevoLore(payload: NuevoLoreTriggerPayload): Promise<TriggerExecutionResult> {
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
