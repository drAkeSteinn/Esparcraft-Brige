import { db } from './db';
import { Session, SessionSummaryEntry, ChatMessage } from './types';
import { sessionSummaryDbManager } from './sessionSummaryDbManager';

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
   */
  async addMessage(id: string, message: ChatMessage): Promise<Session | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updatedMessages = [...existing.messages, message];

    const result = await db.session.update({
      where: { id },
      data: {
        messages: JSON.stringify(updatedMessages),
        lastActivity: new Date()
      }
    });

    return toDomainSession(result, true);
  },

  /**
   * Agrega múltiples mensajes a la sesión
   */
  async addMessages(id: string, messages: ChatMessage[]): Promise<Session | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updatedMessages = [...existing.messages, ...messages];

    const result = await db.session.update({
      where: { id },
      data: {
        messages: JSON.stringify(updatedMessages),
        lastActivity: new Date()
      }
    });

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
   * Elimina todas las sesiones de un NPC
   */
  async deleteByNPCId(npcId: string): Promise<boolean> {
    try {
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
   * Elimina todas las sesiones de un player
   */
  async deleteByPlayerId(playerId: string): Promise<boolean> {
    try {
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
