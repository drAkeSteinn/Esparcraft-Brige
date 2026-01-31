'use server';

// Fixed: extractPromptSections moved to promptUtils.ts to avoid async function requirement

import {
  ChatTriggerPayload,
  ResumenSesionTriggerPayload,
  ResumenNPCTriggerPayload,
  ResumenEdificioTriggerPayload,
  ResumenPuebloTriggerPayload,
  ResumenMundoTriggerPayload,
  NuevoLoreTriggerPayload,
  AnyTriggerPayload,
  ChatMessage,
  getCardField,
  Jugador,
  SessionSummary
} from './types';
import {
  worldManager,
  puebloManager,
  edificioManager,
  sessionManager,
  npcStateManager,
  summaryManager,
  edificioStateManager,
  puebloStateManager,
  worldStateManager,
  grimorioManager
} from './fileManager';
import { npcDbManager } from './npcDbManager';
import {
  buildChatMessagesWithOptions,
  buildCompleteChatPrompt,
  buildCompleteSessionSummaryPrompt,
  buildSessionSummaryPrompt,
  buildNPCSummaryPrompt,
  buildEdificioSummaryPrompt,
  buildPuebloSummaryPrompt,
  buildWorldSummaryPrompt,
  buildNuevoLorePrompt
} from './promptBuilder';
import { EmbeddingTriggers } from './embedding-triggers';
import { replaceVariables, replaceVariablesWithCache, VariableContext } from './utils';
import { extractPromptSections } from './promptUtils';
import { resolveAllVariables } from './grimorioUtils';

// LLM Configuration
const LLM_API_URL = process.env.LLM_API_URL || 'http://127.0.0.1:5000/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'local-model';
const LLM_TEMPERATURE = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
const LLM_MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || '2000');

async function callLLM(messages: ChatMessage[]): Promise<string> {
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

/**
 * Realiza un merge incremental de datos del jugador
 * - Los nuevos datos sobrescriben los existentes
 * - Los datos que no vienen se conservan
 * - Los campos vacíos en el payload NO borran los existentes (solo null borra)
 */
function mergeJugadorData(
  jugadorExistente: Jugador | undefined,
  jugadorNuevo: Jugador | undefined
): Jugador | undefined {
  // Si no hay datos nuevos, conservar existentes
  if (!jugadorNuevo || Object.keys(jugadorNuevo).length === 0) {
    return jugadorExistente;
  }

  // Si no hay datos existentes, usar nuevos (filtrando vacíos)
  if (!jugadorExistente) {
    const jugadorFiltrado = Object.entries(jugadorNuevo)
      .filter(([_, valor]) => valor !== undefined && valor !== '')
      .reduce((obj, [key, valor]) => ({ ...obj, [key]: valor }), {});

    return Object.keys(jugadorFiltrado).length > 0 ? jugadorFiltrado : undefined;
  }

  // Merge: nuevos sobrescriben existentes
  // Campos vacíos en payload NO borran, conservan valor anterior
  // null en payload SÍ borra explícitamente
  const merged = { ...jugadorExistente };

  for (const [key, valor] of Object.entries(jugadorNuevo)) {
    if (valor === null) {
      // null significa borrar explícitamente
      delete (merged as any)[key];
    } else if (valor !== undefined && valor !== '') {
      // Solo actualizar si el nuevo valor no es vacío
      (merged as any)[key] = valor;
    }
    // Si valor es "" o undefined, conservar el existente
  }

  return merged;
}

// Chat trigger handler
export async function handleChatTrigger(payload: ChatTriggerPayload): Promise<{ response: string; sessionId: string }> {
  const { message, npcid, playersessionid, jugador, lastSummary: payloadLastSummary } = payload;

  // DEBUG: Log para ver qué llega del request
  console.log('[handleChatTrigger] DEBUG payload.npcid:', npcid);
  console.log('[handleChatTrigger] DEBUG payload.jugador:', jugador);
  console.log('[handleChatTrigger] DEBUG payload.message:', message);

  // Get NPC
  const npc = await npcDbManager.getById(npcid);
  if (!npc) {
    throw new Error(`NPC with id ${npcid} not found`);
  }

  // Get context (world, pueblo, edificio)
  const world = worldManager.getById(npc.location.worldId);
  const pueblo = npc.location.puebloId ? puebloManager.getById(npc.location.puebloId) : undefined;
  const edificio = npc.location.edificioId ? edificioManager.getById(npc.location.edificioId) : undefined;

  // Get or create session con merge incremental de jugador
  let session;
  if (playersessionid) {
    // Sessión existente: hacer merge incremental de jugador
    session = sessionManager.getById(playersessionid);
    if (!session) {
      throw new Error(`Session ${playersessionid} not found`);
    }

    // ✅ MERGE INCREMENTAL: mezclar datos nuevos con existentes
    const jugadorMergeado = mergeJugadorData(session.jugador, jugador);

    console.log('[handleChatTrigger] MERGE JUGADOR - Existente:', session.jugador);
    console.log('[handleChatTrigger] MERGE JUGADOR - Nuevo:', jugador);
    console.log('[handleChatTrigger] MERGE JUGADOR - Resultado:', jugadorMergeado);

    // Actualizar sesión con datos mergeados
    sessionManager.update(session.id, {
      jugador: jugadorMergeado
    });

    // Usar datos mergeados para el contexto
    session.jugador = jugadorMergeado;
  } else {
    // Nueva sesión: usar datos del payload (filtrando vacíos)
    const jugadorFiltrado = Object.entries(jugador || {})
      .filter(([_, valor]) => valor !== undefined && valor !== '')
      .reduce((obj, [key, valor]) => ({ ...obj, [key]: valor }), {});

    console.log('[handleChatTrigger] NUEVA SESIÓN - Jugador filtrado:', jugadorFiltrado);

    session = sessionManager.create({
      npcId: npcid,
      playerId: jugador?.nombre || undefined,
      jugador: Object.keys(jugadorFiltrado).length > 0 ? jugadorFiltrado : undefined,
      messages: []
    });
  }

  // Obtener el último resumen
  // 1. Prioridad: payload (puede venir del frontend)
  // 2. Fallback: buscar automáticamente en el summaryManager
  const lastSummary = payloadLastSummary || summaryManager.getSummary(session.id) || undefined;

  console.log('[handleChatTrigger] payloadLastSummary:', payloadLastSummary ? 'SI' : 'NO');
  console.log('[handleChatTrigger] summaryManager.getSummary:', summaryManager.getSummary(session.id) ? 'ENCONTRADO' : 'NO ENCONTRADO');
  console.log('[handleChatTrigger] lastSummary final:', lastSummary ? lastSummary.substring(0, 100) + '...' : 'undefined');

  // Construir contexto de variables para reemplazo
  // Usar session.jugador (ya mergeado) en lugar de payload.jugador
  const varContext: VariableContext = {
    npc,
    world,
    pueblo,
    edificio,
    jugador: session.jugador,  // ← DATOS DEL JUGADOR MERGEADOS
    session,
    char: getCardField(npc?.card, 'name', ''),
    mensaje: message,
    userMessage: message,
    lastSummary: lastSummary
  };

  // Construir el prompt completo
  const resolvedPrompt = buildCompleteChatPrompt(message, {
    world,
    pueblo,
    edificio,
    npc,
    session
  }, {
    jugador: session.jugador,  // ← DATOS DEL JUGADOR MERGEADOS
    lastSummary
  });

  console.log('[handleChatTrigger] DEBUG prompt:', resolvedPrompt.substring(0, 300) + '...');

  // Construir mensajes directamente con el prompt resuelto
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: resolvedPrompt,
      timestamp: new Date().toISOString()
    }
  ];

  // Add current user message
  messages.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });

  // Buscar contexto relevante de embeddings (síncrono, no bloquear)
  let embeddingContext = '';
  try {
    embeddingContext = await EmbeddingTriggers.searchContext(message, {
      namespace: undefined, // Buscar en todos los namespaces
      limit: 3, // Máximo 3 contextos relevantes
      threshold: 0.7 // 70% de similitud mínima
    });
  } catch (error) {
    console.error('Error buscando embeddings:', error);
    // Continuar sin contexto de embeddings
  }

  // Si hay contexto de embeddings, agregarlo al prompt
  let finalMessages = messages;
  if (embeddingContext) {
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      finalMessages = [
        {
          ...systemMessage,
          content: `${systemMessage.content}\n\n---\nContexto relevante de documentos:\n${embeddingContext}\n---`
        },
        ...messages.filter(m => m.role !== 'system')
      ];
    }
  }

  // Build complete prompt as text for storage (DESPUÉS de agregar embeddings)
  const completePrompt = finalMessages.map(m => `[${m.role}]\n${m.content}`).join('\n\n');

  // Save the complete prompt to session (ahora incluye embeddings si existían)
  // ✅ También guardar snapshot del jugador mergeado
  sessionManager.update(session.id, {
    lastPrompt: completePrompt,
    jugador: session.jugador  // ← Guardar snapshot mergeado
  });

  // Call LLM
  const response = await callLLM(finalMessages);

  // Save messages to session
  sessionManager.addMessage(session.id, {
    role: 'user',
    content: message
  });

  sessionManager.addMessage(session.id, {
    role: 'assistant',
    content: response
  });

  return {
    response,
    sessionId: session.id
  };
}

