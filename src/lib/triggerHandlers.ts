'use server';

// Updated: Fix npcSummaryDbManager import - Using summaryManagers for NPCSummaryManager
// Fixed: extractPromptSections moved to promptUtils.ts to avoid async function requirement

import {
  ChatTriggerPayload,
  ResumenSesionTriggerPayload,
  ResumenNPCTriggerPayload,
  ResumenEdificioTriggerPayload,
  ResumenPuebloTriggerPayload,
  ResumenMundoTriggerPayload,
  NuevoLoreTriggerPayload,
  NuevoContextoTriggerPayload,
  AnyTriggerPayload,
  ChatMessage,
  getCardField,
  Jugador,
  SessionSummary,
  JsonResponseConfig,
  JsonProcessResult
} from './types';
import {
  edificioStateManager,
  puebloStateManager,
  worldStateManager,
  grimorioManager,
  summaryManager
} from './fileManager';
import { npcDbManager } from './npcDbManager';
import { worldDbManager } from './worldDbManager';
import { puebloDbManager } from './puebloDbManager';
import { edificioDbManager } from './edificioDbManager';
import { sessionDbManager } from './sessionDbManager';
// Importar managers de resúmenes
import { sessionSummaryDbManager } from './resumenSummaryDbManager';
import { NPCSummaryManager, EdificioSummaryManager, PuebloSummaryManager, WorldSummaryManager } from './summaryManagers';
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
import { generateSessionSummariesHash, generateNPCSummariesHash, generateEdificioSummariesHash, generatePuebloSummariesHash } from './hashUtils';
import { getSimilarityThreshold, getMaxResults } from './config-persistence';
import { callLLM as unifiedCallLLM } from './llm/callLLM';
import { getSessionConfig } from './sessionConfig';
import { namespaceManager, buildNamespace } from './namespaceManager';
import { getEmbeddingClient } from './embeddings/client';
import { contextoAdicionalManager, normalizeEntityType } from './contextoAdicionalManager';
import { db } from './db';

/**
 * Extrae JSON de una respuesta del LLM
 * Maneja diferentes formatos: JSON puro, markdown con ```json, texto con JSON embebido
 */
function extractJsonFromResponse(response: string): string | null {
  // Intentar parsear directamente
  const trimmed = response.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  // Buscar JSON en bloques markdown ```json ... ```
  const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }

  // Buscar JSON embebido (primer { hasta último })
  const firstBrace = response.indexOf('{');
  const lastBrace = response.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return response.substring(firstBrace, lastBrace + 1);
  }

  return null;
}

/**
 * Intenta parsear JSON y validar que tenga las keys requeridas
 */
function tryParseJson(jsonStr: string, requiredKeys?: string[]): { success: boolean; data?: Record<string, any>; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    
    // Si hay keys requeridas, validar que existan
    if (requiredKeys && Array.isArray(requiredKeys)) {
      const missingKeys = requiredKeys.filter(key => !(key in parsed));
      if (missingKeys.length > 0) {
        return { success: false, error: `Missing required keys: ${missingKeys.join(', ')}` };
      }
    }
    
    return { success: true, data: parsed };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown parse error' };
  }
}

/**
 * Obtiene la configuración JSON del NPC
 */
function getJsonConfig(npc: any): JsonResponseConfig | null {
  const extensions = npc?.card?.data?.extensions || npc?.card?.extensions;
  if (!extensions?.jsonResponse?.enabled) return null;
  return extensions.jsonResponse as JsonResponseConfig;
}

/**
 * Procesa la respuesta del LLM en modo JSON
 * Intenta extraer, validar y corregir si es necesario
 */
async function processJsonResponse(
  response: string,
  jsonConfig: JsonResponseConfig,
  messages: ChatMessage[]
): Promise<JsonProcessResult> {
  const metadata = {
    jsonMode: true,
    attempts: 1,
    corrected: false,
    usedFallback: false
  };

  // Intentar extraer JSON
  let jsonStr = extractJsonFromResponse(response);
  
  if (!jsonStr) {
    console.log('[processJsonResponse] No se pudo extraer JSON de la respuesta');
    // Intentar corregir con LLM
    return await attemptCorrection(response, jsonConfig, messages, metadata, 'No se encontró JSON en la respuesta');
  }

  // Intentar parsear
  let parseResult = tryParseJson(jsonStr);
  
  if (parseResult.success) {
    console.log('[processJsonResponse] JSON parseado exitosamente en primer intento');
    return {
      success: true,
      data: parseResult.data!,
      rawResponse: response,
      metadata
    };
  }

  console.log('[processJsonResponse] Error parseando JSON:', parseResult.error);
  
  // Intentar corregir
  return await attemptCorrection(response, jsonConfig, messages, metadata, parseResult.error || 'Parse error');
}

/**
 * Intenta corregir la respuesta usando el LLM
 */
async function attemptCorrection(
  originalResponse: string,
  jsonConfig: JsonResponseConfig,
  originalMessages: ChatMessage[],
  metadata: any,
  errorMessage: string
): Promise<JsonProcessResult> {
  const maxRetries = jsonConfig.maxRetries || 2;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    metadata.attempts = attempt + 1;
    console.log(`[attemptCorrection] Intento de corrección ${attempt}/${maxRetries}`);
    
    // Crear mensaje de corrección
    const correctionPrompt = jsonConfig.correctionPrompt || 
      `La respuesta anterior no tiene el formato JSON correcto. Error: ${errorMessage}

Por favor, corrige la respuesta y devuelve ÚNICAMENTE el JSON válido sin texto adicional.

Respuesta incorrecta:
${originalResponse}

Formato esperado:
${JSON.stringify(jsonConfig.exampleResponse || jsonConfig.schema, null, 2)}`;

    const correctionMessages: ChatMessage[] = [
      ...originalMessages,
      {
        role: 'assistant',
        content: originalResponse,
        timestamp: new Date().toISOString()
      },
      {
        role: 'user',
        content: correctionPrompt,
        timestamp: new Date().toISOString()
      }
    ];

    try {
      const correctedResponse = await callLLM(correctionMessages);
      console.log('[attemptCorrection] Respuesta de corrección recibida');
      
      const jsonStr = extractJsonFromResponse(correctedResponse);
      if (!jsonStr) {
        console.log('[attemptCorrection] Aún no se puede extraer JSON');
        originalResponse = correctedResponse;
        continue;
      }

      const parseResult = tryParseJson(jsonStr);
      if (parseResult.success) {
        console.log('[attemptCorrection] JSON corregido exitosamente');
        metadata.corrected = true;
        return {
          success: true,
          data: parseResult.data!,
          rawResponse: correctedResponse,
          metadata
        };
      }
      
      originalResponse = correctedResponse;
      errorMessage = parseResult.error || 'Parse error';
    } catch (error) {
      console.error('[attemptCorrection] Error llamando al LLM:', error);
    }
  }

  // Agotados los intentos, usar fallback si existe
  if (jsonConfig.fallbackResponse) {
    console.log('[attemptCorrection] Usando respuesta de fallback');
    metadata.usedFallback = true;
    return {
      success: true,
      data: jsonConfig.fallbackResponse,
      rawResponse: originalResponse,
      metadata
    };
  }

  // Sin fallback, retornar error
  return {
    success: false,
    data: originalResponse,
    rawResponse: originalResponse,
    metadata: {
      ...metadata,
      error: `Failed after ${maxRetries} correction attempts: ${errorMessage}`
    }
  };
}

/**
 * Wrapper local que usa el callLLM unificado del sistema de proveedores.
 * Devuelve solo el content (string) para mantener compatibilidad con los
 * callers existentes que esperan un string.
 *
 * El proveedor activo se lee de la DB (tabla LLMProvider, isDefault=true).
 * Si no hay proveedor, se auto-crea uno desde .env.
 */
