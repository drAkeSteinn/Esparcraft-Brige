/**
 * ATTRIBUTE TOOL MANAGER
 * ======================
 * Sistema de tool calling para que el LLM pueda modificar los atributos
 * de un NPC de forma autónoma durante el chat.
 *
 * Arquitectura:
 * - Una sola tool genérica `set_atributo(key, value, reason)` por NPC
 * - El schema (enum de keys + descripciones de min/max/opciones) se genera
 *   dinámicamente leyendo los atributos actuales del NPC
 * - La app valida y aplica los cambios en la DB (NO confía en el LLM)
 * - Numéricos: se clampean al rango [min, max]
 * - Listas: se rechazan si el valor no está en las opciones
 * - Todos los cambios se loguean con `reason` para auditoría
 *
 * Los atributos son GLOBALES del NPC: un cambio afecta a todas las sesiones
 * futuras, no solo a la que disparó el cambio.
 */

import { db } from '@/lib/db';
import { NPCAttribute, AttributeType, formatAttributeValue, parseListAttributeValue } from './types';
import type { ToolDefinition } from './llm/types';

/** Nombre fijo de la tool (constante para identificarla en los tool_calls) */
export const ATTRIBUTE_TOOL_NAME = 'set_atributo';

/** Un cambio de atributo aplicado (para devolver al cliente Denizen) */
export interface AttributeChange {
  key: string;
  name: string;
  type: AttributeType;
  oldValue: string;     // valor formateado antes del cambio (ej: "80/100")
  newValue: string;     // valor formateado después del cambio
  rawOldValue: string | number | null;  // valor crudo antes
  rawNewValue: string | number | null;  // valor crudo después
  reason: string;       // razón narrativa que dio el LLM
  clamped?: boolean;    // true si el valor fue ajustado al rango válido
  rejected?: boolean;   // true si el cambio fue rechazado (ej: lista con valor inválido)
  rejectionReason?: string;
}

/** Resultado de procesar un tool_call de atributo */
export interface AttributeToolResult {
  applied: boolean;
  change?: AttributeChange;
  message: string;      // mensaje para log/auditoría
}

