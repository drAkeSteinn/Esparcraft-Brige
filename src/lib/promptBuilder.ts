import { World, Pueblo, Edificio, NPC, Session, ChatMessage, PromptBuildContext, getCardField } from './types';
import { npcStateManager, sessionManager, edificioStateManager, puebloStateManager, worldStateManager, grimorioManager } from './fileManager';
import { replaceVariables, VariableContext } from './utils';
import { resolveAllVariables } from './grimorioUtils';

// ========= FUNCIONES COMPARTIDAS PARA TRIGGERS DE RESUMEN =========

/**
 * Crea un System Prompt compartido para resumenes
 * Soporta variables primarias y plantillas de Grimorio
 */
function buildSharedSystemPrompt(
  options: {
    systemPrompt?: string;
    npc?: NPC;
    world?: World;
    pueblo?: Pueblo;
    edificio?: Edificio;
    templates?: Array<{
      enabled: boolean;
      templateKey: string;
      section: string;
    }>;
  }
): string {
  let prompt = '';
  const systemPrompt = options?.systemPrompt || '';
  const templates = options?.templates || [];

  console.log('[buildSharedSystemPrompt] systemPrompt recibido:', systemPrompt?.substring(0, 50) || '(vacío)');
  console.log('[buildSharedSystemPrompt] templates.length:', templates.length);

  if (systemPrompt && systemPrompt.trim()) {
    // Usar System Prompt personalizado
    prompt += `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n`;
    console.log('[buildSharedSystemPrompt] Usando System Prompt personalizado');
  } else {
    // System Prompt por defecto si no se proporciona uno
    prompt += `=== SYSTEM PROMPT ===\n`;
    prompt += `Eres un asistente experto en análisis narrativo. Tu tarea es generar un resumen conciso pero completo.\n\n`;
    prompt += `INSTRUCCIONES:\n`;
    prompt += `- Resume la información proporcionada de forma clara y organizada\n`;
    prompt += `- Identifica elementos clave y patrones importantes\n`;
    prompt += `- Mantén la coherencia y consistencia narrativa\n\n`;
    prompt += `Formato esperado:\n`;
    prompt += `[RESUMEN_GENERADO]: Tu resumen aquí\n\n`;
    console.log('[buildSharedSystemPrompt] Usando System Prompt por defecto');
  }

  return prompt;
}

/**
 * Inserta plantillas de Grimorio en una sección específica
 */
function insertTemplatesForSection(
  sectionId: string,
  sectionName: string,
  templates: Array<{ enabled: boolean; templateKey: string; section: string }>,
  allGrimorioCards: GrimorioCard[],
  varContext: VariableContext
): string {
  let expandedContent = '';

  const templateKeys = templates
    .filter(t => t.enabled && t.templateKey && t.section === sectionId)
    .map(t => t.templateKey);

  console.log(`[insertTemplatesForSection] Sección ${sectionName} (${sectionId}) - Plantillas:`, templateKeys);

  if (templateKeys.length > 0) {
    templateKeys.forEach(templateKey => {
      const templateCard = allGrimorioCards.find(card => card.key === templateKey);

      if (templateCard && templateCard.tipo === 'plantilla') {
        console.log(`[insertTemplatesForSection] Insertando plantilla ${templateKey} en sección ${sectionName}`);
        const expanded = replaceVariables(templateCard.plantilla || '', varContext);
        expandedContent += `${expanded}\n\n`;
      }
    });

    console.log(`[insertTemplatesForSection] Contenido insertado en ${sectionName}:`, expandedContent.substring(0, 100));
  }

  return expandedContent;
}

