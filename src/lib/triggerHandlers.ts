'use server';

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
  getCardField
} from './types';
import {
  npcManager,
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
import {
  buildChatMessagesWithOptions,
  buildSessionSummaryPrompt,
  buildNPCSummaryPrompt,
  buildEdificioSummaryPrompt,
  buildPuebloSummaryPrompt,
  buildWorldSummaryPrompt,
  buildNuevoLorePrompt
} from './promptBuilder';
import { EmbeddingTriggers } from './embedding-triggers';
import { replaceVariables, replaceVariablesWithCache, VariableContext } from './utils';
import { resolveAllVariables, resolveAllVariablesWithCache } from './grimorioUtils';

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

// Chat trigger handler
export async function handleChatTrigger(payload: ChatTriggerPayload): Promise<{ response: string; sessionId: string }> {
  const { message, npcid, playersessionid, jugador, lastSummary: payloadLastSummary, grimorioTemplates: payloadGrimorioTemplates } = payload;

  // DEBUG: Log para ver qué llega del request
  console.log('[handleChatTrigger] DEBUG payload.npcid:', npcid);
  console.log('[handleChatTrigger] DEBUG payload.jugador:', jugador);
  console.log('[handleChatTrigger] DEBUG payload.message:', message);
  console.log('[handleChatTrigger] DEBUG payload.grimorioTemplates:', payloadGrimorioTemplates);

  // Get NPC
  const npc = npcManager.getById(npcid);
  if (!npc) {
    throw new Error(`NPC with id ${npcid} not found`);
  }

  // Get context (world, pueblo, edificio)
  const world = worldManager.getById(npc.location.worldId);
  const pueblo = npc.location.puebloId ? puebloManager.getById(npc.location.puebloId) : undefined;
  const edificio = npc.location.edificioId ? edificioManager.getById(npc.location.edificioId) : undefined;

  // Get or create session
  let session;
  if (playersessionid) {
    session = sessionManager.getById(playersessionid);
    if (!session) {
      throw new Error(`Session ${playersessionid} not found`);
    }
  } else {
    // Create new session
    session = sessionManager.create({
      npcId: npcid,
      playerId: jugador?.nombre || undefined,
      messages: []
    });
  }

  // Obtener el último resumen (SOLO si viene en el payload, no usar session.lastPrompt)
  // session.lastPrompt contiene el prompt completo, no debe usarse como resumen
  const lastSummary = payloadLastSummary || undefined;

  // ✅ OBTENER PLANTILLAS DE GRIMORIO DEL PAYLOAD O CARGAR DEL ARCHIVO
  let grimorioTemplates = payloadGrimorioTemplates;

  // Si no vienen plantillas en el payload, cargar configuración guardada
  if (!grimorioTemplates || grimorioTemplates.length === 0) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'chat-trigger-config.json');

      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        grimorioTemplates = config.grimorioTemplates || [];
        console.log('[handleChatTrigger] Configuración de plantillas cargada del archivo:', grimorioTemplates.length, 'plantillas');
      } catch (error) {
        // El archivo no existe o hay error al leerlo, usar array vacío
        console.log('[handleChatTrigger] No hay configuración de plantillas guardada, usando array vacío');
        grimorioTemplates = [];
      }
    } catch (error) {
      console.error('[handleChatTrigger] Error cargando configuración de plantillas:', error);
      grimorioTemplates = [];
    }
  }

  // ✅ OBTENER TODAS LAS CARDS DEL GRIMORIO
  const allGrimorioCards = grimorioManager.getAll();
  console.log('[handleChatTrigger] Cards del Grimorio cargadas:', allGrimorioCards.length);

  // ✅ CONSTRUIR CONTEXTO DE VARIABLES PARA REEMPLAZO
  const varContext: VariableContext = {
    npc,
    world,
    pueblo,
    edificio,
    jugador,
    session,
    char: getCardField(npc?.card, 'name', ''),
    mensaje: message,
    userMessage: message,
    lastSummary: lastSummary
  };

  // ✅ CONSTRUIR EL PROMPT COMPLETO CON VARIABLES DE GRIMORIO
  // El prompt se construye primero y luego se resuelven las variables de Grimorio
  const basePrompt = buildCompleteChatPrompt(message, {
    world,
    pueblo,
    edificio,
    npc,
    session
  }, {
    jugador,
    lastSummary,
    grimorioTemplates // Pasar las plantillas de Grimorio
  });

  console.log('[handleChatTrigger] DEBUG basePrompt antes de Grimorio:', basePrompt.substring(0, 200) + '...');

  // ✅ REEMPLAZAR TODAS LAS VARIABLES (PRIMARIAS + PLANTILLAS DE GRIMORIO)
  const resolvedPrompt = resolveAllVariablesWithCache(
    basePrompt,
    varContext,
    allGrimorioCards,
    'chat-prompt-base', // Template ID para el cache
    { verbose: false, useCache: true }
  ).result;

  console.log('[handleChatTrigger] DEBUG prompt después de Grimorio:', resolvedPrompt.substring(0, 300) + '...');

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
  sessionManager.update(session.id, { lastPrompt: completePrompt });

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
  const { npcid, playersessionid } = payload;

  // Get NPC and session
  const npc = npcManager.getById(npcid);
  if (!npc) {
    throw new Error(`NPC with id ${npcid} not found`);
  }

  const session = sessionManager.getById(playersessionid);
  if (!session) {
    throw new Error(`Session ${playersessionid} not found`);
  }

  // Build prompt
  const messages = buildSessionSummaryPrompt(session, npc);

  // Call LLM
  const summary = await callLLM(messages);

  // Save summary
  summaryManager.saveSummary(session.id, summary);

  // Clear messages from session after summary is generated
  sessionManager.clearMessages(session.id);

  return {
    summary
  };
}

