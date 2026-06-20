import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { templateCache } from './templateCache';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Tipos para el contexto de reemplazo de variables
export interface VariableContext {
  npc?: {
    id?: string;
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
    id?: string;
    name: string;
    lore?: string;
  };
  pueblo?: {
    id?: string;
    name: string;
    type?: string;
    description?: string;
  };
  edificio?: {
    id?: string;
    name: string;
    type?: string;
    lore?: string;
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
    humor_delta?: string; // Delta de humor del NPC para esta interacción
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
  /**
   * Atributos del NPC: mapa { key -> valor formateado }.
   * Se resuelven como {{key}} en cualquier parte del texto.
   * Ej: attributes.fuerza = "5/10" => {{fuerza}} => "5/10"
   */
  attributes?: Record<string, string>;
  /**
   * Atributos completos del NPC (con type, valueNumber, valueText, etc.).
   * Usado por las plantillas condicionales para evaluar condiciones.
   */
  npcAttributes?: import('./types').NPCAttribute[];
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
      // ============================================
      // ATRIBUTOS DE NPC (prioridad máxima)
      // ============================================
      // Los atributos definidos explícitamente en el NPC tienen prioridad
      // sobre cualquier variable predefinida del sistema. Esto permite que
      // el usuario use keys como {{salud}}, {{fuerza}} etc. sin colisionar
      // con variables internas del jugador.
      // Nota: solo se aplica a keys simples (sin punto), ya que los atributos
      // no tienen namespace.
      if (!key.includes('.') && context.attributes && Object.prototype.hasOwnProperty.call(context.attributes, key)) {
        return context.attributes[key] ?? '';
      }

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
        } else if (npcKey === 'notes' || npcKey === 'creator_notes' || npcKey === 'notas_creador') {
          value = context.npc?.card?.data?.creator_notes || context.npc?.card?.creator_notes || '';
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
      if (key === 'npc_notes' || key === 'npc.notes' || key === 'notas_creador' || key === 'creator_notes') {
        return context.npc?.card?.data?.creator_notes || context.npc?.card?.creator_notes || '';
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
      if (key === 'humor_delta' || key === 'npc_humor_delta') {
        return context.jugador?.humor_delta || '';
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
        if (jugadorKey === 'humor_delta') return context.jugador?.humor_delta || '';
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
        if (edificioKey === 'id') return context.edificio?.id || '';
        if (edificioKey === 'descripcion') return context.edificio?.lore || '';
        if (edificioKey === 'lore' || edificioKey === 'estado') return context.edificio?.lore || '';
        if (edificioKey === 'type') return (context.edificio as any)?.type || ''; // No en schema, futuro use
        if (edificioKey === 'eventos') return ''; // No existe en schema → vacío (no dejar {{...}} literal)
        if (edificioKey === 'poislist' || edificioKey === 'puntos_de_interes_list' || edificioKey === 'puntos_de_interes') {
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
        // Cualquier otra subkey de edificio desconocida → vacío (evita leak de {{edificio.xxx}})
        return '';
      }

      // Pueblo object keys (pueblo.name, pueblo.type, etc.)
      if (key.startsWith('pueblo.')) {
        const puebloKey = key.replace('pueblo.', '');
        if (puebloKey === 'name' || puebloKey === 'nombre') return context.pueblo?.name || '';
        if (puebloKey === 'id') return context.pueblo?.id || '';
        if (puebloKey === 'tipo' || puebloKey === 'type') return context.pueblo?.type || '';
        if (puebloKey === 'descripcion' || puebloKey === 'description') return context.pueblo?.description || '';
        // Cualquier otra subkey de pueblo desconocida → vacío
        return '';
      }

      // Mundo object keys (mundo.name, mundo.lore, etc.)
      if (key.startsWith('mundo.')) {
        const mundoKey = key.replace('mundo.', '');
        if (mundoKey === 'name' || mundoKey === 'nombre') return context.world?.name || '';
        if (mundoKey === 'id') return context.world?.id || '';
        if (mundoKey === 'estado' || mundoKey === 'estado_mundo') return context.world?.lore || '';
        if (mundoKey === 'lore') return context.world?.lore || '';
        // Cualquier otra subkey de mundo desconocida → vacío
        return '';
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

// ============================================
// UTILIDADES PARA FETCH SEGURO
// ============================================

/**
 * Resultado de un fetch seguro. Si todo fue bien, `ok=true` y `data` contiene
 * el JSON parseado. Si falló, `ok=false` y `error` contiene un mensaje
 * interpretable por el usuario.
 */
export interface SafeFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  /** Cuerpo de la respuesta como texto (para debugging) */
  rawBody?: string;
}

/**
 * Hace un fetch y parsea el JSON de forma segura.
 *
 * Problema que resuelve: cuando un endpoint de Next.js falla durante la
 * compilación o no existe, el servidor devuelve una página HTML (404/500)
 * en lugar de JSON. Hacer `res.json()` directamente explota con
 * "Unexpected token '<', '<!DOCTYPE...' is not valid JSON", que es un error
 * incomprensible para el usuario.
 *
 * Esta función:
 * 1. Hace el fetch.
 * 2. Si el status no es OK, intenta extraer un mensaje de error del cuerpo.
 * 3. Si el Content-Type no es JSON, devuelve un error claro.
 * 4. Solo entonces hace `.json()`.
 *
 * @example
 * const res = await safeFetch<MyData>('/api/foo', { method: 'POST', body: ... });
 * if (res.ok) {
 *   console.log(res.data);
 * } else {
 *   toast({ title: 'Error', description: res.error });
 * }
 */
export async function safeFetch<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<SafeFetchResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error:
        e instanceof Error
          ? `No se pudo conectar con el servidor: ${e.message}`
          : 'No se pudo conectar con el servidor',
    };
  }

  // Leer el cuerpo como texto una sola vez
  const rawBody = await res.text().catch(() => '');

  // Si el status no es OK, intentar extraer un mensaje útil
  if (!res.ok) {
    let errorMessage: string;
    // ¿Es JSON? Intentar extraer { error: "..." } o { message: "..." }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json') && rawBody) {
      try {
        const parsed = JSON.parse(rawBody);
        errorMessage =
          parsed.error ||
          parsed.message ||
          parsed.details ||
          `Error ${res.status} ${res.statusText}`;
      } catch {
        errorMessage = `Error ${res.status} ${res.statusText}`;
      }
    } else if (rawBody && rawBody.length < 500) {
      // Texto corto, probablemente un mensaje de error
      errorMessage = `Error ${res.status}: ${rawBody.trim()}`;
    } else {
      errorMessage = `Error ${res.status} ${res.statusText}`;
    }
    return { ok: false, status: res.status, error: errorMessage, rawBody };
  }

  // El status es OK, pero ¿es JSON?
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // El servidor devolvió HTML (ej: página de error de Next.js dev server)
    return {
      ok: false,
      status: res.status,
      error:
        'El servidor devolvió una respuesta no JSON. Esto suele indicar que el endpoint no existe o que el servidor de desarrollo está caído. Recarga la página e inténtalo de nuevo.',
      rawBody: rawBody.substring(0, 200),
    };
  }

  // Parsear JSON
  try {
    const data = JSON.parse(rawBody) as T;
    return { ok: true, status: res.status, data, rawBody };
  } catch (e) {
    return {
      ok: false,
      status: res.status,
      error: `La respuesta del servidor no es JSON válido: ${e instanceof Error ? e.message : 'parse error'}`,
      rawBody: rawBody.substring(0, 200),
    };
  }
}
