import { db } from '@/lib/db';
import { NPC, SillyTavernCard, NPCLocation } from './types';


// Helper para convertir entre modelos de DB y TypeScript
function toDomainNPC(dbNPC: any): NPC {
  return {
    id: dbNPC.id,
    location: {
      scope: dbNPC.locationScope as 'mundo' | 'pueblo' | 'edificio',
      worldId: dbNPC.worldId,
      puebloId: dbNPC.puebloId || undefined,
      edificioId: dbNPC.edificioId || undefined,
    },
    card: JSON.parse(dbNPC.card) as SillyTavernCard,
  };
}

function toDBNPC(npc: NPC): any {
  return {
    id: npc.id,
    locationScope: npc.location.scope,
    worldId: npc.location.worldId,
    puebloId: npc.location.puebloId || null,
    edificioId: npc.location.edificioId || null,
    card: JSON.stringify(npc.card),
  };
}

// NPC Database Manager
export const npcDbManager = {
  /**
   * Obtiene todos los NPCs
   */
  async getAll(): Promise<NPC[]> {
    const npcs = await db.nPC.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return npcs.map(toDomainNPC);
  },

  /**
   * Obtiene un NPC por su ID
   */
  async getById(id: string): Promise<NPC | null> {
    const npc = await db.nPC.findUnique({
      where: { id }
    });
    return npc ? toDomainNPC(npc) : null;
  },

  /**
   * Obtiene NPCs por ubicación (mundo, pueblo, edificio)
   */
  async getByLocation(worldId: string, puebloId?: string, edificioId?: string): Promise<NPC[]> {
    const where: any = {
      worldId,
    };

    if (puebloId) {
      where.puebloId = puebloId;
    }

    if (edificioId) {
      where.edificioId = edificioId;
    }

    const npcs = await db.nPC.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return npcs.map(toDomainNPC);
  },

  /**
   * Obtiene NPCs por edificioId
   */
  async getByEdificioId(edificioId: string): Promise<NPC[]> {
    const npcs = await db.nPC.findMany({
      where: { edificioId },
      orderBy: { createdAt: 'desc' }
    });
    return npcs.map(toDomainNPC);
  },

  /**
   * Obtiene NPCs por puebloId
   */
  async getByPuebloId(puebloId: string): Promise<NPC[]> {
    const npcs = await db.nPC.findMany({
      where: { puebloId },
      orderBy: { createdAt: 'desc' }
    });
    return npcs.map(toDomainNPC);
  },

  /**
   * Obtiene NPCs por worldId
   */
  async getByWorldId(worldId: string): Promise<NPC[]> {
    const npcs = await db.nPC.findMany({
      where: { worldId },
      orderBy: { createdAt: 'desc' }
    });
    return npcs.map(toDomainNPC);
  },

  /**
   * Crea un nuevo NPC
   */
  async create(npc: Omit<NPC, 'id'>, id?: string): Promise<NPC> {
    const npcId = id || `NPC_${Date.now()}`;
    const newNPC: NPC = { ...npc, id: npcId };

    const created = await db.nPC.create({
      data: toDBNPC(newNPC)
    });

    return toDomainNPC(created);
  },

  /**
   * Actualiza un NPC existente
   */
  async update(id: string, npc: Partial<NPC>): Promise<NPC | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: NPC = {
      ...existing,
      ...npc,
      id: existing.id, // Mantener el ID original
    };

    const result = await db.nPC.update({
      where: { id },
      data: toDBNPC(updated)
    });

    return toDomainNPC(result);
  },

  /**
   * Actualiza solo la tarjeta de un NPC
   */
  async updateCard(id: string, card: SillyTavernCard): Promise<NPC | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.nPC.update({
      where: { id },
      data: {
        card: JSON.stringify(card)
      }
    });

    return toDomainNPC(result);
  },

  /**
   * Elimina un NPC
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.nPC.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('Error deleting NPC:', error);
      return false;
    }
  },

  /**
   * Cuenta NPCs por ubicación
   */
  async countByLocation(worldId?: string, puebloId?: string, edificioId?: string): Promise<number> {
    const where: any = {};

    if (worldId) where.worldId = worldId;
    if (puebloId) where.puebloId = puebloId;
    if (edificioId) where.edificioId = edificioId;

    return await db.nPC.count({ where });
  },

  /**
   * Busca NPCs por nombre (búsqueda simple en la tarjeta)
   */
  async searchByName(searchTerm: string, worldId?: string): Promise<NPC[]> {
    const where: any = {
      card: {
        contains: searchTerm,
      }
    };

    if (worldId) {
      where.worldId = worldId;
    }

    const npcs = await db.nPC.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return npcs.map(toDomainNPC);
  },

  /**
   * Elimina todos los NPCs de la base de datos
   */
  async deleteAll(): Promise<number> {
    try {
      // Primero borrar todas las sesiones relacionadas (foreign key constraint)
      await db.session.deleteMany({});

      // Luego borrar todos los NPCs
      const result = await db.nPC.deleteMany({});
      return result.count;
    } catch (error) {
      console.error('Error deleting all NPCs:', error);
      return 0;
    }
  }
};

export default npcDbManager;
