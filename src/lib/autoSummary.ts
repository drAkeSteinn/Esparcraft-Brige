/**
 * Auto-Summary de Sesiones
 * ========================
 * Cuando se agrega un mensaje a una sesión, este módulo verifica si la sesión
 * tiene suficientes mensajes (>= minMessagesToSummarize) y, de ser así,
 * dispara automáticamente el resumen de sesión.
 *
 * Características:
 * - Debounce por sesión: si se agregan múltiples mensajes en rápida sucesión
 *   (ej: user + assistant en un chat), espera a que dejen de llegar antes de resumir.
 * - Lock por sesión: evita que se ejecuten dos resúmenes simultáneos para la misma sesión.
 * - Fire-and-forget: no bloquea al llamador (addMessage retorna inmediatamente).
 * - Dynamic import: evita dependencia circular con triggerHandlers.
 *
 * Flujo:
 * 1. addMessage → scheduleAutoSummary(sessionId, messageCount)
 * 2. Debounce de 3 segundos (resetable con cada nuevo addMessage)
 * 3. Al expirar el debounce: verificar count >= min
 * 4. Si sí: adquirir lock, llamar handleResumenSesionTrigger, liberar lock
 * 5. handleResumenSesionTrigger hace el resto:
 *    - Guarda resumen anterior como embedding en sesion:{sessionId}
 *    - Genera nuevo resumen con LLM
 *    - Reemplaza resumen anterior
 *    - Conserva últimos keepMessages mensajes
 */

import { getSessionConfig } from './sessionConfig';

// Debounce timers por sesión: sessionId → timeout
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Locks por sesión: sessionId → true (si se está resumiendo ahora)
const summarizingSessions = new Set<string>();

// Delay del debounce en milisegundos
const DEBOUNCE_MS = 3000;

/**
 * Programa un auto-summary para una sesión con debounce.
 * Si ya hay un timer programado para esta sesión, se resetea (toma el último addMessage).
 * Si la sesión ya se está resumiendo, no hace nada.
 */
export function scheduleAutoSummary(sessionId: string): void {
  // Verificar si el auto-summary está habilitado
  const config = getSessionConfig();
  if (!config.autoSummarize) {
    return;
  }

  // Si la sesión ya se está resumiendo, no programar otro
  if (summarizingSessions.has(sessionId)) {
    console.log(`[autoSummary] Sesión ${sessionId} ya siendo resumida, skip`);
    return;
  }

  // Limpiar timer existente (debounce)
  const existingTimer = debounceTimers.get(sessionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Programar nuevo timer
  const timer = setTimeout(() => {
    debounceTimers.delete(sessionId);
    // Fire and forget — no bloquea al llamador original
    executeAutoSummary(sessionId).catch((err) => {
      console.error(`[autoSummary] Error en auto-summary para sesión ${sessionId}:`, err);
    });
  }, DEBOUNCE_MS);

  debounceTimers.set(sessionId, timer);
  console.log(`[autoSummary] Auto-summary programado para sesión ${sessionId} en ${DEBOUNCE_MS}ms`);
}

/**
 * Ejecuta el auto-summary para una sesión.
 * Verifica el count de mensajes y, si >= min, dispara handleResumenSesionTrigger.
 */
async function executeAutoSummary(sessionId: string): Promise<void> {
  const config = getSessionConfig();

  if (!config.autoSummarize) {
    console.log(`[autoSummary] Auto-summary deshabilitado, skip para sesión ${sessionId}`);
    return;
  }

  // Adquirir lock
  if (summarizingSessions.has(sessionId)) {
    console.log(`[autoSummary] Sesión ${sessionId} ya siendo resumida, skip`);
    return;
  }
  summarizingSessions.add(sessionId);

  try {
    // Dynamic import para evitar dependencia circular
    // (triggerHandlers importa sessionDbManager que importa este módulo)
    const { sessionDbManager } = await import('./sessionDbManager');

    // Leer la sesión actual para verificar el count de mensajes
    const session = await sessionDbManager.getById(sessionId);
    if (!session) {
      console.log(`[autoSummary] Sesión ${sessionId} no encontrada, skip`);
      return;
    }

    const messageCount = session.messages.length;
    const minMessages = config.minMessagesToSummarize;

    console.log(
      `[autoSummary] Sesión ${sessionId}: ${messageCount} mensajes (min=${minMessages})`
    );

    if (messageCount < minMessages) {
      console.log(
        `[autoSummary] Sesión ${sessionId} tiene ${messageCount} mensajes (< ${minMessages}), no se resume`
      );
      return;
    }

    console.log(
      `[autoSummary] Sesión ${sessionId} tiene ${messageCount} mensajes (>= ${minMessages}), ` +
      `disparando resumen automático...`
    );

    // Dynamic import de triggerHandlers (evita dependencia circular)
    const { handleResumenSesionTrigger } = await import('./triggerHandlers');

    // Disparar el resumen
    // handleResumenSesionTrigger ya hace todo:
    // 1. Verifica minMessages (doble check, safety net)
    // 2. Genera resumen con LLM
    // 3. Guarda resumen anterior como embedding en sesion:{sessionId}
    // 4. Reemplaza resumen anterior
    // 5. Conserva últimos keepMessages mensajes
    const result = await handleResumenSesionTrigger({
      mode: 'resumen_sesion',
      npcid: session.npcId,
      playersessionid: sessionId,
    });

    console.log(
      `[autoSummary] ✅ Resumen automático completado para sesión ${sessionId}. ` +
      `Resumen: "${result.summary.substring(0, 100)}..."`
    );
  } catch (error: any) {
    // Si el error es por no tener suficientes mensajes, es esperado (la condición cambió)
    if (error?.message?.includes('mensajes')) {
      console.log(`[autoSummary] Sesión ${sessionId}: ${error.message}`);
    } else {
      console.error(`[autoSummary] ❌ Error en auto-summary para sesión ${sessionId}:`, error?.message);
    }
  } finally {
    // Liberar lock
    summarizingSessions.delete(sessionId);
  }
}

/**
 * Cancela cualquier auto-summary pendiente para una sesión.
 * Útil si la sesión se elimina o si se quiere forzar un resumen manual.
 */
export function cancelAutoSummary(sessionId: string): void {
  const timer = debounceTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(sessionId);
    console.log(`[autoSummary] Auto-summary cancelado para sesión ${sessionId}`);
  }
}

/**
 * Verifica si una sesión tiene un auto-summary en progreso.
 */
export function isSessionBeingSummarized(sessionId: string): boolean {
  return summarizingSessions.has(sessionId);
}

/**
 * Verifica si una sesión tiene un auto-summary programado (esperando debounce).
 */
export function isAutoSummaryScheduled(sessionId: string): boolean {
  return debounceTimers.has(sessionId);
}
