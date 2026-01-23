import { World, Pueblo, Edificio, NPC, Session, ChatMessage, PromptBuildContext, getCardField } from './types';
import { npcStateManager, sessionManager } from './fileManager';

// Token estimation (roughly 4 characters per token for English/Spanish)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(messages: ChatMessage[]): number {
  return messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
}

// Helper function to process card fields and replace variables
function processCardField(
  fieldName: string,
  card: SillyTavernCard,
  context: PromptBuildContext
): string {
  const fieldValue = getCardField(card, fieldName, '');
  
  // If fieldValue exists and contains {{variables}}, replace them
  if (fieldValue && fieldValue.includes('{{')) {
    // For system_prompt, use a different context (sin jugador)
    if (fieldName === 'system_prompt') {
      const keyContext: {
        npc: { card },
        world: context.world,
        mundo: context.world,
        pueblo: context.pueblo,
        edificio: context.edificio
      };
      return replaceKeys(fieldValue, keyContext);
    } else {
      // For other fields, include jugador data in context
      const keyContext = {
        npc: { card },
        world: context.world,
        mundo: context.world,
        pueblo: context.pueblo,
        edificio: context.edificio,
        jugador: context.jugador
      };
      return replaceKeys(fieldValue, keyContext);
    }
  }
  
  return fieldValue || '';
}

