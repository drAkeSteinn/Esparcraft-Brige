import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { templateCache } from './templateCache';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Tipos para el contexto de reemplazo de variables
export interface VariableContext {
  npc?: {
    card?: {
      data?: {
        name?: string;
        description?: string;
        personality?: string;
        scenario?: string;
        post_history_instructions?: string;
        system_prompt?: string;
        mes_example?: string;
      };
      name?: string;
      description?: string;
    };
  };
  world?: {
    name: string;
    lore?: {
      estado_mundo?: string;
      rumors?: string[];
    };
  };
  pueblo?: {
    name: string;
    type?: string;
    description?: string;
    lore?: {
      estado_pueblo?: string;
      rumors?: string[];
    };
  };
  edificio?: {
    name: string;
    type?: string;
    lore?: string;
    eventos_recientes?: string[];
    puntosDeInteres?: Array<{
      name?: string;
      descripcion?: string;
      coordenadas?: { x: number; y: number; z: number };
    }>;
  };
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
  session?: {
    playerId?: string;
    messages?: Array<{ role: string; content: string }>;
  };
  mensaje?: string;
  userMessage?: string;
  lastSummary?: string;
  templateUser?: string;
  char?: string; // Para {{char}}
}

/**
 * Reemplaza variables en el formato {{variable}} con sus valores reales del contexto
 * Hace múltiples pasadas para manejar variables anidadas
 */