async function callLLM(messages: ChatMessage[]): Promise<string> {
  try {
    const result = await unifiedCallLLM(messages);
    return result.content;
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
export async function handleChatTrigger(payload: ChatTriggerPayload): Promise<{ 
  response: string | Record<string, any>; 
  sessionId: string;
  jsonMetadata?: JsonProcessResult['metadata'];
  /** Flag: true si la sesión fue auto-creada porque playersessionid no existía en la DB */
  sessionRestored?: boolean;
  /** Cambios de atributos aplicados al NPC (tool calling de atributos) */
  attributeChanges?: Array<{ key: string; name: string; type: string; oldValue: string; newValue: string; reason: string; clamped?: boolean; rejected?: boolean; rejectionReason?: string }>;
}> {
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

  // ✅ Detectar si el NPC tiene JSON mode activado
  const jsonConfig = getJsonConfig(npc);
  console.log('[handleChatTrigger] JSON mode:', jsonConfig?.enabled ? 'ACTIVADO' : 'DESACTIVADO');

  // Get context (world, pueblo, edificio)
  const world = await worldDbManager.getById(npc.location.worldId);
  const pueblo = npc.location.puebloId ? await puebloDbManager.getById(npc.location.puebloId) : undefined;
  const edificio = npc.location.edificioId ? await edificioDbManager.getById(npc.location.edificioId) : undefined;

  // Get or create session con merge incremental de jugador
  // ✅ AUTO-RECREACIÓN: si playersessionid no existe en la DB (fue eliminada o
  // nunca creada), se crea una nueva sesión con ese mismo ID en lugar de fallar.
  // También se asegura el namespace de la sesión (idempotente).
  let session;
  let sessionRestored = false;
  if (playersessionid) {
    // Sesión existente: hacer merge incremental de jugador
    session = await sessionDbManager.getById(playersessionid);
    if (!session) {
      // ⚠️ La sesión no existe: auto-crearla con el ID proporcionado por el cliente
      console.warn(`[handleChatTrigger] Sesión ${playersessionid} no encontrada (¿eliminada?). Auto-creando...`);

      const jugadorFiltrado = Object.entries(jugador || {})
        .filter(([_, valor]) => valor !== undefined && valor !== '')
        .reduce((obj, [key, valor]) => ({ ...obj, [key]: valor }), {});

      // Crear con el ID custom (playersessionid) para mantener consistencia con el cliente
      session = await sessionDbManager.create({
        npcId: npcid,
        playerId: jugador?.nombre || undefined,
        jugador: Object.keys(jugadorFiltrado).length > 0 ? jugadorFiltrado : undefined,
        messages: []
      }, playersessionid);

      sessionRestored = true;
      console.log(`[handleChatTrigger] ✅ Sesión ${playersessionid} auto-creada (sessionRestored=true)`);

      // ✅ Asegurar namespace de la sesión (idempotente: lo crea si no existe, no hace nada si ya existe)
      try {
        const { namespaceManager } = await import('./namespaceManager');
        const nsResult = await namespaceManager.ensureSessionNamespace(playersessionid);
        console.log(`[handleChatTrigger] Namespace sesion:${playersessionid} ${nsResult.created ? 'creado' : 'ya existía — se reutiliza'}`);
      } catch (nsErr: any) {
        console.warn(`[handleChatTrigger] No se pudo asegurar namespace de sesión restaurada:`, nsErr?.message);
      }
    } else {
      // ✅ MERGE INCREMENTAL: mezclar datos nuevos con existentes
      const jugadorMergeado = mergeJugadorData(session.jugador, jugador);

      console.log('[handleChatTrigger] MERGE JUGADOR - Existente:', session.jugador);
      console.log('[handleChatTrigger] MERGE JUGADOR - Nuevo:', jugador);
      console.log('[handleChatTrigger] MERGE JUGADOR - Resultado:', jugadorMergeado);

      // Actualizar sesión con datos mergeados
      await sessionDbManager.update(session.id, {
        jugador: jugadorMergeado
      });

      // Usar datos mergeados para el contexto
      session.jugador = jugadorMergeado;
    }
  } else {
    // Nueva sesión: usar datos del payload (filtrando vacíos)
    const jugadorFiltrado = Object.entries(jugador || {})
      .filter(([_, valor]) => valor !== undefined && valor !== '')
      .reduce((obj, [key, valor]) => ({ ...obj, [key]: valor }), {});

    console.log('[handleChatTrigger] NUEVA SESIÓN - Jugador filtrado:', jugadorFiltrado);

    session = await sessionDbManager.create({
      npcId: npcid,
      playerId: jugador?.nombre || undefined,
      jugador: Object.keys(jugadorFiltrado).length > 0 ? jugadorFiltrado : undefined,
      messages: []
    });

    // ✅ Asegurar namespace de la sesión nueva (idempotente)
    try {
      const { namespaceManager } = await import('./namespaceManager');
      await namespaceManager.ensureSessionNamespace(session.id);
    } catch (nsErr: any) {
      console.warn(`[handleChatTrigger] No se pudo asegurar namespace de sesión nueva:`, nsErr?.message);
    }
  }

  // Obtener el último resumen
  // 1. Prioridad: payload (puede venir del frontend)
  // 2. Fallback: buscar automáticamente en el summaryManager
  const lastSummary = payloadLastSummary || (await sessionSummaryDbManager.getLatestBySessionId(session.id))?.summary || undefined;

  console.log('[handleChatTrigger] payloadLastSummary:', payloadLastSummary ? 'SI' : 'NO');
  console.log('[handleChatTrigger] sessionSummaryDbManager.getLatestBySessionId:', await sessionSummaryDbManager.getLatestBySessionId(session.id) ? 'ENCONTRADO' : 'NO ENCONTRADO');
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

  // Buscar contexto relevante de embeddings ANTES de construir el prompt.
  // Busca en los namespaces de: sesión → NPC → edificio (jerarquía de chat).
  // Además, busca en los namespaces adicionales de contextos adicionales temporales.
  let embeddingContext = '';
  try {
    const threshold = getSimilarityThreshold();
    const maxResults = getMaxResults();

    // Determinar el punto de partida de la jerarquía de chat:
    // - Si hay sesión activa, empezar por la sesión (más específico)
    // - Si no, empezar por el NPC
    let startType: 'sesion' | 'npc' = 'npc';
    let startId = chatPayload.npcid;
    if (chatPayload.playersessionid) {
      startType = 'sesion';
      startId = chatPayload.playersessionid;
    }

    embeddingContext = await EmbeddingTriggers.searchContextForChat(
      startType,
      startId,
      message,
      {
        limit: Math.min(maxResults, 5), // Máximo 5 contextos relevantes para chat
        threshold
      }
    );
    console.log(`[handleChatTrigger] Búsqueda de embeddings (chat hierarchy) desde ${startType}:${startId}: threshold=${threshold}, limit=${maxResults}`);

    // ✅ BUSCAR EN CONTEXTOS ADICIONALES TEMPORALES (si el NPC los tiene)
    // Esto permite que el NPC acceda a namespaces de otras entidades que ha "visitado"
    try {
      const additionalNamespaces = await contextoAdicionalManager.getAdditionalNamespaces('npc', chatPayload.npcid);
      if (additionalNamespaces.length > 0) {
        console.log(`[handleChatTrigger] Contextos adicionales activos para NPC ${chatPayload.npcid}: ${additionalNamespaces.length} namespace(s)`);
        const additionalContext = await EmbeddingTriggers.searchContext(message, {
          namespaces: additionalNamespaces,
          limit: Math.min(maxResults, 3), // Máximo 3 contextos adicionales
          threshold,
        });
        if (additionalContext) {
          embeddingContext = embeddingContext
            ? `${embeddingContext}\n\n${additionalContext}`
            : additionalContext;
          console.log(`[handleChatTrigger] Contexto adicional encontrado (${additionalContext.length} chars)`);
        }
      }
    } catch (ctxErr: any) {
      console.warn(`[handleChatTrigger] Error buscando contextos adicionales:`, ctxErr?.message);
    }
    if (embeddingContext) {
      console.log(`[handleChatTrigger] Contexto de embeddings encontrado (${embeddingContext.length} chars)`);
    } else {
      console.log(`[handleChatTrigger] Sin contexto de embeddings`);
    }
  } catch (error) {
    console.error('Error buscando embeddings:', error);
    // Continuar sin contexto de embeddings
  }

  // Construir el prompt completo (incluye embeddingContext ANTES del chat history)
  const resolvedPrompt = await buildCompleteChatPrompt(message, {
    world,
    pueblo,
    edificio,
    npc,
    session
  }, {
    jugador: session.jugador,  // ← DATOS DEL JUGADOR MERGEADOS
    lastSummary,
    embeddingContext,  // ← CONTEXTO DE EMBEDDINGS (se inserta entre último resumen y chat history)
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

  // Los mensajes finales son los mismos (el contexto de embeddings ya está integrado en el prompt)
  const finalMessages = messages;

  // Build complete prompt as text for storage
  const completePrompt = finalMessages.map(m => `[${m.role}]\n${m.content}`).join('\n\n');

  // Save the complete prompt to session (ahora incluye embeddings si existían)
  // ✅ También guardar snapshot del jugador mergeado
  await sessionDbManager.update(session.id, {
    lastPrompt: completePrompt,
    jugador: session.jugador  // ← Guardar snapshot mergeado
  });

  // ✅ CARGAR ACCIONES DEL NPC (para tool calling o prompt)
  let npcActions: any[] = [];
  let actionsAsTools: any[] = [];
  try {
    const { npcActionManager } = await import('./actionDbManager');
    npcActions = await npcActionManager.getByNpcId(chatPayload.npcid);
    if (npcActions.length > 0) {
      actionsAsTools = await npcActionManager.getActionsAsTools(chatPayload.npcid);
      console.log(`[handleChatTrigger] NPC tiene ${npcActions.length} acción(es) definida(s)`);
    }
  } catch (e) {
    console.warn('[handleChatTrigger] No se pudieron cargar acciones:', e);
  }

  // ✅ CARGAR TOOL DE ATRIBUTOS DEL NPC (para que el LLM pueda modificarlos)
  let attributeTool: any = null;
  try {
    const { attributeToolManager } = await import('./attributeToolManager');
    attributeTool = await attributeToolManager.generateToolForNpc(chatPayload.npcid);
    if (attributeTool) {
      console.log(`[handleChatTrigger] Tool de atributos generada para NPC ${chatPayload.npcid}`);
    }
  } catch (e) {
    console.warn('[handleChatTrigger] No se pudo generar tool de atributos:', e);
  }

  // ✅ SI HAY ACCIONES/ATRIBUTOS Y EL PROVEEDOR SOPORTA TOOL CALLING → ENVIAR COMO TOOLS
  // Si no hay tool calling → añadir al system prompt (formato [ACCION:] / [ATRIBUTO:])
  let llmOptions: any = {};
  let toolCallingUsed = false;
  const allTools: any[] = [...actionsAsTools];
  if (attributeTool) allTools.push(attributeTool);

  if (allTools.length > 0) {
    try {
      const { providerManager } = await import('./llm/providerManager');
      const provider = await providerManager.getActive();
      if (provider?.toolCalling) {
        llmOptions.tools = allTools;
        toolCallingUsed = true;
        console.log(`[handleChatTrigger] Enviando ${allTools.length} tools al LLM (tool calling nativo): ${actionsAsTools.length} acción(es) + ${attributeTool ? 1 : 0} atributo(s)`);
      } else {
        // Tool calling no disponible → añadir acciones Y atributos al system prompt
        const { formatActionsForPrompt } = await import('./types');
        const systemMsg = finalMessages.find(m => m.role === 'system');
        if (systemMsg) {
          if (npcActions.length > 0) {
            const actionsPrompt = formatActionsForPrompt(npcActions);
            if (actionsPrompt) systemMsg.content += `\n\n${actionsPrompt}`;
          }
          if (attributeTool) {
            const { attributeToolManager } = await import('./attributeToolManager');
            const attrPrompt = await attributeToolManager.formatAttributeToolForPrompt(chatPayload.npcid);
            if (attrPrompt) systemMsg.content += `\n\n${attrPrompt}`;
          }
        }
        console.log(`[handleChatTrigger] Acciones + atributos añadidos al system prompt (sin tool calling nativo)`);
      }
    } catch (e) {
      // Si no se puede verificar el provider, añadir al prompt
      const { formatActionsForPrompt } = await import('./types');
      const systemMsg = finalMessages.find(m => m.role === 'system');
      if (systemMsg) {
        if (npcActions.length > 0) {
          const actionsPrompt = formatActionsForPrompt(npcActions);
          if (actionsPrompt) systemMsg.content += `\n\n${actionsPrompt}`;
        }
        if (attributeTool) {
          const { attributeToolManager } = await import('./attributeToolManager');
          const attrPrompt = await attributeToolManager.formatAttributeToolForPrompt(chatPayload.npcid);
          if (attrPrompt) systemMsg.content += `\n\n${attrPrompt}`;
        }
      }
    }
  }

  // Call LLM
  const llmResult = await unifiedCallLLM(finalMessages, llmOptions.tools ? { tools: llmOptions.tools } : undefined);

  // ✅ PROCESAR RESPUESTA: la APP estructura todo
  // El LLM responde con texto natural. La app extrae acciones y cambios de atributos.
  let dialogText = llmResult.content;
  let actions: Array<{ name: string; arguments: Record<string, any> }> = [];
  let attributeChanges: Array<any> = [];

  if (toolCallingUsed) {
    // ============================================================
    // MODO TOOL CALLING NATIVO
    // ============================================================
    // El LLM decide si usar tools. Si no devolvió tool_calls, simplemente
    // no quiso ejecutar ninguna acción ni cambiar atributos — eso es válido.
    // NO caemos al fallback de texto porque en modo nativo el LLM no añade
    // [ACCION:] ni [ATRIBUTO:] al texto (se le dijo que use tools).
    if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
      const { ATTRIBUTE_TOOL_NAME, attributeToolManager } = await import('./attributeToolManager');

      for (const tc of llmResult.toolCalls) {
        const toolName = tc.function.name;
        // Los argumentos vienen como JSON string. xAI siempre devuelve JSON
        // válido (strict mode implícito), pero defendemos contra parse errors.
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(tc.function.arguments || '{}');
        } catch (e) {
          console.warn(
            `[handleChatTrigger] Tool call "${toolName}" con arguments inválidos: "${tc.function.arguments}". Ignorando.`
          );
          continue;
        }

        if (toolName === ATTRIBUTE_TOOL_NAME) {
          // ✅ Tool de atributos: validar + aplicar a DB
          try {
            const result = await attributeToolManager.applyAttributeChange(chatPayload.npcid, {
              key: args.key,
              value: String(args.value),
              reason: args.reason || 'sin razón especificada',
            });
            if (result.change) {
              attributeChanges.push(result.change);
              console.log(`[handleChatTrigger] Atributo cambiado: ${result.message}`);
            } else {
              console.warn(`[handleChatTrigger] Cambio de atributo no aplicado: ${result.message}`);
            }
          } catch (e) {
            console.error(`[handleChatTrigger] Error aplicando cambio de atributo:`, e);
          }
        } else {
          // Tool de acción: agregar al array de acciones.
          // NOTA: las acciones NO se ejecutan aquí — solo se reportan al cliente
          // (tu integración con el juego) para que las ejecute.
          actions.push({ name: toolName, arguments: args });
        }
      }
      console.log(
        `[handleChatTrigger] ${actions.length} acción(es) + ${attributeChanges.length} cambio(s) de atributo(s) via tool calling`
      );
    } else {
      // toolCallingUsed=true pero toolCalls vacío: el LLM decidió no usar tools.
      // Eso es un comportamiento normal — no hay nada que procesar.
      console.log(
        `[handleChatTrigger] Tool calling habilitado pero el LLM no usó tools en esta respuesta.`
      );
    }
  } else {
    // ============================================================
    // MODO FALLBACK (sin tool calling nativo)
    // ============================================================
    // El system_prompt contiene instrucciones para que el LLM añada
    // [ACCION: nombre|param=valor] y [ATRIBUTO: key=valor | reason=motivo]
    // al final de su respuesta. Parseamos esas líneas del texto.
    const { parseActionFromResponse } = await import('./types');
    const parsed = parseActionFromResponse(dialogText);
    dialogText = parsed.dialogText;
    actions = parsed.actions;
    if (actions.length > 0) {
      console.log(`[handleChatTrigger] ${actions.length} acción(es) detectada(s) via [ACCION:]`);
    }

    // Parsear cambios de atributos del texto ([ATRIBUTO: key=valor | reason=motivo])
    if (attributeTool) {
      const { attributeToolManager } = await import('./attributeToolManager');
      const parsedAttrChanges = attributeToolManager.parseAttributeChangesFromText(dialogText);
      if (parsedAttrChanges.length > 0) {
        // Limpiar las líneas [ATRIBUTO:] del texto del diálogo
        dialogText = attributeToolManager.stripAttributeLinesFromText(dialogText);
        // Aplicar cada cambio
        for (const change of parsedAttrChanges) {
          try {
            const result = await attributeToolManager.applyAttributeChange(chatPayload.npcid, change);
            if (result.change) {
              attributeChanges.push(result.change);
              console.log(`[handleChatTrigger] Atributo cambiado (fallback): ${result.message}`);
            }
          } catch (e) {
            console.error(`[handleChatTrigger] Error aplicando cambio de atributo (fallback):`, e);
          }
        }
        console.log(`[handleChatTrigger] ${attributeChanges.length} cambio(s) de atributo(s) detectado(s) via [ATRIBUTO:]`);
      }
    }
  }

  // Save messages to session
  await sessionDbManager.addMessage(session.id, {
    role: 'user',
    content: message
  });

  await sessionDbManager.addMessage(session.id, {
    role: 'assistant',
    content: dialogText
  });

  // ✅ RETORNAR RESPUESTA ESTRUCTURADA POR LA APP
  return {
    response: dialogText,
    sessionId: session.id,
    actions: actions.length > 0 ? actions : undefined,
    attributeChanges: attributeChanges.length > 0 ? attributeChanges : undefined,
    sessionRestored: sessionRestored || undefined,
    metadata: {
      model: llmResult.model,
      latencyMs: llmResult.latencyMs,
      tokensUsed: llmResult.usage.totalTokens > 0 ? {
        prompt: llmResult.usage.promptTokens,
        completion: llmResult.usage.completionTokens,
        total: llmResult.usage.totalTokens,
      } : undefined,
      toolCallingUsed,
    },
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

  const session = await sessionDbManager.getById(playersessionid);
  if (!session) {
    throw new Error(`Session ${playersessionid} not found`);
  }

  // ✅ LEER CONFIGURACIÓN DE minMessages Y keepMessages DESDE sessionConfig
  // (configuración unificada en Sesiones → Configuración)
  const sessionCfg = getSessionConfig();
  const minMessages = sessionCfg.minMessagesToSummarize;
  const keepMessages = sessionCfg.keepMessagesAfterSummary;

  console.log(
    `[handleResumenSesionTrigger] Config: minMessages=${minMessages}, keepMessages=${keepMessages}`
  );

  // ✅ VERIFICAR QUE LA SESIÓN TENGA SUFICIENTES MENSAJES
  if (session.messages.length < minMessages) {
    console.log(`[handleResumenSesionTrigger] Sesión ${playersessionid} tiene ${session.messages.length} mensajes (< ${minMessages}), OMITIENDO resumen`);
    throw new Error(`La sesión tiene solo ${session.messages.length} mensajes. Se requieren al menos ${minMessages} mensajes para generar el resumen.`);
  }

  console.log(`[handleResumenSesionTrigger] Sesión ${playersessionid} tiene ${session.messages.length} mensajes (>= ${minMessages}), PROCEDIENDO con resumen`);

  // Get context (world, pueblo, edificio)
  const world = await worldDbManager.getById(npc.location.worldId);
  const pueblo = npc.location.puebloId ? await puebloDbManager.getById(npc.location.puebloId) : undefined;
  const edificio = npc.location.edificioId ? await edificioDbManager.getById(npc.location.edificioId) : undefined;

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
  const nextVersion = await sessionDbManager.getNextSummaryVersion(session.id);

  // ✅ GUARDAR RESUMEN ANTERIOR COMO EMBEDDING ANTES DE REEMPLAZARLO
  // Si la sesión tenía un resumen anterior (en session.summary o en el historial),
  // lo convertimos en embedding dentro del namespace sesion:{sessionId} para que
  // quede persistido como memoria a largo plazo y se pueda recuperar vía búsqueda semántica.
  try {
    const previousSummaryEntry = await sessionDbManager.getLatestSummary(session.id);
    const previousSummary = previousSummaryEntry?.summary || session.summary;

    if (previousSummary && previousSummary.trim()) {
      const sesionNamespace = buildNamespace('sesion', session.id);
      // Asegurar que el namespace de la sesión exista
      await namespaceManager.ensureSessionNamespace(session.id);

      const embeddingClient = getEmbeddingClient();
      // Eliminar embeddings previos del tipo 'resumen_sesion' de esta sesión
      // (para no acumular versiones obsoletas del resumen en el namespace)
      try {
        await embeddingClient.deleteBySource('resumen_sesion_anterior', session.id);
      } catch (delErr: any) {
        console.warn(
          `[handleResumenSesionTrigger] No se pudieron eliminar embeddings previos del resumen:`,
          delErr?.message
        );
      }

      // Guardar el resumen anterior como embedding
      await embeddingClient.createEmbedding({
        content: `Resumen anterior (v${previousSummaryEntry?.version ?? nextVersion - 1}) de sesión con ${npcName}:\n\n${previousSummary}`,
        metadata: {
          title: `Resumen anterior - Sesión ${session.id}`,
          type: 'resumen_sesion_anterior',
          sessionId: session.id,
          npcId: npcid,
          npcName,
          playerName,
          version: previousSummaryEntry?.version ?? nextVersion - 1,
          timestamp: new Date().toISOString(),
        },
        namespace: sesionNamespace,
        source_type: 'resumen_sesion_anterior',
        source_id: session.id,
      });
      console.log(
        `[handleResumenSesionTrigger] Resumen anterior guardado como embedding en namespace "${sesionNamespace}"`
      );
    } else {
      console.log(
        `[handleResumenSesionTrigger] No había resumen anterior para guardar como embedding`
      );
    }
  } catch (embedErr: any) {
    // No bloquear el flujo si falla el embedding del resumen anterior
    console.error(
      `[handleResumenSesionTrigger] Error guardando resumen anterior como embedding:`,
      embedErr?.message
    );
  }

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
  await sessionDbManager.addSummaryToHistory(session.id, summary, nextVersion);

  // ✅ CONSERVAR LOS ÚLTIMOS keepMessages Y ELIMINAR LOS VIEJOS
  // Antes: clearMessages(session.id) → borraba TODOS los mensajes.
  // Ahora: conservamos los últimos N mensajes (los más recientes) y eliminamos los viejos.
  // Esto optimiza el contexto sin perder la continuidad inmediata de la conversación.
  try {
    const currentSession = await sessionDbManager.getById(session.id);
    if (currentSession && currentSession.messages.length > keepMessages) {
      const recentMessages = currentSession.messages.slice(-keepMessages);
      await sessionDbManager.updateMessages(session.id, recentMessages);
      console.log(
        `[handleResumenSesionTrigger] Mensajes conservados: ${recentMessages.length} (de ${currentSession.messages.length}, keepMessages=${keepMessages})`
      );
    } else {
      console.log(
        `[handleResumenSesionTrigger] Sesión tiene ${currentSession?.messages.length ?? 0} mensajes, no se requiere recorte (keepMessages=${keepMessages})`
      );
    }
  } catch (trimErr: any) {
    console.error(
      `[handleResumenSesionTrigger] Error conservando últimos ${keepMessages} mensajes:`,
      trimErr?.message
    );
    // Fallback: limpiar todos los mensajes (comportamiento anterior)
    await sessionDbManager.clearMessages(session.id);
  }

  return {
    summary
  };
}

// Resumen NPC trigger handler
// Resumen NPC trigger handler - VERSIÓN CORREGIDA CON VERIFICACIÓN ANTES DE LLM
export async function handleResumenNPCTrigger(payload: ResumenNPCTriggerPayload): Promise<{ success: boolean; memory: Record<string, any> }> {
  const { npcid, systemPrompt: payloadSystemPrompt, allSummaries: payloadAllSummaries } = payload;

  // Get NPC
  const npc = await npcDbManager.getById(npcid);
  if (!npc) {
    throw new Error(`NPC with id ${npcid} not found`);
  }

  // Get context (world, pueblo, edificio)
  const world = await worldDbManager.getById(npc.location.worldId);
  const pueblo = npc.location.puebloId ? await puebloDbManager.getById(npc.location.puebloId) : undefined;
  const edificio = npc.location.edificioId ? await edificioDbManager.getById(npc.location.edificioId) : undefined;

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
  const npcSummaries = await sessionSummaryDbManager.getByNPCId(npcid);
  console.log(`[handleResumenNPCTrigger] Obtenidos \${npcSummaries.length} resúmenes para el NPC \${npcid}`);

  // ✅ CALCULAR HASH ACTUAL DE LOS RESÚMENES DE SESIONES DEL NPC
  const currentHash = generateSessionSummariesHash(npcSummaries);

  // ✅ OBTENER ÚLTIMO RESUMEN GUARDADO DEL NPC
  const npcSummaryMgr = new NPCSummaryManager();
  const lastNPCSummary = await npcSummaryMgr.getLatest(npcid);

  console.log(`[handleResumenNPCTrigger] NPC \${npcid} - Último hash guardado: \${lastNPCSummary?.sessionHash || 'N/A'}, Versión: \${lastNPCSummary?.version || 0}`);

  // ✅ VERIFICAR SI HUBO CAMBIOS EN LOS RESÚMENES DE SESIONES DEL NPC - ANTES DE LLAMAR AL LLM
  if (lastNPCSummary?.sessionHash === currentHash) {
    console.log(`[handleResumenNPCTrigger] NPC \${npcid} - SIN CAMBIOS, SKIP`);
    return {
      success: false,
      error: `No hubo cambios en las sesiones del NPC \${npcid}. Los resúmenes son iguales.`
    };
  }

  console.log(`[handleResumenNPCTrigger] NPC \${npcid} - HAY CAMBIOS, PROCEDIENDO CON RESUMEN`);

  // ✅ FILTRAR SOLO RESÚMENES NUEVOS (creados después del último resumen del NPC)
  // Esto evita re-procesar resúmenes que ya fueron incluidos en el resumen anterior del NPC.
  // Si es la primera vez (no hay lastNPCSummary), se usan todos los resúmenes.
  let summariesToProcess = npcSummaries;
  if (lastNPCSummary?.createdAt) {
    const sinceDate = lastNPCSummary.createdAt;
    summariesToProcess = npcSummaries.filter(s => new Date(s.timestamp) > sinceDate);
    console.log(`[handleResumenNPCTrigger] NPC \${npcid} - Filtrado: \${npcSummaries.length} total → \${summariesToProcess.length} nuevos (desde \${sinceDate.toISOString()})`);
  } else {
    console.log(`[handleResumenNPCTrigger] NPC \${npcid} - Primera ejecución, usando todos los \${npcSummaries.length} resúmenes`);
  }

  // Si después del filtrado no hay resúmenes nuevos, skip (no debería pasar si el hash cambió, pero safety net)
  if (summariesToProcess.length === 0) {
    console.log(`[handleResumenNPCTrigger] NPC \${npcid} - No hay resúmenes nuevos después del filtrado, SKIP`);
    return {
      success: false,
      error: `No hay resúmenes nuevos para el NPC \${npcid}.`
    };
  }

  // ✅ FORMATEAR LA LISTA DE RESÚMENES NUEVOS
  let allSummariesFormatted = payloadAllSummaries;

  if (!allSummariesFormatted && summariesToProcess.length > 0) {
    // Agrupar resúmenes por nombre de jugador
    const summariesByPlayer = summariesToProcess.reduce((acc, s) => {
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
      memoriesSections.push(`Memoria de \${playerName}`);
      summaries.forEach(s => {
        memoriesSections.push(s.summary);
      });
    }

    allSummariesFormatted = `***
MEMORIAS DE LOS AVENTUREROS
\${memoriesSections.join('\\n')}
***`;
    console.log(`[handleResumenNPCTrigger] \${summariesToProcess.length} resúmenes nuevos formateados correctamente`);
  }

  // Get existing memory from creator_notes (DB) instead of npcStateManager
  const existingMemory = getCardField(npc?.card, 'creator_notes', '');

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

  // Call LLM - SOLO SE EJECUTA SI HUBO CAMBIOS
  const response = await callLLM(messages);

  // ✅ GUARDAR RESUMEN ANTERIOR COMO EMBEDDING ANTES DE REEMPLAZARLO
  // El resumen anterior del NPC se guarda como embedding en el namespace npc:{npcid}
  // para que quede persistido como memoria a largo plazo y se pueda recuperar vía búsqueda semántica.
  try {
    if (lastNPCSummary?.summary && lastNPCSummary.summary.trim()) {
      const npcNamespace = buildNamespace('npc', npcid);
      await namespaceManager.ensureNpcNamespace(npcid);
      const embeddingClient = getEmbeddingClient();
      // Eliminar embeddings previos del tipo 'resumen_npc_anterior' de este NPC
      try {
        await embeddingClient.deleteBySource('resumen_npc_anterior', npcid);
      } catch (delErr: any) {
        console.warn(`[handleResumenNPCTrigger] No se pudieron eliminar embeddings previos:`, delErr?.message);
      }
      await embeddingClient.createEmbedding({
        content: `Resumen anterior (v${lastNPCSummary.version}) del NPC:\n\n${lastNPCSummary.summary}`,
        metadata: {
          title: `Resumen anterior - NPC ${npcid}`,
          type: 'resumen_npc_anterior',
          npcId: npcid,
          version: lastNPCSummary.version,
          timestamp: new Date().toISOString(),
        },
        namespace: npcNamespace,
        source_type: 'resumen_npc_anterior',
        source_id: npcid,
      });
      console.log(`[handleResumenNPCTrigger] Resumen anterior guardado como embedding en namespace "${npcNamespace}"`);
    } else {
      console.log(`[handleResumenNPCTrigger] No había resumen anterior para guardar como embedding`);
    }
  } catch (embedErr: any) {
    console.error(`[handleResumenNPCTrigger] Error guardando resumen anterior como embedding:`, embedErr?.message);
  }

  // ✅ GUARDAR EN TABLA NPCSummary PARA HISTÓRICO (CON VERSIÓN)
  const nextVersion = (lastNPCSummary?.version || 0) + 1;
  await npcSummaryMgr.create({
    npcId: npcid,
    summary: response,
    sessionHash: currentHash,
    version: nextVersion
  });
  console.log(`[handleResumenNPCTrigger] NPC \${npcid} - Resumen guardado en DB con versión \${nextVersion}`);

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
    summary: response,
    version: nextVersion
  };
}

// Resumen edificio trigger handler
export async function handleResumenEdificioTrigger(payload: ResumenEdificioTriggerPayload): Promise<{ success: boolean; summary: string }> {
  const { edificioid, systemPrompt: payloadSystemPrompt, allSummaries: payloadAllSummaries } = payload;

  // Get edificio
  const edificio = await edificioDbManager.getById(edificioid);
  if (!edificio) {
    throw new Error(`Edificio with id ${edificioid} not found`);
  }

  // Get context (world, pueblo)
  const world = await worldDbManager.getById(edificio.worldId);
  const pueblo = edificio.puebloId ? await puebloDbManager.getById(edificio.puebloId) : undefined;

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

  console.log(`[handleResumenEdificioTrigger] Obtenidos ${npcs.length} NPCs para el edificio ${edificioid}`);

  // ✅ CALCULAR HASH DE LOS RESÚMENES DE NPCs DEL EDIFICIO
  const npcSummaryMgr = new NPCSummaryManager();
  const allNPCSummaries = [];

  for (const npc of npcs) {
    const npcSumms = await npcSummaryMgr.getByNPCId(npc.id);
    if (npcSumms) {
      allNPCSummaries.push(npcSumms);
    }
  }

  const currentHash = generateNPCSummariesHash(allNPCSummaries);

  // ✅ OBTENER ÚLTIMO RESUMEN GUARDADO DEL EDIFICIO
  const edificioSummaryMgr = new EdificioSummaryManager();
  const lastEdificioSummary = await edificioSummaryMgr.getLatest(edificioid);

  console.log(`[handleResumenEdificioTrigger] Edificio ${edificioid} - Hash actual: ${currentHash}, Último hash: ${lastEdificioSummary?.npcHash || 'N/A'}`);

  // ✅ VERIFICAR SI HUBO CAMBIOS EN LOS RESÚMENES DE NPCs
  if (lastEdificioSummary?.npcHash === currentHash) {
    console.log(`[handleResumenEdificioTrigger] Edificio ${edificioid} - SIN CAMBIOS, SKIP`);
    return {
      success: false,
      error: `No hubo cambios en los resúmenes de NPCs del edificio ${edificioid}. Los resúmenes son iguales.`
    };
  }

  console.log(`[handleResumenEdificioTrigger] Edificio ${edificioid} - HAY CAMBIOS, PROCEDIENDO CON RESUMEN`);

  // ✅ FILTRAR SOLO NPCs CON RESÚMENES NUEVOS (creados después del último resumen del edificio)
  // Esto evita re-procesar NPCs que ya fueron incluidos en el resumen anterior del edificio.
  let npcsWithNewSummaries = npcs;
  if (lastEdificioSummary?.createdAt) {
    const sinceDate = lastEdificioSummary.createdAt;
    const npcSummaryMgrForFilter = new NPCSummaryManager();
    const newNpcIds: string[] = [];
    for (const npc of npcs) {
      const latestNpcSummary = await npcSummaryMgrForFilter.getLatest(npc.id);
      if (latestNpcSummary && new Date(latestNpcSummary.createdAt) > sinceDate) {
        newNpcIds.push(npc.id);
      }
    }
    npcsWithNewSummaries = npcs.filter(n => newNpcIds.includes(n.id));
    console.log(`[handleResumenEdificioTrigger] Filtrado: ${npcs.length} NPCs total → ${npcsWithNewSummaries.length} con resúmenes nuevos (desde ${sinceDate.toISOString()})`);
  } else {
    console.log(`[handleResumenEdificioTrigger] Primera ejecución, usando todos los ${npcs.length} NPCs`);
  }

  if (npcsWithNewSummaries.length === 0) {
    console.log(`[handleResumenEdificioTrigger] No hay NPCs con resúmenes nuevos, SKIP`);
    return { success: false, error: `No hay resúmenes nuevos de NPCs para el edificio ${edificioid}.` };
  }

  // ✅ OBTENER creator_notes SOLO DE LOS NPCs CON RESÚMENES NUEVOS
  let npcSummaries = payloadAllSummaries;

  if (!npcSummaries && npcsWithNewSummaries.length > 0) {
    npcSummaries = npcsWithNewSummaries
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

  // ✅ GUARDAR RESUMEN ANTERIOR COMO EMBEDDING ANTES DE REEMPLAZARLO
  try {
    if (lastEdificioSummary?.summary && lastEdificioSummary.summary.trim()) {
      const edNamespace = buildNamespace('edificio', edificioid);
      await namespaceManager.ensureEdificioNamespace(edificioid);
      const embeddingClient = getEmbeddingClient();
      try {
        await embeddingClient.deleteBySource('resumen_edificio_anterior', edificioid);
      } catch (delErr: any) {
        console.warn(`[handleResumenEdificioTrigger] No se pudieron eliminar embeddings previos:`, delErr?.message);
      }
      await embeddingClient.createEmbedding({
        content: `Resumen anterior (v${lastEdificioSummary.version}) del edificio ${edificio?.name || edificioid}:\n\n${lastEdificioSummary.summary}`,
        metadata: {
          title: `Resumen anterior - Edificio ${edificioid}`,
          type: 'resumen_edificio_anterior',
          edificioId: edificioid,
          version: lastEdificioSummary.version,
          timestamp: new Date().toISOString(),
        },
        namespace: edNamespace,
        source_type: 'resumen_edificio_anterior',
        source_id: edificioid,
      });
      console.log(`[handleResumenEdificioTrigger] Resumen anterior guardado como embedding en namespace "${edNamespace}"`);
    } else {
      console.log(`[handleResumenEdificioTrigger] No había resumen anterior para guardar como embedding`);
    }
  } catch (embedErr: any) {
    console.error(`[handleResumenEdificioTrigger] Error guardando resumen anterior como embedding:`, embedErr?.message);
  }

  // ✅ GUARDAR EN TABLA EdificioSummary PARA HISTÓRICO (CON VERSIÓN)
  const nextVersion = (lastEdificioSummary?.version || 0) + 1;
  await edificioSummaryMgr.create({
    edificioId: edificioid,
    summary: response,
    npcHash: currentHash,
    version: nextVersion
  });
  console.log(`[handleResumenEdificioTrigger] Edificio ${edificioid} - Resumen guardado en DB con versión ${nextVersion}`);

  // ✅ GUARDAR RESUMEN EN EL CAMPO lore (Estado del Edificio) DEL EDIFICIO
  // Reemplazar siempre el contenido de lore con el resumen generado
  if (edificio) {
    const updatedEdificio: Partial<Edificio> = {
      lore: response
    };

    await edificioDbManager.update(edificioid, updatedEdificio);
    console.log('[handleResumenEdificioTrigger] Resumen guardado en lore (Estado del Edificio) del edificio');
  }

  return {
    success: true,
    summary: response,
    version: nextVersion
  };
}

// Resumen pueblo trigger handler
export async function handleResumenPuebloTrigger(payload: ResumenPuebloTriggerPayload): Promise<{ success: boolean; summary: string }> {
  const { pueblid, systemPrompt: payloadSystemPrompt, allSummaries: payloadAllSummaries } = payload;

  // Get pueblo
  const pueblo = await puebloDbManager.getById(pueblid);
  if (!pueblo) {
    throw new Error(`Pueblo with id ${pueblid} not found`);
  }

  // Get context (world)
  const world = await worldDbManager.getById(pueblo.worldId);

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
  const edificios = await edificioDbManager.getByPuebloId(pueblid);

  console.log(`[handleResumenPuebloTrigger] Obtenidos ${edificios.length} edificios para el pueblo ${pueblid}`);

  // ✅ CALCULAR HASH DE LOS RESÚMENES DE EDIFICIOS DEL PUEBLO
  const edificioSummaryMgr = new EdificioSummaryManager();
  const allEdificioSummaries = [];

  for (const edificio of edificios) {
    const edificioSummaries = await edificioSummaryMgr.getByEdificioId(edificio.id);
    if (edificioSummaries) {
      allEdificioSummaries.push(edificioSummaries);
    }
  }

  const currentHash = generateEdificioSummariesHash(allEdificioSummaries);

  // ✅ OBTENER ÚLTIMO RESUMEN GUARDADO DEL PUEBLO
  const puebloSummaryMgr = new PuebloSummaryManager();
  const lastPuebloSummary = await puebloSummaryMgr.getLatest(pueblid);

  console.log(`[handleResumenPuebloTrigger] Pueblo ${pueblid} - Hash actual: ${currentHash}, Último hash: ${lastPuebloSummary?.edificioHash || 'N/A'}`);

  // ✅ VERIFICAR SI HUBO CAMBIOS EN LOS RESÚMENES DE EDIFICIOS
  if (lastPuebloSummary?.edificioHash === currentHash) {
    console.log(`[handleResumenPuebloTrigger] Pueblo ${pueblid} - SIN CAMBIOS, SKIP`);
    return {
      success: false,
      error: `No hubo cambios en los resúmenes de edificios del pueblo ${pueblid}. Los resúmenes son iguales.`
    };
  }

  console.log(`[handleResumenPuebloTrigger] Pueblo ${pueblid} - HAY CAMBIOS, PROCEDIENDO CON RESUMEN`);

  // ✅ FILTRAR SOLO EDIFICIOS CON RESÚMENES NUEVOS (creados después del último resumen del pueblo)
  let edificiosWithNewSummaries = edificios;
  if (lastPuebloSummary?.createdAt) {
    const sinceDate = lastPuebloSummary.createdAt;
    const edSummaryMgrForFilter = new EdificioSummaryManager();
    const newEdificioIds: string[] = [];
    for (const edificio of edificios) {
      const latestEdSummary = await edSummaryMgrForFilter.getLatest(edificio.id);
      if (latestEdSummary && new Date(latestEdSummary.createdAt) > sinceDate) {
        newEdificioIds.push(edificio.id);
      }
    }
    edificiosWithNewSummaries = edificios.filter(e => newEdificioIds.includes(e.id));
    console.log(`[handleResumenPuebloTrigger] Filtrado: ${edificios.length} edificios total → ${edificiosWithNewSummaries.length} con resúmenes nuevos (desde ${sinceDate.toISOString()})`);
  } else {
    console.log(`[handleResumenPuebloTrigger] Primera ejecución, usando todos los ${edificios.length} edificios`);
  }

  if (edificiosWithNewSummaries.length === 0) {
    console.log(`[handleResumenPuebloTrigger] No hay edificios con resúmenes nuevos, SKIP`);
    return { success: false, error: `No hay resúmenes nuevos de edificios para el pueblo ${pueblid}.` };
  }

  // ✅ OBTENER lore (Estado del Edificio) SOLO DE LOS EDIFICIOS CON RESÚMENES NUEVOS
  let edificioSummaries = payloadAllSummaries;

  if (!edificioSummaries && edificiosWithNewSummaries.length > 0) {
    edificioSummaries = edificiosWithNewSummaries
      .map(edificio => {
        const consolidatedSummary = edificio.lore || '';
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

  // ✅ GUARDAR RESUMEN ANTERIOR COMO EMBEDDING ANTES DE REEMPLAZARLO
  try {
    if (lastPuebloSummary?.summary && lastPuebloSummary.summary.trim()) {
      const puebloNamespace = buildNamespace('pueblo', pueblid);
      await namespaceManager.ensurePuebloNamespace(pueblid);
      const embeddingClient = getEmbeddingClient();
      try {
        await embeddingClient.deleteBySource('resumen_pueblo_anterior', pueblid);
      } catch (delErr: any) {
        console.warn(`[handleResumenPuebloTrigger] No se pudieron eliminar embeddings previos:`, delErr?.message);
      }
      await embeddingClient.createEmbedding({
        content: `Resumen anterior (v${lastPuebloSummary.version}) del pueblo ${pueblo?.name || pueblid}:\n\n${lastPuebloSummary.summary}`,
        metadata: {
          title: `Resumen anterior - Pueblo ${pueblid}`,
          type: 'resumen_pueblo_anterior',
          puebloId: pueblid,
          version: lastPuebloSummary.version,
          timestamp: new Date().toISOString(),
        },
        namespace: puebloNamespace,
        source_type: 'resumen_pueblo_anterior',
        source_id: pueblid,
      });
      console.log(`[handleResumenPuebloTrigger] Resumen anterior guardado como embedding en namespace "${puebloNamespace}"`);
    } else {
      console.log(`[handleResumenPuebloTrigger] No había resumen anterior para guardar como embedding`);
    }
  } catch (embedErr: any) {
    console.error(`[handleResumenPuebloTrigger] Error guardando resumen anterior como embedding:`, embedErr?.message);
  }

  // ✅ GUARDAR EN TABLA PuebloSummary PARA HISTÓRICO (CON VERSIÓN)
  const nextVersion = (lastPuebloSummary?.version || 0) + 1;
  await puebloSummaryMgr.create({
    puebloId: pueblid,
    summary: response,
    edificioHash: currentHash,
    version: nextVersion
  });
  console.log(`[handleResumenPuebloTrigger] Pueblo ${pueblid} - Resumen guardado en DB con versión ${nextVersion}`);

  // ✅ GUARDAR RESUMEN EN lore.eventos DE LA CARD DEL PUEBLO
  // Reemplazar siempre el contenido de lore.eventos con el resumen generado
  if (pueblo) {
    const loreActual = pueblo.lore || {};
    const updatedPueblo: Partial<Pueblo> = {
      lore: {
        ...loreActual,
        eventos: [response]  // ✅ REEMPLAZAR el array completo (en lugar de lore.rumores)
      }
    };

    await puebloDbManager.update(pueblid, updatedPueblo);
    console.log('[handleResumenPuebloTrigger] Resumen guardado en lore.eventos del pueblo');
  }

  return {
    success: true,
    summary: response,
    version: nextVersion
  };
}

// Resumen mundo trigger handler
export async function handleResumenMundoTrigger(payload: ResumenMundoTriggerPayload): Promise<{ success: boolean; summary: string }> {
  const { mundoid, systemPrompt: payloadSystemPrompt, allSummaries: payloadAllSummaries } = payload;

  // Get world
  const world = await worldDbManager.getById(mundoid);
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
  const pueblos = await puebloDbManager.getByWorldId(mundoid);

  // ✅ CALCULAR HASH DE LOS RESÚMENES DE PUEBLOS DEL MUNDO
  const puebloSummaryMgr = new PuebloSummaryManager();
  const allPuebloSummaries = [];

  for (const pueblo of pueblos) {
    const puebloSummaries = await puebloSummaryMgr.getByPuebloId(pueblo.id);
    if (puebloSummaries) {
      allPuebloSummaries.push(puebloSummaries);
    }
  }

  const currentHash = generatePuebloSummariesHash(allPuebloSummaries);

  // ✅ OBTENER ÚLTIMO RESUMEN GUARDADO DEL MUNDO
  const worldSummaryMgr = new WorldSummaryManager();
  const lastWorldSummary = await worldSummaryMgr.getLatest(mundoid);

  console.log(`[handleResumenMundoTrigger] Mundo ${mundoid} - Hash actual: ${currentHash}, Último hash: ${lastWorldSummary?.puebloHash || "N/A"}`);

  // ✅ VERIFICAR SI HUBO CAMBIOS EN LOS RESÚMENES DE PUEBLOS
  if (lastWorldSummary?.puebloHash === currentHash) {
    console.log(`[handleResumenMundoTrigger] Mundo ${mundoid} - SIN CAMBIOS, SKIP`);
    return {
      success: false,
      error: `No hubo cambios en los resúmenes de pueblos del mundo ${mundoid}. Los resúmenes son iguales.`
    };
  }

  console.log(`[handleResumenMundoTrigger] Mundo ${mundoid} - HAY CAMBIOS, PROCEDIENDO CON RESUMEN`);

  // ✅ FILTRAR SOLO PUEBLOS CON RESÚMENES NUEVOS (creados después del último resumen del mundo)
  let pueblosWithNewSummaries = pueblos;
  if (lastWorldSummary?.createdAt) {
    const sinceDate = lastWorldSummary.createdAt;
    const newPuebloIds: string[] = [];
    for (const pueblo of pueblos) {
      const latestPuebloSummary = await puebloSummaryMgr.getLatest(pueblo.id);
      if (latestPuebloSummary && new Date(latestPuebloSummary.createdAt) > sinceDate) {
        newPuebloIds.push(pueblo.id);
      }
    }
    pueblosWithNewSummaries = pueblos.filter(p => newPuebloIds.includes(p.id));
    console.log(`[handleResumenMundoTrigger] Filtrado: ${pueblos.length} pueblos total → ${pueblosWithNewSummaries.length} con resúmenes nuevos (desde ${sinceDate.toISOString()})`);
  } else {
    console.log(`[handleResumenMundoTrigger] Primera ejecución, usando todos los ${pueblos.length} pueblos`);
  }

  if (pueblosWithNewSummaries.length === 0) {
    console.log(`[handleResumenMundoTrigger] No hay pueblos con resúmenes nuevos, SKIP`);
    return { success: false, error: `No hay resúmenes nuevos de pueblos para el mundo ${mundoid}.` };
  }

  // ✅ OBTENER RESÚMENES SOLO DE LOS PUEBLOS CON CAMBIOS NUEVOS
  let puebloSummaries = payloadAllSummaries;

  if (!puebloSummaries && pueblosWithNewSummaries.length > 0) {
    const puebloSummaryData: string[] = [];
    for (const pueblo of pueblosWithNewSummaries) {
      const latestSummary = await puebloSummaryMgr.getLatest(pueblo.id);
      if (latestSummary?.summary && latestSummary.summary.trim()) {
        puebloSummaryData.push(`Pueblo/Nación ${pueblo.name} (ID: ${pueblo.id})\n${latestSummary.summary}`);
      }
    }
    puebloSummaries = puebloSummaryData.join('\n\n');
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

  // ✅ GUARDAR RESUMEN ANTERIOR COMO EMBEDDING ANTES DE REEMPLAZARLO
  try {
    if (lastWorldSummary?.summary && lastWorldSummary.summary.trim()) {
      const mundoNamespace = buildNamespace('mundo', mundoid);
      await namespaceManager.ensureWorldNamespace(mundoid);
      const embeddingClient = getEmbeddingClient();
      try {
        await embeddingClient.deleteBySource('resumen_mundo_anterior', mundoid);
      } catch (delErr: any) {
        console.warn(`[handleResumenMundoTrigger] No se pudieron eliminar embeddings previos:`, delErr?.message);
      }
      await embeddingClient.createEmbedding({
        content: `Resumen anterior (v${lastWorldSummary.version}) del mundo ${world?.name || mundoid}:\n\n${lastWorldSummary.summary}`,
        metadata: {
          title: `Resumen anterior - Mundo ${mundoid}`,
          type: 'resumen_mundo_anterior',
          worldId: mundoid,
          version: lastWorldSummary.version,
          timestamp: new Date().toISOString(),
        },
        namespace: mundoNamespace,
        source_type: 'resumen_mundo_anterior',
        source_id: mundoid,
      });
      console.log(`[handleResumenMundoTrigger] Resumen anterior guardado como embedding en namespace "${mundoNamespace}"`);
    } else {
      console.log(`[handleResumenMundoTrigger] No había resumen anterior para guardar como embedding`);
    }
  } catch (embedErr: any) {
    console.error(`[handleResumenMundoTrigger] Error guardando resumen anterior como embedding:`, embedErr?.message);
  }

  // ✅ GUARDAR EN TABLA WorldSummary PARA HISTÓRICO (CON VERSIÓN)
  const nextVersion = (lastWorldSummary?.version || 0) + 1;
  await worldSummaryMgr.create({
    worldId: mundoid,
    summary: response,
    puebloHash: currentHash,
    version: nextVersion
  });
  console.log(`[handleResumenMundoTrigger] Mundo ${mundoid} - Resumen guardado en DB con versión ${nextVersion}`);


  // ✅ GUARDAR RESUMEN EN lore.eventos DE LA CARD DEL MUNDO
  // Reemplazar siempre el contenido de lore.eventos con el resumen generado
  if (world) {
    const loreActual = world.lore || {};
    const updatedWorld: Partial<World> = {
      lore: {
        ...loreActual,
        eventos: [response]  // ✅ REEMPLAZAR el array completo (en lugar de lore.rumores)
      }
    };

    await worldDbManager.update(mundoid, updatedWorld);
    console.log('[handleResumenMundoTrigger] Resumen guardado en lore.eventos del mundo');
    console.log('[handleResumenMundoTrigger] Resumen guardado en rumores del mundo');
  }

  return {
    success: true,
    summary: response,
    version: nextVersion
  };
}

// Nuevo lore trigger handler
export async function handleNuevoLoreTrigger(payload: NuevoLoreTriggerPayload): Promise<{ lore: string }> {
  const { scope, targetId, loreType, context } = payload;

  // Get context based on scope
  let world, pueblo, edificio;
  if (scope === 'mundo') {
    world = await worldDbManager.getById(targetId);
    if (!world) {
      throw new Error(`World with id ${targetId} not found`);
    }
  } else if (scope === 'pueblo') {
    pueblo = await puebloDbManager.getById(targetId);
    if (!pueblo) {
      throw new Error(`Pueblo with id ${targetId} not found`);
    }
    world = await worldDbManager.getById(pueblo.worldId);
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
      const loreActual = world.lore || {};
      await worldDbManager.update(world.id, {
        lore: {
          ...loreActual,
          rumores: [...loreActual.rumores || [], lore]
        }
      });
    } else if (loreType === 'estado_mundo') {
      const loreActual = world.lore || {};
      await worldDbManager.update(world.id, {
        lore: {
          ...loreActual,
          estado_mundo: lore
        }
      });
    }
  } else if (scope === 'pueblo' && pueblo) {
    if (loreType === 'rumores') {
      const loreActual = pueblo.lore || {};
      await puebloDbManager.update(pueblo.id, {
        lore: {
          ...loreActual,
          rumores: [...loreActual.rumores || [], lore]
        }
      });
    } else if (loreType === 'estado_pueblo') {
      const loreActual = pueblo.lore || {};
      await puebloDbManager.update(pueblo.id, {
        lore: {
          ...loreActual,
          estado_pueblo: lore
        }
      });
    }
  }

  return { lore };
}

// ============================================
// NUEVO CONTEXTO TRIGGER
// ============================================
// Da acceso temporal a los namespaces de otra entidad.
// Ej: NPC A "visita" edificio X → NPC A tiene acceso al namespace de edificio X durante N días.

export async function handleNuevoContextoTrigger(payload: NuevoContextoTriggerPayload): Promise<{
  success: boolean;
  entityType: string;
  entityId: string;
  targetType: string;
  targetId: string;
  durationDays: number;
  expiresAt: string;
  message: string;
}> {
  const { type, typeid, targetid, duration } = payload;

  // Validar campos
  if (!type || !typeid || !targetid || !duration) {
    throw new Error('Faltan campos requeridos: type, typeid, targetid, duration');
  }

  const durationDays = parseInt(duration, 10);
  if (isNaN(durationDays) || durationDays < 1) {
    throw new Error(`Duration inválida: "${duration}". Debe ser un número entero positivo (días).`);
  }

  // Normalizar tipo (nacion → pueblo)
  const entityType = normalizeEntityType(type);

  // Validar que la entidad existe en la DB
  await validateEntityExists(entityType, typeid);

  // Detectar automáticamente el tipo del target buscando en todas las tablas
  const targetType = await detectEntityType(targetid);

  // Validar que el target existe en la DB
  await validateEntityExists(targetType, targetid);

  // Crear o actualizar el contexto adicional
  const contexto = await contextoAdicionalManager.upsert({
    entityType,
    entityId: typeid,
    targetType,
    targetId: targetid,
    durationDays,
  });

  console.log(`[handleNuevoContextoTrigger] Contexto ${entityType}:${typeid} → ${targetType}:${targetid} (${durationDays} días)`);

  return {
    success: true,
    entityType,
    entityId: typeid,
    targetType,
    targetId: targetid,
    durationDays,
    expiresAt: contexto.expiresAt,
    message: `Contexto adicional creado: ${entityType}:${typeid} tiene acceso a ${targetType}:${targetid} durante ${durationDays} días (expira: ${contexto.expiresAt})`,
  };
}

/**
 * Detecta automáticamente el tipo de una entidad buscando en todas las tablas.
 */
async function detectEntityType(entityId: string): Promise<string> {
  // Buscar en NPCs
  const npc = await db.nPC.findUnique({ where: { id: entityId } }).catch(() => null);
  if (npc) return 'npc';

  // Buscar en Edificios
  const edificio = await db.edificio.findUnique({ where: { id: entityId } }).catch(() => null);
  if (edificio) return 'edificio';

  // Buscar en Pueblos
  const pueblo = await db.pueblo.findUnique({ where: { id: entityId } }).catch(() => null);
  if (pueblo) return 'pueblo';

  // Buscar en Mundos
  const mundo = await db.world.findUnique({ where: { id: entityId } }).catch(() => null);
  if (mundo) return 'mundo';

  throw new Error(`No se pudo determinar el tipo de la entidad con ID: ${entityId}. No se encontró en ninguna tabla.`);
}

/**
 * Valida que una entidad existe en la DB según su tipo.
 */
async function validateEntityExists(entityType: string, entityId: string): Promise<void> {
  switch (entityType) {
    case 'npc': {
      const npc = await npcDbManager.getById(entityId);
      if (!npc) throw new Error(`NPC no encontrado: ${entityId}`);
      break;
    }
    case 'edificio': {
      const edificio = await edificioDbManager.getById(entityId);
      if (!edificio) throw new Error(`Edificio no encontrado: ${entityId}`);
      break;
    }
    case 'pueblo': {
      const pueblo = await puebloDbManager.getById(entityId);
      if (!pueblo) throw new Error(`Pueblo/Nación no encontrado: ${entityId}`);
      break;
    }
    case 'mundo': {
      const mundo = await worldDbManager.getById(entityId);
      if (!mundo) throw new Error(`Mundo no encontrado: ${entityId}`);
      break;
    }
    default:
      throw new Error(`Tipo de entidad inválido: ${entityType}`);
  }
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
    case 'nuevo_contexto':
      return handleNuevoContextoTrigger(payload as NuevoContextoTriggerPayload);
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

      const world = await worldDbManager.getById(npc.location.worldId);
      const pueblo = npc.location.puebloId ? await puebloDbManager.getById(npc.location.puebloId) : undefined;
      const edificio = npc.location.edificioId ? await edificioDbManager.getById(npc.location.edificioId) : undefined;
      const session = chatPayload.playersessionid ? await sessionDbManager.getById(chatPayload.playersessionid) : undefined;

      // Obtener el último resumen
      // 1. Prioridad: payload (puede venir del frontend)
      // 2. Fallback: buscar automáticamente en el summaryManager
      const lastSummary = chatPayload.lastSummary || (session ? (await sessionSummaryDbManager.getLatestBySessionId(session.id))?.summary : undefined) || undefined;

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
      const basePrompt = await buildCompleteChatPrompt(chatPayload.message, {
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
      const session = await sessionDbManager.getById(summaryPayload.playersessionid);

      if (!npc || !session) throw new Error('NPC or session not found');

      // Get context (world, pueblo, edificio)
      const world = await worldDbManager.getById(npc.location.worldId);
      const pueblo = npc.location.puebloId ? await puebloDbManager.getById(npc.location.puebloId) : undefined;
      const edificio = npc.location.edificioId ? await edificioDbManager.getById(npc.location.edificioId) : undefined;

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
      const world = await worldDbManager.getById(npc.location.worldId);
      const pueblo = npc.location.puebloId ? await puebloDbManager.getById(npc.location.puebloId) : undefined;
      const edificio = npc.location.edificioId ? await edificioDbManager.getById(npc.location.edificioId) : undefined;

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
      const npcSummaries = await sessionSummaryDbManager.getByNPCId(npcPayload.npcid);

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

      const existingMemory = getCardField(npc?.card, 'creator_notes', '');

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
        world = await worldDbManager.getById(lorePayload.targetId);
        if (!world) {
          throw new Error(`World with id ${lorePayload.targetId} not found`);
        }
      } else if (lorePayload.scope === 'pueblo') {
        pueblo = await puebloDbManager.getById(lorePayload.targetId);
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

    default:
      throw new Error(`Unknown trigger mode: ${mode}`);
  }
}
