import { World, Pueblo, Edificio, NPC, Session, ChatMessage, PromptBuildContext, getCardField } from './types';
import { npcStateManager, sessionManager, edificioStateManager, puebloStateManager, worldStateManager, grimorioManager } from './fileManager';
import { replaceVariables, VariableContext } from './utils';
import { resolveGrimorioVariable } from './grimorioUtils';

// Token estimation (roughly 4 characters per token for English/Spanish)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(messages: ChatMessage[]): number {
  return messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
}

/**
 * Formatea una lista de strings como líneas con guiones
 */
function formatAsList(items: string[]): string {
  if (!items || items.length === 0) return '(Sin datos)';
  return items.map(item => `- ${item}`).join('\n');
}

/**
 * Formatea una lista de POIs como líneas con guiones
 */
function formatPOIsList(pois?: Array<{ name?: string; descripcion?: string; coordenadas?: { x: number; y: number; z: number } }>): string {
  if (!pois || pois.length === 0) return '(Sin puntos de interés)';
  return pois.map(poi => {
    const nombre = poi.name || 'Sin nombre';
    const descripcion = poi.descripcion || '';
    const coords = poi.coordenadas || { x: 0, y: 0, z: 0 };
    return `- ${nombre} (${descripcion}) {"coordenadas": {"x": ${coords.x},"y": ${coords.y},"z": ${coords.z}}}`;
  }).join('\n');
}

/**
 * Construye el prompt completo para el trigger de Chat siguiendo la estructura estándar:
 *
 * 1) Escribe ÚNICAMENTE la próxima respuesta de {{npc.name}} en reacción al último mensaje de {{jugador.nombre}}.
 * 2) Main Prompt (DEL NPC)
 * 3) Descripción (DEL NPC)
 * 4) Personalidad (DEL NPC)
 * 5) Scenario (DEL NPC)
 * 6) Chat Examples (DEL NPC)
 * 7) Template User (opcional, del payload)
 * 8) Last User Message (incluye último resumen, chat history y mensaje del usuario)
 * 9) POST-HISTORY (DEL NPC)
 */