export function replaceVariables(text: string, context: VariableContext): string {
  if (!text) return '';

  // DEBUG: Log para ver qué está en el contexto
  console.log('[replaceVariables] DEBUG context.jugador:', context.jugador);
  console.log('[replaceVariables] DEBUG context.templateUser:', context.templateUser);
  console.log('[replaceVariables] DEBUG text antes de reemplazo:', text.substring(0, 200) + '...');

  // Función auxiliar para hacer una sola pasada de reemplazo
  const replaceSinglePass = (inputText: string): string => {
    return inputText.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match: string, key: string) => {
      // Variables especiales
      if (key === 'char' || key === 'CHAR') {
        return context.char || context.npc?.card?.data?.name || context.npc?.card?.name || '';
      }

      // NPC object keys (npc.name, npc.description, etc.)
      if (key.startsWith('npc.')) {
        const npcKey = key.replace('npc.', '');
        let value = '';

        if (npcKey === 'name' || npcKey === 'nombre') {
          value = context.npc?.card?.data?.name || context.npc?.card?.name || '';
        } else if (npcKey === 'description' || npcKey === 'descripcion') {
          value = context.npc?.card?.data?.description || context.npc?.card?.description || '';
        } else if (npcKey === 'personality' || npcKey === 'personalidad') {
          value = context.npc?.card?.data?.personality || '';
        } else if (npcKey === 'scenario') {
          value = context.npc?.card?.data?.scenario || '';
        } else if (npcKey === 'system_prompt') {
          value = context.npc?.card?.data?.system_prompt || context.npc?.card?.system_prompt || '';
        } else if (npcKey === 'chat_examples' || npcKey === 'mes_example') {
          value = context.npc?.card?.data?.mes_example || context.npc?.card?.mes_example || '';
        } else if (npcKey === 'post_history_instructions') {
          value = context.npc?.card?.data?.post_history_instructions || context.npc?.card?.post_history_instructions || '';
        }

        // Importante: Reemplazar variables recursivas dentro del valor del NPC
        // Esto permite que {{npc.post_history_instructions}} contenga {{jugador.nombre}}, etc.
        if (value && value.includes('{{')) {
          return replaceSinglePass(value);
        }

        return value;
      }

      // NPC keys (sin prefijo)
      if (key === 'npcid' || key === 'npc_name' || key === 'npc.name' || key === 'npc') {
        return context.npc?.card?.data?.name || context.npc?.card?.name || '';
      }
      if (key === 'npc_description' || key === 'npc.description') {
        return context.npc?.card?.data?.description || context.npc?.card?.description || '';
      }
      if (key === 'npc_personality' || key === 'npc.personality') {
        return context.npc?.card?.data?.personality || '';
      }

      // Historial del NPC (session history)
      if (key === 'npc_historial' || key === 'npc.historial') {
        if (context.session && context.session.messages && context.session.messages.length > 0) {
          return context.session.messages.map((msg) => {
            const role = msg.role === 'user' ? 'Usuario' : 'NPC';
            return `${role}: ${msg.content}`;
          }).join('\n');
        }
        return ''; // ✅ Dejar vacío si no hay historial
      }

      // Player keys (nombre, playername, player_name)
      if (key === 'playername' || key === 'player_name' || key === 'nombre') {
        return context.jugador?.nombre || '';
      }
      if (key === 'player_race' || key === 'player_raza' || key === 'raza') {
        return context.jugador?.raza || '';
      }
      if (key === 'player_level' || key === 'player_nivel' || key === 'nivel') {
        return context.jugador?.nivel || '';
      }
      if (key === 'player_health' || key === 'player_salud' || key === 'salud_actual' || key === 'salud') {
        return context.jugador?.salud_actual || '';
      }
      if (key === 'player_reputation' || key === 'player_reputacion' || key === 'reputacion' || key === 'reputación') {
        return context.jugador?.reputacion || '';
      }
      if (key === 'player_time' || key === 'player_hora' || key === 'hora') {
        return context.jugador?.hora || '';
      }
      if (key === 'player_weather' || key === 'player_clima' || key === 'clima') {
        return context.jugador?.clima || '';
      }
      if (key === 'almakos') {
        return context.jugador?.almakos || '';
      }
      if (key === 'deuda') {
        return context.jugador?.deuda || '';
      }
      if (key === 'piedras_del_alma' || key === 'piedras') {
        return context.jugador?.piedras_del_alma || '';
      }

      // Jugador object keys (jugador.nombre, jugador.raza, etc.)
      if (key.startsWith('jugador.')) {
        const jugadorKey = key.replace('jugador.', '');
        if (jugadorKey === 'nombre') return context.jugador?.nombre || '';
        if (jugadorKey === 'raza') return context.jugador?.raza || '';
        if (jugadorKey === 'nivel') return context.jugador?.nivel || '';
        if (jugadorKey === 'salud_actual' || jugadorKey === 'salud') return context.jugador?.salud_actual || '';
        if (jugadorKey === 'reputacion' || jugadorKey === 'reputación') return context.jugador?.reputacion || '';
        if (jugadorKey === 'hora') return context.jugador?.hora || '';
        if (jugadorKey === 'clima') return context.jugador?.clima || '';
        if (jugadorKey === 'almakos') return context.jugador?.almakos || '';
        if (jugadorKey === 'deuda') return context.jugador?.deuda || '';
        if (jugadorKey === 'piedras_del_alma' || jugadorKey === 'piedras') return context.jugador?.piedras_del_alma || '';
        if (jugadorKey === 'mensaje') return context.mensaje || ''; // Mensaje del jugador actual
      }

      // Location keys
      if (key === 'world_name' || key === 'mundo_nombre' || key === 'mundo') {
        return context.world?.name || '';
      }
      if (key === 'pueblo_name' || key === 'pueblo') {
        return context.pueblo?.name || '';
      }
      if (key === 'edificio_name' || key === 'edificio') {
        return context.edificio?.name || '';
      }

      // Edificio object keys (edificio.name, edificio.lore, etc.)
      if (key.startsWith('edificio.')) {
        const edificioKey = key.replace('edificio.', '');
        if (edificioKey === 'name' || edificioKey === 'nombre') return context.edificio?.name || '';
        if (edificioKey === 'descripcion') return context.edificio?.lore || ''; // lore es un string directo en edificios
        if (edificioKey === 'lore') return context.edificio?.lore || '';
        if (edificioKey === 'eventos' || edificioKey === 'eventos_recientes') {
          if (context.edificio?.eventos_recientes && context.edificio.eventos_recientes.length > 0) {
            return context.edificio.eventos_recientes.map(e => `- ${e}`).join('\n');
          }
          return ''; // ✅ Dejar vacío si no hay eventos
        }
        if (edificioKey === 'type') return context.edificio?.type || '';
        if (edificioKey === 'poislist' || edificioKey === 'puntos_de_interes_list') {
          if (context.edificio?.puntosDeInteres && context.edificio.puntosDeInteres.length > 0) {
            return context.edificio.puntosDeInteres.map((poi) => {
              const nombre = poi.name || 'Sin nombre';
              const descripcion = poi.descripcion || '';
              const coords = poi.coordenadas || { x: 0, y: 0, z: 0 };
              return `- ${nombre} (${descripcion}) {"coordenadas": {"x": ${coords.x},"y": ${coords.y},"z": ${coords.z}}}`;
            }).join('\n');
          }
          return ''; // ✅ Dejar vacío si no hay puntos de interés
        }
      }

      // Pueblo object keys (pueblo.name, pueblo.type, etc.)
      if (key.startsWith('pueblo.')) {
        const puebloKey = key.replace('pueblo.', '');
        if (puebloKey === 'name' || puebloKey === 'nombre') return context.pueblo?.name || '';
        if (puebloKey === 'tipo') return context.pueblo?.type || '';
        if (puebloKey === 'descripcion') return context.pueblo?.description || ''; // Descripción general
        if (puebloKey === 'estado') return context.pueblo?.lore?.estado_pueblo || '';
        if (puebloKey === 'rumores') {
          if (context.pueblo?.lore?.rumores && context.pueblo.lore.rumores.length > 0) {
            return context.pueblo.lore.rumores.map(r => `- ${r}`).join('\n');
          }
          return ''; // ✅ Dejar vacío si no hay rumores
        }
      }

      // Mundo object keys (mundo.name, mundo.lore, etc.)
      if (key.startsWith('mundo.')) {
        const mundoKey = key.replace('mundo.', '');
        if (mundoKey === 'name' || mundoKey === 'nombre') return context.world?.name || '';
        if (mundoKey === 'estado' || mundoKey === 'estado_mundo') return context.world?.lore?.estado_mundo || '';
        if (mundoKey === 'rumores') {
          if (context.world?.lore?.rumors && context.world.lore.rumors.length > 0) {
            return context.world.lore.rumors.map(r => `- ${r}`).join('\n');
          }
          return ''; // ✅ Dejar vacío si no hay rumores
        }
      }

      // Variable especial para el último resumen
      if (key === 'lastSummary' || key === 'ultimo_resumen') {
        return context.lastSummary || ''; // ✅ Dejar vacío si no hay resumen
      }

      // Variables de sesión (session.playerId, etc.)
      if (key === 'session.playerId' || key === 'session_player_id' || key === 'player_id' || key === 'playerId') {
        // session.playerId se mapea a context.session?.playerId o al nombre del jugador
        return (context as any).session?.playerId || context.jugador?.nombre || '';
      }

      // Variables para el mensaje del usuario y template
      if (key === 'userMessage' || key === 'user_message') {
        return context.userMessage || context.mensaje || '';
      }
      if (key === 'chatHistory' || key === 'chat_history') {
        // ✅ Construir chat history a partir de session.messages
        if (context.session && context.session.messages && context.session.messages.length > 0) {
          return context.session.messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        }
        return ''; // ✅ Dejar vacío si no hay historial
      }
      if (key === 'templateUser' || key === 'template_user') {
        return context.templateUser || '';
      }

      // Si la key no existe, retorna el match original
      return match;
    });
  };

  // Procesamiento recursivo: hacer múltiples pasadas hasta que no haya más cambios
  let result = text;
  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    const previousResult = result;
    result = replaceSinglePass(result);

    // Si no hubo cambios en esta iteración, terminamos
    if (result === previousResult) {
      break;
    }

    iterations++;
  }

  return result;
}

/**
 * Reemplaza variables en el formato {{variable}} con sus valores reales del contexto
 * utilizando el cache inteligente para mejorar el rendimiento
 * 
 * Esta función es equivalente a replaceVariables() pero con cache integrado
 * 
 * @param text - Texto con variables a reemplazar
 * @param context - Contexto con los valores de las variables
 * @param templateId - ID opcional de la plantilla para el cache
 * @param useCache - ¿Usar cache? (default: true)
 * @returns Texto con variables reemplazadas
 */
export function replaceVariablesWithCache(
  text: string,
  context: VariableContext,
  templateId?: string,
  useCache: boolean = true
): string {
  if (!text) return '';

  // Si no hay templateId o no se usa cache, usar la función estándar
  if (!templateId || !useCache) {
    return replaceVariables(text, context);
  }

  // Intentar obtener del cache
  const cached = templateCache.get(templateId, context);
  if (cached !== null) {
    console.log('[replaceVariablesWithCache] Cache HIT for template:', templateId);
    return cached;
  }

  // No está en cache, procesar normalmente
  console.log('[replaceVariablesWithCache] Cache MISS for template:', templateId);
  const result = replaceVariables(text, context);

  // Guardar en cache
  templateCache.set(templateId, context, result);

  return result;
}
