import fs from 'fs';
import path from 'path';
import { World, Pueblo, Edificio, NPC, Session, SillyTavernCard, PlaceType, PointOfInterest, GrimorioCard, GrimorioCardType, GrimorioCardCategory, SessionSummary, SessionSummaryEntry } from './types';

const DATA_DIR = path.join(process.cwd(), 'data-esparcraft');

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

// PlaceType operations
export const placeTypeManager = {
  getFilePath: (id: string) => path.join(DATA_DIR, 'place-types', `${id}.json`),

  getAll(): PlaceType[] {
    const files = listFiles(path.join(DATA_DIR, 'place-types'));
    return files
      .map(f => readJSON<PlaceType>(path.join(DATA_DIR, 'place-types', f)))
      .filter((p): p is PlaceType => p !== null);
  },

  getById(id: string): PlaceType | null {
    return readJSON<PlaceType>(this.getFilePath(id));
  },

  create(placeType: Omit<PlaceType, 'id'>, id?: string): PlaceType {
    const typeId = id || `PLACE_TYPE_${Date.now()}`;
    const newPlaceType: PlaceType = { ...placeType, id: typeId };
    writeJSON(this.getFilePath(typeId), newPlaceType);
    return newPlaceType;
  },

  update(id: string, placeType: Partial<PlaceType>): PlaceType | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const updated = { ...existing, ...placeType };
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
  },

  // Check if a place type is in use by any POI
  isInUse(typeId: string): boolean {
    const edificios = edificioManager.getAll();
    for (const edificio of edificios) {
      if (edificio.puntosDeInteres) {
        const inUse = edificio.puntosDeInteres.some(poi => poi.tipo === typeId);
        if (inUse) return true;
      }
    }
    return false;
  }
};