export const attributeToolManager = {
  /**
   * Genera la ToolDefinition dinámica para un NPC, basándose en sus atributos actuales.
   * Si el NPC no tiene atributos, retorna null (no se envía la tool).
   *
   * El schema incluye:
   * - enum con las keys de los atributos (para que el LLM sepa cuáles puede modificar)
   * - descripción con info de min/max para numéricos y opciones para listas
   */
  async generateToolForNpc(npcId: string): Promise<ToolDefinition | null> {
    const attrs = await db.nPCAttribute.findMany({
      where: { npcId },
      orderBy: [{ name: 'asc' }],
    });

    if (attrs.length === 0) return null;

    // Construir descripción detallada de cada atributo para el LLM
    const attrDescriptions = attrs.map(a => {
      if (a.type === 'numeric') {
        const min = a.minValue != null ? a.minValue : '−∞';
        const max = a.maxValue != null ? a.maxValue : '+∞';
        const current = a.valueNumber != null ? a.valueNumber : 'sin valor';
        return `  - "${a.key}" (numérico, actual: ${current}, rango: ${min}–${max}): ${a.name}`;
      }
      if (a.type === 'list') {
        const options = parseListAttributeValue(a.valueText);
        const optsStr = options.length > 0 ? options.join(' | ') : '(lista vacía)';
        return `  - "${a.key}" (lista, opciones válidas: ${optsStr}): ${a.name}`;
      }
      // text
      const currentText = a.valueText ?? '(vacío)';
      return `  - "${a.key}" (texto, actual: "${currentText}"): ${a.name}`;
    }).join('\n');

    const keysEnum = attrs.map(a => a.key);

    return {
      type: 'function',
      function: {
        name: ATTRIBUTE_TOOL_NAME,
        description: [
          'Modifica un atributo del NPC. Úsala de forma autónoma cuando la narrativa lo justifique',
          '(ej: el NPC recibe daño → bajar vida; cambia de opinión → cambiar humor; se mueve → actualizar ubicación).',
          'No anuncies que vas a usar esta herramienta — simplemente úsala y responde naturalmente.',
          '',
          'Atributos disponibles:',
          attrDescriptions,
        ].join('\n'),
        parameters: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              enum: keysEnum,
              description: 'El key del atributo a modificar',
            },
            value: {
              type: 'string',
              description: [
                'Nuevo valor del atributo.',
                'Para numéricos: un número (se ajustará al rango min/max si excede).',
                'Para listas: debe ser exactamente una de las opciones válidas.',
                'Para texto: cualquier string.',
              ].join(' '),
            },
            reason: {
              type: 'string',
              description: 'Razón narrativa del cambio (ej: "recibió un golpe del jugador", "subió de nivel tras entrenar")',
            },
          },
          required: ['key', 'value', 'reason'],
        },
      },
    };
  },

  /**
   * Procesa un tool_call de set_atributo: valida, aplica el cambio en la DB y retorna el resultado.
   *
   * Reglas de validación:
   * - Numéricos: si value > max → clampar a max; si value < min → clampar a min
   * - Listas: si value no está en las opciones → rechazar (no aplicar)
   * - Texto: aplicar sin validación
   * - Si el atributo no existe → rechazar
   *
   * @param npcId  ID del NPC dueño del atributo
   * @param args   Argumentos parseados del tool_call: { key, value, reason }
   * @returns Resultado con el cambio aplicado o el motivo de rechazo
   */
  async applyAttributeChange(
    npcId: string,
    args: { key: string; value: string; reason: string }
  ): Promise<AttributeToolResult> {
    const { key, value, reason } = args;

    // 1. Buscar el atributo
    const attr = await db.nPCAttribute.findUnique({
      where: { npcId_key: { npcId, key } },
    });

    if (!attr) {
      return {
        applied: false,
        message: `Atributo "${key}" no encontrado en el NPC ${npcId}`,
      };
    }

    // Snapshot del valor anterior
    const oldFormatted = formatAttributeValue(attr as NPCAttribute);
    const oldRaw = attr.type === 'numeric' ? attr.valueNumber : attr.valueText;

    // 2. Validar y aplicar según tipo
    let newRaw: string | number | null;
    let newFormatted: string;
    let clamped = false;
    let rejected = false;
    let rejectionReason: string | undefined;

    if (attr.type === 'numeric') {
      let numValue = parseFloat(value);
      if (Number.isNaN(numValue)) {
        return {
          applied: false,
          message: `Valor "${value}" no es numérico para el atributo "${key}" (tipo numérico)`,
        };
      }
      // Clamp al rango [min, max]
      const min = attr.minValue;
      const max = attr.maxValue;
      if (min != null && numValue < min) {
        numValue = min;
        clamped = true;
      }
      if (max != null && numValue > max) {
        numValue = max;
        clamped = true;
      }

      // Aplicar en DB
      await db.nPCAttribute.update({
        where: { id: attr.id },
        data: { valueNumber: numValue },
      });

      newRaw = numValue;
      // Formatear manualmente para no re-fetchear
      if (max != null) {
        newFormatted = `${numValue}/${max}`;
      } else {
        newFormatted = `${numValue}`;
      }
    } else if (attr.type === 'list') {
      const options = parseListAttributeValue(attr.valueText);
      if (options.length === 0) {
        return {
          applied: false,
          message: `La lista del atributo "${key}" está vacía, no se puede validar el valor`,
        };
      }
      // El valor debe ser exactamente una de las opciones (case-sensitive trim)
      const trimmedValue = value.trim();
      if (!options.includes(trimmedValue)) {
        rejected = true;
        rejectionReason = `Valor "${trimmedValue}" no está en las opciones válidas: ${options.join(', ')}`;
        return {
          applied: false,
          change: {
            key,
            name: attr.name,
            type: 'list' as AttributeType,
            oldValue: oldFormatted,
            newValue: oldFormatted, // no cambió
            rawOldValue: oldRaw,
            rawNewValue: oldRaw,
            reason,
            rejected: true,
            rejectionReason,
          },
          message: `Rechazado: ${rejectionReason}`,
        };
      }
      // Aplicar en DB
      await db.nPCAttribute.update({
        where: { id: attr.id },
        data: { valueText: trimmedValue },
      });
      newRaw = trimmedValue;
      newFormatted = trimmedValue;
    } else {
      // text: aplicar sin validación
      const textValue = value.trim();
      await db.nPCAttribute.update({
        where: { id: attr.id },
        data: { valueText: textValue },
      });
      newRaw = textValue;
      newFormatted = textValue;
    }

    // 3. Log de auditoría
    const clampNote = clamped ? ' (valor clampeado al rango válido)' : '';
    console.log(
      `[attributeTool] Atributo "${key}" del NPC ${npcId} actualizado: ` +
      `${oldFormatted} → ${newFormatted}${clampNote}. Razón: "${reason}"`
    );

    return {
      applied: true,
      change: {
        key,
        name: attr.name,
        type: attr.type as AttributeType,
        oldValue: oldFormatted,
        newValue: newFormatted,
        rawOldValue: oldRaw,
        rawNewValue: newRaw,
        reason,
        clamped: clamped || undefined,
      },
      message: `Atributo "${key}" actualizado: ${oldFormatted} → ${newFormatted}${clampNote}`,
    };
  },

  /**
   * Formatea la info de la tool de atributos para inyectar en el system_prompt
   * (fallback para providers sin tool calling nativo).
   *
   * Formato: [ATRIBUTO: key=valor | reason=motivo]
   */
  async formatAttributeToolForPrompt(npcId: string): Promise<string> {
    const attrs = await db.nPCAttribute.findMany({
      where: { npcId },
      orderBy: [{ name: 'asc' }],
    });

    if (attrs.length === 0) return '';

    const attrList = attrs.map(a => {
      if (a.type === 'numeric') {
        const min = a.minValue != null ? a.minValue : '−∞';
        const max = a.maxValue != null ? a.maxValue : '+∞';
        const current = a.valueNumber != null ? a.valueNumber : 'sin valor';
        return `- ${a.key} (numérico, actual: ${current}, rango: ${min}–${max}): ${a.name}`;
      }
      if (a.type === 'list') {
        const options = parseListAttributeValue(a.valueText);
        return `- ${a.key} (lista, opciones: ${options.join(' | ')}): ${a.name}`;
      }
      return `- ${a.key} (texto, actual: "${a.valueText ?? ''}"): ${a.name}`;
    }).join('\n');

    return [
      'Puedes modificar tus atributos durante la conversación si la narrativa lo justifica.',
      'Atributos disponibles:',
      attrList,
      '',
      'Si modificas un atributo, inclúyelo al FINAL de tu respuesta en esta línea:',
      '[ATRIBUTO: key=valor | reason=motivo narrativo]',
      'Ej: [ATRIBUTO: vida=60 | reason=recibió un golpe del jugador]',
      'Para numéricos: el valor se ajustará al rango válido. Para listas: debe ser una opción válida.',
    ].join('\n');
  },

  /**
   * Parsea líneas [ATRIBUTO: key=valor | reason=motivo] del texto del LLM
   * (fallback sin tool calling).
   */
  parseAttributeChangesFromText(text: string): Array<{ key: string; value: string; reason: string }> {
    const changes: Array<{ key: string; value: string; reason: string }> = [];
    // [ATRIBUTO: vida=60 | reason=recibió un golpe]
    const regex = /\[ATRIBUTO:\s*([^|=]+)=([^|]+?)\s*\|\s*reason=([^\]]+)\]/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      changes.push({
        key: match[1].trim(),
        value: match[2].trim(),
        reason: match[3].trim(),
      });
    }
    return changes;
  },

  /**
   * Elimina las líneas [ATRIBUTO: ...] del texto del diálogo (para no mostrarlas al usuario).
   */
  stripAttributeLinesFromText(text: string): string {
    const regex = /\[ATRIBUTO:\s*[^|=]+=[^|]+?\s*\|\s*reason=[^\]]+\]/gi;
    return text.replace(regex, '').trim();
  },
};

export default attributeToolManager;