export function buildCompleteChatPrompt(
  message: string,
  context: PromptBuildContext,
  options?: {
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
    };
    templateUser?: string;
    lastSummary?: string;
    grimorioTemplates?: Array<{
      enabled: boolean;
      templateKey: string;
      section: string;
    }>;
  }
): string {
  const { world, pueblo, edificio, npc, session } = context;
  const jugador = options?.jugador;
  const templates = options?.grimorioTemplates || [];

  let prompt = '';

  // 1. Instrucción inicial
  prompt += `Escribe ÚNICAMENTE la próxima respuesta de {{npc.name}} en reacción al último mensaje de {{jugador.nombre}}.\n\n`;

  // 2. Main Prompt (DEL NPC)
  const mainPrompt = getCardField(npc?.card, 'system_prompt', '');
  if (mainPrompt) {
    prompt += `=== MAIN PROMPT ===\n{{npc.system_prompt}}\n\n`;
  }

  // 3. Descripción (DEL NPC)
  const description = getCardField(npc?.card, 'description', '');
  if (description) {
    prompt += `=== DESCRIPCIÓN ===\n{{npc.description}}\n\n`;
  }

  // 4. Personalidad (DEL NPC)
  const personality = getCardField(npc?.card, 'personality', '');
  if (personality) {
    prompt += `=== PERSONALIDAD ===\n{{npc.personality}}\n\n`;
  }

  // 5. Scenario (DEL NPC)
  const scenario = getCardField(npc?.card, 'scenario', '');
  if (scenario) {
    prompt += `=== ESCENARIO ===\n{{npc.scenario}}\n\n`;
  }

  // 6. Chat Examples (DEL NPC)
  const chatExamples = getCardField(npc?.card, 'mes_example', '');
  if (chatExamples) {
    prompt += `=== EJEMPLOS DE CHAT ===\n{{npc.chat_examples}}\n\n`;
  }

  // 7. Procesar plantillas de Grimorio activas e insertarlas en sus secciones
  if (templates && templates.length > 0) {
    // Cargar todas las plantillas de Grimorio
    const allGrimorioCards = grimorioManager.getAll();

    // Agrupar plantillas activas por sección
    const templatesBySection: Record<string, string[]> = {};
    templates.filter(t => t.enabled && t.templateKey).forEach(template => {
      if (!templatesBySection[template.section]) {
        templatesBySection[template.section] = [];
      }
      templatesBySection[template.section].push(template.templateKey);
    });

    // Mapeo de secciones a sus secciones del prompt
    const sectionMap: Record<string, string> = {
      '1': 'Instrucción Inicial',
      '2': 'MAIN PROMPT',
      '3': 'DESCRIPCIÓN',
      '4': 'PERSONALIDAD',
      '5': 'ESCENARIO',
      '6': 'EJEMPLOS DE CHAT',
      '7': 'LAST USER MESSAGE',
      '8': 'INSTRUCCIONES POST-HISTORY'
    };

    // Construir contexto de variables
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
      lastSummary: options?.lastSummary
    };

    // Procesar cada sección y sus plantillas
    Object.keys(templatesBySection).forEach(sectionId => {
      const sectionName = sectionMap[sectionId];
      if (sectionName) {
        const templateKeys = templatesBySection[sectionId];

        templateKeys.forEach(templateKey => {
          // Buscar y expandir la plantilla de Grimorio
          const templateCard = allGrimorioCards.find(card => card.key === templateKey);

          if (templateCard && templateCard.tipo === 'plantilla') {
            // Expandir la plantilla con variables primarias
            const expanded = (templateCard.plantilla || '').replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (match, variableKey) => {
              // Reemplazar variables primarias en la plantilla
              return replaceVariables(match, varContext);
            });

            // Insertar la plantilla expandida en la sección
            prompt += `=== ${sectionName.toUpperCase()} ===\n${expanded}\n\n`;
          }
        });
      }
    });
  }

  // 7. Last User Message (se eliminó la sección Template del Usuario, ahora se usan variables de Grimorio directamente)
  prompt += `=== LAST USER MESSAGE ===\n`;

  // 7.1. Último resumen (si existe)
  if (options?.lastSummary && options.lastSummary.trim()) {
    prompt += `Último Resumen:\n{{lastSummary}}\n\n`;
  }

  // 7.2. Chat History (si existe)
  if (session && session.messages && session.messages.length > 0) {
    prompt += `Chat History:\n{{chatHistory}}\n\n`;
  }

  // 7.3. Mensaje del usuario
  prompt += `Mensaje del Usuario:\n{{userMessage}}\n\n`;

  // 8. POST-HISTORY (DEL NPC)
  const postHistory = getCardField(npc?.card, 'post_history_instructions', '');
  if (postHistory) {
    prompt += `=== INSTRUCCIONES POST-HISTORIAL ===\n{{npc.post_history_instructions}}\n\n`;
  }

  // Construir contexto de variables para reemplazo
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
    lastSummary: options?.lastSummary,
    templateUser: options?.templateUser
  };

  // DEBUG: Log para verificar que las variables del jugador lleguen
  console.log('[buildCompleteChatPrompt] DEBUG jugador:', jugador);
  console.log('[buildCompleteChatPrompt] DEBUG grimorioTemplates:', templates);

  // Reemplazar todas las variables en el prompt (primarias y plantillas de Grimorio ya expandidas)
  const result = replaceVariables(prompt, varContext);

  return result;
}

/**
 * Construye los messages completos para el trigger de Chat usando la estructura estándar.
 *
 * Retorna un array de ChatMessage listo para enviar al LLM.
 */
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
  return buildChatMessagesWithOptions(userMessage, context, { jugador });
}

/**
 * Construye los messages completos con opciones adicionales (templateUser, lastSummary).
 *
 * Retorna un array de ChatMessage listo para enviar al LLM.
 */
export function buildChatMessagesWithOptions(
  userMessage: string,
  context: PromptBuildContext,
  options?: {
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
    };
    templateUser?: string;
    lastSummary?: string;
  }
): ChatMessage[] {
  const completePrompt = buildCompleteChatPrompt(userMessage, context, options);

  const messages: ChatMessage[] = [
    { role: 'system', content: completePrompt, timestamp: new Date().toISOString() }
  ];

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString()
  });

  return messages;
}

// Las siguientes funciones se mantienen para otros triggers (resumen, nuevo lore, etc.)

