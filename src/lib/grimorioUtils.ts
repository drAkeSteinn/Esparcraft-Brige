/**
 * UTILIDADES DEL GRIMORIO
 * 
 * Funciones para resolver variables del Grimorio, validar plantillas
 * y gestionar el sistema de variables primarias vs plantillas
 */

import { GrimorioCard, GrimorioCardType, ValidateGrimorioCardResult, Condition, ConditionalBranch, ConditionalConfig, NPCAttribute } from './types';
import { VariableContext, replaceVariables } from './utils';
import { getVariableDefinition } from './VARIABLE_GLOSSARY';
import { templateCache } from './templateCache';
import { grimorioStats } from './grimorioStats';

/**
 * Reexportar replaceVariables para compatibilidad
 */
export { replaceVariables };

/**
 * Tipos de variables en el sistema de resolución
 */
export type VariableResolutionType = 'primaria' | 'plantilla' | 'desconocida';

/**
 * Resultado de la resolución de una variable
 */
export interface VariableResolutionResult {
  value: string;
  type: VariableResolutionType;
  fromCache: boolean;
  errors: string[];
}

/**
 * Patrones para identificar variables primarias
 */
const PRIMARY_VARIABLE_PATTERNS = [
  // Variables de jugador
  /^jugador\./,
  // Variables de NPC
  /^npc\./,
  // Variables de mundo
  /^mundo\./,
  // Variables de pueblo
  /^pueblo\./,
  // Variables de edificio
  /^edificio\./,
  // Variables de sesión
  /^session\./,
  // Variables abreviadas comunes
  /^(nombre|raza|nivel|salud|reputacion|almakos|deuda|piedras|hora|clima)$/,
  // Aliases específicos
  /^(playername|npcid|npc_name|npc_description|npc_notes|player_race|player_raza|player_level|player_nivel|player_health|player_salud|player_reputation|player_reputacion|player_time|player_hora|player_weather|player_clima)$/,
  // Variables simples (sin punto) - variables abreviadas del sistema
  /^(npc|mundo|pueblo|edificio|session|playername|mensaje)$/,
  // Variables de template (en minúsculas porque identifyVariableType normaliza a minúsculas)
  /^(usermessage|user_message|lastsummary|ultimo_resumen|chathistory|chat_history|char|templateuser|template_user|mensaje)$/,
];

/**
 * Determina el tipo de una variable del Grimorio basado en su key
 */
export function determineTypeFromKey(key: string): GrimorioCardType {
  const normalizedKey = key.trim().toLowerCase();

  for (const pattern of PRIMARY_VARIABLE_PATTERNS) {
    if (pattern.test(normalizedKey)) {
      return 'variable';
    }
  }

  return 'plantilla';
}

/**
 * Identifica el tipo de variable para resolución
 * @param variableName - Nombre de la variable (sin llaves {{}})
 * @returns Tipo de variable: 'primaria', 'plantilla' o 'desconocida'
 */
export function identifyVariableType(variableName: string): VariableResolutionType {
  const normalizedKey = variableName.trim().toLowerCase();

  // Verificar si es una variable primaria conocida
  for (const pattern of PRIMARY_VARIABLE_PATTERNS) {
    if (pattern.test(normalizedKey)) {
      return 'primaria';
    }
  }

  // Verificar si está en el glosario como variable primaria
  const def = getVariableDefinition(normalizedKey);
  if (def && def.category !== 'custom') {
    return 'primaria';
  }

  // Si no coincide, asumir que es una plantilla del Grimorio
  return 'plantilla';
}

/**
 * Extrae todas las variables tipo plantilla de un texto
 * @param text - Texto a analizar
 * @returns Array de keys de plantillas encontradas (sin llaves {{}})
 */
export function extractTemplateVariables(text: string): string[] {
  const matches = text.match(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g) || [];
  const extracted = matches.map(match => {
    return match.replace(/\{\{\s*|\s*\}\}/g, '');
  });

  // Filtrar solo las que NO son variables primarias
  return extracted.filter(key => identifyVariableType(key) === 'plantilla');
}

/**
 * Extrae todas las variables primarias de un texto
 * @param text - Texto a analizar
 * @returns Array de keys de variables primarias encontradas (sin llaves {{}})
 */