// Resumen sesion trigger handler
export async function handleResumenSesionTrigger(payload: ResumenSesionTriggerPayload): Promise<{ summary: string }> {
  const { npcid, playersessionid, systemPrompt, lastSummary: payloadLastSummary, chatHistory } = payload;

  // Get NPC and session
  const npc = await npcDbManager.getById(npcid);
  if (!npc) {
    throw new Error(`NPC with id ${npcid} not found`);
  }

  const session = sessionManager.getById(playersessionid);
  if (!session) {
    throw new Error(`Session ${playersessionid} not found`);
  }

  // Get context (world, pueblo, edificio)
  const world = worldManager.getById(npc.location.worldId);
  const pueblo = npc.location.puebloId ? puebloManager.getById(npc.location.puebloId) : undefined;
  const edificio = npc.location.edificioId ? edificioManager.getById(npc.location.edificioId) : undefined;

  // ✅ LEER CONFIGURACIÓN DE SYSTEM PROMPT DEL ARCHIVO ESPECÍFICO
  let configSystemPrompt = systemPrompt;

  // Si no se proporciona systemPrompt en el payload, cargar del archivo de configuración
  if (!configSystemPrompt) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'resumen-sesion-trigger-config.json');

      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        configSystemPrompt = config.systemPrompt || '';
        console.log('[handleResumenSesionTrigger] System Prompt cargado del archivo de configuración');
      } catch (error) {
        // El archivo no existe o hay error al leerlo, usar string vacío
        console.log('[handleResumenSesionTrigger] No hay configuración de System Prompt guardada, usando vacío');
        configSystemPrompt = '';
      }
    } catch (error) {
      console.error('[handleResumenSesionTrigger] Error cargando configuración de System Prompt:', error);
      configSystemPrompt = '';
    }
  }

  // ✅ CONSTRUIR EL PROMPT COMPLETO (SIN PLANTILLAS DE GRIMORIO)
  const basePrompt = buildCompleteSessionSummaryPrompt({
    world,
    pueblo,
    edificio,
    npc,
    session
  }, {
    systemPrompt: configSystemPrompt,
    lastSummary: payloadLastSummary,
    chatHistory: chatHistory || session.messages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
    grimorioTemplates: [] // ✅ NO USAR PLANTILLAS DE GRIMORIO EN EL MODO RESUMEN SESIÓN
  });

  // ✅ REEMPLAZAR VARIABLES PRIMARIAS (SIN PLANTILLAS DE GRIMORIO)
  const varContext: VariableContext = {
    npc,
    world,
    pueblo,
    edificio,
    session,
    char: getCardField(npc?.card, 'name', ''),
    lastSummary: payloadLastSummary
  };
  const resolvedPrompt = replaceVariables(basePrompt, varContext);

  // ✅ CONSTRUIR MENSAJES DIRECTAMENTE CON EL PROMPT RESUELTO
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: resolvedPrompt,
      timestamp: new Date().toISOString()
    }
  ];

  // Call LLM
  const summary = await callLLM(messages);

  // ✅ OBTENER METADATA PARA EL RESUMEN
  const npcName = getCardField(npc?.card, 'name', '');
  const playerName = session.playerId || session.jugador?.nombre || 'Unknown';
  const nextVersion = sessionManager.getNextSummaryVersion(session.id);

  // ✅ GUARDAR RESUMEN CON METADATA COMPLETA (Opción 3: Híbrida)
  summaryManager.saveSummary(
    session.id,
    npcid,
    playerName,
    npcName,
    summary,
    nextVersion
  );

  // ✅ AGREGAR RESUMEN AL HISTORIAL DE LA SESIÓN
  sessionManager.addSummaryToHistory(session.id, summary, nextVersion);

  // Clear messages from session after summary is generated
  sessionManager.clearMessages(session.id);

  return {
    summary
  };
}