// Build system prompt for chat (SillyTavern format - LEGACY, mantener por compatibilidad)
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
    prompt += `Mundo: {{mundo}}\n`;
    prompt += `Estado: {{mundo.estado}}\n`;
    if (world.lore.rumors && world.lore.rumors.length > 0) {
      prompt += `Rumores: {{mundo.rumores}}\n`;
    }
    prompt += '\n';
  }

  if (pueblo) {
    prompt += `=== CONTEXTO DEL PUEBLO ===\n`;
    prompt += `Pueblo: {{pueblo}}\n`;
    prompt += `Estado: {{pueblo.estado}}\n`;
    if (pueblo.lore.rumors && pueblo.lore.rumors.length > 0) {
      prompt += `Rumores: {{pueblo.rumores}}\n`;
    }
    prompt += '\n';
  }

  if (edificio) {
    prompt += `=== CONTEXTO DE LA UBICACIÓN ===\n`;
    prompt += `Ubicación: {{edificio}}\n`;
    prompt += `Descripción: {{edificio.descripcion}}\n`;
    if (edificio.eventos_recientes && edificio.eventos_recientes.length > 0) {
      prompt += `Eventos recientes: {{edificio.eventos}}\n`;
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
      prompt += `Descripción:\n{{npc.description}}\n\n`;
    }

    // Personalidad
    const personality = getCardField(npc.card, 'personality', '');
    if (personality) {
      prompt += `Personalidad:\n{{npc.personality}}\n\n`;
    }

    // Escenario
    const scenario = getCardField(npc.card, 'scenario', '');
    if (scenario) {
      prompt += `Escenario:\n{{npc.scenario}}\n\n`;
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
      prompt += `{{npc.post_history_instructions}}\n\n`;
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
    if (jugador.nombre) prompt += `Nombre: {{jugador.nombre}}\n`;
    if (jugador.raza) prompt += `Raza: {{jugador.raza}}\n`;
    if (jugador.nivel) prompt += `Nivel: {{jugador.nivel}}\n`;
    if (jugador.almakos) prompt += `Almakos: {{jugador.almakos}}\n`;
    if (jugador.deuda) prompt += `Deuda: {{jugador.deuda}}\n`;
    if (jugador.piedras_del_alma) prompt += `Piedras del Alma: {{jugador.piedras_del_alma}}\n`;
    if (jugador.salud_actual) prompt += `Salud: {{jugador.salud_actual}}\n`;
    if (jugador.reputacion) prompt += `Reputación: {{jugador.reputacion}}\n`;
    if (jugador.hora) prompt += `Hora: {{jugador.hora}}\n`;
    if (jugador.clima) prompt += `Clima: {{jugador.clima}}\n`;
    prompt += '\n';
  }

  // Construir contexto de variables para reemplazo
  const varContext: VariableContext = {
    npc,
    world,
    pueblo,
    edificio,
    jugador,
    session,
    char: getCardField(npc?.card, 'name', '')
  };

  // Reemplazar todas las variables en el prompt
  return replaceVariables(prompt, varContext);
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
    if (context.world.lore.rumors.length > 0) {
      prompt += `Rumores: ${context.world.lore.rumors.join(', ')}\n`;
    }
    prompt += '\n';
  }

  if (context.pueblo) {
    prompt += `Pueblo: ${context.pueblo.name}\n`;
    prompt += `Estado actual: ${context.pueblo.lore.estado_pueblo}\n`;
    if (context.pueblo.lore.rumors.length > 0) {
      prompt += `Rumores: ${context.pueblo.lore.rumors.join(', ')}\n`;
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

// Build prompt for Edificio summary
export function buildEdificioSummaryPrompt(
  edificio: Edificio,
  npcSummaries: Array<{ npcId: string; npcName: string; consolidatedSummary: string }>,
  edificioMemory?: Record<string, any>
): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Eres un asistente experto en consolidación de memoria narrativa de ubicaciones. Tu tarea es crear una memoria consolidada de un edificio.

INSTRUCCIONES:
- Crea un resumen que capture la esencia y evolución del edificio
- Incluye eventos importantes que han ocurrido en el edificio
- Identifica patrones en las interacciones de los NPCs del edificio
- Mantén la coherencia con el propósito y naturaleza del edificio
- El resumen debe servir como memoria a largo plazo del edificio

Formato esperado:
RESUMEN_CONSOLIDADO: [Resumen completo del edificio y su evolución]
EVENTOS_IMPORTANTES: [Lista de eventos importantes]
ACTIVIDAD_NPCS: [Patrones de interacción de NPCs]
ESTADO_ACTUAL: [Estado actual del edificio]`,
      timestamp: new Date().toISOString()
    }
  ];

  let prompt = `Edificio: ${edificio.name}\n`;
  prompt += `Descripción: ${edificio.lore || 'Sin descripción'}\n\n`;

  if (edificioMemory && edificioMemory.consolidatedSummary) {
    prompt += `Memoria anterior: ${edificioMemory.consolidatedSummary}\n`;
  }

  if (npcSummaries.length > 0) {
    prompt += `Resúmenes consolidados de NPCs del edificio:\n`;
    npcSummaries.forEach((npc, index) => {
      prompt += `${index + 1}. ${npc.npcName}:\n${npc.consolidatedSummary}\n`;
    });
    prompt += '\n';
  }

  prompt += `\nGenera la memoria consolidada actualizada del edificio:`;

  messages.push({
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString()
  });

  return messages;
}

// Build prompt for Pueblo summary
export function buildPuebloSummaryPrompt(
  pueblo: Pueblo,
  edificioSummaries: Array<{ edificioId: string; edificioName: string; consolidatedSummary: string }>,
  puebloMemory?: Record<string, any>
): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Eres un asistente experto en consolidación de memoria narrativa de regiones. Tu tarea es crear una memoria consolidada de un pueblo/nación.

INSTRUCCIONES:
- Crea un resumen que capture la esencia y evolución del pueblo/nación
- Incluye eventos importantes que han ocurrido en el pueblo
- Identifica patrones en la actividad de los edificios del pueblo
- Mantén la coherencia con el rol y naturaleza del pueblo
- El resumen debe servir como memoria a largo plazo del pueblo

Formato esperado:
RESUMEN_CONSOLIDADO: [Resumen completo del pueblo/nación y su evolución]
EVENTOS_IMPORTANTES: [Lista de eventos importantes]
ACTIVIDAD_EDIFICIOS: [Patrones de actividad en edificios]
ESTADO_ACTUAL: [Estado actual del pueblo/nación]`,
      timestamp: new Date().toISOString()
    }
  ];

  let prompt = `Pueblo/Nación: ${pueblo.name}\n`;
  prompt += `Tipo: ${pueblo.tipo || 'Sin especificar'}\n`;
  prompt += `Estado: ${pueblo.lore.estado_pueblo || 'Sin especificado'}\n`;
  if (pueblo.lore.rumors && pueblo.lore.rumors.length > 0) {
    prompt += `Rumores: ${pueblo.lore.rumors.join(', ')}\n`;
  }
  prompt += '\n';

  if (puebloMemory && puebloMemory.consolidatedSummary) {
    prompt += `Memoria anterior: ${puebloMemory.consolidatedSummary}\n`;
  }

  if (edificioSummaries.length > 0) {
    prompt += `Resúmenes consolidados de edificios del pueblo:\n`;
    edificioSummaries.forEach((edificio, index) => {
      prompt += `${index + 1}. ${edificio.edificioName}:\n${edificio.consolidatedSummary}\n`;
    });
    prompt += '\n';
  }

  prompt += `\nGenera la memoria consolidada actualizada del pueblo/nación:`;

  messages.push({
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString()
  });

  return messages;
}

