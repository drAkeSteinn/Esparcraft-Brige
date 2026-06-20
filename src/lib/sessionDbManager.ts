import { db } from './db';
import { Session, SessionSummaryEntry, ChatMessage } from './types';
import { sessionSummaryDbManager } from './sessionSummaryDbManager';
import { getSessionConfig } from './sessionConfig';
import { scheduleAutoSummary } from './autoSummary';

/**
 * Aplica el límite de maxMessageHistory a un array de mensajes.
 * Si la configuración está en 0 o no definida, no aplica límite.
 * Conserva los mensajes más recientes.
 */
function applyMaxMessageHistory(messages: ChatMessage[]): ChatMessage[] {
  try {
    const { maxMessageHistory } = getSessionConfig();
    if (maxMessageHistory && maxMessageHistory > 0 && messages.length > maxMessageHistory) {
      // Conservar los últimos N mensajes (los más recientes)
      const truncated = messages.slice(-maxMessageHistory);
      console.log(
        `[sessionDbManager] Histórico truncado: ${messages.length} → ${truncated.length} mensajes (maxMessageHistory=${maxMessageHistory})`
      );
      return truncated;
    }
  } catch (e) {
    // Si no se puede leer la config, no aplicar límite (mejor perder límite que datos)
    console.warn('[sessionDbManager] No se pudo leer maxMessageHistory:', (e as Error).message);
  }
  return messages;
}

// Helper para convertir entre modelos de DB y TypeScript
function toDomainSession(dbSession: any, includeSummary = false): Session {
  const session: Session = {
    id: dbSession.id,
    npcId: dbSession.npcId,
    playerId: dbSession.playerId || undefined,
    jugador: dbSession.jugador ? JSON.parse(dbSession.jugador) : undefined,
    startTime: dbSession.startTime.toISOString(),
    lastActivity: dbSession.lastActivity.toISOString(),
    messages: dbSession.messages ? JSON.parse(dbSession.messages) : [],
    lastPrompt: dbSession.lastPrompt || undefined,
    summaryHistory: undefined, // Se carga separadamente si se necesita
  };

  // Incluir summary si se solicita
  if (includeSummary && dbSession.summary) {
    session.summary = dbSession.summary;
  }

  return session;
}

function toDBSession(session: Session): any {
  return {
    id: session.id,
    npcId: session.npcId,
    playerId: session.playerId || null,
    jugador: session.jugador ? JSON.stringify(session.jugador) : '{}',
    startTime: new Date(session.startTime),
    lastActivity: new Date(session.lastActivity),
    messages: JSON.stringify(session.messages || []),
    lastPrompt: session.lastPrompt || null,
    summary: session.summary || null,
  };
}

