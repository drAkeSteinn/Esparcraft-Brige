import { db } from './db';
import { SessionSummary } from './types';

// Helper para convertir entre modelos de DB y TypeScript
function toDomainSessionSummary(dbSummary: any): SessionSummary {
  return {
    sessionId: dbSummary.sessionId,
    npcId: dbSummary.npcId,
    playerId: dbSummary.playerId || undefined,
    playerName: dbSummary.playerName || undefined,
    npcName: dbSummary.npcName || undefined,
    summary: dbSummary.summary,
    timestamp: dbSummary.timestamp.toISOString(),
    version: dbSummary.version,
  };
}

function toDBSessionSummary(summary: SessionSummary): any {
  return {
    sessionId: summary.sessionId,
    npcId: summary.npcId,
    playerId: summary.playerId || null,
    playerName: summary.playerName || null,
    npcName: summary.npcName || null,
    summary: summary.summary,
    timestamp: summary.timestamp,
    version: summary.version,
  };
}

// Session Summary Database Manager
export const sessionSummaryDbManager = {
  /**
   * Obtiene un resumen por su ID
   */
  async getById(id: string): Promise<SessionSummary | null> {
    const summary = await db.sessionSummary.findUnique({
      where: { id }
    });
    return summary ? toDomainSessionSummary(summary) : null;
  },

  /**
   * Obtiene resúmenes por sessionId
   */
  async getBySessionId(sessionId: string): Promise<SessionSummary[]> {
    const summaries = await db.sessionSummary.findMany({
      where: { sessionId },
      orderBy: { version: 'asc' }
    });
    return summaries.map(toDomainSessionSummary);
  },

  /**
   * Obtiene resúmenes por npcId
   */
  async getByNPCId(npcId: string): Promise<SessionSummary[]> {
    const summaries = await db.sessionSummary.findMany({
      where: { npcId },
      orderBy: { timestamp: 'desc' }
    });
    return summaries.map(toDomainSessionSummary);
  },

  /**
   * Obtiene resúmenes por playerId
   */
  async getByPlayerId(playerId: string): Promise<SessionSummary[]> {
    const summaries = await db.sessionSummary.findMany({
      where: { playerId },
      orderBy: { timestamp: 'desc' }
    });
    return summaries.map(toDomainSessionSummary);
  },

  /**
   * Obtiene el último resumen de una sesión
   */
  async getLatestBySessionId(sessionId: string): Promise<SessionSummary | null> {
    const summary = await db.sessionSummary.findFirst({
      where: { sessionId },
      orderBy: [{ version: 'desc' }, { timestamp: 'desc' }]
    });
    return summary ? toDomainSessionSummary(summary) : null;
  },

  /**
   * Obtiene todos los resúmenes
   */
  async getAll(): Promise<SessionSummary[]> {
    const summaries = await db.sessionSummary.findMany({
      orderBy: { timestamp: 'desc' }
    });
    return summaries.map(toDomainSessionSummary);
  },

  /**
   * Crea un nuevo resumen
   */
  async create(summary: Omit<SessionSummary, 'id'>, id?: string): Promise<SessionSummary> {
    const summaryId = id || `SUMMARY_${Date.now()}`;
    const newSummary = { ...summary, id: summaryId };

    const created = await db.sessionSummary.create({
      data: toDBSessionSummary(newSummary)
    });

    return toDomainSessionSummary(created);
  },

  /**
   * Actualiza un resumen existente
   */
  async update(id: string, summary: Partial<SessionSummary>): Promise<SessionSummary | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: SessionSummary = {
      ...existing,
      ...summary,
      id: existing.id, // Mantener el ID original
    };

    const result = await db.sessionSummary.update({
      where: { id },
      data: {
        sessionId: updated.sessionId,
        npcId: updated.npcId,
        playerId: updated.playerId || null,
        playerName: updated.playerName || null,
        npcName: updated.npcName || null,
        summary: updated.summary,
        timestamp: new Date(updated.timestamp),
        version: updated.version,
      }
    });

    return toDomainSessionSummary(result);
  },

  /**
   * Actualiza solo el texto del resumen
   */
  async updateSummaryText(id: string, summaryText: string): Promise<SessionSummary | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.sessionSummary.update({
      where: { id },
      data: {
        summary: summaryText
      }
    });

    return toDomainSessionSummary(result);
  },

  /**
   * Elimina un resumen
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.sessionSummary.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('Error deleting SessionSummary:', error);
      return false;
    }
  },

  /**
   * Elimina todos los resúmenes de una sesión
   */
  async deleteBySessionId(sessionId: string): Promise<boolean> {
    try {
      await db.sessionSummary.deleteMany({
        where: { sessionId }
      });
      return true;
    } catch (error) {
      console.error('Error deleting SessionSummaries by session:', error);
      return false;
    }
  },

  /**
   * Cuenta resúmenes por sessionId
   */
  async countBySessionId(sessionId: string): Promise<number> {
    return await db.sessionSummary.count({ where: { sessionId } });
  },

  /**
   * Cuenta resúmenes por npcId
   */
  async countByNPCId(npcId: string): Promise<number> {
    return await db.sessionSummary.count({ where: { npcId } });
  },

  /**
   * Cuenta resúmenes por playerId
   */
  async countByPlayerId(playerId: string): Promise<number> {
    return await db.sessionSummary.count({ where: { playerId } });
  },

  /**
   * Cuenta el total de resúmenes
   */
  async count(): Promise<number> {
    return await db.sessionSummary.count();
  }
};

export default sessionSummaryDbManager;
