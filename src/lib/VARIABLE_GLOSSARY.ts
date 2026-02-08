/**
 * GLOSARIO CENTRALIZADO DE VARIABLES
 * 
 * Este archivo contiene la documentación completa de todas las variables disponibles
 * en el sistema de reemplazo de Esparcraft Bridge.
 * 
 * Formato: {{variable}}
 * 
 * Las variables se organizan en categorías según su procedencia y uso.
 */

export interface VariableDefinition {
  /** Nombre de la variable (sin los corchetes) */
  name: string;
  /** Aliases alternativos para la misma variable */
  aliases: string[];
  /** Descripción de la variable */
  description: string;
  /** Tipo de dato */
  type: 'string' | 'number' | 'array' | 'object';
  /** Ejemplo de valor */
  example: string;
  /** Categoría de la variable */
  category: VariableCategory;
  /** ¿Es obligatorio? */
  required: boolean;
  /** ¿Se puede anidar dentro de otras variables? */
  nested: boolean;
}

export type VariableCategory = 
  | 'player'      // Datos del jugador
  | 'npc'         // Datos del NPC
  | 'session'     // Datos de la sesión
  | 'world'       // Datos del mundo
  | 'pueblo'      // Datos del pueblo
  | 'edificio'    // Datos del edificio
  | 'template'    // Variables especiales de plantillas
  | 'custom'      // Variables personalizadas
  | 'meta';       // Variables meta del sistema

/**
 * Glosario completo de variables disponibles
 */