// Resumen NPC trigger handler
export async function handleResumenNPCTrigger(payload: ResumenNPCTriggerPayload): Promise<{ success: boolean; memory: Record<string, any> }> {
  const { npcid, systemPrompt: payloadSystemPrompt, allSummaries: payloadAllSummaries } = payload;

  // Get NPC
  const npc = await npcDbManager.getById(npcid);
  if (!npc) {
    throw new Error(`NPC with id ${npcid} not found`);
  }

  // ✅ LEER CONFIGURACIÓN DE SYSTEM PROMPT DEL ARCHIVO ESPECÍFICO
  let configSystemPrompt = payloadSystemPrompt;

  // Si no se proporciona systemPrompt en el payload, cargar del archivo de configuración
  if (!configSystemPrompt) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'resumen-npc-trigger-config.json');

      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        configSystemPrompt = config.systemPrompt || '';
        console.log('[handleResumenNPCTrigger] System Prompt cargado del archivo de configuración');
      } catch (error) {
        // El archivo no existe o hay error al leerlo, usar string vacío
        console.log('[handleResumenNPCTrigger] No hay configuración de System Prompt guardada, usando default');
        configSystemPrompt = '';
      }
    } catch (error) {
      console.error('[handleResumenNPCTrigger] Error cargando configuración de System Prompt:', error);
      configSystemPrompt = '';
    }
  }

  // ✅ OBTENER RESÚMENES DE SESIONES DEL NPC CON METADATA
  const npcSummaries = summaryManager.getSummariesByNPC(npcid);
  console.log(`[handleResumenNPCTrigger] Obtenidos ${npcSummaries.length} resúmenes para el NPC ${npcid}`);

  // ✅ FORMATEAR LA LISTA DE RESÚMENES CON EL NUEVO FORMATO
  let allSummariesFormatted = payloadAllSummaries;

  if (!allSummariesFormatted && npcSummaries.length > 0) {
    // Agrupar resúmenes por nombre de jugador
    const summariesByPlayer = npcSummaries.reduce((acc, s) => {
      const playerName = s.playerName || 'Unknown';
      if (!acc[playerName]) {
        acc[playerName] = [];
      }
      acc[playerName].push(s);
      return acc;
    }, {} as Record<string, SessionSummary[]>);

    // Construir el formato especificado
    const memoriesSections: string[] = [];
    for (const [playerName, summaries] of Object.entries(summariesByPlayer)) {
      memoriesSections.push(`Memoria de ${playerName}`);
      summaries.forEach(s => {
        memoriesSections.push(s.summary);
      });
    }

    allSummariesFormatted = `***
MEMORIAS DE LOS AVENTUREROS
${memoriesSections.join('\n')}
***`;
    console.log('[handleResumenNPCTrigger] Resúmenes formateados correctamente');
  }

  // Get existing memory
  const existingMemory = npcStateManager.getMemory(npcid) || {};

  // ✅ CONSTRUIR EL SYSTEM PROMPT PARA RESUMEN NPC (SIN HEADERS)
  // El system prompt puede incluir keys de plantilla como {{npc.name}}, {{npc.personality}}, etc.
  const npcName = getCardField(npc?.card, 'name', '');

  // Construir contexto de variables para reemplazo
  const varContext: VariableContext = {
    npc,
    world,
    pueblo,
    edificio,
    char: npcName
  };

  // Build prompt con system prompt personalizado y resúmenes formateados
  let messages = buildNPCSummaryPrompt(
    npc,
    [], // No necesitamos summaries antiguos como array, usamos allSummaries
    existingMemory,
    {
      systemPrompt: configSystemPrompt,
      allSummaries: allSummariesFormatted
    }
  );

  // ✅ REEMPLAZAR VARIABLES PRIMARIAS Y PLANTILLAS DE GRIMORIO EN EL SYSTEM PROMPT
  const grimorioCards = grimorioManager.getAll();
  const systemPromptRaw = messages[0]?.content || '';
  const { result: systemPromptResolved } = resolveAllVariables(systemPromptRaw, varContext, grimorioCards);

  // Actualizar el mensaje system con las variables reemplazadas
  messages = [
    {
      role: 'system',
      content: systemPromptResolved,
      timestamp: new Date().toISOString()
    },
    ...messages.slice(1) // Mantener el mensaje user con las memorias
  ];

  console.log('[handleResumenNPCTrigger] System Prompt procesado con variables y plantillas');

  // Call LLM
  const response = await callLLM(messages);

  // ✅ GUARDAR RESUMEN EN creator_notes DE LA CARD DEL NPC
  // Reemplazar siempre el contenido de creator_notes con el resumen generado
  if (npc?.card) {
    const updatedCard: any = {
      ...npc.card
    };

    // Actualizar creator_notes en data si existe data, sino crearlo
    if (updatedCard.data) {
      updatedCard.data = {
        ...updatedCard.data,
        creator_notes: response
      };
    } else {
      updatedCard.data = {
        creator_notes: response
      };
    }

    await npcDbManager.update(npcid, { card: updatedCard });
    console.log('[handleResumenNPCTrigger] Resumen guardado en creator_notes de la Card del NPC');
  }

  return {
    success: true,
    summary: response
  };
}

// Resumen edificio trigger handler
export async function handleResumenEdificioTrigger(payload: ResumenEdificioTriggerPayload): Promise<{ success: boolean; summary: string }> {
  const { edificioid, systemPrompt: payloadSystemPrompt, allSummaries: payloadAllSummaries } = payload;

  // Get edificio
  const edificio = edificioManager.getById(edificioid);
  if (!edificio) {
    throw new Error(`Edificio with id ${edificioid} not found`);
  }

  // Get context (world, pueblo)
  const world = worldManager.getById(edificio.worldId);
  const pueblo = edificio.puebloId ? puebloManager.getById(edificio.puebloId) : undefined;

  // ✅ LEER CONFIGURACIÓN DE SYSTEM PROMPT DEL ARCHIVO ESPECÍFICO
  let configSystemPrompt = payloadSystemPrompt;

  // Si no se proporciona systemPrompt en el payload, cargar del archivo de configuración
  if (!configSystemPrompt) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'resumen-edificio-trigger-config.json');

      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        configSystemPrompt = config.systemPrompt || '';
        console.log('[handleResumenEdificioTrigger] System Prompt cargado del archivo de configuración');
      } catch (error) {
        console.log('[handleResumenEdificioTrigger] No hay configuración de System Prompt guardada, usando default');
        configSystemPrompt = '';
      }
    } catch (error) {
      console.error('[handleResumenEdificioTrigger] Error cargando configuración de System Prompt:', error);
      configSystemPrompt = '';
    }
  }

  // Get all NPCs for this edificio
  const npcs = await npcDbManager.getByEdificioId(edificioid);

  // ✅ OBTENER creator_notes DE LOS NPCs (no npcStateManager)
  let npcSummaries = payloadAllSummaries;

  if (!npcSummaries && npcs.length > 0) {
    npcSummaries = npcs
      .map(npc => {
        const creatorNotes = npc?.card?.data?.creator_notes || '';
        return {
          npcId: npc.id,
          npcName: npc.card?.data?.name || npc.card?.name || 'Unknown',
          consolidatedSummary: creatorNotes
        };
      })
      .filter(n => n.consolidatedSummary !== '')
      .map(n => `NPC: ${n.npcName} (ID: ${n.npcId})\n${n.consolidatedSummary}`)
      .join('\n\n');
  }

  console.log(`[handleResumenEdificioTrigger] Obtenidos resúmenes de ${npcs.length} NPCs para el edificio ${edificioid}`);

  // ✅ CONSTRUIR EL SYSTEM PROMPT PARA RESUMEN EDIFICIO (SIN HEADERS)
  const edificioName = edificio.name;

  // Construir contexto de variables para reemplazo
  const varContext: VariableContext = {
    edificio,
    world,
    pueblo,
    char: edificioName
  };

  // Build prompt con system prompt personalizado y resúmenes de NPCs
  let messages = buildEdificioSummaryPrompt(
    edificio,
    [],  // No necesitamos npcSummaries como array, usamos el string formateado
    undefined,  // No usamos memoria anterior del edificio
    {
      systemPrompt: configSystemPrompt
    }
  );

  // ✅ REEMPLAZAR VARIABLES PRIMARIAS Y PLANTILLAS DE GRIMORIO EN EL SYSTEM PROMPT
  const grimorioCards = grimorioManager.getAll();
  const systemPromptRaw = messages[0]?.content || '';
  const { result: systemPromptResolved } = resolveAllVariables(systemPromptRaw, varContext, grimorioCards);

  // Actualizar el mensaje system con las variables reemplazadas
  messages = [
    {
      role: 'system',
      content: systemPromptResolved,
      timestamp: new Date().toISOString()
    },
    // Si hay resúmenes de NPCs, agregar como user message
    ...(npcSummaries ? [{
      role: 'user',
      content: npcSummaries,
      timestamp: new Date().toISOString()
    }] : [])
  ];

  console.log('[handleResumenEdificioTrigger] System Prompt procesado con variables y plantillas');

  // Call LLM
  const response = await callLLM(messages);

  // ✅ GUARDAR RESUMEN EN eventos_recientes DE LA CARD DEL EDIFICIO
  // Reemplazar siempre el contenido de eventos_recientes con el resumen generado
  if (edificio) {
    const updatedEdificio: Partial<Edificio> = {
      eventos_recientes: [response]
    };

    edificioManager.update(edificioid, updatedEdificio);
    console.log('[handleResumenEdificioTrigger] Resumen guardado en eventos_recientes del edificio');
  }

  return {
    success: true,
    summary: response
  };
}