// ========= FIN FUNCIONES COMPARTIDAS =========

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

  let prompt = '';

  // 1. Instrucción inicial
  prompt += `Escribe ÚNICAMENTE la próxima respuesta de {{npc.name}} en reacción al último mensaje de {{jugador.nombre}}.\n\n`;

  // 2. Main Prompt (DEL NPC)
  const mainPrompt = getCardField(npc?.card, 'system_prompt', '');
  if (mainPrompt) {
    prompt += `{{npc.system_prompt}}\n\n`;
  }

  // 3. Descripción (DEL NPC)
  const description = getCardField(npc?.card, 'description', '');
  if (description) {
    prompt += `{{npc.description}}\n\n`;
  }

  // 4. Personalidad (DEL NPC)
  const personality = getCardField(npc?.card, 'personality', '');
  if (personality) {
    prompt += `{{npc.personality}}\n\n`;
  }

  // 5. Scenario (DEL NPC)
  const scenario = getCardField(npc?.card, 'scenario', '');
  if (scenario) {
    prompt += `{{npc.scenario}}\n\n`;
  }

  // 6. Chat Examples (DEL NPC)
  const chatExamples = getCardField(npc?.card, 'mes_example', '');
  if (chatExamples) {
    prompt += `=== EJEMPLOS DE CHAT ===\n{{npc.mes_example}}\n\n`;
  }

  // 7. Last User Message (se eliminó la sección Template del Usuario, ahora se usan variables de Grimorio directamente)

  // 7.1. Último resumen (si existe)
  if (options?.lastSummary && options.lastSummary.trim()) {
    prompt += `RECUERDOS DE ({{npc.name}}):\n{{lastSummary}}\n\n`;
  }

  // 7.2. Chat History (si existe)
  if (session && session.messages && session.messages.length > 0) {
    prompt += `Historial de la conversación:\n{{chatHistory}}\n\n`;
  }

  // 8. POST-HISTORY (DEL NPC)
  const postHistory = getCardField(npc?.card, 'post_history_instructions', '');
  if (postHistory) {
    prompt += `{{npc.post_history_instructions}}\n\n`;
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

  // Cargar todas las cards del Grimorio para expandir plantillas
  const grimorioCards = grimorioManager.getAll();

  // Primero reemplazar todas las variables (incluyendo plantillas de Grimorio)
  const { result } = resolveAllVariables(prompt, varContext, grimorioCards);

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

/**
 * Construye el prompt completo para el trigger de Resumen de Sesión siguiendo una estructura similar al trigger de Chat:
 *
 * 1) System Prompt (Personalizable, con soporte de variables primarias y plantillas de Grimorio)
 * 2) Último Resumen (Si existe un resumen anterior de esta sesión)
 * 3) Historial de Chat
 *
 * Esta estructura permite que el resumen de sesión use las mismas herramientas que el trigger de Chat.
 */
export function buildCompleteSessionSummaryPrompt(
  context: PromptBuildContext,
  options?: {
    systemPrompt?: string;
    lastSummary?: string;
    chatHistory?: string;
    grimorioTemplates?: Array<{
      enabled: boolean;
      templateKey: string;
      section: string;
    }>;
  }
): string {
  const { npc, world, pueblo, edificio, session } = context;
  const systemPrompt = options?.systemPrompt || '';
  const lastSummary = options?.lastSummary || '';
  const chatHistory = options?.chatHistory || '';
  const templates = options?.grimorioTemplates || [];

  let prompt = '';

  // ✅ PREPARAR PLANTILLAS DE GRIMORIO (antes de construir el prompt)
  let templatesBySection: Record<string, string[]> = {};
  let allGrimorioCards: GrimorioCard[] = [];

  if (templates && templates.length > 0) {
    // Cargar todas las plantillas de Grimorio
    allGrimorioCards = grimorioManager.getAll();

    // Agrupar plantillas activas por sección
    templatesBySection = {};
    templates.filter(t => t.enabled && t.templateKey).forEach(template => {
      if (!templatesBySection[template.section]) {
        templatesBySection[template.section] = [];
      }
      templatesBySection[template.section].push(template.templateKey);
    });
  }

  // Mapeo de secciones para el resumen de sesión
  const sectionMap: Record<string, string> = {
    '1': 'SYSTEM PROMPT',
    '2': 'ÚLTIMO RESUMEN',
    '3': 'HISTORIAL DE CHAT'
  };

  // ✅ FUNCIÓN HELPER: Insertar plantillas de una sección específica
  const insertTemplatesForSection = (sectionId: string) => {
    const templateKeys = templatesBySection[sectionId];
    if (!templateKeys || templateKeys.length === 0) return;

    const sectionName = sectionMap[sectionId];
    if (!sectionName) return;

    // Construir contexto de variables para la expansión
    const varContext: VariableContext = {
      npc,
      world,
      pueblo,
      edificio,
      session,
      char: getCardField(npc?.card, 'name', ''),
      lastSummary: options?.lastSummary
    };

    templateKeys.forEach(templateKey => {
      // Buscar y expandir la plantilla de Grimorio
      const templateCard = allGrimorioCards.find(card => card.key === templateKey);

      if (templateCard && templateCard.tipo === 'plantilla') {
        // Expandir la plantilla con TODAS las variables (usando replaceVariables directamente)
        const expanded = replaceVariables(templateCard.plantilla || '', varContext);

        // ✅ Insertar solo el contenido expandido, SIN encabezado de sección
        prompt += `${expanded}\n\n`;
      }
    });
  };

  // 1. System Prompt (personalizable)
  if (systemPrompt && systemPrompt.trim()) {
    prompt += `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n`;
  } else {
    // System prompt por defecto si no se proporciona uno
    prompt += `=== SYSTEM PROMPT ===\n`;
    prompt += `Eres un asistente experto en análisis narrativo. Tu tarea es generar un resumen conciso pero completo de una conversación entre un jugador y un NPC.\n\n`;
    prompt += `INSTRUCCIONES:\n`;
    prompt += `- Resume la conversación en 3-5 oraciones clave\n`;
    prompt += `- Identifica decisiones importantes o eventos relevantes\n`;
    prompt += `- Menciona temas principales discutidos\n`;
    prompt += `- Mantén el contexto del mundo y el personaje\n`;
    prompt += `- El resumen debe ser útil para mantener continuidad narrativa\n\n`;
    prompt += `Formato esperado:\n`;
    prompt += `RESUMEN: [Tu resumen aquí]\n`;
    prompt += `EVENTOS_CLAVES: [Lista de eventos importantes separados por comas]\n`;
    prompt += `TEMAS: [Lista de temas principales separados por comas]\n\n`;
  }
  insertTemplatesForSection('1'); // ✅ Insertar plantillas de sección 1 aquí

  // 2. Último Resumen (si existe)
  if (lastSummary && lastSummary.trim()) {
    prompt += `=== ÚLTIMO RESUMEN ===\n${lastSummary}\n\n`;
  }
  insertTemplatesForSection('2'); // ✅ Insertar plantillas de sección 2 aquí

  // 3. Historial de Chat
  if (chatHistory && chatHistory.trim()) {
    prompt += `=== HISTORIAL DE CHAT ===\n${chatHistory}\n\n`;
  }
  insertTemplatesForSection('3'); // ✅ Insertar plantillas de sección 3 aquí

  // Construir contexto de variables para reemplazo
  const varContext: VariableContext = {
    npc,
    world,
    pueblo,
    edificio,
    session,
    char: getCardField(npc?.card, 'name', ''),
    lastSummary: options?.lastSummary
  };

  // Reemplazar todas las variables en el prompt (primarias y plantillas de Grimorio ya expandidas)
  const result = replaceVariables(prompt, varContext);

  return result;
}

// Build prompt for NPC global summary
export function buildNPCSummaryPrompt(
  npc: NPC,
  sessionSummaries: string[],
  npcMemory?: Record<string, any>,
  options?: {
    systemPrompt?: string; // System prompt personalizado (puede incluir keys de plantilla como {{npc.name}}, {{npc.personality}}, etc.)
    allSummaries?: string; // Lista formateada de resúmenes de sesiones del NPC
  }
): ChatMessage[] {
  // Usar system prompt personalizado o el default
  // El system prompt NO debe incluir headers, solo el contenido
  // El usuario puede usar keys de plantilla como {{npc.name}}, {{npc.personality}}, {{npc.scenario}}, etc.
  const customSystemPrompt = options?.systemPrompt;

  const systemPromptContent = customSystemPrompt && customSystemPrompt.trim()
    ? customSystemPrompt
    : `Eres un asistente experto en consolidación de memoria narrativa. Tu tarea es crear una memoria consolidada del NPC {{npc.name}}.

INSTRUCCIONES:
- Crea un resumen que capture la esencia y evolución del personaje
- Incluye eventos importantes que hayan moldeado al NPC
- Identifica relaciones y conexiones significativas
- Mantén la coherencia con la personalidad del NPC
- El resumen debe servir como memoria a largo plazo

Formato esperado:
RESUMEN_CONSOLIDADO: [Resumen completo del personaje y su evolución]
EVENTOS_IMPORTANTES: [Lista de eventos importantes]
RELACIONES: [Relaciones importantes con otros personajes o jugadores]
PERSPECTIVA_ACTUAL: [Cómo el NPC ve el mundo actualmente]`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPromptContent,
      timestamp: new Date().toISOString()
    }
  ];

  // Solo incluir las memorias de los aventureros
  let prompt = '';

  if (options?.allSummaries && options.allSummaries.trim()) {
    prompt = options.allSummaries;
  } else if (sessionSummaries.length > 0) {
    prompt = sessionSummaries.join('\n');
  }

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
  edificioMemory?: Record<string, any>,
  options?: {
    systemPrompt?: string; // ✅ NUEVO: System prompt personalizado
  }
): ChatMessage[] {
  // ✅ Usar system prompt personalizado o el default (SIN header ===)
  // El system prompt puede incluir keys de plantilla como {{edificio.name}}, {{edificio.descripcion}}, etc.
  const customSystemPrompt = options?.systemPrompt;

  const systemPromptContent = customSystemPrompt && customSystemPrompt.trim()
    ? customSystemPrompt
    : `Eres un asistente experto en consolidación de memoria narrativa de ubicaciones. Tu tarea es crear una memoria consolidada del edificio {{edificio.name}}.

INSTRUCCIONES:
- Crea un resumen que capture la esencia y evolución del edificio
- Incluye eventos importantes que hayan ocurrido en el edificio
- Identifica patrones en las interacciones de los NPCs del edificio
- Mantén la coherencia con el propósito y naturaleza del edificio
- El resumen debe servir como memoria a largo plazo del edificio

Formato esperado:
RESUMEN_CONSOLIDADO: [Resumen completo del edificio y su evolución]
EVENTOS_IMPORTANTES: [Lista de eventos importantes]
ACTIVIDAD_NPCS: [Patrones de interacción de NPCs]
ESTADO_ACTUAL: [Estado actual del edificio]`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPromptContent,
      timestamp: new Date().toISOString()
    }
  ];

  // ✅ SOLO incluir las memorias de los NPCs (formato simple)
  let prompt = '';

  if (npcSummaries.length > 0) {
    prompt = npcSummaries
      .map((npc, index) =>
        `NPC ${index + 1}: ${npc.npcName} (ID: ${npc.npcId})\n${npc.consolidatedSummary}`
      )
      .join('\n\n');
  }

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
  puebloMemory?: Record<string, any>,
  options?: {
    systemPrompt?: string; // ✅ NUEVO: System prompt personalizado
  }
): ChatMessage[] {
  // ✅ Usar system prompt personalizado o el default (SIN header ===)
  // El system prompt puede incluir keys de plantilla como {{pueblo.name}}, {{pueblo.descripcion}}, {{mundo}}, etc.
  const customSystemPrompt = options?.systemPrompt;

  const systemPromptContent = customSystemPrompt && customSystemPrompt.trim()
    ? customSystemPrompt
    : `Eres un asistente experto en consolidación de memoria narrativa de regiones. Tu tarea es crear una memoria consolidada del pueblo/nación {{pueblo.name}}.

INSTRUCCIONES:
- Crea un resumen que capture la esencia y evolución del pueblo/nación
- Incluye eventos importantes que hayan ocurrido en el pueblo
- Identifica patrones en la actividad de los edificios del pueblo
- Mantén la coherencia con el rol y naturaleza del pueblo
- El resumen debe servir como memoria a largo plazo del pueblo

Formato esperado:
RESUMEN_CONSOLIDADO: [Resumen completo del pueblo/nación y su evolución]
EVENTOS_IMPORTANTES: [Lista de eventos importantes]
ACTIVIDAD_EDIFICIOS: [Patrones de actividad en edificios]
ESTADO_ACTUAL: [Estado actual del pueblo/nación]`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPromptContent,
      timestamp: new Date().toISOString()
    }
  ];

  // ✅ SOLO incluir los resúmenes de los edificios (formato simple)
  let prompt = '';

  if (edificioSummaries.length > 0) {
    prompt = edificioSummaries
      .map((edificio, index) =>
        `Edificio ${index + 1}: ${edificio.edificioName} (ID: ${edificio.edificioId})\n${edificio.consolidatedSummary}`
      )
      .join('\n\n');
  }

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
  worldMemory?: Record<string, any>,
  options?: {
    systemPrompt?: string; // ✅ NUEVO: System prompt personalizado
  }
): ChatMessage[] {
  // ✅ Usar system prompt personalizado o el default (SIN header ===)
  // El system prompt puede incluir keys de plantilla como {{mundo.name}}, {{mundo.descripcion}}, etc.
  const customSystemPrompt = options?.systemPrompt;

  const systemPromptContent = customSystemPrompt && customSystemPrompt.trim()
    ? customSystemPrompt
    : `Eres un asistente experto en consolidación de memoria narrativa de mundos. Tu tarea es crear una memoria consolidada del mundo {{mundo.name}}.

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
ESTADO_ACTUAL: [Estado actual del mundo]`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPromptContent,
      timestamp: new Date().toISOString()
    }
  ];

  // ✅ SOLO incluir los resúmenes de los pueblos (formato simple)
  let prompt = '';

  if (puebloSummaries.length > 0) {
    prompt = puebloSummaries
      .map((pueblo, index) =>
        `Pueblo/Nación ${index + 1}: ${pueblo.puebloName} (ID: ${pueblo.puebloId})\n${pueblo.consolidatedSummary}`
      )
      .join('\n\n');
  }

  messages.push({
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString()
  });

  return messages;
}
