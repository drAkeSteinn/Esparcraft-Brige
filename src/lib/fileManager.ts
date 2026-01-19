import fs from 'fs';
import path from 'path';
import { World, Pueblo, Edificio, NPC, Session, SillyTavernCard } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

// Helper functions
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function readJSON<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    return null;
  }
}

export function writeJSON<T>(filePath: string, data: T): void {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    throw error;
  }
}

export function listFiles(dirPath: string): string[] {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    return fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  } catch (error) {
    console.error(`Error listing files in ${dirPath}:`, error);
    return [];
  }
}

export function deleteFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    throw error;
  }
}

// World operations
export const worldManager = {
  getFilePath: (id: string) => path.join(DATA_DIR, 'worlds', `${id}.json`),

  getAll(): World[] {
    const files = listFiles(path.join(DATA_DIR, 'worlds'));
    return files
      .map(f => readJSON<World>(path.join(DATA_DIR, 'worlds', f)))
      .filter((w): w is World => w !== null);
  },

  getById(id: string): World | null {
    return readJSON<World>(this.getFilePath(id));
  },

  create(world: Omit<World, 'id'>, id?: string): World {
    const worldId = id || `WORLD_${Date.now()}`;
    const newWorld: World = { ...world, id: worldId };
    writeJSON(this.getFilePath(worldId), newWorld);
    return newWorld;
  },

  update(id: string, world: Partial<World>): World | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const updated = { ...existing, ...world };
    writeJSON(this.getFilePath(id), updated);
    return updated;
  },

  delete(id: string): boolean {
    try {
      deleteFile(this.getFilePath(id));
      return true;
    } catch {
      return false;
    }
  }
};

// Pueblo operations
export const puebloManager = {
  getFilePath: (id: string) => path.join(DATA_DIR, 'pueblos', `${id}.json`),

  getAll(): Pueblo[] {
    const files = listFiles(path.join(DATA_DIR, 'pueblos'));
    return files
      .map(f => readJSON<Pueblo>(path.join(DATA_DIR, 'pueblos', f)))
      .filter((p): p is Pueblo => p !== null);
  },

  getById(id: string): Pueblo | null {
    return readJSON<Pueblo>(this.getFilePath(id));
  },

  getByWorldId(worldId: string): Pueblo[] {
    return this.getAll().filter(p => p.worldId === worldId);
  },

  create(pueblo: Omit<Pueblo, 'id'>, id?: string): Pueblo {
    const puebloId = id || `PUEBLO_${Date.now()}`;
    const newPueblo: Pueblo = { ...pueblo, id: puebloId };
    writeJSON(this.getFilePath(puebloId), newPueblo);
    return newPueblo;
  },

  update(id: string, pueblo: Partial<Pueblo>): Pueblo | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const updated = { ...existing, ...pueblo };
    writeJSON(this.getFilePath(id), updated);
    return updated;
  },

  delete(id: string): boolean {
    try {
      deleteFile(this.getFilePath(id));
      return true;
    } catch {
      return false;
    }
  }
};

// Edificio operations
export const edificioManager = {
  getFilePath: (id: string) => path.join(DATA_DIR, 'edificios', `${id}.json`),

  getAll(): Edificio[] {
    const files = listFiles(path.join(DATA_DIR, 'edificios'));
    return files
      .map(f => readJSON<Edificio>(path.join(DATA_DIR, 'edificios', f)))
      .filter((e): e is Edificio => e !== null);
  },

  getById(id: string): Edificio | null {
    return readJSON<Edificio>(this.getFilePath(id));
  },

  getByWorldId(worldId: string): Edificio[] {
    return this.getAll().filter(e => e.worldId === worldId);
  },

  getByPuebloId(puebloId: string): Edificio[] {
    return this.getAll().filter(e => e.puebloId === puebloId);
  },

  create(edificio: Omit<Edificio, 'id'>, id?: string): Edificio {
    const edificioId = id || `EDIF_${Date.now()}`;
    const newEdificio: Edificio = { ...edificio, id: edificioId };
    writeJSON(this.getFilePath(edificioId), newEdificio);
    return newEdificio;
  },

  update(id: string, edificio: Partial<Edificio>): Edificio | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const updated = { ...existing, ...edificio };
    writeJSON(this.getFilePath(id), updated);
    return updated;
  },

  delete(id: string): boolean {
    try {
      deleteFile(this.getFilePath(id));
      return true;
    } catch {
      return false;
    }
  }
};