// Point of Interest operations (nested within Edificios)
export const pointOfInterestManager = {
  // Get POIs image path
  getImagePath: (edificioId: string, poiId: string) =>
    path.join(DATA_DIR, 'edificios', 'images', `${edificioId}_${poiId}.png`),

  // Save image for POI
  saveImage(edificioId: string, poiId: string, imageData: Buffer): void {
    const imageDir = path.join(DATA_DIR, 'edificios', 'images');
    ensureDir(imageDir);
    const imagePath = this.getImagePath(edificioId, poiId);
    fs.writeFileSync(imagePath, imageData);
  },

  // Delete image for POI
  deleteImage(edificioId: string, poiId: string): void {
    try {
      const imagePath = this.getImagePath(edificioId, poiId);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch (error) {
      console.error('Error deleting POI image:', error);
    }
  },

  // Add POI to edificio
  addToEdificio(edificioId: string, poi: Omit<PointOfInterest, 'id'>): Edificio | null {
    const edificio = edificioManager.getById(edificioId);
    if (!edificio) return null;

    const poiId = `POI_${Date.now()}`;
    const newPOI: PointOfInterest = { ...poi, id: poiId };
    const puntosDeInteres = edificio.puntosDeInteres || [];

    edificioManager.update(edificioId, {
      puntosDeInteres: [...puntosDeInteres, newPOI]
    });

    return edificioManager.getById(edificioId);
  },

  // Update POI in edificio
  updateInEdificio(edificioId: string, poiId: string, updates: Partial<PointOfInterest>): Edificio | null {
    const edificio = edificioManager.getById(edificioId);
    if (!edificio || !edificio.puntosDeInteres) return null;

    const updatedPOIs = edificio.puntosDeInteres.map(poi =>
      poi.id === poiId ? { ...poi, ...updates } : poi
    );

    edificioManager.update(edificioId, {
      puntosDeInteres: updatedPOIs
    });

    return edificioManager.getById(edificioId);
  },

  // Delete POI from edificio
  removeFromEdificio(edificioId: string, poiId: string): Edificio | null {
    const edificio = edificioManager.getById(edificioId);
    if (!edificio || !edificio.puntosDeInteres) return null;

    const updatedPOIs = edificio.puntosDeInteres.filter(poi => poi.id !== poiId);

    edificioManager.update(edificioId, {
      puntosDeInteres: updatedPOIs
    });

    return edificioManager.getById(edificioId);
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

  getByEdificioId(edificioId: string): NPC[] {
    return this.getAll().filter(n => n.location.edificioId === edificioId);
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
  },

  clearMessages(id: string): Session | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      messages: [],
      lastActivity: new Date().toISOString()
    };
    writeJSON(this.getFilePath(id), updated);
    return updated;
  },

  /**
   * Agrega un resumen al historial de resúmenes de la sesión
   */
  addSummaryToHistory(id: string, summary: string, version: number): Session | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const summaryEntry: SessionSummaryEntry = {
      summary,
      timestamp: new Date().toISOString(),
      version
    };

    const summaryHistory = existing.summaryHistory || [];
    const updated = {
      ...existing,
      summaryHistory: [...summaryHistory, summaryEntry],
      lastActivity: new Date().toISOString()
    };
    writeJSON(this.getFilePath(id), updated);
    return updated;
  },

  /**
   * Obtiene el historial de resúmenes de una sesión
   */
  getSummaryHistory(id: string): SessionSummaryEntry[] {
    const session = this.getById(id);
    return session?.summaryHistory || [];
  },

  /**
   * Obtiene la siguiente versión de resumen para una sesión
   */
  getNextSummaryVersion(id: string): number {
    const history = this.getSummaryHistory(id);
    return history.length + 1;
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

  /**
   * Obtiene solo el texto del resumen (mantiene compatibilidad con código existente)
   */
  getSummary(sessionId: string): string | null {
    // Primero intentar leer como SessionSummary (nuevo formato)
    const newData = readJSON<SessionSummary>(this.getFilePath(sessionId));
    if (newData?.summary) {
      return newData.summary;
    }

    // Si falla, intentar leer como formato antiguo
    const oldData = readJSON<{ summary: string; timestamp: string }>(this.getFilePath(sessionId));
    return oldData?.summary || null;
  },

  /**
   * Obtiene los datos completos del resumen con metadata
   * Soporta formato antiguo (migración automática) y nuevo
   */
  getSummaryData(sessionId: string): SessionSummary | null {
    const filePath = this.getFilePath(sessionId);

    // Primero intentar leer como SessionSummary (nuevo formato)
    const newData = readJSON<SessionSummary>(filePath);
    if (newData && newData.sessionId) {
      // Es el nuevo formato con todos los campos
      return newData;
    }

    // Si no tiene sessionId, puede ser formato antiguo o corrupto
    if (newData && newData.summary) {
      // Migración automática: formato antiguo
      // No tenemos sessionId, npcId, etc., pero devolvemos lo que tenemos
      // El código que lo usa debe manejar campos opcionales nulos
      return {
        sessionId: sessionId,
        npcId: '',  // No disponible en formato antiguo
        playerId: undefined,
        playerName: undefined,
        npcName: undefined,
        summary: newData.summary,
        timestamp: newData.timestamp || new Date().toISOString(),
        version: 1
      };
    }

    return null;
  },

  /**
   * Guarda un resumen con metadata completa (npcId, playerId, playerName, npcName, version)
   */
  saveSummary(
    sessionId: string,
    npcId: string,
    playerName: string,
    npcName: string,
    summary: string,
    version?: number
  ): void {
    ensureDir(path.join(DATA_DIR, 'sessions', 'summaries'));
    const summaryData: SessionSummary = {
      sessionId,
      npcId,
      playerName,
      npcName,
      summary,
      timestamp: new Date().toISOString(),
      version: version || 1
    };
    writeJSON(this.getFilePath(sessionId), summaryData);
  },

  /**
   * Obtiene todos los resúmenes de un NPC específico
   * Soporta formato antiguo y nuevo
   */
  getSummariesByNPC(npcId: string): SessionSummary[] {
    const summaryDir = path.join(DATA_DIR, 'sessions', 'summaries');
    ensureDir(summaryDir);
    const files = listFiles(summaryDir);

    return files
      .map(f => {
        const filePath = path.join(summaryDir, f);
        // Primero intentar leer como nuevo formato
        const newData = readJSON<SessionSummary>(filePath);

        if (newData && newData.sessionId) {
          // Nuevo formato - filtrar por npcId
          if (newData.npcId === npcId) {
            return newData;
          }
          return null;
        }

        // Formato antiguo - no tiene npcId, devolver null (no se puede filtrar)
        return null;
      })
      .filter((s): s is SessionSummary => s !== null);
  },

  /**
   * Obtiene todos los resúmenes del sistema
   * Soporta formato antiguo y nuevo
   */
  getAllSummaries(): SessionSummary[] {
    const summaryDir = path.join(DATA_DIR, 'sessions', 'summaries');
    ensureDir(summaryDir);
    const files = listFiles(summaryDir);

    return files
      .map(f => {
        const filePath = path.join(summaryDir, f);
        // Primero intentar leer como nuevo formato
        const newData = readJSON<SessionSummary>(filePath);

        if (newData && newData.sessionId) {
          // Nuevo formato con todos los campos
          return newData;
        }

        // Formato antiguo - migrar a nuevo formato
        if (newData && newData.summary) {
          const sessionId = f.replace('.json', '');
          return {
            sessionId: sessionId,
            npcId: '',  // No disponible en formato antiguo
            playerId: undefined,
            playerName: undefined,
            npcName: undefined,
            summary: newData.summary,
            timestamp: newData.timestamp || new Date().toISOString(),
            version: 1
          };
        }

        return null;
      })
      .filter((s): s is SessionSummary => s !== null);
  }
};

