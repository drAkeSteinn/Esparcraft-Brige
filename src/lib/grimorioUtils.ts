/**
 * UTILIDADES DEL GRIMORIO
 * 
 * Funciones para resolver variables del Grimorio, validar plantillas
 * y gestionar el sistema de variables primarias vs plantillas
 */

import { GrimorioCard, GrimorioCardType, ValidateGrimorioCardResult } from './types';
import { VariableContext, replaceVariables } from './utils';
import { getVariableDefinition } from './VARIABLE_GLOSSARY';
import { templateCache } from './templateCache';
import { grimorioStats } from './grimorioStats';

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
 */
export function validateTemplateStructure(plantilla: string, tipo: GrimorioCardType): Omit<ValidateGrimorioCardResult, 'tipo'> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Extraer variables
  const primaryVariables = extractPrimaryVariables(plantilla);
  const nestedTemplates = extractTemplateVariables(plantilla);

  // Para tipo 'plantilla': NO debe tener plantillas anidadas
  if (tipo === 'plantilla' && nestedTemplates.length > 0) {
    errors.push(
      `Las plantillas no pueden contener otras plantillas. Se encontraron: ${nestedTemplates.join(', ')}`
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

    // Regla 3: Validar que no tenga plantillas anidadas (prevenir ciclos)
    const nestedTemplates = extractTemplateVariables(templateCard.plantilla);
    if (nestedTemplates.length > 0) {
      if (verbose) {
        console.log(`[resolveGrimorioVariable] Plantilla con anidamiento detectado: ${nestedTemplates.join(', ')}, retornando vacío`);
      }
      const errorMsg = `Prevenido ciclo: Plantilla {{${variableName}}} contiene otras plantillas: ${nestedTemplates.join(', ')}`;
      const executionTime = Date.now() - startTime;
      grimorioStats.logResolution(variableName, variableType, executionTime, false, false, errorMsg);
      return {
        value: '',
        type: 'plantilla',
        fromCache: false,
        errors: [
          errorMsg
        ]
      };
    }

    // Paso 4: Expandir plantilla y reemplazar variables primarias
    try {
      if (verbose) {
        console.log(`[resolveGrimorioVariable] Expandiendo plantilla: ${variableName}`);
      }

      const expanded = templateCard.plantilla;
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