export function extractPrimaryVariables(text: string): string[] {
  const matches = text.match(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g) || [];
  const extracted = matches.map(match => {
    return match.replace(/\{\{\s*|\s*\}\}/g, '');
  });

  // Filtrar solo las que son variables primarias
  return extracted.filter(key => identifyVariableType(key) === 'primaria');
}

/**
 * Valida la estructura de una plantilla
 * @param plantilla - Texto de la plantilla a validar
 * @param tipo - Tipo de card ('variable' o 'plantilla')
 * @returns Resultado de la validación
 *
 * Nota: Las plantillas anidadas ({{otra_plantilla}} dentro de una plantilla)
 * SÍ están permitidas. Se reportan en `nestedTemplates` como información para
 * que la UI pueda avisar al usuario, pero NO generan error. La resolución
 * multi-pasada en resolveAllVariables se encarga de expandirlas, y la
 * protección anti-ciclo la da maxPasses=10 + detección de auto-referencia.
 */
export function validateTemplateStructure(plantilla: string, tipo: GrimorioCardType): Omit<ValidateGrimorioCardResult, 'tipo'> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Extraer variables
  const primaryVariables = extractPrimaryVariables(plantilla);
  const nestedTemplates = extractTemplateVariables(plantilla);

  // ✅ Detección de auto-referencia directa (ciclo inmediato) → sí es error
  if (tipo === 'plantilla' && nestedTemplates.length > 0) {
    // Verificar auto-referencia: la plantilla se referencia a sí misma.
    // No podemos saber el key de la card aquí (no se pasa), así que solo
    // emitimos un warning informativo. La validación de auto-referencia real
    // se hace en resolveGrimorioVariable donde sí se conoce el variableName.
    warnings.push(
      `Esta plantilla contiene plantillas anidadas: ${nestedTemplates.join(', ')}. Se resolverán en cascada (máx 10 niveles).`
    );
  }

  // Validar que las variables primarias existan en el glosario
  const missingVariables: string[] = [];
  for (const variable of primaryVariables) {
    const def = getVariableDefinition(variable);
    if (!def) {
      missingVariables.push(variable);
    }
  }

  if (missingVariables.length > 0) {
    warnings.push(
      `Variables no encontradas en el glosario: ${missingVariables.join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    variablesUsed: primaryVariables,
    nestedTemplates,
    missingVariables,
    warnings,
    preview: undefined
  };
}

/**
 * Resuelve una variable del Grimorio
 * 
 * Flujo:
 * 1. Identificar tipo de variable (primaria vs plantilla)
 * 2. Si es primaria: extraer del contexto directo
 * 3. Si es plantilla: buscar en Grimorio, expandir y reemplazar
 * 4. Validar que no haya plantillas anidadas (Regla 3)
 * 5. Retornar vacío si hay errores (Reglas 2 y 3)
 * 
 * @param variableName - Nombre de la variable (sin llaves {{}})
 * @param context - Contexto con los datos
 * @param grimorioCards - Cards del Grimorio disponibles
 * @param options - Opciones adicionales
 * @returns Resultado de la resolución
 */
export function resolveGrimorioVariable(
  variableName: string,
  context: VariableContext,
  grimorioCards: GrimorioCard[],
  options: {
    useCache?: boolean;
    verbose?: boolean;
  } = {}
): VariableResolutionResult {
  const errors: string[] = [];
  const { useCache = true, verbose = false } = options;
  const startTime = Date.now();

  if (verbose) {
    console.log(`[resolveGrimorioVariable] Resolviendo: {{${variableName}}}`);
  }

  // Paso 1: Identificar tipo de variable
  const variableType = identifyVariableType(variableName);

  if (verbose) {
    console.log(`[resolveGrimorioVariable] Tipo identificado: ${variableType}`);
  }

  // Paso 2: Si es variable primaria
  if (variableType === 'primaria') {
    try {
      // Usar replaceVariables para extraer del contexto
      const textToReplace = `{{${variableName}}}`;
      const resolved = replaceVariables(textToReplace, context);

      // Si no se reemplazó, retornar string vacío
      if (resolved === textToReplace) {
        if (verbose) {
          console.log(`[resolveGrimorioVariable] Variable primaria no resuelta, retornando vacío`);
        }
        const executionTime = Date.now() - startTime;
        grimorioStats.logResolution(variableName, variableType, executionTime, false, true);
        return {
          value: '',
          type: 'primaria',
          fromCache: false,
          errors: []
        };
      }

      if (verbose) {
        console.log(`[resolveGrimorioVariable] Variable primaria resuelta: "${resolved}"`);
      }
      const executionTime = Date.now() - startTime;
      grimorioStats.logResolution(variableName, variableType, executionTime, false, true);
      return {
        value: resolved,
        type: 'primaria',
        fromCache: false,
        errors: []
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      errors.push(`Error al resolver variable primaria {{${variableName}}}: ${errorMsg}`);

      if (verbose) {
        console.error(`[resolveGrimorioVariable] Error:`, errorMsg);
      }

      // Retornar vacío según reglas
      const executionTime = Date.now() - startTime;
      grimorioStats.logResolution(variableName, variableType, executionTime, false, false, errorMsg);
      return {
        value: '',
        type: 'primaria',
        fromCache: false,
        errors
      };
    }
  }

  // Paso 3: Si es tipo plantilla
  if (variableType === 'plantilla') {
    // Buscar la plantilla en el Grimorio
    const templateCard = grimorioCards.find(card => card.key === variableName);

    // Regla 2: Plantilla no existe → Retornar vacío
    if (!templateCard) {
      if (verbose) {
        console.log(`[resolveGrimorioVariable] Plantilla no encontrada: ${variableName}, retornando vacío`);
      }
      const executionTime = Date.now() - startTime;
      grimorioStats.logResolution(variableName, variableType, executionTime, false, true);
      return {
        value: '',
        type: 'plantilla',
        fromCache: false,
        errors: []
      };
    }

    // Verificar que sea tipo 'plantilla'
    if (templateCard.tipo !== 'plantilla') {
      if (verbose) {
        console.log(`[resolveGrimorioVariable] Card no es tipo plantilla: ${variableName}, retornando vacío`);
      }
      const executionTime = Date.now() - startTime;
      grimorioStats.logResolution(variableName, variableType, executionTime, false, true);
      return {
        value: '',
        type: 'plantilla',
        fromCache: false,
        errors: []
      };
    }

    // ✅ PLANTILLA CONDICIONAL: si templateType='condicional', evaluar branches
    // contra los atributos del NPC del contexto y devolver el template que coincida.
    if (templateCard.templateType === 'condicional' && templateCard.conditionalConfig) {
      try {
        if (verbose) {
          console.log(`[resolveGrimorioVariable] Plantilla condicional: ${variableName} (${templateCard.conditionalConfig.branches.length} branch(es))`);
        }
        const condResult = resolveConditionalTemplate(
          templateCard.conditionalConfig,
          context.npcAttributes,
          context,
          grimorioCards
        );
        if (condResult.errors.length > 0 && verbose) {
          console.warn(`[resolveGrimorioVariable] Errores en plantilla condicional:`, condResult.errors);
        }
        if (verbose) {
          console.log(`[resolveGrimorioVariable] Plantilla condicional resuelta (branch: ${condResult.matchedBranchId ?? 'default'}):`, condResult.value.substring(0, 100) + '...');
        }
        const executionTime = Date.now() - startTime;
        grimorioStats.logResolution(variableName, variableType, executionTime, false, true);
        return {
          value: condResult.value,
          type: 'plantilla',
          fromCache: false,
          errors: condResult.errors
        };
      } catch (error) {
        const errorMsg = `Error al evaluar plantilla condicional {{${variableName}}}: ${(error as Error).message}`;
        const executionTime = Date.now() - startTime;
        grimorioStats.logResolution(variableName, variableType, executionTime, false, false, errorMsg);
        return { value: '', type: 'plantilla', fromCache: false, errors: [errorMsg] };
      }
    }

    // ✅ DETECCIÓN DE AUTO-REFERENCIA DIRECTA (ciclo inmediato):
    // Si templateA contiene {{templateA}} dentro de sí misma, es un ciclo infinito
    // que el maxPasses del loop externo no cortaría limpiamente. Lo cortamos aquí.
    // Nota: ciclos indirectos (A→B→A) se cortan por el maxPasses=10 de resolveAllVariables.
    const nestedTemplates = extractTemplateVariables(templateCard.plantilla);
    if (nestedTemplates.includes(variableName)) {
      const errorMsg = `Ciclo detectado: la plantilla {{${variableName}}} se referencia a sí misma`;
      if (verbose) {
        console.warn(`[resolveGrimorioVariable] ${errorMsg}`);
      }
      const executionTime = Date.now() - startTime;
      grimorioStats.logResolution(variableName, variableType, executionTime, false, false, errorMsg);
      return {
        value: '',
        type: 'plantilla',
        fromCache: false,
        errors: [errorMsg]
      };
    }

    // ✅ PLANTILLAS ANIDADAS PERMITIDAS:
    // Si la plantilla contiene {{otraPlantilla}}, devolvemos el cuerpo expandido con
    // las variables PRIMARIAS resueltas, pero dejando las {{otraPlantilla}} intactas.
    // La siguiente pasada del loop resolveAllVariables se encargará de resolverlas.
    // La protección anti-ciclo la da el maxPasses=10 del loop externo.
    try {
      if (verbose) {
        console.log(`[resolveGrimorioVariable] Expandiendo plantilla: ${variableName}${nestedTemplates.length > 0 ? ` (con ${nestedTemplates.length} plantilla(s) anidada(s): ${nestedTemplates.join(', ')})` : ''}`);
      }

      const expanded = templateCard.plantilla;
      // replaceVariables solo resuelve variables primarias; deja {{plantillaB}} intactas
      const resolved = replaceVariables(expanded, context);

      if (verbose) {
        console.log(`[resolveGrimorioVariable] Plantilla resuelta:`, resolved.substring(0, 100) + '...');
      }
      const executionTime = Date.now() - startTime;
      grimorioStats.logResolution(variableName, variableType, executionTime, false, true);
      return {
        value: resolved,
        type: 'plantilla',
        fromCache: false,
        errors: []
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      errors.push(`Error al expandir plantilla {{${variableName}}}: ${errorMsg}`);

      if (verbose) {
        console.error(`[resolveGrimorioVariable] Error:`, errorMsg);
      }

      // Retornar vacío según reglas
      const executionTime = Date.now() - startTime;
      grimorioStats.logResolution(variableName, variableType, executionTime, false, false, errorMsg);
      return {
        value: '',
        type: 'plantilla',
        fromCache: false,
        errors
      };
    }
  }

  // Paso 5: Variable desconocida → Retornar vacío
  if (verbose) {
    console.log(`[resolveGrimorioVariable] Variable desconocida: ${variableName}, retornando vacío`);
  }
  const executionTime = Date.now() - startTime;
  grimorioStats.logResolution(variableName, 'desconocida', executionTime, false, true);
  return {
    value: '',
    type: 'desconocida',
    fromCache: false,
    errors: []
  };
}

/**
 * Resuelve todas las variables (primarias y plantillas) en un texto
 * @param text - Texto con variables a resolver
 * @param context - Contexto con los datos
 * @param grimorioCards - Cards del Grimorio disponibles
 * @param options - Opciones adicionales
 * @returns Texto con todas las variables resueltas
 */
export function resolveAllVariables(
  text: string,
  context: VariableContext,
  grimorioCards: GrimorioCard[],
  options: {
    verbose?: boolean;
  } = {}
): { result: string; stats: { resolved: number; emptyReturned: number; errors: number } } {
  const { verbose = false } = options;
  const stats = { resolved: 0, emptyReturned: 0, errors: 0 };

  // Extraer todas las variables del texto
  const variablePattern = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

  // Hacer múltiples pasadas hasta que no haya más variables
  let result = text;
  let maxPasses = 10; // Evitar loops infinitos
  let currentPass = 0;

  while (currentPass < maxPasses) {
    currentPass++;

    // Encontrar todas las variables en el resultado actual
    const matches = [...result.matchAll(variablePattern)];

    if (matches.length === 0) {
      // No hay más variables que resolver
      break;
    }

    // Procesar cada variable encontrada
    let hasChanges = false;
    for (const match of matches) {
      const [fullMatch, variableName] = match;

      // Resolver la variable
      const resolution = resolveGrimorioVariable(variableName, context, grimorioCards, { verbose });

      if (resolution.errors.length > 0) {
        stats.errors += resolution.errors.length;
      }

      if (resolution.value === '') {
        stats.emptyReturned++;
      } else {
        stats.resolved++;
        hasChanges = true;
      }

      // Reemplazar en el resultado
      result = result.replace(fullMatch, resolution.value);
    }

    // Si no hubo cambios en esta pasada, salir para evitar loops infinitos
    if (!hasChanges) {
      break;
    }
  }

  // ✅ DETECCIÓN DE CICLO / PROFUNDIDAD MÁXIMA:
  // Si tras 10 pasadas aún quedan {{...}} sin resolver, es muy probable que haya
  // un ciclo indirecto (A→B→A) o un anidamiento demasiado profundo. Lo reportamos.
  const remainingMatches = [...result.matchAll(variablePattern)];
  if (currentPass >= maxPasses && remainingMatches.length > 0) {
    const unresolved = remainingMatches.map(m => m[0]).slice(0, 5).join(', ');
    const warnMsg = `Posible ciclo o anidamiento demasiado profundo: tras ${maxPasses} pasadas quedan variables sin resolver: ${unresolved}${remainingMatches.length > 5 ? ` (y ${remainingMatches.length - 5} más)` : ''}`;
    stats.errors += 1;
    if (verbose) {
      console.warn(`[resolveAllVariables] ${warnMsg}`);
    }
  }

  return { result, stats };
}

/**
 * Resuelve todas las variables (primarias y plantillas) en un texto con soporte de cache
 * @param text - Texto con variables a resolver
 * @param context - Contexto con los datos
 * @param grimorioCards - Cards del Grimorio disponibles
 * @param templateId - ID de la plantilla para el cache (opcional)
 * @param options - Opciones adicionales
 * @returns Texto con todas las variables resueltas
 */
export function resolveAllVariablesWithCache(
  text: string,
  context: VariableContext,
  grimorioCards: GrimorioCard[],
  templateId?: string,
  options: {
    verbose?: boolean;
    useCache?: boolean;
  } = {}
): { result: string; stats: { resolved: number; emptyReturned: number; errors: number; fromCache: boolean } } {
  const { verbose = false, useCache = true } = options;
  const stats = { resolved: 0, emptyReturned: 0, errors: 0, fromCache: false };

  // Si hay templateId y se debe usar cache, intentar obtener del cache
  if (templateId && useCache) {
    const cached = templateCache.get(templateId, context);
    if (cached !== null) {
      if (verbose) {
        console.log(`[resolveAllVariablesWithCache] Cache HIT for template: ${templateId}`);
      }
      stats.fromCache = true;
      return { result: cached, stats };
    }

    if (verbose) {
      console.log(`[resolveAllVariablesWithCache] Cache MISS for template: ${templateId}`);
    }
  }

  // No está en cache o no se usa cache, procesar normalmente
  const resolution = resolveAllVariables(text, context, grimorioCards, { verbose });

  // Guardar en cache si hay templateId
  if (templateId && useCache) {
    templateCache.set(templateId, context, resolution.result);
  }

  return { ...resolution, stats: { ...resolution.stats, fromCache: false } };
}

/**
 * Genera un preview de una plantilla con contexto de prueba
 * @param plantilla - Texto de la plantilla
 * @param tipo - Tipo de card
 * @returns Preview con contexto de prueba
 */
export function generateTemplatePreview(plantilla: string, tipo: GrimorioCardType): string {
  const testContext: VariableContext = {
    jugador: {
      nombre: 'Aldric',
      raza: 'Humano',
      nivel: '15',
      salud_actual: '100%',
      reputacion: 'Respetado',
      almakos: '2500',
      deuda: '0',
      piedras_del_alma: '3',
      hora: '14:30',
      clima: 'Lluvia ligera'
    },
    npc: {
      card: {
        data: {
          name: 'Theron',
          description: 'Un herrero anciano',
          personality: 'Grumpy pero servicial'
        }
      }
    },
    world: {
      name: 'Esparcraft',
      lore: {
        estado_mundo: 'Paz y prosperidad',
        rumors: []
      }
    },
    pueblo: {
      name: 'Valle Dorado',
      type: 'Village',
      description: 'Un pueblo tranquilo'
    },
    edificio: {
      name: 'Herrería',
      lore: 'Una herrería antigua'
    },
    mensaje: 'Hola, ¿cómo estás?',
    userMessage: 'Hola, ¿cómo estás?',
    lastSummary: 'El jugador llegó al pueblo y visitó la herrería.',
    templateUser: '',
    char: 'Theron'
  };

  const resolution = resolveAllVariables(plantilla, testContext, [], { verbose: false });
  return resolution.result;
}

/**
 * Valida si un key es válido para una variable primaria
 * @param key - Key a validar
 * @returns true si es formato válido para variable primaria
 */
export function isValidPrimaryVariableKey(key: string): boolean {
  const normalizedKey = key.trim().toLowerCase();

  for (const pattern of PRIMARY_VARIABLE_PATTERNS) {
    if (pattern.test(normalizedKey)) {
      return true;
    }
  }

  return false;
}

/**
 * Valida si un key es válido para una plantilla
 * @param key - Key a validar
 * @returns true si es formato válido para plantilla
 */
export function isValidTemplateKey(key: string): boolean {
  // Las plantillas pueden tener cualquier formato alfanumérico con guiones y guiones bajos
  const pattern = /^[a-zA-Z0-9_-]+$/;
  return pattern.test(key.trim());
}

// ============================================
// PLANTILLAS CONDICIONALES (basadas en atributos de NPC)
// ============================================

/**
 * Obtiene el valor de un atributo del NPC como string.
 * Si el atributo no existe, retorna null.
 * Para tipo 'list', devuelve el valor crudo (separado por comas) y type='list'.
 */
function getAttributeValue(attrs: NPCAttribute[] | undefined, key: string): { value: string; type: 'numeric' | 'text' | 'list'; items: string[] } | null {
  if (!attrs) return null;
  const attr = attrs.find(a => a.key === key);
  if (!attr) return null;
  if (attr.type === 'numeric') {
    if (attr.valueNumber == null) return null;
    return { value: String(attr.valueNumber), type: 'numeric', items: [] };
  }
  if (attr.type === 'list') {
    const raw = attr.valueText ?? '';
    const items = raw.split(',').map(s => s.trim()).filter(s => s.length > 0);
    return { value: raw, type: 'list', items };
  }
  // text
  return { value: attr.valueText ?? '', type: 'text', items: [] };
}

/**
 * Evalúa una condición individual contra los atributos de un NPC.
 * @returns true si la condición se cumple
 */
export function evaluateCondition(condition: Condition, attrs: NPCAttribute[] | undefined): boolean {
  const attrVal = getAttributeValue(attrs, condition.attributeKey);
  if (!attrVal) {
    // Si el atributo no existe, la condición no se cumple
    return false;
  }

  const op = condition.operator;
  const condValue = condition.value.trim();

  // ✅ Atributo tipo LIST: el valor del atributo es un array de strings.
  // Operadores naturales: in_list (es uno de), not_in_list (no es uno de),
  // contains (la lista contiene el substring), not_contains.
  if (attrVal.type === 'list') {
    const items = attrVal.items;
    switch (op) {
      case 'in_list':     return items.includes(condValue);   // "es uno de"
      case 'not_in_list': return !items.includes(condValue);  // "no es uno de"
      case 'eq':          return items.includes(condValue);   // alias de in_list
      case 'neq':         return !items.includes(condValue);  // alias de not_in_list
      case 'contains':     return items.some(i => i.includes(condValue));
      case 'not_contains': return !items.some(i => i.includes(condValue));
      case 'starts_with':  return items.some(i => i.startsWith(condValue));
      case 'ends_with':    return items.some(i => i.endsWith(condValue));
      // Operadores numéricos no aplican a listas
      default: return false;
    }
  }

  if (attrVal.type === 'numeric') {
    const attrNum = parseFloat(attrVal.value);
    const condNum = parseFloat(condValue);
    if (Number.isNaN(attrNum)) return false;

    switch (op) {
      case 'eq':  return attrNum === (Number.isNaN(condNum) ? 0 : condNum);
      case 'neq': return attrNum !== (Number.isNaN(condNum) ? 0 : condNum);
      case 'gt':  return !Number.isNaN(condNum) && attrNum > condNum;
      case 'lt':  return !Number.isNaN(condNum) && attrNum < condNum;
      case 'gte': return !Number.isNaN(condNum) && attrNum >= condNum;
      case 'lte': return !Number.isNaN(condNum) && attrNum <= condNum;
      // Operadores de texto aplicados a numéricos: comparación como string
      case 'contains':     return attrVal.value.includes(condValue);
      case 'not_contains': return !attrVal.value.includes(condValue);
      case 'starts_with':  return attrVal.value.startsWith(condValue);
      case 'ends_with':    return attrVal.value.endsWith(condValue);
      default: return false;
    }
  } else {
    // Atributo de texto
    const attrStr = attrVal.value;
    switch (op) {
      case 'eq':  return attrStr === condValue;
      case 'neq': return attrStr !== condValue;
      case 'contains':     return attrStr.includes(condValue);
      case 'not_contains': return !attrStr.includes(condValue);
      case 'starts_with':  return attrStr.startsWith(condValue);
      case 'ends_with':    return attrStr.endsWith(condValue);
      // Operadores numéricos aplicados a texto: intentamos parsear
      case 'gt': {
        const a = parseFloat(attrStr), b = parseFloat(condValue);
        return !Number.isNaN(a) && !Number.isNaN(b) && a > b;
      }
      case 'lt': {
        const a = parseFloat(attrStr), b = parseFloat(condValue);
        return !Number.isNaN(a) && !Number.isNaN(b) && a < b;
      }
      case 'gte': {
        const a = parseFloat(attrStr), b = parseFloat(condValue);
        return !Number.isNaN(a) && !Number.isNaN(b) && a >= b;
      }
      case 'lte': {
        const a = parseFloat(attrStr), b = parseFloat(condValue);
        return !Number.isNaN(a) && !Number.isNaN(b) && a <= b;
      }
      default: return false;
    }
  }
}

/**
 * Evalúa un branch condicional (conjunto de condiciones con AND/OR).
 * @returns true si el branch se cumple
 */
export function evaluateBranch(branch: ConditionalBranch, attrs: NPCAttribute[] | undefined): boolean {
  if (!branch.conditions || branch.conditions.length === 0) {
    // Sin condiciones → se cumple (equivale a "default" pero con prioridad sobre el defaultTemplate)
    return true;
  }
  if (branch.combinator === 'AND') {
    return branch.conditions.every(c => evaluateCondition(c, attrs));
  } else {
    return branch.conditions.some(c => evaluateCondition(c, attrs));
  }
}

/**
 * Resuelve una plantilla condicional evaluando los branches contra los atributos del NPC.
 * Devuelve el template del primer branch que se cumple, o el defaultTemplate si ninguno aplica.
 *
 * @param config - Configuración de la plantilla condicional
 * @param attrs - Atributos del NPC activo en el chat
 * @param context - Contexto de variables para resolver {{...}} dentro del template elegido
 * @param grimorioCards - Cards del grimorio (para resolver plantillas anidadas)
 * @returns Texto del template elegido con variables primarias resueltas
 */
export function resolveConditionalTemplate(
  config: ConditionalConfig,
  attrs: NPCAttribute[] | undefined,
  context: VariableContext,
  grimorioCards: GrimorioCard[]
): { value: string; matchedBranchId: string | null; errors: string[] } {
  const errors: string[] = [];

  // Validar config
  if (!config || !Array.isArray(config.branches)) {
    return { value: '', matchedBranchId: null, errors: ['Config de plantilla condicional inválido'] };
  }

  // Evaluar branches en orden
  for (const branch of config.branches) {
    try {
      if (evaluateBranch(branch, attrs)) {
        // Branch cumplido → resolver su template
        const resolved = replaceVariables(branch.template, context);
        return { value: resolved, matchedBranchId: branch.id, errors: [] };
      }
    } catch (e) {
      errors.push(`Error evaluando branch "${branch.name}": ${(e as Error).message}`);
    }
  }

  // Ningún branch cumplió → usar defaultTemplate
  const resolved = replaceVariables(config.defaultTemplate || '', context);
  return { value: resolved, matchedBranchId: null, errors };
}