// Build system prompt for chat (SillyTavern format)
export function buildChatSystemPrompt(
  context: PromptBuildContext,
  jugador?: {
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
): string {
  const { world, pueblo, edificio, npc, session } = context;

  let prompt = '';

  // System prompt de la card del NPC (instrucciones base)
  const systemPrompt = processCardField('system_prompt', npc.card, context);
  if (systemPrompt) {
    prompt += systemPrompt + '\n\n';
  }

  // Contexto del mundo (DEBAJO de la card del NPC)
  if (world) {
    prompt += `=== CONTEXTO DEL MUNDO ===\n`;
    prompt += `Mundo: ${world.name}\n`;
    prompt += `Estado: ${world.lore?.estado_mundo}\n`;
    if (world.lore?.rumores && world.lore.rumores.length > 0) {
      prompt += `Rumores: ${world.lore.rumores.join(', ')}\n`;
    }
    prompt += '\n';
  }

  // Contexto del pueblo (DEBAJO de la card del NPC)
  if (pueblo) {
    prompt += `=== CONTEXTO DEL PUEBLO ===\n`;
    prompt += `Pueblo: ${pueblo.name}\n`;
    if (pueblo.lore?.estado_pueblo) {
      prompt += `Estado: ${pueblo.lore.estado_pueblo}\n`;
    }
    if (pueblo.lore?.rumores && pueblo.lore.rumores.length > 0) {
      prompt += `Rumores: ${pueblo.lore.rumores.join(', ')}\n`;
    }
    prompt += '\n';
  }

  // Contexto del edificio (DEBAJO de la card del NPC)
  if (edificio) {
    prompt += `=== CONTEXTO DEL EDIFICIO ===\n`;
    prompt += `Ubicación: ${edificio.name}\n`;
    if (edificio.lore) {
      prompt += `Descripción: ${edificio.lore}\n`;
    }
    if (edificio.eventos_recientes && edificio.eventos_recientes.length > 0) {
      prompt += `Eventos recientes: ${edificio.eventos_recientes.join(', ')}\n`;
    }
    prompt += '\n';
  }

  return prompt;
}

// Build system prompt for chat (SillyTavern format)
export function buildChatSystemPrompt(
  context: PromptBuildContext,
  jugador?: {
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
): string {
  const { world, pueblo, edificio, npc, session } = context;

  let prompt = '';

  // System prompt de la card del NPC (instrucciones base)
  if (npc) {
    const systemPrompt = getCardField(npc.card, 'system_prompt', '');
    if (systemPrompt) {
      prompt += systemPrompt;
      prompt += '\n\n';
    }
  }

  // Contexto del mundo (DEBAJO de la card del NPC)
  if (world) {
    prompt += `=== CONTEXTO DEL MUNDO ===\n`;
    prompt += `Mundo: ${world.name}\n`;
    prompt += `Estado: ${world.lore.estado_mundo}\n`;
    if (world.lore.rumores && world.lore.rumores.length > 0) {
      prompt += `Rumores: ${world.lore.rumores.join(', ')}\n`;
    }
    prompt += '\n';
  }

  if (pueblo) {
    prompt += `=== CONTEXTO DEL PUEBLO ===\n`;
    prompt += `Pueblo: ${pueblo.name}\n`;
    prompt += `Estado: ${pueblo.lore.estado_pueblo}\n`;
    if (pueblo.lore.rumores && pueblo.lore.rumores.length > 0) {
      prompt += `Rumores: ${pueblo.lore.rumores.join(', ')}\n`;
    }
    prompt += '\n';
  }

  if (edificio) {
    prompt += `=== CONTEXTO DE LA UBICACIÓN ===\n`;
    prompt += `Ubicación: ${edificio.name}\n`;
    prompt += `Descripción: ${edificio.lore}\n`;
    if (edificio.eventos_recientes && edificio.eventos_recientes.length > 0) {
      prompt += `Eventos recientes: ${edificio.eventos_recientes.join(', ')}\n`;
    }
    prompt += '\n';
  }

  // Información del personaje (DE LA CARD)
  if (npc) {
    prompt += `=== PERSONAJE ===\n`;

    // Nombre
    const cardName = getCardField(npc.card, 'name', 'Unknown');
    prompt += `Nombre: {{char}}\n`;
    prompt += `${cardName}\n\n`;

    // Descripción
    const description = getCardField(npc.card, 'description', '');
    if (description) {
      prompt += `Descripción:\n${description}\n\n`;
    }

    // Personalidad
    const personality = getCardField(npc.card, 'personality', '');
    if (personality) {
      prompt += `Personalidad:\n${personality}\n\n`;
    }

    // Escenario
    const scenario = getCardField(npc.card, 'scenario', '');
    if (scenario) {
      prompt += `Escenario:\n${scenario}\n\n`;
    }

    // Primer mensaje (ejemplo)
    const firstMes = getCardField(npc.card, 'first_mes', '');
    if (firstMes) {
      prompt += `Ejemplo de inicio:\n${firstMes}\n\n`;
    }

    // Instrucciones post-historial de la card
    const postHistoryInstructions = getCardField(npc.card, 'post_history_instructions', '');
    if (postHistoryInstructions) {
      prompt += `=== INSTRUCCIONES POST-HISTORIAL ===\n`;
      prompt += `${postHistoryInstructions}\n\n`;
    }
  }

  // Memoria del NPC
  if (npc) {
    const memory = npcStateManager.getMemory(npc.id);
    if (memory) {
      prompt += `=== MEMORIA DEL PERSONAJE ===\n`;
      if (memory.consolidatedSummary) {
        prompt += `Resumen consolidado: ${memory.consolidatedSummary}\n`;
      }
      if (memory.importantEvents && memory.importantEvents.length > 0) {
        prompt += `Eventos importantes: ${memory.importantEvents.join(', ')}\n`;
      }
      if (memory.relationships) {
        prompt += `Relaciones: ${JSON.stringify(memory.relationships)}\n`;
      }
      prompt += '\n';
    }
  }

  // Información del jugador (si está disponible)
  if (jugador) {
    prompt += '=== JUGADOR ===\n';
    if (jugador.nombre) prompt += `Nombre: ${jugador.nombre}\n`;
    if (jugador.raza) prompt += `Raza: ${jugador.raza}\n`;
    if (jugador.nivel) prompt += `Nivel: ${jugador.nivel}\n`;
    if (jugador.almakos) prompt += `Almakos: ${jugador.almakos}\n`;
    if (jugador.deuda) prompt += `Deuda: ${jugador.deuda}\n`;
    if (jugador.piedras_del_alma) prompt += `Piedras del Alma: ${jugador.piedras_del_alma}\n`;
    if (jugador.salud_actual) prompt += `Salud: ${jugador.salud_actual}\n`;
    if (jugador.reputacion) prompt += `Reputación: ${jugador.reputacion}\n`;
    if (jugador.hora) prompt += `Hora: ${jugador.hora}\n`;
    if (jugador.clima) prompt += `Clima: ${jugador.clima}\n`;
    prompt += '\n';
  }

  return prompt;
}

// Build messages for chat trigger (SillyTavern format)
export function buildChatMessages(
  userMessage: string,
  context: PromptBuildContext,
  jugador?: {
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
): ChatMessage[] {
  const systemPrompt = buildChatSystemPrompt(context, jugador);
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt, timestamp: new Date().toISOString() }
  ];

  // Add recent session history (last 20 messages)
  if (context.session && context.session.messages.length > 0) {
    const recentHistory = context.session.messages.slice(-20);
    messages.push(...recentHistory);
  }

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString()
  });

  return messages;
}

// Build prompt for session summary
export function buildSessionSummaryPrompt(session: Session, npc: NPC): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Eres un asistente experto en análisis narrativo. Tu tarea es generar un resumen conciso pero completo de una conversación entre un jugador y un NPC.

INSTRUCCIONES:
- Resume la conversación en 3-5 oraciones clave
- Identifica decisiones importantes o eventos relevantes
- Menciona temas principales discutidos
- Mantén el contexto del mundo y el personaje
- El resumen debe ser útil para mantener continuidad narrativa