// Resumen NPC trigger handler
export async function handleResumenNPCTrigger(payload: ResumenNPCTriggerPayload): Promise<{ success: boolean; memory: Record<string, any> }> {
  const { npcid } = payload;

  // Get NPC
  const npc = npcManager.getById(npcid);
  if (!npc) {
    throw new Error(`NPC with id ${npcid} not found`);
  }

  // Get all sessions for this NPC
  const sessions = sessionManager.getByNPCId(npcid);

  // Get summaries for all sessions
  const summaries = sessions
    .map(s => summaryManager.getSummary(s.id))
    .filter((s): s is string => s !== null);

  // Get existing memory
  const existingMemory = npcStateManager.getMemory(npcid) || {};

  // Build prompt
  const messages = buildNPCSummaryPrompt(npc, summaries, existingMemory);

  // Call LLM
  const response = await callLLM(messages);

  // Parse response and save memory
  const memory: Record<string, any> = {
    consolidatedSummary: response,
    lastUpdated: new Date().toISOString(),
    sessionCount: sessions.length
  };

  npcStateManager.saveMemory(npcid, memory);

  return {
    success: true,
    memory
  };
}

// Resumen edificio trigger handler
export async function handleResumenEdificioTrigger(payload: ResumenEdificioTriggerPayload): Promise<{ success: boolean; memory: Record<string, any> }> {
  const { edificioid } = payload;

  // Get edificio
  const edificio = edificioManager.getById(edificioid);
  if (!edificio) {
    throw new Error(`Edificio with id ${edificioid} not found`);
  }

  // Get all NPCs for this edificio
  const npcs = npcManager.getByEdificioId(edificioid);

  // Get consolidated summaries from NPCs
  const npcSummaries = npcs
    .map(npc => {
      const memory = npcStateManager.getMemory(npc.id);
      return {
        npcId: npc.id,
        npcName: npc.card?.data?.name || npc.card?.name || 'Unknown',
        consolidatedSummary: memory?.consolidatedSummary || ''
      };
    })
    .filter(n => n.consolidatedSummary !== '');

  // Get existing memory
  const existingMemory = edificioStateManager.getMemory(edificioid) || {};

  // Build prompt
  const messages = buildEdificioSummaryPrompt(edificio, npcSummaries, existingMemory);

  // Call LLM
  const response = await callLLM(messages);

  // Parse response and save memory
  const memory: Record<string, any> = {
    consolidatedSummary: response,
    lastUpdated: new Date().toISOString(),
    npcCount: npcs.length,
    summaryCount: npcSummaries.length
  };

  edificioStateManager.saveMemory(edificioid, memory);

  return {
    success: true,
    memory
  };
}