// Resumen pueblo trigger handler
export async function handleResumenPuebloTrigger(payload: ResumenPuebloTriggerPayload): Promise<{ success: boolean; summary: string }> {
  const { pueblid, systemPrompt: payloadSystemPrompt, allSummaries: payloadAllSummaries } = payload;

  // Get pueblo
  const pueblo = puebloManager.getById(pueblid);
  if (!pueblo) {
    throw new Error(`Pueblo with id ${pueblid} not found`);
  }

  // Get context (world)
  const world = worldManager.getById(pueblo.worldId);

  // ✅ LEER CONFIGURACIÓN DE SYSTEM PROMPT DEL ARCHIVO ESPECÍFICO
  let configSystemPrompt = payloadSystemPrompt;

  // Si no se proporciona systemPrompt en el payload, cargar del archivo de configuración
  if (!configSystemPrompt) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'resumen-pueblo-trigger-config.json');

      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        configSystemPrompt = config.systemPrompt || '';
        console.log('[handleResumenPuebloTrigger] System Prompt cargado del archivo de configuración');
      } catch (error) {
        console.log('[handleResumenPuebloTrigger] No hay configuración de System Prompt guardada, usando default');
        configSystemPrompt = '';
      }
    } catch (error) {
      console.error('[handleResumenPuebloTrigger] Error cargando configuración de System Prompt:', error);
      configSystemPrompt = '';
    }
  }

  // Get all edificios for this pueblo
  const edificios = edificioManager.getByPuebloId(pueblid);

  // ✅ OBTENER eventos_recientes DE LOS EDIFICIOS
  let edificioSummaries = payloadAllSummaries;

  if (!edificioSummaries && edificios.length > 0) {
    edificioSummaries = edificios
      .map(edificio => {
        const eventosRecientes = edificio.eventos_recientes || [];
        const consolidatedSummary = eventosRecientes.length > 0
          ? eventosRecientes.join('\n')
          : '';

        return {
          edificioId: edificio.id,
          edificioName: edificio.name,
          consolidatedSummary: consolidatedSummary
        };
      })
      .filter(e => e.consolidatedSummary !== '')
      .map(e => `Edificio ${e.edificioName} (ID: ${e.edificioId})\n${e.consolidatedSummary}`)
      .join('\n\n');
  }

  console.log(`[handleResumenPuebloTrigger] Obtenidos resúmenes de ${edificios.length} edificios para el pueblo ${pueblid}`);

  // ✅ CONSTRUIR EL SYSTEM PROMPT PARA RESUMEN PUEBLO (SIN HEADERS)
  const puebloName = pueblo.name;

  // Construir contexto de variables para reemplazo
  const varContext: VariableContext = {
    pueblo,
    world,
    char: puebloName
  };

  // Build prompt con system prompt personalizado y resúmenes de edificios
  let messages = buildPuebloSummaryPrompt(
    pueblo,
    [],  // No necesitamos edificioSummaries como array, usamos el string formateado
    undefined,  // No usamos memoria anterior del pueblo
    {
      systemPrompt: configSystemPrompt
    }
  );

  // ✅ REEMPLAZAR VARIABLES PRIMARIAS Y PLANTILLAS DE GRIMORIO EN EL SYSTEM PROMPT
  const grimorioCards = grimorioManager.getAll();
  const systemPromptRaw = messages[0]?.content || '';
  const { result: systemPromptResolved } = resolveAllVariables(systemPromptRaw, varContext, grimorioCards);

  // Actualizar el mensaje system con las variables reemplazadas
  messages = [
    {
      role: 'system',
      content: systemPromptResolved,
      timestamp: new Date().toISOString()
    },
    // Si hay resúmenes de edificios, agregar como user message
    ...(edificioSummaries ? [{
      role: 'user',
      content: edificioSummaries,
      timestamp: new Date().toISOString()
    }] : [])
  ];

  console.log('[handleResumenPuebloTrigger] System Prompt procesado con variables y plantillas');

  // Call LLM
  const response = await callLLM(messages);

  // ✅ GUARDAR RESUMEN EN rumores DE LA CARD DEL PUEBLO
  // Reemplazar siempre el contenido de rumores con el resumen generado
  if (pueblo) {
    const updatedPueblo: Partial<Pueblo> = {
      lore: {
        ...pueblo.lore,
        rumores: [response]  // Reemplazar el array completo
      }
    };

    puebloManager.update(pueblid, updatedPueblo);
    console.log('[handleResumenPuebloTrigger] Resumen guardado en rumores del pueblo');
  }

  return {
    success: true,
    summary: response
  };
}