// Build prompt for World summary
export function buildWorldSummaryPrompt(
  world: World,
  puebloSummaries: Array<{ puebloId: string; puebloName: string; consolidatedSummary: string }>,
  worldMemory?: Record<string, any>
): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Eres un asistente experto en consolidación de memoria narrativa de mundos. Tu tarea es crear una memoria consolidada de un mundo.

INSTRUCCIONES:
- Crea un resumen que capture la esencia y evolución del mundo
- Incluye eventos importantes que han ocurrido en el mundo
- Identifica tendencias globales entre los pueblos/naciones
- Mantén la coherencia con la narrativa global del mundo
- El resumen debe servir como memoria a largo plazo del mundo

Formato esperado:
RESUMEN_CONSOLIDADO: [Resumen completo del mundo y su evolución]
EVENTOS_IMPORTANTES: [Lista de eventos globales]
TENDENCIAS_GLOBALES: [Patrones y tendencias entre pueblos/naciones]
ESTADO_ACTUAL: [Estado actual del mundo]`,
      timestamp: new Date().toISOString()
    }
  ];

  let prompt = `Mundo: ${world.name}\n`;
  prompt += `Estado actual: ${world.lore.estado_mundo}\n`;
  if (world.lore.rumors && world.lore.rumors.length > 0) {
    prompt += `Rumores: ${world.lore.rumors.join(', ')}\n`;
  }
  prompt += '\n';

  if (worldMemory && worldMemory.consolidatedSummary) {
    prompt += `Memoria anterior: ${worldMemory.consolidatedSummary}\n`;
  }

  if (puebloSummaries.length > 0) {
    prompt += `Resúmenes consolidados de pueblos/naciones:\n`;
    puebloSummaries.forEach((pueblo, index) => {
      prompt += `${index + 1}. ${pueblo.puebloName}:\n${pueblo.consolidatedSummary}\n`;
    });
    prompt += '\n';
  }

  prompt += `\nGenera la memoria consolidada actualizada del mundo:`;

  messages.push({
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString()
  });

  return messages;
}