// Resumen pueblo trigger handler
export async function handleResumenPuebloTrigger(payload: ResumenPuebloTriggerPayload): Promise<{ success: boolean; memory: Record<string, any> }> {
  const { pueblid } = payload;

  // Get pueblo
  const pueblo = puebloManager.getById(pueblid);
  if (!pueblo) {
    throw new Error(`Pueblo with id ${pueblid} not found`);
  }

  // Get all edificios for this pueblo
  const edificios = edificioManager.getByPuebloId(pueblid);

  // Get consolidated summaries from edificios
  const edificioSummaries = edificios
    .map(edificio => {
      const memory = edificioStateManager.getMemory(edificio.id);
      return {
        edificioId: edificio.id,
        edificioName: edificio.name,
        consolidatedSummary: memory?.consolidatedSummary || ''
      };
    })
    .filter(e => e.consolidatedSummary !== '');

  // Get existing memory
  const existingMemory = puebloStateManager.getMemory(pueblid) || {};

  // Build prompt
  const messages = buildPuebloSummaryPrompt(pueblo, edificioSummaries, existingMemory);

  // Call LLM
  const response = await callLLM(messages);

  // Parse response and save memory
  const memory: Record<string, any> = {
    consolidatedSummary: response,
    lastUpdated: new Date().toISOString(),
    edificioCount: edificios.length,
    summaryCount: edificioSummaries.length
  };

  puebloStateManager.saveMemory(pueblid, memory);

  return {
    success: true,
    memory
  };
}