Formato esperado:
RESUMEN: [Tu resumen aquí]
EVENTOS_CLAVES: [Lista de eventos importantes separados por comas]
TEMAS: [Lista de temas principales separados por comas]`,
      timestamp: new Date().toISOString()
    }
  ];

  // Add conversation history
  const conversationText = session.messages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n\n');

  messages.push({
    role: 'user',
    content: `Conversación con ${getCardField(npc.card, 'name', 'Unknown')}:\n\n${conversationText}\n\nGenera un resumen de esta conversación:`,
    timestamp: new Date().toISOString()
  });

  return messages;
}

// Build prompt for NPC global summary
export function buildNPCSummaryPrompt(
  npc: NPC,
  sessionSummaries: string[],
  npcMemory?: Record<string, any>
): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Eres un asistente experto en consolidación de memoria narrativa. Tu tarea es crear una memoria consolidada de un NPC.

INSTRUCCIONES:
- Crea un resumen que capture la esencia y evolución del personaje
- Incluye eventos importantes que han moldeado al NPC
- Identifica relaciones y conexiones significativas
- Mantén la coherencia con la personalidad del NPC
- El resumen debe servir como memoria a largo plazo

Formato esperado:
RESUMEN_CONSOLIDADO: [Resumen completo del personaje y su evolución]
EVENTOS_IMPORTANTES: [Lista de eventos importantes]
RELACIONES: [Relaciones importantes con otros personajes o jugadores]
PERSPECTIVA_ACTUAL: [Cómo el NPC ve el mundo actualmente]`,
      timestamp: new Date().toISOString()
    }
  ];

  let prompt = `Personaje: ${getCardField(npc.card, 'name', 'Unknown')}\n`;
  prompt += `Personalidad: ${getCardField(npc.card, 'personality', 'No especificada')}\n`;
  prompt += `Escenario: ${getCardField(npc.card, 'scenario', 'No especificado')}\n\n`;

  if (npcMemory && npcMemory.consolidatedSummary) {
    prompt += `Memoria anterior: ${npcMemory.consolidatedSummary}\n`;
  }

  if (sessionSummaries.length > 0) {
    prompt += `Resúmenes de sesiones recientes:\n${sessionSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`;
  }

  prompt += `\nGenera la memoria consolidada actualizada:`;

  messages.push({
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString()
  });

  return messages;
}

// Build prompt for new lore
export function buildNuevoLorePrompt(
  scope: 'mundo' | 'pueblo',
  context: PromptBuildContext
): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Eres un generador de lore narrativo especializado en mundos de fantasía y rol. Tu tarea es generar lore coherente y contextual.

INSTRUCCIONES:
- Genera lore que se integre naturalmente con el contexto existente
- Mantén coherencia con el estado actual del mundo o pueblo
- Sé creativo pero respetuoso con la narrativa existente
- El lore debe ser útil para futuras interacciones y eventos
- Usa el tono y estilo apropiado para el setting`,
      timestamp: new Date().toISOString()
    }
  ];

  let prompt = '';

  if (context.world) {
    prompt += `Mundo: ${context.world.name}\n`;
    prompt += `Estado actual: ${context.world.lore.estado_mundo}\n`;
    if (context.world.lore.rumores.length > 0) {
      prompt += `Rumores: ${context.world.lore.rumores.join(', ')}\n`;
    }
    prompt += '\n';
  }

  if (context.pueblo) {
    prompt += `Pueblo: ${context.pueblo.name}\n`;
    prompt += `Estado actual: ${context.pueblo.lore.estado_pueblo}\n`;
    if (context.pueblo.lore.rumores.length > 0) {
      prompt += `Rumores: ${context.pueblo.lore.rumores.join(', ')}\n`;
    }
    prompt += '\n';
  }

  if (context.edificio) {
    prompt += `Ubicación: ${context.edificio.name}\n`;
    prompt += `Descripción: ${context.edificio.lore}\n`;
    if (context.edificio.eventos_recientes.length > 0) {
      prompt += `Eventos recientes: ${context.edificio.eventos_recientes.join(', ')}\n`;
    }
    prompt += '\n';
  }

  if (context.context) {
    prompt += `Contexto/Evento: ${context.context}\n`;
  }

  prompt += `\nTipo de lore: ${context.loreType || 'general'}\n`;
  prompt += `\nGenera el lore narrativo:`;

  messages.push({
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString()
  });

  return messages;
}

// Build prompt debug info
export function buildPromptDebugInfo(
  systemPrompt: string,
  messages: ChatMessage[],
  context: PromptBuildContext,
  finalRequest: any
): {
  systemPrompt: string;
  messages: ChatMessage[];
  context: PromptBuildContext;
  estimatedTokens: number;
  finalRequest: any;
} {
  return {
    systemPrompt,
    messages,
    context,
    estimatedTokens: estimateTokens(systemPrompt) + estimateMessagesTokens(messages),
    finalRequest
  };
}