// Resumen mundo trigger handler
export async function handleResumenMundoTrigger(payload: ResumenMundoTriggerPayload): Promise<{ success: boolean; summary: string }> {
  const { mundoid, systemPrompt: payloadSystemPrompt, allSummaries: payloadAllSummaries } = payload;

  // Get world
  const world = worldManager.getById(mundoid);
  if (!world) {
    throw new Error(`World with id ${mundoid} not found`);
  }

  // ✅ LEER CONFIGURACIÓN DE SYSTEM PROMPT DEL ARCHIVO ESPECÍFICO
  let configSystemPrompt = payloadSystemPrompt;

  // Si no se proporciona systemPrompt en el payload, cargar del archivo de configuración
  if (!configSystemPrompt) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'resumen-mundo-trigger-config.json');

      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        configSystemPrompt = config.systemPrompt || '';
        console.log('[handleResumenMundoTrigger] System Prompt cargado del archivo de configuración');
      } catch (error) {
        console.log('[handleResumenMundoTrigger] No hay configuración de System Prompt guardada, usando default');
        configSystemPrompt = '';
      }
    } catch (error) {
      console.error('[handleResumenMundoTrigger] Error cargando configuración de System Prompt:', error);
      configSystemPrompt = '';
    }
  }

  // Get all pueblos for this world
  const pueblos = puebloManager.getByWorldId(mundoid);

  // ✅ OBTENER RUMORES DE LOS PUEBLOS
  let puebloSummaries = payloadAllSummaries;

  if (!puebloSummaries && pueblos.length > 0) {
    puebloSummaries = pueblos
      .map(pueblo => {
        const rumores = pueblo.lore.rumores || [];
        const consolidatedSummary = rumores.length > 0
          ? rumores.join('\n')
          : '';

        return {
          puebloId: pueblo.id,
          puebloName: pueblo.name,
          consolidatedSummary: consolidatedSummary
        };
      })
      .filter(p => p.consolidatedSummary !== '')
      .map(p => `Pueblo/Nación ${p.p.puebloName} (ID: ${p.p.puebloId})\n${p.consolidatedSummary}`)
      .join('\n\n');
  }

  console.log(`[handleResumenMundoTrigger] Obtenidos resúmenes de ${pueblos.length} pueblos para el mundo ${mundoid}`);

  // ✅ CONSTRUIR EL SYSTEM PROMPT PARA RESUMEN MUNDO (SIN HEADERS)
  const mundoName = world.name;

  // Construir contexto de variables para reemplazo
  const varContext: VariableContext = {
    world,
    char: mundoName
  };

  // Build prompt con system prompt personalizado y resúmenes de pueblos
  let messages = buildWorldSummaryPrompt(
    world,
    [],  // No necesitamos puebloSummaries como array, usamos el string formateado
    undefined,  // No usamos memoria anterior del mundo
    {
      systemPrompt: configSystemPrompt
    }
  );

  // ✅ REEMPLAZAR VARIABLES PRIMARIAS Y PLANTILLAS DE GRIMORIO EN EL SYSTEM PROMPT
  const grimorioCards = grimorioManager.getAll();
  const systemPromptRaw = messages[0]?.content || '';
  const { result: systemPromptResolved } = resolveAllVariables(systemPromptRaw, varContext, grimorioCards);

  // Actualizar el mensaje system con las variables reemplazadas
  messages = [
    {
      role: 'system',
      content: systemPromptResolved,
      timestamp: new Date().toISOString()
    },
    // Si hay resúmenes de pueblos, agregar como user message
    ...(puebloSummaries ? [{
      role: 'user',
      content: puebloSummaries,
      timestamp: new Date().toISOString()
    }] : [])
  ];

  console.log('[handleResumenMundoTrigger] System Prompt procesado con variables y plantillas');

  // Call LLM
  const response = await callLLM(messages);

  // ✅ GUARDAR RESUMEN EN rumores DE LA CARD DEL MUNDO
  // Reemplazar siempre el contenido de rumores con el resumen generado
  if (world) {
    const updatedWorld: Partial<World> = {
      lore: {
        ...world.lore,
        rumores: [response]  // Reemplazar el array completo
      }
    };

    worldManager.update(mundoid, updatedWorld);
    console.log('[handleResumenMundoTrigger] Resumen guardado en rumores del mundo');
  }

  return {
    success: true,
    summary: response
  };
}

// Nuevo lore trigger handler
export async function handleNuevoLoreTrigger(payload: NuevoLoreTriggerPayload): Promise<{ lore: string }> {
  const { scope, targetId, loreType, context } = payload;

  // Get context based on scope
  let world, pueblo, edificio;
  if (scope === 'mundo') {
    world = worldManager.getById(targetId);
    if (!world) {
      throw new Error(`World with id ${targetId} not found`);
    }
  } else if (scope === 'pueblo') {
    pueblo = puebloManager.getById(targetId);
    if (!pueblo) {
      throw new Error(`Pueblo with id ${targetId} not found`);
    }
    world = worldManager.getById(pueblo.worldId);
  }

  // Build prompt
  const messages = buildNuevoLorePrompt(scope, {
    world,
    pueblo,
    edificio,
    loreType,
    context
  });

  // Call LLM
  const lore = await callLLM(messages);

  // Update lore
  if (scope === 'mundo' && world) {
    if (loreType === 'rumores') {
      worldManager.update(world.id, {
        lore: {
          ...world.lore,
          rumores: [...world.lore.rumores, lore]
        }
      });
    } else if (loreType === 'estado_mundo') {
      worldManager.update(world.id, {
        lore: {
          ...world.lore,
          estado_mundo: lore
        }
      });
    }
  } else if (scope === 'pueblo' && pueblo) {
    if (loreType === 'rumores') {
      puebloManager.update(pueblo.id, {
        lore: {
          ...pueblo.lore,
          rumores: [...pueblo.lore.rumores, lore]
        }
      });
    } else if (loreType === 'estado_pueblo') {
      puebloManager.update(pueblo.id, {
        lore: {
          ...pueblo.lore,
          estado_pueblo: lore
        }
      });
    }
  }

  return { lore };
}

// Main handler function
export async function handleTrigger(payload: AnyTriggerPayload): Promise<any> {
  const { mode } = payload;

  switch (mode) {
    case 'chat':
      return handleChatTrigger(payload as ChatTriggerPayload);
    case 'resumen_sesion':
      return handleResumenSesionTrigger(payload as ResumenSesionTriggerPayload);
    case 'resumen_npc':
      return handleResumenNPCTrigger(payload as ResumenNPCTriggerPayload);
    case 'resumen_edificio':
      return handleResumenEdificioTrigger(payload as ResumenEdificioTriggerPayload);
    case 'resumen_pueblo':
      return handleResumenPuebloTrigger(payload as ResumenPuebloTriggerPayload);
    case 'resumen_mundo':
      return handleResumenMundoTrigger(payload as ResumenMundoTriggerPayload);
    case 'nuevo_lore':
      return handleNuevoLoreTrigger(payload as NuevoLoreTriggerPayload);
    default:
      throw new Error(`Unknown trigger mode: ${mode}`);
  }
}