export const VARIABLE_GLOSSARY: Record<string, VariableDefinition> = {
  // ============================================================================
  // VARIABLES DEL JUGADOR
  // ============================================================================
  'jugador.nombre': {
    name: 'jugador.nombre',
    aliases: ['nombre', 'playername', 'player_name'],
    description: 'Nombre del jugador',
    type: 'string',
    example: 'Aldric',
    category: 'player',
    required: true,
    nested: false
  },

  'jugador.raza': {
    name: 'jugador.raza',
    aliases: ['raza', 'player_race', 'player_raza'],
    description: 'Raza del jugador',
    type: 'string',
    example: 'Humano',
    category: 'player',
    required: false,
    nested: false
  },

  'jugador.nivel': {
    name: 'jugador.nivel',
    aliases: ['nivel', 'player_level', 'player_nivel'],
    description: 'Nivel del jugador',
    type: 'number',
    example: '15',
    category: 'player',
    required: false,
    nested: false
  },

  'jugador.salud_actual': {
    name: 'jugador.salud_actual',
    aliases: ['salud_actual', 'salud', 'player_health', 'player_salud'],
    description: 'Salud actual del jugador',
    type: 'string',
    example: '85/100',
    category: 'player',
    required: false,
    nested: false
  },

  'jugador.reputacion': {
    name: 'jugador.reputacion',
    aliases: ['reputacion', 'reputación', 'player_reputation', 'player_reputacion'],
    description: 'Reputación del jugador',
    type: 'string',
    example: 'Respetado',
    category: 'player',
    required: false,
    nested: false
  },

  'jugador.hora': {
    name: 'jugador.hora',
    aliases: ['hora', 'player_time', 'player_hora'],
    description: 'Hora actual del juego',
    type: 'string',
    example: '14:30',
    category: 'player',
    required: false,
    nested: false
  },

  'jugador.clima': {
    name: 'jugador.clima',
    aliases: ['clima', 'player_weather', 'player_clima'],
    description: 'Clima actual',
    type: 'string',
    example: 'Lluvia ligera',
    category: 'player',
    required: false,
    nested: false
  },

  'jugador.almakos': {
    name: 'jugador.almakos',
    aliases: ['almakos'],
    description: 'Moneda Almakos del jugador',
    type: 'string',
    example: '2500',
    category: 'player',
    required: false,
    nested: false
  },

  'jugador.deuda': {
    name: 'jugador.deuda',
    aliases: ['deuda'],
    description: 'Deuda del jugador',
    type: 'string',
    example: '500',
    category: 'player',
    required: false,
    nested: false
  },

  'jugador.piedras_del_alma': {
    name: 'jugador.piedras_del_alma',
    aliases: ['piedras_del_alma', 'piedras'],
    description: 'Piedras del alma del jugador',
    type: 'string',
    example: '3',
    category: 'player',
    required: false,
    nested: false
  },

  'jugador.compra': {
    name: 'jugador.compra',
    aliases: ['compra'],
    description: 'Indicador de compra del jugador (SI/NO)',
    type: 'string',
    example: 'SI',
    category: 'player',
    required: false,
    nested: false
  },

  'jugador.humor_delta': {
    name: 'jugador.humor_delta',
    aliases: ['humor_delta'],
    description: 'Variación del humor del jugador (-10 a 10)',
    type: 'number',
    example: '5',
    category: 'player',
    required: false,
    nested: false
  },

  'jugador.mensaje': {
    name: 'jugador.mensaje',
    aliases: ['mensaje'],
    description: 'Último mensaje del jugador',
    type: 'string',
    example: '¿Dónde puedo encontrar la posada?',
    category: 'player',
    required: true,
    nested: false
  },

  // ============================================================================
  // VARIABLES DEL NPC
  // ============================================================================
  'npc.name': {
    name: 'npc.name',
    aliases: ['npcid', 'npc_name', 'npc.name', 'npc', 'char', 'CHAR'],
    description: 'Nombre del NPC',
    type: 'string',
    example: 'Theron el Herrero',
    category: 'npc',
    required: true,
    nested: false
  },

  'npc.description': {
    name: 'npc.description',
    aliases: ['npc_description', 'npc.description'],
    description: 'Descripción del NPC',
    type: 'string',
    example: 'Un herrero anciano con manos fuertes y ojos brillantes',
    category: 'npc',
    required: false,
    nested: false
  },

  'npc.personality': {
    name: 'npc.personality',
    aliases: ['npc_personality', 'npc.personality', 'personalidad'],
    description: 'Personalidad del NPC',
    type: 'string',
    example: 'Grumpy but helpful',
    category: 'npc',
    required: false,
    nested: false
  },

  'npc.scenario': {
    name: 'npc.scenario',
    aliases: ['scenario'],
    description: 'Escenario o contexto del NPC',
    type: 'string',
    example: 'You are in a forge...',
    category: 'npc',
    required: false,
    nested: true
  },

  'npc.system_prompt': {
    name: 'npc.system_prompt',
    aliases: ['system_prompt'],
    description: 'Prompt de sistema del NPC',
    type: 'string',
    example: 'You are Theron...',
    category: 'npc',
    required: false,
    nested: true
  },

  'npc.chat_examples': {
    name: 'npc.chat_examples',
    aliases: ['chat_examples', 'mes_example'],
    description: 'Ejemplos de chat del NPC',
    type: 'string',
    example: 'User: Hello\nNPC: Greetings, traveler',
    category: 'npc',
    required: false,
    nested: true
  },

  'npc.post_history_instructions': {
    name: 'npc.post_history_instructions',
    aliases: ['post_history_instructions'],
    description: 'Instrucciones post-historial del NPC',
    type: 'string',
    example: 'Remember to...',
    category: 'npc',
    required: false,
    nested: true
  },

  'npc.historial': {
    name: 'npc.historial',
    aliases: ['npc_historial', 'npc.historial'],
    description: 'Historial completo de la sesión con el NPC',
    type: 'string',
    example: 'Usuario: Hola\nNPC: Bienvenido...',
    category: 'session',
    required: false,
    nested: false
  },

  'npc.notes': {
    name: 'npc.notes',
    aliases: ['npc_notes', 'notas_creador', 'creator_notes'],
    description: 'Notas del creador sobre el NPC (pensamientos, ideas, aclaraciones)',
    type: 'string',
    example: 'Este NPC tiene un pasado misterioso que se revela lentamente. Preferable usar tono melancólico pero esperanzador.',
    category: 'npc',
    required: true,
    nested: false
  },

  // ============================================================================
  // VARIABLES DEL MUNDO
  // ============================================================================
  'mundo.name': {
    name: 'mundo.name',
    aliases: ['world_name', 'mundo_nombre', 'mundo'],
    description: 'Nombre del mundo',
    type: 'string',
    example: 'Esparcraft',
    category: 'world',
    required: true,
    nested: false
  },

  'mundo.estado': {
    name: 'mundo.estado',
    aliases: ['estado', 'estado_mundo'],
    description: 'Estado actual del mundo',
    type: 'string',
    example: 'El mundo está en paz...',
    category: 'world',
    required: false,
    nested: false
  },

  'mundo.rumores': {
    name: 'mundo.rumores',
    aliases: ['rumores'],
    description: 'Rumores del mundo (lista formateada)',
    type: 'array',
    example: '- Se escuchan susurros\n- Algo se mueve en las sombras',
    category: 'world',
    required: false,
    nested: false
  },

  // ============================================================================
  // VARIABLES DEL PUEBLO
  // ============================================================================
  'pueblo.name': {
    name: 'pueblo.name',
    aliases: ['pueblo_name', 'pueblo'],
    description: 'Nombre del pueblo',
    type: 'string',
    example: 'Valle Dorado',
    category: 'pueblo',
    required: false,
    nested: false
  },

  'pueblo.tipo': {
    name: 'pueblo.tipo',
    aliases: ['type'],
    description: 'Tipo de pueblo',
    type: 'string',
    example: 'Fortaleza',
    category: 'pueblo',
    required: false,
    nested: false
  },

  'pueblo.descripcion': {
    name: 'pueblo.descripcion',
    aliases: ['descripcion'],
    description: 'Descripción general del pueblo',
    type: 'string',
    example: 'Un pueblo fortificado...',
    category: 'pueblo',
    required: false,
    nested: false
  },

  'pueblo.estado': {
    name: 'pueblo.estado',
    aliases: ['estado_pueblo'],
    description: 'Estado actual del pueblo',
    type: 'string',
    example: 'El pueblo prospera...',
    category: 'pueblo',
    required: false,
    nested: false
  },

  'pueblo.rumores': {
    name: 'pueblo.rumores',
    aliases: ['rumores'],
    description: 'Rumores del pueblo (lista formateada)',
    type: 'array',
    example: '- Extraños en la posada\n- Caravanas desaparecidas',
    category: 'pueblo',
    required: false,
    nested: false
  },

  // ============================================================================
  // VARIABLES DEL EDIFICIO
  // ============================================================================
  'edificio.name': {
    name: 'edificio.name',
    aliases: ['edificio_name', 'edificio'],
    description: 'Nombre del edificio',
    type: 'string',
    example: 'Herrería de Theron',
    category: 'edificio',
    required: false,
    nested: false
  },

  'edificio.descripcion': {
    name: 'edificio.descripcion',
    aliases: ['descripcion', 'lore'],
    description: 'Descripción/Lore del edificio',
    type: 'string',
    example: 'Una herrería antigua...',
    category: 'edificio',
    required: false,
    nested: false
  },

  'edificio.eventos': {
    name: 'edificio.eventos',
    aliases: ['eventos', 'eventos_recientes'],
    description: 'Eventos recientes del edificio (lista formateada)',
    type: 'array',
    example: '- Llegó un extranjero\n- Se reparó el horno',
    category: 'edificio',
    required: false,
    nested: false
  },

  'edificio.type': {
    name: 'edificio.type',
    aliases: ['type'],
    description: 'Tipo de edificio',
    type: 'string',
    example: 'Herrería',
    category: 'edificio',
    required: false,
    nested: false
  },

  'edificio.poislist': {
    name: 'edificio.poislist',
    aliases: ['poislist', 'puntos_de_interes_list'],
    description: 'Lista de puntos de interés del edificio',
    type: 'array',
    example: '- Yunque (Para forjar) {"coordenadas": {"x": 1,"y": 0,"z": 0}}',
    category: 'edificio',
    required: false,
    nested: false
  },

  // ============================================================================
  // VARIABLES DE PLANTILLA
  // ============================================================================
  'templateUser': {
    name: 'templateUser',
    aliases: ['template_user'],
    description: 'Plantilla de usuario configurada en el servidor',
    type: 'string',
    example: 'Eres {{jugador.nombre}}, un {{jugador.raza}} de nivel {{jugador.nivel}}...',
    category: 'template',
    required: false,
    nested: true
  },

  'userMessage': {
    name: 'userMessage',
    aliases: ['user_message'],
    description: 'Mensaje actual del usuario',
    type: 'string',
    example: '¿Qué puedo hacer aquí?',
    category: 'template',
    required: true,
    nested: false
  },

  'chatHistory': {
    name: 'chatHistory',
    aliases: ['chat_history'],
    description: 'Historial de chat completo',
    type: 'string',
    example: 'Usuario: Hola\nNPC: Bienvenido...',
    category: 'session',
    required: false,
    nested: false
  },

  'session.playerId': {
    name: 'session.playerId',
    aliases: ['session_player_id', 'player_id', 'playerId'],
    description: 'ID/Nombre del jugador en esta sesión',
    type: 'string',
    example: 'Aldric',
    category: 'session',
    required: false,
    nested: false
  },

  'lastSummary': {
    name: 'lastSummary',
    aliases: ['ultimo_resumen', 'lastSummary'],
    description: 'Último resumen de la sesión',
    type: 'string',
    example: 'El jugador llegó al pueblo y visitó la herrería...',
    category: 'meta',
    required: false,
    nested: false
  },

  // ============================================================================
  // VARIABLES PERSONALIZADAS
  // ============================================================================
  // Las variables personalizadas se registran dinámicamente
  // Ejemplo: {{userdata}} puede contener cualquier valor definido por el usuario
  // Estas variables se resuelven a partir del contexto custom del VariableContext

};

