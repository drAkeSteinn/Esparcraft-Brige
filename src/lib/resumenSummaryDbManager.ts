import { db } from './db';

/**
 * Session Summary Manager
 */
export class SessionSummaryManager {
  async getBySessionId(sessionId: string) {
    return await db.sessionSummary.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' }
    });
  }

  async getLatestBySessionId(sessionId: string) {
    const summaries = await this.getBySessionId(sessionId);
    return summaries[0] || null;
  }

  async create(data: {
    sessionId: string;
    npcId: string;
    playerName?: string;
    npcName?: string;
    summary: string;
    version?: number;
  }) {
    return await db.sessionSummary.create({
      data
    });
  }

  async getAll() {
    return await db.sessionSummary.findMany({
      orderBy: { timestamp: 'desc' }
    });
  }

  async getByNPCId(npcId: string) {
    return await db.sessionSummary.findMany({
      where: { npcId },
      orderBy: { timestamp: 'desc' }
    });
  }

  async getBySessionId(sessionId: string) {
    return await db.sessionSummary.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' }
    });
  }
}

/**
 * NPC Summary Manager
 */
export class NPCSummaryManager {
  async getLatest(npcId: string) {
    return await db.npcSummary.findFirst({
      where: { npcId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: {
    npcId: string;
    summary: string;
    sessionHash: string;
    version: number;
  }) {
    return await db.npcSummary.create({
      data
    });
  }

  async getAll() {
    return await db.npcSummary.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllByNPCId(npcId: string) {
    return await db.npcSummary.findMany({
      where: { npcId },
      orderBy: { createdAt: 'desc' }
    });
  }
}

/**
 * Edificio Summary Manager
 */
export class EdificioSummaryManager {
  async getLatest(edificioId: string) {
    return await db.edificioSummary.findFirst({
      where: { edificioId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: {
    edificioId: string;
    summary: string;
    npcHash: string;
    version: number;
  }) {
    return await db.edificioSummary.create({
      data
    });
  }

  async getAll() {
    return await db.edificioSummary.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }
}

/**
 * Pueblo Summary Manager
 */
export class PuebloSummaryManager {
  async getLatest(puebloId: string) {
    return await db.puebloSummary.findFirst({
      where: { puebloId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: {
    puebloId: string;
    summary: string;
    edificioHash: string;
    version: number;
  }) {
    return await db.puebloSummary.create({
      data
    });
  }

  async getAll() {
    return await db.puebloSummary.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }
}

/**
 * World Summary Manager
 */
export class WorldSummaryManager {
  async getLatest(worldId: string) {
    return await db.worldSummary.findFirst({
      where: { worldId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: {
    worldId: string;
    summary: string;
    puebloHash: string;
    version: number;
  }) {
    return await db.worldSummary.create({
      data
    });
  }

  async getAll() {
    return await db.worldSummary.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }
}

// ========================================================================
// Exportar instancias singleton
// ========================================================================
export const sessionSummaryDbManager = new SessionSummaryManager();
export const npcSummaryDbManager = new NPCSummaryManager();
export const edificioSummaryDbManager = new EdificioSummaryManager();
export const puebloSummaryDbManager = new PuebloSummaryManager();
export const worldSummaryDbManager = new WorldSummaryManager();
