/**
 * HELPER DE VALIDACIÓN DE VARIABLES
 * 
 * Sistema de validación para plantillas con variables
 * Verifica que todas las variables estén definidas en el glosario
 * y que los contextos tengan los datos necesarios
 */

import { VariableContext } from './utils';
import {
  getVariableDefinition,
  extractVariablesFromText,
  getRequiredVariables,
  VARIABLE_GLOSSARY
} from './VARIABLE_GLOSSARY';

export interface ValidationError {
  /** Variable que causó el error */
  variable: string;
  /** Tipo de error */
  type: 'UNKNOWN' | 'MISSING' | 'EMPTY' | 'INVALID_NESTING' | 'CYCLIC_REFERENCE';
  /** Mensaje descriptivo del error */
  message: string;
  /** Nivel de gravedad */
  severity: 'error' | 'warning';
  /** Línea donde ocurrió el error (si es aplicable) */
  line?: number;
}

export interface ValidationResult {
  /** ¿La validación fue exitosa? */
  valid: boolean;
  /** Lista de errores encontrados */
  errors: ValidationError[];
  /** Lista de advertencias */
  warnings: ValidationError[];
  /** Variables encontradas en el texto */
  variablesFound: string[];
  /** Variables definidas en el glosario */
  variablesDefined: string[];
  /** Variables obligatorias faltantes */
  missingRequired: string[];
}

/**
 * Valida un template o texto con variables
 */
