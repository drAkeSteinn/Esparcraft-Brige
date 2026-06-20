/**
 * Configuración de sesiones (singleton en memoria del servidor)
 * ============================================
 * Esta configuración se persiste solo en memoria del proceso Node.js
 * (no en DB ni en archivo). Se actualiza vía POST /api/settings/sessions.
 *
 * Configuraciones soportadas:
 * - autoSave: si true, las sesiones se guardan automáticamente
 * - autoSaveInterval: cada cuántos segundos se auto-guarda
 * - maxMessageHistory: límite de mensajes por sesión (se truncan los viejos)
 * - sessionsPerPage: cuántas sesiones mostrar por página en la UI
 * - inactivityTimeout: segundos de inactividad para marcar sesión como inactiva
 * - minMessagesToSummarize: mínimo de mensajes para que se dispare el resumen de sesión
 * - keepMessagesAfterSummary: mensajes a conservar al hacer el resumen (los más recientes)
 * - autoSummarize: si true, el resumen se dispara automáticamente al agregar mensajes
 */

export interface SessionConfig {
  autoSave: boolean;
  autoSaveInterval: number;
  maxMessageHistory: number;
  sessionsPerPage: number;
  inactivityTimeout: number;
  /** Mínimo de mensajes para que el resumen de sesión se ejecute */
  minMessagesToSummarize: number;
  /** Mensajes a conservar al hacer el resumen (los más recientes). Los viejos se eliminan. */
  keepMessagesAfterSummary: number;
  /** Si true, el resumen se dispara automáticamente al agregar mensajes a la sesión */
  autoSummarize: boolean;
}

const DEFAULT_CONFIG: SessionConfig = {
  autoSave: true,
  autoSaveInterval: 30,
  maxMessageHistory: 100,
  sessionsPerPage: 12,
  inactivityTimeout: 300,
  minMessagesToSummarize: 10,
  keepMessagesAfterSummary: 4,
  autoSummarize: true,
};

// Configuración en memoria (singleton del proceso)
let sessionConfig: SessionConfig = { ...DEFAULT_CONFIG };

export function getSessionConfig(): SessionConfig {
  return sessionConfig;
}

export function updateSessionConfig(updates: Partial<SessionConfig>): void {
  sessionConfig = { ...sessionConfig, ...updates };
}

export function resetSessionConfig(): void {
  sessionConfig = { ...DEFAULT_CONFIG };
}

export { DEFAULT_CONFIG };