// Session Database Manager
export const sessionDbManager = {
  /**
   * Obtiene todas las sesiones
   */
  async getAll(): Promise<Session[]> {
    const sessions = await db.session.findMany({
      orderBy: { lastActivity: 'desc' }
    });
    return sessions.map(s => toDomainSession(s));
  },

  /**
   * Obtiene una sesión por su ID
   */
  async getById(id: string): Promise<Session | null> {
    const session = await db.session.findUnique({
      where: { id }
    });
    return session ? toDomainSession(session, true) : null;
  },

  /**
   * Obtiene sesiones por NPC ID
   */
  async getByNPCId(npcId: string): Promise<Session[]> {
    const sessions = await db.session.findMany({
      where: { npcId },
      orderBy: { lastActivity: 'desc' }
    });
    return sessions.map(s => toDomainSession(s, true));
  },

  /**
   * Obtiene sesiones por Player ID
   */
  async getByPlayerId(playerId: string): Promise<Session[]> {
    const sessions = await db.session.findMany({
      where: { playerId },
      orderBy: { lastActivity: 'desc' }
    });
    return sessions.map(s => toDomainSession(s, true));
  },

  /**
   * Obtiene sesiones por NPC ID con NPC incluido
   */
  async getByNPCIdWithNPC(npcId: string): Promise<Session[]> {
    const sessions = await db.session.findMany({
      where: { npcId },
      include: {
        npc: true
      },
      orderBy: { lastActivity: 'desc' }
    });
    return sessions.map(s => toDomainSession(s, true));
  },

  /**
   * ✅ KEY METHOD: Obtiene sesión con TODO el contexto en UNA QUERY
   * Incluye: NPC, Mundo, Pueblo, Edificio, y Resúmenes
   */
  async getByIdWithFullContext(sessionId: string): Promise<Session | null> {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        npc: {
          include: {
            mundo: true,
            pueblo: {
              include: {
                mundo: true
              }
            },
            edificio: {
              include: {
                pueblo: {
                  include: {
                    mundo: true
                  }
                },
                mundo: true
              }
            }
          }
        }
      }
    });

    if (!session) return null;

    const domainSession = toDomainSession(session, true);

    // Cargar historial de resúmenes
    const summaries = await sessionSummaryDbManager.getBySessionId(sessionId);
    if (summaries.length > 0) {
      domainSession.summaryHistory = summaries.map(s => ({
        summary: s.summary,
        timestamp: s.timestamp,
        version: s.version
      }));
    }

    return domainSession;
  },

  /**
   * Obtiene sesiones con NPC completo
   */
  async getAllWithNPCs(): Promise<Session[]> {
    const sessions = await db.session.findMany({
      include: {
        npc: true
      },
      orderBy: { lastActivity: 'desc' }
    });
    return sessions.map(s => toDomainSession(s, true));
  },

  /**
   * Obtiene la última sesión de un NPC
   */
  async getLatestByNPCId(npcId: string): Promise<Session | null> {
    const session = await db.session.findFirst({
      where: { npcId },
      include: {
        npc: true
      },
      orderBy: { lastActivity: 'desc' }
    });
    return session ? toDomainSession(session, true) : null;
  },

  /**
   * Busca sesiones por playerId o playerName
   */
  async searchByPlayer(playerId: string, playerName?: string): Promise<Session[]> {
    const where: any = {};
    
    if (playerId) {
      where.playerId = playerId;
    }

    // Nota: playerName está en jugador JSON, no es query directa en SQLite
    // Se podría hacer post-filtering si es necesario

    const sessions = await db.session.findMany({
      where,
      orderBy: { lastActivity: 'desc' }
    });

    // Post-filtering por playerName si es necesario
    if (playerName) {
      return sessions
        .map(s => toDomainSession(s, true))
        .filter(s => s.jugador?.nombre === playerName);
    }

    return sessions.map(s => toDomainSession(s, true));
  },

  /**
   * Crea una nueva sesión
   */
  async create(session: Omit<Session, 'id' | 'startTime' | 'lastActivity'>, id?: string): Promise<Session> {
    const sessionId = id || `SESSION_${Date.now()}`;
    const now = new Date();
    
    const newSession: Session = {
      ...session,
      id: sessionId,
      startTime: now.toISOString(),
      lastActivity: now.toISOString(),
    };

    const created = await db.session.create({
      data: toDBSession(newSession)
    });

    return toDomainSession(created);
  },

  /**
   * Actualiza una sesión existente
   */
  async update(id: string, session: Partial<Session>): Promise<Session | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: Session = {
      ...existing,
      ...session,
      id: existing.id, // Mantener el ID original
      startTime: session.startTime || existing.startTime,
      lastActivity: session.lastActivity || existing.lastActivity,
    };

    const result = await db.session.update({
      where: { id },
      data: toDBSession(updated)
    });

    return toDomainSession(result, true);
  },

  /**
   * Agrega un mensaje a la sesión
   * Aplica maxMessageHistory: si la sesión excede el límite, trunca los mensajes más viejos.
   * Tras agregar, programa un auto-summary con debounce (si está habilitado en la config).
   */
  async addMessage(id: string, message: ChatMessage): Promise<Session | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updatedMessages = applyMaxMessageHistory([...existing.messages, message]);

    const result = await db.session.update({
      where: { id },
      data: {
        messages: JSON.stringify(updatedMessages),
        lastActivity: new Date()
      }
    });

    // Programar auto-summary (debounce de 3s, fire-and-forget)
    scheduleAutoSummary(id);

    return toDomainSession(result, true);
  },

  /**
   * Agrega múltiples mensajes a la sesión
   * Aplica maxMessageHistory: si la sesión excede el límite, trunca los mensajes más viejos.
   * Tras agregar, programa un auto-summary con debounce (si está habilitado en la config).
   */
  async addMessages(id: string, messages: ChatMessage[]): Promise<Session | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updatedMessages = applyMaxMessageHistory([...existing.messages, ...messages]);

    const result = await db.session.update({
      where: { id },
      data: {
        messages: JSON.stringify(updatedMessages),
        lastActivity: new Date()
      }
    });

    // Programar auto-summary (debounce de 3s, fire-and-forget)
    scheduleAutoSummary(id);

    return toDomainSession(result, true);
  },

  /**
   * Limpia todos los mensajes de una sesión
   */
  async clearMessages(id: string): Promise<Session | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.session.update({
      where: { id },
      data: {
        messages: '[]',
        lastActivity: new Date()
      }
    });

    return toDomainSession(result, true);
  },

  /**
   * Reemplaza los mensajes de una sesión por un nuevo array.
   * Útil para conservar solo los últimos N mensajes tras un resumen.
   */
  async updateMessages(id: string, messages: ChatMessage[]): Promise<Session | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.session.update({
      where: { id },
      data: {
        messages: JSON.stringify(messages),
        lastActivity: new Date(),
      },
    });

    return toDomainSession(result, true);
  },

  /**
   * Actualiza solo el jugador de una sesión
   */
  async updateJugador(id: string, jugador: Session['jugador']): Promise<Session | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.session.update({
      where: { id },
      data: {
        jugador: jugador ? JSON.stringify(jugador) : '{}',
        lastActivity: new Date()
      }
    });

    return toDomainSession(result);
  },

  /**
   * Actualiza solo el lastPrompt de una sesión
   */
  async updateLastPrompt(id: string, lastPrompt: string): Promise<Session | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.session.update({
      where: { id },
      data: { lastPrompt }
    });

    return toDomainSession(result, true);
  },

  /**
   * Actualiza la actividad de una sesión
   */
  async updateActivity(id: string): Promise<Session | null> {
    const result = await db.session.update({
      where: { id },
      data: { lastActivity: new Date() }
    });

    return result ? toDomainSession(result) : null;
  },

  /**
   * Actualiza solo el summary de una sesión
   */
  async updateSummary(id: string, summary: string): Promise<Session | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.session.update({
      where: { id },
      data: { summary }
    });

    return toDomainSession(result, true);
  },

  /**
   * Elimina una sesión
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Eliminar el namespace de la sesión antes de borrarla
      try {
        const { namespaceManager } = await import('./namespaceManager');
        await namespaceManager.deleteEntityNamespace('sesion', id);
        console.log(`[sessionDbManager.delete] Namespace sesion:${id} eliminado`);
      } catch (nsErr: any) {
        console.warn(`[sessionDbManager.delete] No se pudo eliminar namespace:`, nsErr?.message);
      }

      await db.session.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('Error deleting Session:', error);
      return false;
    }
  },

  /**
   * Elimina todas las sesiones de un NPC (y sus namespaces)
   */
  async deleteByNPCId(npcId: string): Promise<boolean> {
    try {
      // Obtener los IDs de las sesiones antes de borrarlas para limpiar sus namespaces
      const sessions = await db.session.findMany({
        where: { npcId },
        select: { id: true }
      });

      // Eliminar namespaces de cada sesión
      try {
        const { namespaceManager } = await import('./namespaceManager');
        for (const s of sessions) {
          try {
            await namespaceManager.deleteEntityNamespace('sesion', s.id);
          } catch (nsErr: any) {
            console.warn(`[deleteByNPCId] Error eliminando namespace sesion:${s.id}:`, nsErr?.message);
          }
        }
      } catch (importErr: any) {
        console.warn(`[deleteByNPCId] No se pudo importar namespaceManager:`, importErr?.message);
      }

      await db.session.deleteMany({
        where: { npcId }
      });
      return true;
    } catch (error) {
      console.error('Error deleting Sessions by NPC:', error);
      return false;
    }
  },

  /**
   * Elimina todas las sesiones de un player (y sus namespaces)
   */
  async deleteByPlayerId(playerId: string): Promise<boolean> {
    try {
      // Obtener los IDs de las sesiones antes de borrarlas para limpiar sus namespaces
      const sessions = await db.session.findMany({
        where: { playerId },
        select: { id: true }
      });

      // Eliminar namespaces de cada sesión
      try {
        const { namespaceManager } = await import('./namespaceManager');
        for (const s of sessions) {
          try {
            await namespaceManager.deleteEntityNamespace('sesion', s.id);
          } catch (nsErr: any) {
            console.warn(`[deleteByPlayerId] Error eliminando namespace sesion:${s.id}:`, nsErr?.message);
          }
        }
      } catch (importErr: any) {
        console.warn(`[deleteByPlayerId] No se pudo importar namespaceManager:`, importErr?.message);
      }

      await db.session.deleteMany({
        where: { playerId }
      });
      return true;
    } catch (error) {
      console.error('Error deleting Sessions by Player:', error);
      return false;
    }
  },

  /**
   * Lista las sesiones inactivas (lastActivity más antigua que el timeout).
   * @param inactivityTimeoutSeconds segundos de inactividad para considerar una sesión inactiva
   */
  async getInactiveSessions(inactivityTimeoutSeconds: number): Promise<Session[]> {
    const cutoff = new Date(Date.now() - inactivityTimeoutSeconds * 1000);
    const sessions = await db.session.findMany({
      where: { lastActivity: { lt: cutoff } },
      orderBy: { lastActivity: 'asc' },
    });
    return sessions.map((s: any) => toDomainSession(s, false));
  },

  /**
   * Elimina las sesiones inactivas (lastActivity más antigua que el timeout).
   * @param inactivityTimeoutSeconds segundos de inactividad para considerar una sesión inactiva
   * @returns número de sesiones eliminadas
   */
  async cleanInactiveSessions(inactivityTimeoutSeconds: number): Promise<number> {
    const cutoff = new Date(Date.now() - inactivityTimeoutSeconds * 1000);
    try {
      const result = await db.session.deleteMany({
        where: { lastActivity: { lt: cutoff } },
      });
      console.log(
        `[sessionDbManager] Sesiones inactivas eliminadas: ${result.count} (cutoff: ${cutoff.toISOString()})`
      );
      return result.count;
    } catch (error) {
      console.error('Error cleaning inactive sessions:', error);
      return 0;
    }
  },

  /**
   * Cuenta sesiones por NPC ID
   */
  async countByNPCId(npcId: string): Promise<number> {
    return await db.session.count({ where: { npcId } });
  },

  /**
   * Cuenta sesiones por Player ID
   */
  async countByPlayerId(playerId: string): Promise<number> {
    return await db.session.count({ where: { playerId } });
  },

  /**
   * Cuenta el total de sesiones
   */
  async count(): Promise<number> {
    return await db.session.count();
  },

  // ============================================================
  // Métodos de Historial de Resúmenes
  // ============================================================

  /**
   * Agrega un resumen al historial de una sesión
   */
  async addSummaryToHistory(id: string, summary: string, version?: number): Promise<Session | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    // Obtener siguiente versión de resumen si no se proporciona
    const nextVersion = version || (await this.getNextSummaryVersion(id));

    // Crear nuevo SessionSummary
    const newSummary = await sessionSummaryDbManager.create({
      sessionId: id,
      npcId: existing.npcId,
      playerId: existing.playerId || undefined,
      playerName: existing.jugador?.nombre || undefined,
      npcName: undefined, // Se podría obtener del NPC si es necesario
      summary,
      timestamp: new Date().toISOString(),
      version: nextVersion,
    });

    // Actualizar sesión con el nuevo summaryId
    const result = await db.session.update({
      where: { id },
      data: {
        summaryId: newSummary.id,
        summary,
        lastActivity: new Date()
      }
    });

    return toDomainSession(result, true);
  },

  /**
   * Obtiene el historial de resúmenes de una sesión
   */
  async getSummaryHistory(id: string): Promise<SessionSummaryEntry[]> {
    const summaries = await sessionSummaryDbManager.getBySessionId(id);
    return summaries.map(s => ({
      summary: s.summary,
      timestamp: s.timestamp,
      version: s.version
    }));
  },

  /**
   * Obtiene el último resumen de una sesión
   */
  async getLatestSummary(id: string): Promise<SessionSummaryEntry | null> {
    const summary = await sessionSummaryDbManager.getLatestBySessionId(id);
    if (!summary) return null;
    return {
      summary: summary.summary,
      timestamp: summary.timestamp,
      version: summary.version
    };
  },

  /**
   * Obtiene el siguiente número de versión de resumen
   */
  async getNextSummaryVersion(id: string): Promise<number> {
    const summaries = await this.getSummaryHistory(id);
    return summaries.length + 1;
  }
};

export default sessionDbManager;
export const sessionDbManagerSingleton = sessionDbManager;