// Resumen mundo trigger handler
export async function handleResumenMundoTrigger(payload: ResumenMundoTriggerPayload): Promise<{ success: boolean; memory: Record<string, any> }> {
  const { mundoid } = payload;

  // Get world
  const world = worldManager.getById(mundoid);
  if (!world) {
    throw new Error(`World with id ${mundoid} not found`);
  }

  // Get all pueblos for this world
  const pueblos = puebloManager.getByWorldId(mundoid);

  // Get consolidated summaries from pueblos
  const puebloSummaries = pueblos
    .map(pueblo => {
      const memory = puebloStateManager.getMemory(pueblo.id);
      return {
        puebloId: pueblo.id,
        puebloName: pueblo.name,
        consolidatedSummary: memory?.consolidatedSummary || ''
      };
    })
    .filter(p => p.consolidatedSummary !== '');

  // Get existing memory
  const existingMemory = worldStateManager.getMemory(mundoid) || {};

  // Build prompt
  const messages = buildWorldSummaryPrompt(world, puebloSummaries, existingMemory);

  // Call LLM
  const response = await callLLM(messages);

  // Parse response and save memory
  const memory: Record<string, any> = {
    consolidatedSummary: response,
    lastUpdated: new Date().toISOString(),
    puebloCount: pueblos.length,
    summaryCount: puebloSummaries.length
  };

  worldStateManager.saveMemory(mundoid, memory);

  return {
    success: true,
    memory
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
      const npc = npcManager.getById(chatPayload.npcid);
      if (!npc) throw new Error('NPC not found');

      const world = worldManager.getById(npc.location.worldId);
      const pueblo = npc.location.puebloId ? puebloManager.getById(npc.location.puebloId) : undefined;
      const edificio = npc.location.edificioId ? edificioManager.getById(npc.location.edificioId) : undefined;
      const session = chatPayload.playersessionid ? sessionManager.getById(chatPayload.playersessionid) : undefined;

      // Obtener el último resumen (SOLO si viene en el payload, no usar session.lastPrompt)
      const lastSummary = chatPayload.lastSummary || undefined;

      // ✅ OBTENER TODAS LAS CARDS DEL GRIMORIO
      const allGrimorioCards = grimorioManager.getAll();

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
        // No pasamos templateUser, será reemplazado por variables de Grimorio
      });

      // ✅ REEMPLAZAR TODAS LAS VARIABLES (PRIMARIAS + PLANTILLAS DE GRIMORIO)
      const resolvedPrompt = resolveAllVariablesWithCache(
        basePrompt,
        varContext,
        allGrimorioCards,
        'chat-prompt-preview', // Template ID para el cache
        { verbose: false, useCache: true }
      ).result;

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

      return {
        systemPrompt,
        messages,
        estimatedTokens: 0,
        lastPrompt,
        sections: extractPromptSections(systemPrompt)
      };
    }

    case 'resumen_sesion': {
      const summaryPayload = payload as ResumenSesionTriggerPayload;
      const npc = npcManager.getById(summaryPayload.npcid);
      const session = sessionManager.getById(summaryPayload.playersessionid);

      if (!npc || !session) throw new Error('NPC or session not found');

      const messages = buildSessionSummaryPrompt(session, npc);
      const systemPrompt = messages[0]?.content || '';

      return {
        systemPrompt,
        messages,
        estimatedTokens: 0,
        sections: extractPromptSections(systemPrompt)
      };
    }

    case 'resumen_npc': {
      const npcPayload = payload as ResumenNPCTriggerPayload;
      const npc = npcManager.getById(npcPayload.npcid);
      const sessions = sessionManager.getByNPCId(npcPayload.npcid);
      const summaries = sessions
        .map(s => summaryManager.getSummary(s.id))
        .filter((s): s is string => s !== null);
      const existingMemory = npcStateManager.getMemory(npcPayload.npcid);

      const messages = buildNPCSummaryPrompt(npc, summaries, existingMemory);
      const systemPrompt = messages[0]?.content || '';

      return {
        systemPrompt,
        messages,
        estimatedTokens: 0,
        sections: extractPromptSections(systemPrompt)
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

      return {
        systemPrompt,
        messages,
        estimatedTokens: 0,
        sections: extractPromptSections(systemPrompt)
      };
    }

    case 'resumen_edificio': {
      const edificioPayload = payload as ResumenEdificioTriggerPayload;
      const edificio = edificioManager.getById(edificioPayload.edificioid);
      if (!edificio) throw new Error('Edificio not found');

      const npcs = npcManager.getByEdificioId(edificioPayload.edificioid);
      const npcSummaries = npcs
        .map(npc => {
          const memory = npcStateManager.getMemory(npc.id);
          return {
            npcId: npc.id,
            npcName: npc.card?.data?.name || npc.card?.name || 'Unknown',
            consolidatedSummary: memory?.consolidatedSummary || ''
          };
        })
        .filter(n => n.consolidatedSummary !== '');
      const existingMemory = edificioStateManager.getMemory(edificioPayload.edificioid);

      const messages = buildEdificioSummaryPrompt(edificio, npcSummaries, existingMemory);
      const systemPrompt = messages[0]?.content || '';

      return {
        systemPrompt,
        messages,
        estimatedTokens: 0,
        sections: extractPromptSections(systemPrompt)
      };
    }

    case 'resumen_pueblo': {
      const puebloPayload = payload as ResumenPuebloTriggerPayload;
      const pueblo = puebloManager.getById(puebloPayload.pueblid);
      if (!pueblo) throw new Error('Pueblo not found');

      const edificios = edificioManager.getByPuebloId(puebloPayload.pueblid);
      const edificioSummaries = edificios
        .map(edificio => {
          const memory = edificioStateManager.getMemory(edificio.id);
          return {
            edificioId: edificio.id,
            edificioName: edificio.name,
            consolidatedSummary: memory?.consolidatedSummary || ''
          };
        })
        .filter(e => e.consolidatedSummary !== '');
      const existingMemory = puebloStateManager.getMemory(puebloPayload.pueblid);

      const messages = buildPuebloSummaryPrompt(pueblo, edificioSummaries, existingMemory);
      const systemPrompt = messages[0]?.content || '';

      return {
        systemPrompt,
        messages,
        estimatedTokens: 0,
        sections: extractPromptSections(systemPrompt)
      };
    }

    case 'resumen_mundo': {
      const mundoPayload = payload as ResumenMundoTriggerPayload;
      const world = worldManager.getById(mundoPayload.mundoid);
      if (!world) throw new Error('World not found');

      const pueblos = puebloManager.getByWorldId(mundoPayload.mundoid);
      const puebloSummaries = pueblos
        .map(pueblo => {
          const memory = puebloStateManager.getMemory(pueblo.id);
          return {
            puebloId: pueblo.id,
            puebloName: pueblo.name,
            consolidatedSummary: memory?.consolidatedSummary || ''
          };
        })
        .filter(p => p.consolidatedSummary !== '');
      const existingMemory = worldStateManager.getMemory(mundoPayload.mundoid);

      const messages = buildWorldSummaryPrompt(world, puebloSummaries, existingMemory);
      const systemPrompt = messages[0]?.content || '';

      return {
        systemPrompt,
        messages,
        estimatedTokens: 0,
        sections: extractPromptSections(systemPrompt)
      };
    }

    default:
      throw new Error(`Unknown trigger mode: ${mode}`);
  }
}