// Debug function to preview prompts without calling LLM
export async function previewTriggerPrompt(payload: AnyTriggerPayload): Promise<{
  systemPrompt: string;
  messages: ChatMessage[];
  estimatedTokens: number;
  lastPrompt?: string;
  sections?: Array<{
    label: string;
    content: string;
    bgColor: string;
  }>;
}> {
  const { mode } = payload;

  switch (mode) {
    case 'chat': {
      const chatPayload = payload as ChatTriggerPayload;

      // ✅ DEBUG: Log para ver qué llega del payload
      console.log('[previewTriggerPrompt] CHAT PAYLOAD:', JSON.stringify(chatPayload, null, 2));

      const npc = await npcDbManager.getById(chatPayload.npcid);
      if (!npc) throw new Error('NPC not found');

      console.log('[previewTriggerPrompt] NPC encontrado:', npc.id, npc.card?.data?.name || npc.card?.name);

      const world = worldManager.getById(npc.location.worldId);
      const pueblo = npc.location.puebloId ? puebloManager.getById(npc.location.puebloId) : undefined;
      const edificio = npc.location.edificioId ? edificioManager.getById(npc.location.edificioId) : undefined;
      const session = chatPayload.playersessionid ? sessionManager.getById(chatPayload.playersessionid) : undefined;

      // Obtener el último resumen
      // 1. Prioridad: payload (puede venir del frontend)
      // 2. Fallback: buscar automáticamente en el summaryManager
      const lastSummary = chatPayload.lastSummary || (session ? summaryManager.getSummary(session.id) : undefined) || undefined;

      // ✅ CONSTRUIR CONTEXTO DE VARIABLES PARA REEMPLAZO
      const varContext: VariableContext = {
        npc,
        world,
        pueblo,
        edificio,
        jugador: chatPayload.jugador,
        session,
        char: getCardField(npc?.card, 'name', ''),
        mensaje: chatPayload.message,
        userMessage: chatPayload.message,
        lastSummary: lastSummary
      };

      // ✅ CONSTRUIR EL PROMPT COMPLETO CON VARIABLES DE GRIMORIO
      const basePrompt = buildCompleteChatPrompt(chatPayload.message, {
        world,
        pueblo,
        edificio,
        npc,
        session
      }, {
        jugador: chatPayload.jugador,
        lastSummary
      });

      // ✅ buildCompleteChatPrompt YA reemplaza todas las variables (incluyendo plantillas de Grimorio)
      const resolvedPrompt = basePrompt;

      console.log('[previewTriggerPrompt] RESOLVED PROMPT LENGTH:', resolvedPrompt.length);
      console.log('[previewTriggerPrompt] RESOLVED PROMPT (primeros 200 chars):', resolvedPrompt.substring(0, 200));

      // ✅ CONSTRUIR MENSAJES DIRECTAMENTE CON EL PROMPT RESUELTO
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: resolvedPrompt,
          timestamp: new Date().toISOString()
        }
      ];

      // Add current user message
      messages.push({
        role: 'user',
        content: chatPayload.message,
        timestamp: new Date().toISOString()
      });

      const lastPrompt = messages.map(m => `[${m.role}]\n${m.content}`).join('\n\n');
      const systemPrompt = messages.find(m => m.role === 'system')?.content || '';

      const sections = extractPromptSections(systemPrompt);
      console.log('[previewTriggerPrompt] SECTIONS EXTRACTED:', sections.length);
      console.log('[previewTriggerPrompt] SECTIONS:', sections.map(s => s.label));

      return {
        systemPrompt,
        messages,
        estimatedTokens: 0,
        lastPrompt,
        sections: sections
      };
    }

    case 'resumen_sesion': {
      const summaryPayload = payload as ResumenSesionTriggerPayload;
      const npc = await npcDbManager.getById(summaryPayload.npcid);
      const session = sessionManager.getById(summaryPayload.playersessionid);

      if (!npc || !session) throw new Error('NPC or session not found');

      // Get context (world, pueblo, edificio)
      const world = worldManager.getById(npc.location.worldId);
      const pueblo = npc.location.puebloId ? puebloManager.getById(npc.location.puebloId) : undefined;
      const edificio = npc.location.edificioId ? edificioManager.getById(npc.location.edificioId) : undefined;

      // ✅ LEER CONFIGURACIÓN DE SYSTEM PROMPT DEL ARCHIVO ESPECÍFICO
      let configSystemPrompt = summaryPayload.systemPrompt;

      // Si no se proporciona systemPrompt en el payload, cargar del archivo de configuración
      if (!configSystemPrompt) {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const configPath = path.join(process.cwd(), 'db', 'resumen-sesion-trigger-config.json');

          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            configSystemPrompt = config.systemPrompt || '';
            console.log('[previewTriggerPrompt] System Prompt cargado del archivo de configuración');
          } catch (error) {
            console.log('[previewTriggerPrompt] No hay configuración de System Prompt guardada, usando vacío');
            configSystemPrompt = '';
          }
        } catch (error) {
          console.error('[previewTriggerPrompt] Error cargando configuración de System Prompt:', error);
          configSystemPrompt = '';
        }
      }

      // ✅ CONSTRUIR CONTEXTO DE VARIABLES PARA REEMPLAZO
      const varContext: VariableContext = {
        npc,
        world,
        pueblo,
        edificio,
        session,
        char: getCardField(npc?.card, 'name', ''),
        lastSummary: summaryPayload.lastSummary
      };

      // ✅ CONSTRUIR EL PROMPT COMPLETO (SIN PLANTILLAS DE GRIMORIO)
      const basePrompt = buildCompleteSessionSummaryPrompt({
        world,
        pueblo,
        edificio,
        npc,
        session
      }, {
        systemPrompt: configSystemPrompt,
        lastSummary: summaryPayload.lastSummary,
        chatHistory: summaryPayload.chatHistory || session.messages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
        grimorioTemplates: [] // ✅ NO USAR PLANTILLAS DE GRIMORIO EN EL MODO RESUMEN SESIÓN
      });

      // ✅ REEMPLAZAR VARIABLES PRIMARIAS (SIN PLANTILLAS DE GRIMORIO)
      const resolvedPrompt = replaceVariables(basePrompt, varContext);

      // ✅ CONSTRUIR MENSAJES DIRECTAMENTE CON EL PROMPT RESUELTO
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: resolvedPrompt,
          timestamp: new Date().toISOString()
        }
      ];

      const systemPrompt = messages[0]?.content || '';

      const lastPrompt = messages.map(m => `[${m.role}]\n${m.content}`).join('\n\n');

      return {
        systemPrompt,
        messages,
        estimatedTokens: 0,
        lastPrompt,
        sections: extractPromptSections(lastPrompt)
      };
    }

    case 'resumen_npc': {
      const npcPayload = payload as ResumenNPCTriggerPayload;
      const npc = await npcDbManager.getById(npcPayload.npcid);
      if (!npc) {
        throw new Error(`NPC with id ${npcPayload.npcid} not found`);
      }

      // Get context (world, pueblo, edificio)
      const world = worldManager.getById(npc.location.worldId);
      const pueblo = npc.location.puebloId ? puebloManager.getById(npc.location.puebloId) : undefined;
      const edificio = npc.location.edificioId ? edificioManager.getById(npc.location.edificioId) : undefined;

      // ✅ LEER CONFIGURACIÓN DE SYSTEM PROMPT DEL ARCHIVO ESPECÍFICO
      let configSystemPrompt = npcPayload.systemPrompt;

      // Si no se proporciona systemPrompt en el payload, cargar del archivo de configuración
      if (!configSystemPrompt) {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const configPath = path.join(process.cwd(), 'db', 'resumen-npc-trigger-config.json');

          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            configSystemPrompt = config.systemPrompt || '';
            console.log('[previewTriggerPrompt] System Prompt cargado del archivo de configuración');
          } catch (error) {
            console.log('[previewTriggerPrompt] No hay configuración de System Prompt guardada, usando default');
            configSystemPrompt = '';
          }
        } catch (error) {
          console.error('[previewTriggerPrompt] Error cargando configuración de System Prompt:', error);
          configSystemPrompt = '';
        }
      }

      // ✅ OBTENER RESÚMENES DE SESIONES DEL NPC CON METADATA
      const npcSummaries = summaryManager.getSummariesByNPC(npcPayload.npcid);

      // ✅ FORMATEAR LA LISTA DE RESÚMENES CON EL NUEVO FORMATO
      let allSummariesFormatted = npcPayload.allSummaries;

      if (!allSummariesFormatted && npcSummaries.length > 0) {
        // Agrupar resúmenes por nombre de jugador
        const summariesByPlayer = npcSummaries.reduce((acc, s) => {
          const playerName = s.playerName || 'Unknown';
          if (!acc[playerName]) {
            acc[playerName] = [];
          }
          acc[playerName].push(s);
          return acc;
        }, {} as Record<string, SessionSummary[]>);

        // Construir el formato especificado
        const memoriesSections: string[] = [];
        for (const [playerName, summaries] of Object.entries(summariesByPlayer)) {
          memoriesSections.push(`Memoria de ${playerName}`);
          summaries.forEach(s => {
            memoriesSections.push(s.summary);
          });
        }

        allSummariesFormatted = `***
MEMORIAS DE LOS AVENTUREROS
${memoriesSections.join('\n')}
***`;
      }

      const existingMemory = npcStateManager.getMemory(npcPayload.npcid) || {};

      // ✅ CONSTRUIR EL SYSTEM PROMPT PARA RESUMEN NPC (SIN HEADERS)
      // El system prompt puede incluir keys de plantilla como {{npc.name}}, {{npc.personality}}, etc.
      const npcName = getCardField(npc?.card, 'name', '');

      // Construir contexto de variables para reemplazo
      const varContext: VariableContext = {
        npc,
        world,
        pueblo,
        edificio,
        char: npcName
      };

      // Build prompt con system prompt personalizado y resúmenes formateados
      let messages = buildNPCSummaryPrompt(
        npc,
        [], // No necesitamos summaries antiguos como array, usamos allSummaries
        existingMemory,
        {
          systemPrompt: configSystemPrompt,
          allSummaries: allSummariesFormatted
        }
      );

      // ✅ REEMPLAZAR VARIABLES PRIMARIAS Y PLANTILLAS DE GRIMORIO EN EL SYSTEM PROMPT
      const grimorioCards = grimorioManager.getAll();
      const systemPromptRaw = messages[0]?.content || '';
      const { result: systemPromptResolved } = resolveAllVariables(systemPromptRaw, varContext, grimorioCards);

      // Actualizar el mensaje system con las variables reemplazadas
      messages = [
        {
          role: 'system',
          content: systemPromptResolved,
          timestamp: new Date().toISOString()
        },
        ...messages.slice(1) // Mantener el mensaje user con las memorias
      ];

      console.log('[previewTriggerPrompt] System Prompt procesado con variables y plantillas');

      const lastPrompt = messages.map(m => `[${m.role}]\n${m.content}`).join('\n\n');

      return {
        systemPrompt: systemPromptResolved,
        messages,
        estimatedTokens: 0,
        lastPrompt,
        sections: extractPromptSections(lastPrompt)
      };
    }

    case 'nuevo_lore': {
      const lorePayload = payload as NuevoLoreTriggerPayload;
      let world, pueblo;

      if (lorePayload.scope === 'mundo') {
        world = worldManager.getById(lorePayload.targetId);
        if (!world) {
          throw new Error(`World with id ${lorePayload.targetId} not found`);
        }
      } else if (lorePayload.scope === 'pueblo') {
        pueblo = puebloManager.getById(lorePayload.targetId);
        if (!pueblo) {
          throw new Error(`Pueblo with id ${lorePayload.targetId} not found`);
        }
      }

      const messages = buildNuevoLorePrompt(lorePayload.scope, {
        world,
        pueblo,
        loreType: lorePayload.loreType,
        context: lorePayload.context
      });
      const systemPrompt = messages[0]?.content || '';

      const lastPrompt = messages.map(m => `[${m.role}]\n${m.content}`).join('\n\n');

      return {
        systemPrompt,
        messages,
        estimatedTokens: 0,
        lastPrompt,
        sections: extractPromptSections(lastPrompt)
      };
    }

    case 'resumen_edificio': {
      const edificioPayload = payload as ResumenEdificioTriggerPayload;
      const edificio = edificioManager.getById(edificioPayload.edificioid);
      if (!edificio) throw new Error('Edificio not found');

      // Get context (world, pueblo)
      const world = worldManager.getById(edificio.worldId);
      const pueblo = edificio.puebloId ? puebloManager.getById(edificio.puebloId) : undefined;

      // ✅ LEER CONFIGURACIÓN DE SYSTEM PROMPT
      let configSystemPrompt = edificioPayload.systemPrompt;

      // Si no se proporciona systemPrompt en el payload, cargar del archivo de configuración
      if (!configSystemPrompt) {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const configPath = path.join(process.cwd(), 'db', 'resumen-edificio-trigger-config.json');

          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            configSystemPrompt = config.systemPrompt || '';
            console.log('[previewTriggerPrompt] System Prompt cargado del archivo de configuración');
          } catch (error) {
            console.log('[previewTriggerPrompt] No hay configuración de System Prompt guardada, usando default');
            configSystemPrompt = '';
          }
        } catch (error) {
          console.error('[previewTriggerPrompt] Error cargando configuración de System Prompt:', error);
          configSystemPrompt = '';
        }
      }

      // ✅ OBTENER creator_notes DE LOS NPCs (no npcStateManager)
      const npcs = await npcDbManager.getByEdificioId(edificioPayload.edificioid);
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

      // ✅ CONSTRUIR EL SYSTEM PROMPT Y REEMPLAZAR VARIABLES
      const edificioName = edificio.name;

      // Construir contexto de variables para reemplazo
      const varContext: VariableContext = {
        edificio,
        world,
        pueblo,
        char: edificioName
      };

      // Build prompt con system prompt personalizado
      let messages = buildEdificioSummaryPrompt(
        edificio,
        [],  // No necesitamos npcSummaries como array, usamos el string formateado
        undefined,  // No usamos memoria anterior del edificio
        {
          systemPrompt: configSystemPrompt
        }
      );

      // ✅ Formatear los resúmenes de NPCs
      const npcSummariesText = npcSummaries
        .map(n => `NPC: ${n.npcName} (ID: ${n.npcId})\n${n.consolidatedSummary}`)
        .join('\n\n');

      // ✅ REEMPLAZAR VARIABLES PRIMARIAS Y PLANTILLAS DE GRIMORIO EN EL SYSTEM PROMPT
      const grimorioCards = grimorioManager.getAll();
      const systemPromptRaw = messages[0]?.content || '';
      const { result: systemPromptResolved } = resolveAllVariables(systemPromptRaw, varContext, grimorioCards);

      // Actualizar el mensaje system con las variables reemplazadas
      messages = [
        {
          role: 'system',
          content: systemPromptResolved,
          timestamp: new Date().toISOString()
        },
        // Si hay resúmenes de NPCs, agregar como user message
        ...(npcSummariesText ? [{
          role: 'user',
          content: npcSummariesText,
          timestamp: new Date().toISOString()
        }] : [])
      ];

      console.log('[previewTriggerPrompt] System Prompt procesado con variables y plantillas');

      const lastPrompt = messages.map(m => `[${m.role}]\n${m.content}`).join('\n\n');

      return {
        systemPrompt: systemPromptResolved,
        messages,
        estimatedTokens: 0,
        lastPrompt,
        sections: extractPromptSections(lastPrompt)
      };
    }

    case 'resumen_pueblo': {
      const puebloPayload = payload as ResumenPuebloTriggerPayload;
      const pueblo = puebloManager.getById(puebloPayload.pueblid);
      if (!pueblo) throw new Error('Pueblo not found');

      // Get context (world)
      const world = worldManager.getById(pueblo.worldId);

      // ✅ LEER CONFIGURACIÓN DE SYSTEM PROMPT
      let configSystemPrompt = puebloPayload.systemPrompt;

      if (!configSystemPrompt) {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const configPath = path.join(process.cwd(), 'db', 'resumen-pueblo-trigger-config.json');

          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            configSystemPrompt = config.systemPrompt || '';
            console.log('[previewTriggerPrompt] System Prompt cargado del archivo de configuración');
          } catch (error) {
            console.log('[previewTriggerPrompt] No hay configuración de System Prompt guardada, usando default');
            configSystemPrompt = '';
          }
        } catch (error) {
          console.error('[previewTriggerPrompt] Error cargando configuración de System Prompt:', error);
          configSystemPrompt = '';
        }
      }

      // ✅ OBTENER eventos_recientes DE LOS EDIFICIOS
      const edificios = edificioManager.getByPuebloId(puebloPayload.pueblid);
      const edificioSummaries = edificios
        .map(edificio => {
          const eventosRecientes = edificio.eventos_recientes || [];
          const consolidatedSummary = eventosRecientes.length > 0
            ? eventosRecientes.join('\n')
            : '';

          return {
            edificioId: edificio.id,
            edificioName: edificio.name,
            consolidatedSummary: consolidatedSummary
          };
        })
        .filter(e => e.consolidatedSummary !== '');

      // ✅ CONSTRUIR EL SYSTEM PROMPT Y REEMPLAZAR VARIABLES
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

      // ✅ Formatear los resúmenes de edificios
      const edificioSummariesText = edificioSummaries
        .map(e => `Edificio ${e.edificioName} (ID: ${e.edificioId})\n${e.consolidatedSummary}`)
        .join('\n\n');

      // ✅ REEMPLAZAR VARIABLES
      const grimorioCards = grimorioManager.getAll();
      const systemPromptRaw = messages[0]?.content || '';
      const { result: systemPromptResolved } = resolveAllVariables(systemPromptRaw, varContext, grimorioCards);

      messages = [
        {
          role: 'system',
          content: systemPromptResolved,
          timestamp: new Date().toISOString()
        },
        ...(edificioSummariesText ? [{
          role: 'user',
          content: edificioSummariesText,
          timestamp: new Date().toISOString()
        }] : [])
      ];

      const lastPrompt = messages.map(m => `[${m.role}]\n${m.content}`).join('\n\n');

      return {
        systemPrompt: systemPromptResolved,
        messages,
        estimatedTokens: 0,
        lastPrompt,
        sections: extractPromptSections(lastPrompt)
      };
    }

    case 'resumen_mundo': {
      const mundoPayload = payload as ResumenMundoTriggerPayload;
      const world = worldManager.getById(mundoPayload.mundoid);
      if (!world) throw new Error('World not found');

      // ✅ LEER CONFIGURACIÓN DE SYSTEM PROMPT
      let configSystemPrompt = mundoPayload.systemPrompt;

      if (!configSystemPrompt) {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const configPath = path.join(process.cwd(), 'db', 'resumen-mundo-trigger-config.json');

          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            configSystemPrompt = config.systemPrompt || '';
            console.log('[previewTriggerPrompt] System Prompt cargado del archivo de configuración');
          } catch (error) {
            console.log('[previewTriggerPrompt] No hay configuración de System Prompt guardada, usando default');
            configSystemPrompt = '';
          }
        } catch (error) {
          console.error('[previewTriggerPrompt] Error cargando configuración de System Prompt:', error);
          configSystemPrompt = '';
        }
      }

      // ✅ OBTENER rumores DE LOS PUEBLOS
      const pueblos = puebloManager.getByWorldId(mundoPayload.mundoid);
      const puebloSummaries = pueblos
        .map(pueblo => {
          const rumores = pueblo.lore.rumores || [];
          const consolidatedSummary = rumores.length > 0
            ? rumores.join('\n')
            : '';

          return {
            puebloId: pueblo.id,
            puebloName: pueblo.name,
            consolidatedSummary: consolidatedSummary
          };
        })
        .filter(p => p.consolidatedSummary !== '');

      // ✅ CONSTRUIR EL SYSTEM PROMPT Y REEMPLAZAR VARIABLES
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

      // ✅ Formatear los resúmenes de pueblos
      const puebloSummariesText = puebloSummaries
        .map(p => `Pueblo/Nación ${p.puebloName} (ID: ${p.puebloId})\n${p.consolidatedSummary}`)
        .join('\n\n');

      // ✅ REEMPLAZAR VARIABLES
      const grimorioCards = grimorioManager.getAll();
      const systemPromptRaw = messages[0]?.content || '';
      const { result: systemPromptResolved } = resolveAllVariables(systemPromptRaw, varContext, grimorioCards);

      messages = [
        {
          role: 'system',
          content: systemPromptResolved,
          timestamp: new Date().toISOString()
        },
        ...(puebloSummariesText ? [{
          role: 'user',
          content: puebloSummariesText,
          timestamp: new Date().toISOString()
        }] : [])
      ];

      const lastPrompt = messages.map(m => `[${m.role}]\n${m.content}`).join('\n\n');

      return {
        systemPrompt: systemPromptResolved,
        messages,
        estimatedTokens: 0,
        lastPrompt,
        sections: extractPromptSections(lastPrompt)
      };
    }

    default:
      throw new Error(`Unknown trigger mode: ${mode}`);
  }
}