/**
 * Función para obtener la definición de una variable
 * Busca por nombre o alias
 */
export function getVariableDefinition(variableName: string): VariableDefinition | undefined {
  // Buscar directo
  if (VARIABLE_GLOSSARY[variableName]) {
    return VARIABLE_GLOSSARY[variableName];
  }

  // Buscar por alias
  for (const def of Object.values(VARIABLE_GLOSSARY)) {
    if (def.aliases.includes(variableName)) {
      return def;
    }
  }

  return undefined;
}

/**
 * Función para obtener todas las variables de una categoría
 */
export function getVariablesByCategory(category: VariableCategory): VariableDefinition[] {
  return Object.values(VARIABLE_GLOSSARY).filter(def => def.category === category);
}

/**
 * Función para obtener todas las variables obligatorias
 */
export function getRequiredVariables(): VariableDefinition[] {
  return Object.values(VARIABLE_GLOSSARY).filter(def => def.required);
}

/**
 * Función para obtener todas las variables que permiten anidamiento
 */
export function getNestedVariables(): VariableDefinition[] {
  return Object.values(VARIABLE_GLOSSARY).filter(def => def.nested);
}

/**
 * Función para extraer todas las variables de un texto
 */
export function extractVariablesFromText(text: string): string[] {
  const matches = text.match(/\{\{\s*([\w.]+)\s*\}\}/g) || [];
  return matches.map(match => match.replace(/\{\{\s*|\s*\}\}/g, ''));
}