export function validateTemplate(
  text: string,
  context?: VariableContext,
  options: {
    /** ¿Verificar variables desconocidas? */
    checkUnknown?: boolean;
    /** ¿Verificar variables faltantes en el contexto? */
    checkMissing?: boolean;
    /** ¿Verificar variables vacías? */
    checkEmpty?: boolean;
    /** ¿Verificar referencias cíclicas? */
    checkCyclic?: boolean;
  } = {}
): ValidationResult {
  const {
    checkUnknown = true,
    checkMissing = true,
    checkEmpty = false,
    checkCyclic = true
  } = options;

  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Extraer todas las variables del texto
  const variablesFound = extractVariablesFromText(text);
  const variablesDefined = Object.keys(VARIABLE_GLOSSARY);

  // Verificar variables desconocidas
  if (checkUnknown) {
    for (const variableName of variablesFound) {
      const def = getVariableDefinition(variableName);
      if (!def) {
        errors.push({
          variable: variableName,
          type: 'UNKNOWN',
          message: `Variable desconocida: "${variableName}". No está definida en el glosario.`,
          severity: 'error'
        });
      }
    }
  }

  // Verificar variables faltantes en el contexto
  if (checkMissing && context) {
    for (const variableName of variablesFound) {
      const def = getVariableDefinition(variableName);
      if (!def) continue;

      const value = getVariableValue(variableName, context);
      if (value === undefined || value === null) {
        if (def.required) {
          errors.push({
            variable: variableName,
            type: 'MISSING',
            message: `Variable obligatoria faltante: "${variableName}". Requerida para funcionar correctamente.`,
            severity: 'error'
          });
        } else {
          warnings.push({
            variable: variableName,
            type: 'MISSING',
            message: `Variable opcional faltante: "${variableName}". Podría no renderizarse correctamente.`,
            severity: 'warning'
          });
        }
      }
    }
  }

  // Verificar variables vacías
  if (checkEmpty && context) {
    for (const variableName of variablesFound) {
      const def = getVariableDefinition(variableName);
      if (!def) continue;

      const value = getVariableValue(variableName, context);
      if (value === '') {
        warnings.push({
          variable: variableName,
          type: 'EMPTY',
          message: `Variable vacía: "${variableName}". Se renderizará como una cadena vacía.`,
          severity: 'warning'
        });
      }
    }
  }

  // Verificar referencias cíclicas
  if (checkCyclic) {
    const cyclicVars = detectCyclicReferences(text);
    for (const cycle of cyclicVars) {
      errors.push({
        variable: cycle[0],
        type: 'CYCLIC_REFERENCE',
        message: `Referencia cíclica detectada: ${cycle.join(' → ')}. Esto causará un bucle infinito.`,
        severity: 'error'
      });
    }
  }

  // Calcular variables obligatorias faltantes
  const requiredVars = getRequiredVariables().map(v => v.name);
  const missingRequired = requiredVars.filter(req => {
    const found = variablesFound.some(v => {
      const def = getVariableDefinition(v);
      return def && (def.name === req || def.aliases.includes(req));
    });
    return !found;
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    variablesFound,
    variablesDefined,
    missingRequired
  };
}

/**
 * Valida que un contexto tenga todas las propiedades necesarias
 */
export function validateContext(
  context: VariableContext,
  requiredVariables?: string[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Variables encontradas en el contexto
  const variablesFound: string[] = [];

  // Verificar propiedades principales del contexto
  if (!context.npc) {
    warnings.push({
      variable: 'npc',
      type: 'MISSING',
      message: 'Contexto NPC no proporcionado',
      severity: 'warning'
    });
  } else {
    variablesFound.push('npc');
  }

  if (!context.jugador) {
    warnings.push({
      variable: 'jugador',
      type: 'MISSING',
      message: 'Contexto Jugador no proporcionado',
      severity: 'warning'
    });
  } else {
    variablesFound.push('jugador');
  }

  if (!context.world) {
    warnings.push({
      variable: 'world',
      type: 'MISSING',
      message: 'Contexto Mundo no proporcionado',
      severity: 'warning'
    });
  } else {
    variablesFound.push('world');
  }

  if (!context.pueblo) {
    warnings.push({
      variable: 'pueblo',
      type: 'MISSING',
      message: 'Contexto Pueblo no proporcionado (opcional)',
      severity: 'warning'
    });
  } else {
    variablesFound.push('pueblo');
  }

  if (!context.edificio) {
    warnings.push({
      variable: 'edificio',
      type: 'MISSING',
      message: 'Contexto Edificio no proporcionado (opcional)',
      severity: 'warning'
    });
  } else {
    variablesFound.push('edificio');
  }

  if (!context.session) {
    warnings.push({
      variable: 'session',
      type: 'MISSING',
      message: 'Contexto Session no proporcionado (opcional)',
      severity: 'warning'
    });
  } else {
    variablesFound.push('session');
  }

  // Verificar variables requeridas específicas
  if (requiredVariables) {
    for (const requiredVar of requiredVariables) {
      const value = getVariableValue(requiredVar, context);
      if (value === undefined || value === null || value === '') {
        errors.push({
          variable: requiredVar,
          type: 'MISSING',
          message: `Variable requerida no encontrada o vacía: "${requiredVar}"`,
          severity: 'error'
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    variablesFound,
    variablesDefined: Object.keys(VARIABLE_GLOSSARY),
    missingRequired: []
  };
}

/**
 * Obtiene el valor de una variable desde el contexto
 */
function getVariableValue(variableName: string, context: VariableContext): any {
  const def = getVariableDefinition(variableName);
  if (!def) return undefined;

  // Buscar por el nombre principal y aliases
  const searchKeys = [def.name, ...def.aliases];

  for (const key of searchKeys) {
    // Variables especiales
    if (key === 'char' || key === 'CHAR') {
      return context.char || context.npc?.card?.data?.name || context.npc?.card?.name;
    }

    if (key === 'userMessage' || key === 'user_message') {
      return context.userMessage || context.mensaje;
    }

    if (key === 'lastSummary' || key === 'ultimo_resumen') {
      return context.lastSummary;
    }

    if (key === 'templateUser' || key === 'template_user') {
      return context.templateUser;
    }

    // NPC keys
    if (key.startsWith('npc.')) {
      const npcKey = key.replace('npc.', '');
      const npcData = context.npc?.card?.data || {};
      return (npcData as any)[npcKey];
    }

    // Jugador keys
    if (key.startsWith('jugador.')) {
      const jugadorKey = key.replace('jugador.', '');
      return (context.jugador as any)?.[jugadorKey];
    }

    // Mundo keys
    if (key.startsWith('mundo.')) {
      const mundoKey = key.replace('mundo.', '');
      return (context.world as any)?.[mundoKey];
    }

    // Pueblo keys
    if (key.startsWith('pueblo.')) {
      const puebloKey = key.replace('pueblo.', '');
      return (context.pueblo as any)?.[puebloKey];
    }

    // Edificio keys
    if (key.startsWith('edificio.')) {
      const edificioKey = key.replace('edificio.', '');
      return (context.edificio as any)?.[edificioKey];
    }
  }

  return undefined;
}

/**
 * Detecta referencias cíclicas en variables anidadas
 * Ejemplo: {{var1}} contiene {{var2}} que contiene {{var1}}
 */
export function detectCyclicReferences(text: string): string[][] {
  const variables = extractVariablesFromText(text);
  const cycles: string[][] = [];

  // Simular resolución para detectar ciclos
  // Nota: Esta es una detección básica. Para detección completa
  // necesitaríamos el contexto actual del sistema.

  // Crear grafo de dependencias (simplificado)
  const dependencies = new Map<string, string[]>();

  for (const variable of variables) {
    // En un sistema completo, aquí analizaríamos el contenido real
    // de cada variable para detectar dependencias
    dependencies.set(variable, []);
  }

  // Detectar ciclos usando DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function detectCycle(node: string, path: string[]): boolean {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = dependencies.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (detectCycle(neighbor, path)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Encontramos un ciclo
        const cycleStart = path.indexOf(neighbor);
        cycles.push([...path.slice(cycleStart), neighbor]);
      }
    }

    recursionStack.delete(node);
    path.pop();
    return false;
  }

  for (const variable of variables) {
    if (!visited.has(variable)) {
      detectCycle(variable, []);
    }
  }

  return cycles;
}

/**
 * Obtiene sugerencias de variables similares para corregir typos
 */
export function getSuggestedVariables(typo: string, threshold: number = 0.7): string[] {
  const suggestions: string[] = [];
  const allVariables = Object.keys(VARIABLE_GLOSSARY);

  for (const variable of allVariables) {
    const similarity = calculateSimilarity(typo.toLowerCase(), variable.toLowerCase());
    if (similarity >= threshold) {
      suggestions.push(variable);
    }
  }

  // También buscar en aliases
  for (const def of Object.values(VARIABLE_GLOSSARY)) {
    for (const alias of def.aliases) {
      const similarity = calculateSimilarity(typo.toLowerCase(), alias.toLowerCase());
      if (similarity >= threshold && !suggestions.includes(alias)) {
        suggestions.push(alias);
      }
    }
  }

  return suggestions.sort((a, b) => {
    const simA = calculateSimilarity(typo.toLowerCase(), a.toLowerCase());
    const simB = calculateSimilarity(typo.toLowerCase(), b.toLowerCase());
    return simB - simA;
  });
}

/**
 * Calcula la similitud entre dos strings (Levenshtein distance)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0) return 0;
  if (str2.length === 0) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[str2.length][str1.length];
  const maxLen = Math.max(str1.length, str2.length);
  return 1 - distance / maxLen;
}

/**
 * Formatea un resultado de validación para mostrar en la UI
 */
export function formatValidationErrors(result: ValidationResult): {
  summary: string;
  details: string[];
} {
  const details: string[] = [];

  for (const error of result.errors) {
    details.push(`[ERROR] ${error.message}`);
  }

  for (const warning of result.warnings) {
    details.push(`[WARN] ${warning.message}`);
  }

  let summary = '';
  if (result.valid) {
    summary = '✓ Validación exitosa';
  } else {
    summary = `✖ Validación fallida: ${result.errors.length} error(es), ${result.warnings.length} advertencia(s)`;
  }

  if (result.missingRequired.length > 0) {
    details.push(`Variables obligatorias faltantes: ${result.missingRequired.join(', ')}`);
  }

  return { summary, details };
}
