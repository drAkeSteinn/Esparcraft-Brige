/**
 * TRIGGER EXECUTOR (thin wrapper)
 * ===============================
 *
 * ✅ MIGRADO: Esta función ahora delega en `handleTrigger` de `triggerHandlers.ts`.
 *
 * Antes tenía su propia implementación duplicada de cada resumen (sesión, NPC, edificio,
 * pueblo, mundo) que había divergido de los handlers modernos. Eso causaba:
 * - La fase de sesiones no respetaba `keepMessages` (borraba todos los mensajes)
 * - La fase de sesiones no generaba embeddings en `sesion:{id}`
 * - Leía config obsoleta de `db/resumen-general-config.json`
 *
 * Ahora `executeTrigger` es un thin wrapper que:
 * 1. Verifica si Resumen General está corriendo (bloquea chat durante el resumen)
 * 2. Delega a `handleTrigger` (misma función que usan las API routes de chat)
 * 3. Mapea el resultado al formato `TriggerExecutionResult { success, data, error }`
 *
 * Esto garantiza que el Resumen General use EXACTAMENTE la misma lógica que el chat:
 * - sessionConfig unificado (minMessages, keepMessages)
 * - Namespaces de embeddings (sesion:{id}, npc:{id}, etc.)
 * - Plantillas del Grimorio (excepto en resumen_sesion que no las usa)
 * - Mismos prompts, misma resolución de variables
 */

import { AnyTriggerPayload, ChatTriggerPayload } from './types';
import { handleTrigger } from './triggerHandlers';
import { db } from './db';

/**
 * Resultado de ejecución de un trigger
 */
export interface TriggerExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * ✅ FUNCIÓN CENTRAL DE EJECUCIÓN
 *
 * Delega en `handleTrigger` (de triggerHandlers.ts) para que el Resumen General
 * use la misma lógica que las API routes de chat.
 *
 * @param payload - Payload completo del trigger
 * @returns Resultado de la ejecución en formato { success, data, error }
 */
export async function executeTrigger(
  payload: AnyTriggerPayload
): Promise<TriggerExecutionResult> {
  try {
    const { mode } = payload;

    // Verificar si resumen general está corriendo (solo bloquea chat)
    // Esto evita que durante un resumen general se procesen peticiones de chat,
    // devolviendo un sentinel "resumen_general" que el cliente puede interpretar.
    if (mode === 'chat') {
      const systemConfig = await db.systemConfig.findUnique({
        where: { key: 'resumen_general_status' }
      });
      if (systemConfig?.value === 'running') {
        return {
          success: true,
          data: { response: 'resumen_general' }
        };
      }
    }

    // ✅ DELEGAR AL HANDLER UNIFICADO
    const result = await handleTrigger(payload);

    // ✅ MAPPEAR AL FORMATO TriggerExecutionResult
    // Algunos handlers retornan { success: boolean, ... } (resumen_npc, resumen_edificio, etc.)
    // que indican explícitamente si la operación tuvo éxito o fue un skip.
    // Otros retornan el payload directo sin success (resumen_sesion → { summary }, chat → { response, ... }).
    //
    // Normalizamos:
    // - Si el resultado tiene `success: false` explícito → propagar como error
    // - Si el resultado tiene `success: true` o no tiene `success` → OK
    if (result && typeof result === 'object' && 'success' in result && result.success === false) {
      return {
        success: false,
        error: (result as any).error || (result as any).message || 'Handler reportó fallo (success: false)'
      };
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('[executeTrigger] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

export default executeTrigger;