/**
 * Extrae las secciones de un prompt para visualización en el frontend
 * Parsea el prompt buscando encabezados de sección (=== SECCIÓN ===)
 * y devuelve un array de secciones con formato visual
 *
 * @param prompt - El prompt completo a parsear
 * @returns Array de secciones con label, content y bgColor
 */
export function extractPromptSections(prompt: string): Array<{
  label: string;
  content: string;
  bgColor: string;
}> {
  const sections: Array<{ label: string; content: string; bgColor: string }> = [];
  
  // Mapeo de secciones a sus colores
  const sectionColors: Record<string, string> = {
    'Instrucción': 'bg-blue-50 dark:bg-blue-950',
    'MAIN PROMPT': 'bg-green-50 dark:bg-green-950',
    'DESCRIPCIÓN': 'bg-emerald-50 dark:bg-emerald-950',
    'PERSONALIDAD': 'bg-teal-50 dark:bg-teal-950',
    'ESCENARIO': 'bg-purple-50 dark:bg-purple-950',
    'EJEMPLOS DE CHAT': 'bg-pink-50 dark:bg-pink-950',
    'LAST USER MESSAGE': 'bg-slate-50 dark:bg-slate-950',
    'INSTRUCCIONES POST-HISTORIAL': 'bg-red-50 dark:bg-red-950',
    'INSTRUCCIONES POST-HISTORY': 'bg-red-50 dark:bg-red-950',
    'TIPO DE LORE': 'bg-teal-50 dark:bg-teal-950',
    'CONTEXTO': 'bg-orange-50 dark:bg-orange-950',
    'RESUMENES': 'bg-yellow-50 dark:bg-yellow-950',
    'NOMBRE': 'bg-blue-50 dark:bg-blue-950',
    'SISTEMA': 'bg-indigo-50 dark:bg-indigo-950'
  };

  // Dividir el prompt por los encabezados de sección
  const sectionPattern = /===\s*(.+?)\s*===/g;
  const matches = [...prompt.matchAll(sectionPattern)];
  
  let currentIndex = 0;
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const sectionLabel = match[1].trim();
    const sectionStart = match.index!;
    const sectionEnd = matches[i + 1]?.index || prompt.length;
    
    // Obtener el contenido de la sección (después del encabezado)
    const sectionContent = prompt.slice(sectionStart + match[0].length, sectionEnd).trim();
    
    // Usar color conocido o un color por defecto
    const bgColor = sectionColors[sectionLabel] || 'bg-gray-50 dark:bg-gray-950';
    
    sections.push({
      label: sectionLabel,
      content: sectionContent,
      bgColor
    });
  }
  
  // Si no hay secciones, devolver el contenido completo como una sola sección
  if (sections.length === 0) {
    sections.push({
      label: 'Prompt Completo',
      content: prompt,
      bgColor: 'bg-gray-50 dark:bg-gray-950'
    });
  }
  
  return sections;
}
