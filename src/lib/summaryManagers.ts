import { db } from './db';

/**
 * Session Summary Manager
 */
export class SessionSummaryManager {
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
    return await db.nPCSummary.findFirst({
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
    return await db.nPCSummary.create({
      data
    });
  }

  async getAll() {
    return await db.nPCSummary.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllByNPCId(npcId: string) {
    return await db.nPCSummary.findMany({
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

  async getAllByEdificioId(edificioId: string) {
    return await db.edificioSummary.findMany({
      where: { edificioId },
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

  async getAllByPuebloId(puebloId: string) {
    return await db.puebloSummary.findMany({
      where: { puebloId },
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

  async getAllByWorldId(worldId: string) {
    return await db.worldSummary.findMany({
      where: { worldId },
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