// NPC operations
export const npcManager = {
  getFilePath: (id: string) => path.join(DATA_DIR, 'npcs', `${id}.json`),

  getAll(): NPC[] {
    const files = listFiles(path.join(DATA_DIR, 'npcs'));
    return files
      .map(f => readJSON<NPC>(path.join(DATA_DIR, 'npcs', f)))
      .filter((n): n is NPC => n !== null);
  },

  getById(id: string): NPC | null {
    return readJSON<NPC>(this.getFilePath(id));
  },

  getByLocation(worldId: string, puebloId?: string, edificioId?: string): NPC[] {
    return this.getAll().filter(npc => {
      if (npc.location.worldId !== worldId) return false;
      if (puebloId && npc.location.puebloId !== puebloId) return false;
      if (edificioId && npc.location.edificioId !== edificioId) return false;
      return true;
    });
  },

  create(npc: Omit<NPC, 'id'>, id?: string): NPC {
    const npcId = id || `NPC_${Date.now()}`;
    const newNPC: NPC = { ...npc, id: npcId };
    writeJSON(this.getFilePath(npcId), newNPC);
    return newNPC;
  },

  update(id: string, npc: Partial<NPC>): NPC | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const updated = { ...existing, ...npc };

    // If ID is changing, delete old file and save to new location
    if (npc.id && npc.id !== id) {
      try {
        deleteFile(this.getFilePath(id));
      } catch {
        // Ignore error if old file doesn't exist
      }
      writeJSON(this.getFilePath(updated.id), updated);
    } else {
      writeJSON(this.getFilePath(id), updated);
    }

    return updated;
  },

  updateCard(id: string, card: SillyTavernCard): NPC | null {
    return this.update(id, { card });
  },

  delete(id: string): boolean {
    try {
      deleteFile(this.getFilePath(id));
      return true;
    } catch {
      return false;
    }
  }
};

// Session operations
export const sessionManager = {
  getFilePath: (id: string) => path.join(DATA_DIR, 'sessions', `${id}.json`),

  getAll(): Session[] {
    const files = listFiles(path.join(DATA_DIR, 'sessions'));
    return files
      .map(f => readJSON<Session>(path.join(DATA_DIR, 'sessions', f)))
      .filter((s): s is Session => s !== null);
  },

  getById(id: string): Session | null {
    return readJSON<Session>(this.getFilePath(id));
  },

  getByNPCId(npcId: string): Session[] {
    return this.getAll().filter(s => s.npcId === npcId);
  },

  create(session: Omit<Session, 'id' | 'startTime' | 'lastActivity'>, id?: string): Session {
    const sessionId = id || `SESSION_${Date.now()}`;
    const now = new Date().toISOString();
    const newSession: Session = {
      ...session,
      id: sessionId,
      startTime: now,
      lastActivity: now
    };
    writeJSON(this.getFilePath(sessionId), newSession);
    return newSession;
  },

  update(id: string, session: Partial<Session>): Session | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const updated = { ...existing, ...session, lastActivity: new Date().toISOString() };
    writeJSON(this.getFilePath(id), updated);
    return updated;
  },

  addMessage(id: string, message: { role: 'system' | 'user' | 'assistant'; content: string }): Session | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const newMessage = {
      ...message,
      timestamp: new Date().toISOString()
    };
    const updated = {
      ...existing,
      messages: [...existing.messages, newMessage],
      lastActivity: new Date().toISOString()
    };
    writeJSON(this.getFilePath(id), updated);
    return updated;
  },

  delete(id: string): boolean {
    try {
      deleteFile(this.getFilePath(id));
      return true;
    } catch {
      return false;
    }
  }
};

// NPC Memory/State operations
export const npcStateManager = {
  getFilePath: (npcId: string) => path.join(DATA_DIR, 'npcs', 'states', `npc_${npcId}_memory.json`),

  getMemory(npcId: string): Record<string, any> | null {
    return readJSON<Record<string, any>>(this.getFilePath(npcId));
  },

  saveMemory(npcId: string, memory: Record<string, any>): void {
    writeJSON(this.getFilePath(npcId), memory);
  },

  updateMemory(npcId: string, updates: Record<string, any>): void {
    const existing = this.getMemory(npcId) || {};
    this.saveMemory(npcId, { ...existing, ...updates });
  }
};

// Session Summary operations
export const summaryManager = {
  getFilePath: (sessionId: string) => path.join(DATA_DIR, 'sessions', 'summaries', `${sessionId}.json`),

  getSummary(sessionId: string): string | null {
    const data = readJSON<{ summary: string }>(this.getFilePath(sessionId));
    return data?.summary || null;
  },

  saveSummary(sessionId: string, summary: string): void {
    writeJSON(this.getFilePath(sessionId), { summary, timestamp: new Date().toISOString() });
  }
};