/**
 * Genera documentación en Markdown del glosario
 */
export function generateGlossaryMarkdown(): string {
  let md = '# Glosario de Variables - Esparcraft Bridge\n\n';
  md += 'Este documento describe todas las variables disponibles en el sistema de reemplazo.\n\n';
  md += '## Formato\n\n';
  md += 'Las variables se escriben en el formato: `{{nombre_variable}}`\n\n';

  // Agrupar por categoría
  const categories: VariableCategory[] = ['player', 'npc', 'session', 'world', 'pueblo', 'edificio', 'template', 'custom', 'meta'];
  
  for (const category of categories) {
    const variables = getVariablesByCategory(category);
    if (variables.length === 0) continue;

    const categoryNames: Record<VariableCategory, string> = {
      player: 'Jugador',
      npc: 'NPC',
      session: 'Sesión',
      world: 'Mundo',
      pueblo: 'Pueblo',
      edificio: 'Edificio',
      template: 'Plantilla',
      custom: 'Personalizadas',
      meta: 'Meta'
    };

    md += `## ${categoryNames[category]}\n\n`;
    
    for (const variable of variables) {
      md += `### \`${variable.name}\`\n\n`;
      md += `- **Descripción**: ${variable.description}\n`;
      md += `- **Tipo**: ${variable.type}\n`;
      md += `- **Ejemplo**: \`${variable.example}\`\n`;
      md += `- **Obligatoria**: ${variable.required ? 'Sí' : 'No'}\n`;
      md += `- **Permite anidamiento**: ${variable.nested ? 'Sí' : 'No'}\n`;
      
      if (variable.aliases.length > 0) {
        md += `- **Aliases**: ${variable.aliases.map(a => `\`${a}\``).join(', ')}\n`;
      }
      md += '\n';
    }
  }

  md += '## Notas sobre Anidamiento\n\n';
  md += 'Las variables marcadas como "Permite anidamiento: Sí" pueden contener otras variables dentro de su valor.\n';
  md += 'Por ejemplo, `{{npc.post_history_instructions}}` puede contener `{{jugador.nombre}}`.\n\n';
  md += 'El sistema realiza hasta 10 pasadas de reemplazo para resolver todas las variables anidadas.\n';

  return md;
}
