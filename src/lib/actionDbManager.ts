import { db } from '@/lib/db';
import { NPCAction, NPCActionInput } from './types';
import type { ToolDefinition } from './llm/types';

/**
 * Convierte una fila de la DB al tipo de dominio NPCAction.
 *
 * Maneja el caso de `parameters` que puede venir como:
 * - null/undefined → null
 * - string JSON simple: '{"type":"object",...}'
 * - string JSON doblemente escapado: '"{\\"type\\":\\"object\\",...}"' (si se guardó
 *   haciendo JSON.stringify dos veces por error en una versión anterior)
 * - ya un objeto (algunos ORMs pueden devolverlo así)
 *
 * Si el parseo falla, se loguea un warning y se devuelve null para que la acción
 * siga siendo usable (sin schema de parámetros) en lugar de romper todo el listado.
 */
function toDomain(a: any): NPCAction {
  let parameters: Record<string, any> | null = null;
  if (a.parameters != null && a.parameters !== '') {
    if (typeof a.parameters === 'object') {
      // Ya es un objeto (algunos drivers lo parsean automáticamente)
      parameters = a.parameters as Record<string, any>;
    } else if (typeof a.parameters === 'string') {
      try {
        const parsed = JSON.parse(a.parameters);
        // Si después del primer parse sigue siendo un string, era doble-escapado.
        // Hacemos un segundo parse.
        if (typeof parsed === 'string') {
          try {
            parameters = JSON.parse(parsed);
          } catch {
            // El segundo parse falló: el string interno no es JSON válido.
            console.warn(
              `[actionDbManager.toDomain] parameters doble-escapado pero inválido para action "${a.key}":`,
              parsed.substring(0, 100)
            );
            parameters = null;
          }
        } else if (typeof parsed === 'object' && parsed !== null) {
          parameters = parsed as Record<string, any>;
        } else {
          // parsed es number/boolean/etc — no es un schema válido
          parameters = null;
        }
      } catch (e) {
        console.warn(
          `[actionDbManager.toDomain] Error parseando parameters para action "${a.key}":`,
          e instanceof Error ? e.message : e
        );
        parameters = null;
      }
    }
  }

  return {
    id: a.id,
    npcId: a.npcId,
    name: a.name,
    key: a.key,
    description: a.description,
    parameters,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

const KEY_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function isValidActionKey(key: string): boolean {
  return KEY_REGEX.test(key);
}

/**
 * Valida que un JSON Schema de parámetros sea válido para tool calling.
 *
 * Según la documentación oficial de xAI (docs.x.ai/developers/tools/function-calling)
 * y OpenAI, el schema de parámetros debe cumplir:
 *
 * 1. La raíz debe ser un object: `type: "object"` (es obligatorio; si no, la API
 *    devuelve 400 porque no puede compilar el grammar del tool-call).
 * 2. `properties` debe ser un objeto (o estar ausente si la tool no tiene params).
 * 3. `additionalProperties` por defecto es `false` en xAI (debe ser `true` explícito).
 *
 * Esta función normaliza y valida el schema. Si el usuario envía algo inválido,
 * lanza un error descriptivo.
 */
export function validateAndNormalizeParametersSchema(
  parameters: Record<string, any> | null | undefined
): Record<string, any> | null {
  if (!parameters) return null;

  if (typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw new Error(
      'Los parámetros deben ser un objeto JSON Schema (no un array ni un valor primitivo).'
    );
  }

  // Si el schema está vacío ({}) lo normalizamos a object vacío.
  // Esto cubre el caso en que el usuario envía "{}" para una tool sin params.
  if (Object.keys(parameters).length === 0) {
    return { type: 'object', properties: {} };
  }

  // Si NO tiene type, asumimos que es object (normalización benigna).
  // Esto cubre el caso: { properties: {...} } → { type: "object", properties: {...} }
  if (!parameters.type) {
    return { type: 'object', properties: parameters.properties ?? {}, ...parameters };
  }

  // Validar que la raíz sea type: "object"
  // (xAI y OpenAI rechazan schemas cuya raíz sea scalar/array)
  if (parameters.type !== 'object') {
    throw new Error(
      `El JSON Schema de parámetros debe tener "type": "object" en la raíz. ` +
      `Recibido: type="${parameters.type}". ` +
      `Ejemplo válido: {"type":"object","properties":{"item":{"type":"string"}},"required":["item"]}`
    );
  }

  // Si no tiene properties, asegurarnos de que exista (vacío)
  if (!parameters.properties) {
    return { ...parameters, properties: {} };
  }

  return parameters;
}

export const npcActionManager = {
  async getByNpcId(npcId: string): Promise<NPCAction[]> {
    const actions = await db.nPCAction.findMany({
      where: { npcId },
      orderBy: [{ name: 'asc' }],
    });
    return actions.map(toDomain);
  },

  async create(npcId: string, input: NPCActionInput): Promise<NPCAction> {
    if (!isValidActionKey(input.key)) {
      throw new Error(`Key inválida: "${input.key}". Solo se permiten letras, números y underscore.`);
    }

    const npc = await db.nPC.findUnique({ where: { id: npcId } });
    if (!npc) throw new Error(`NPC no encontrado: ${npcId}`);

    const existing = await db.nPCAction.findUnique({
      where: { npcId_key: { npcId, key: input.key } },
    });
    if (existing) {
      throw new Error(`El NPC ya tiene una acción con la key "${input.key}".`);
    }

    // Validar y normalizar el schema de parámetros antes de guardar.
    // Esto evita que se guarden actions con schemas inválidos que romperían
    // el tool calling en runtime.
    const normalizedParams = validateAndNormalizeParametersSchema(input.parameters);

    const created = await db.nPCAction.create({
      data: {
        npcId,
        name: input.name,
        key: input.key,
        description: input.description,
        parameters: normalizedParams ? JSON.stringify(normalizedParams) : null,
      },
    });
    return toDomain(created);
  },

  async update(id: string, input: NPCActionInput): Promise<NPCAction | null> {
    if (!isValidActionKey(input.key)) {
      throw new Error(`Key inválida: "${input.key}".`);
    }

    const existing = await db.nPCAction.findUnique({ where: { id } });
    if (!existing) return null;

    if (existing.key !== input.key) {
      const conflict = await db.nPCAction.findUnique({
        where: { npcId_key: { npcId: existing.npcId, key: input.key } },
      });
      if (conflict) throw new Error(`El NPC ya tiene otra acción con la key "${input.key}".`);
    }

    const normalizedParams = validateAndNormalizeParametersSchema(input.parameters);

    const updated = await db.nPCAction.update({
      where: { id },
      data: {
        name: input.name,
        key: input.key,
        description: input.description,
        parameters: normalizedParams ? JSON.stringify(normalizedParams) : null,
      },
    });
    return toDomain(updated);
  },

  async delete(id: string): Promise<boolean> {
    try {
      await db.nPCAction.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async deleteAllByNpc(npcId: string): Promise<number> {
    const result = await db.nPCAction.deleteMany({ where: { npcId } });
    return result.count;
  },

  /**
   * Convierte las acciones de un NPC al formato ToolDefinition
   * para enviar al LLM via tool calling.
   *
   * Formato requerido por xAI y OpenAI (compatible con /v1/chat/completions):
   *   {
   *     type: "function",
   *     function: {
   *       name: string,           // unique, <= 64 chars
   *       description: string,    // ayuda al LLM a decidir cuándo usarla
   *       parameters: {           // JSON Schema, raíz debe ser type:"object"
   *         type: "object",
   *         properties: {...},
   *         required: [...]
   *       }
   *     }
   *   }
   *
   * Referencias:
   *   - https://docs.x.ai/developers/tools/function-calling
   *   - https://docs.x.ai/developers/model-capabilities/text/structured-outputs
   */
  async getActionsAsTools(npcId: string): Promise<ToolDefinition[]> {
    const actions = await this.getByNpcId(npcId);
    return actions.map(a => {
      // Validar el schema al construir la tool. Si por algún motivo se coló
      // un schema inválido en la DB (datos antiguos), lo normalizamos aquí
      // para que el LLM no rechace toda la request.
      let parameters: Record<string, any>;
      try {
        const normalized = validateAndNormalizeParametersSchema(a.parameters);
        parameters = normalized ?? { type: 'object', properties: {} };
      } catch (e) {
        console.warn(
          `[getActionsAsTools] Schema inválido para action "${a.key}", usando schema vacío:`,
          e instanceof Error ? e.message : e
        );
        parameters = { type: 'object', properties: {} };
      }

      return {
        type: 'function' as const,
        function: {
          name: a.key,
          description: a.description,
          parameters,
        },
      };
    });
  },

  /**
   * Verifica si un NPC tiene acciones definidas.
   */
  async hasActions(npcId: string): Promise<boolean> {
    const count = await db.nPCAction.count({ where: { npcId } });
    return count > 0;
  },
};

export default npcActionManager;