// Edificio Memory/State operations
export const edificioStateManager = {
  getFilePath: (edificioId: string) => path.join(DATA_DIR, 'edificios', 'states', `edificio_${edificioId}_memory.json`),

  getMemory(edificioId: string): Record<string, any> | null {
    return readJSON<Record<string, any>>(this.getFilePath(edificioId));
  },

  saveMemory(edificioId: string, memory: Record<string, any>): void {
    writeJSON(this.getFilePath(edificioId), memory);
  },

  updateMemory(edificioId: string, updates: Record<string, any>): void {
    const existing = this.getMemory(edificioId) || {};
    this.saveMemory(edificioId, { ...existing, ...updates });
  }
};

// Pueblo Memory/State operations
export const puebloStateManager = {
  getFilePath: (puebloId: string) => path.join(DATA_DIR, 'pueblos', 'states', `pueblo_${puebloId}_memory.json`),

  getMemory(puebloId: string): Record<string, any> | null {
    return readJSON<Record<string, any>>(this.getFilePath(puebloId));
  },

  saveMemory(puebloId: string, memory: Record<string, any>): void {
    writeJSON(this.getFilePath(puebloId), memory);
  },

  updateMemory(puebloId: string, updates: Record<string, any>): void {
    const existing = this.getMemory(puebloId) || {};
    this.saveMemory(puebloId, { ...existing, ...updates });
  }
};

// World Memory/State operations
export const worldStateManager = {
  getFilePath: (worldId: string) => path.join(DATA_DIR, 'worlds', 'states', `world_${worldId}_memory.json`),

  getMemory(worldId: string): Record<string, any> | null {
    return readJSON<Record<string, any>>(this.getFilePath(worldId));
  },

  saveMemory(worldId: string, memory: Record<string, any>): void {
    writeJSON(this.getFilePath(worldId), memory);
  },

  updateMemory(worldId: string, updates: Record<string, any>): void {
    const existing = this.getMemory(worldId) || {};
    this.saveMemory(worldId, { ...existing, ...updates });
  }
};

// Template User operations (configuración global)
export const templateUserManager = {
  getFilePath: () => path.join(DATA_DIR, 'settings', 'templateUser.json'),

  getTemplate(): string {
    const data = readJSON<{ template: string; timestamp: string }>(this.getFilePath());
    return data?.template || '';
  },

  saveTemplate(template: string): void {
    writeJSON(this.getFilePath(), {
      template,
      timestamp: new Date().toISOString()
    });
  }
};

// Grimorio operations (plantillas reutilizables)
export const grimorioManager = {
  getFilePath: (id: string) => path.join(DATA_DIR, 'grimorio', `${id}.json`),

  getAll(): GrimorioCard[] {
    const files = listFiles(path.join(DATA_DIR, 'grimorio'));
    return files
      .map(f => readJSON<GrimorioCard>(path.join(DATA_DIR, 'grimorio', f)))
      .filter((c): c is GrimorioCard => c !== null);
  },

  getById(id: string): GrimorioCard | null {
    return readJSON<GrimorioCard>(this.getFilePath(id));
  },

  getByKey(key: string): GrimorioCard | null {
    const allCards = this.getAll();
    return allCards.find(card => card.key === key) || null;
  },

  getByCategory(categoria: GrimorioCardCategory): GrimorioCard[] {
    const allCards = this.getAll();
    return allCards.filter(card => card.categoria === categoria);
  },

  getByType(tipo: GrimorioCardType): GrimorioCard[] {
    const allCards = this.getAll();
    return allCards.filter(card => card.tipo === tipo);
  },

  create(card: Omit<GrimorioCard, 'id' | 'timestamp'>): GrimorioCard {
    const cardId = `GRIMORIO_${Date.now()}`;
    const newCard: GrimorioCard = { ...card, id: cardId, timestamp: new Date().toISOString() };
    writeJSON(this.getFilePath(cardId), newCard);
    return newCard;
  },

  update(id: string, updates: Partial<Omit<GrimorioCard, 'id'>>): GrimorioCard | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, timestamp: new Date().toISOString() };
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
  },

  // Valida que la key sea única
  isKeyUnique(key: string, excludeId?: string): boolean {
    const allCards = this.getAll();
    return allCards
      .filter(card => card.key === key && card.id !== excludeId)
      .length === 0;
  }
};
