import { db } from '@/lib/db';
import { Pueblo } from './types';

// Helper para convertir entre modelos de DB y TypeScript
function toDomainPueblo(dbPueblo: any): Pueblo {
  return {
    id: dbPueblo.id,
    worldId: dbPueblo.worldId,
    name: dbPueblo.name,
    type: dbPueblo.type as 'pueblo' | 'nacion',
    description: dbPueblo.description,
    lore: dbPueblo.lore ? JSON.parse(dbPueblo.lore) : {
      estado_pueblo: '',
      rumores: [],
      eventos: []
    },
    area: dbPueblo.area ? JSON.parse(dbPueblo.area) : undefined,
  };
}

function toDBPueblo(pueblo: Pueblo): any {
  return {
    id: pueblo.id,
    worldId: pueblo.worldId,
    name: pueblo.name,
    type: pueblo.type,
    description: pueblo.description,
    lore: JSON.stringify(pueblo.lore),
    area: pueblo.area ? JSON.stringify(pueblo.area) : null,
  };
}

// Pueblo Database Manager
export const puebloDbManager = {
  /**
   * Obtiene todos los pueblos
   */
  async getAll(): Promise<Pueblo[]> {
    const pueblos = await db.pueblo.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return pueblos.map(toDomainPueblo);
  },

  /**
   * Obtiene un pueblo por su ID
   */
  async getById(id: string): Promise<Pueblo | null> {
    const pueblo = await db.pueblo.findUnique({
      where: { id }
    });
    return pueblo ? toDomainPueblo(pueblo) : null;
  },

  /**
   * Obtiene pueblos por worldId
   */
  async getByWorldId(worldId: string): Promise<Pueblo[]> {
    const pueblos = await db.pueblo.findMany({
      where: { worldId },
      orderBy: { createdAt: 'desc' }
    });
    return pueblos.map(toDomainPueblo);
  },

  /**
   * Obtiene un pueblo con su mundo y edificios relacionados
   */
  async getByIdWithRelations(id: string): Promise<(Pueblo & { mundo: any; edificios: any[]; npcs: any[] }) | null> {
    const pueblo = await db.pueblo.findUnique({
      where: { id },
      include: {
        mundo: true,
        edificios: true,
        npcs: true,
      }
    });

    if (!pueblo) return null;

    return {
      ...toDomainPueblo(pueblo),
      mundo: pueblo.mundo,
      edificios: pueblo.edificios,
      npcs: pueblo.npcs,
    };
  },

  /**
   * Obtiene pueblos por tipo
   */
  async getByType(type: 'pueblo' | 'nacion'): Promise<Pueblo[]> {
    const pueblos = await db.pueblo.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' }
    });
    return pueblos.map(toDomainPueblo);
  },

  /**
   * Obtiene pueblos por worldId y tipo
   */
  async getByWorldIdAndType(worldId: string, type: 'pueblo' | 'nacion'): Promise<Pueblo[]> {
    const pueblos = await db.pueblo.findMany({
      where: {
        worldId,
        type
      },
      orderBy: { createdAt: 'desc' }
    });
    return pueblos.map(toDomainPueblo);
  },

  /**
   * Busca pueblos por nombre (búsqueda parcial)
   */
  async searchByName(searchTerm: string, worldId?: string): Promise<Pueblo[]> {
    const where: any = {
      name: {
        contains: searchTerm,
      }
    };

    if (worldId) {
      where.worldId = worldId;
    }

    const pueblos = await db.pueblo.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return pueblos.map(toDomainPueblo);
  },

  /**
   * Crea un nuevo pueblo
   */
  async create(pueblo: Omit<Pueblo, 'id'>, id?: string): Promise<Pueblo> {
    const puebloId = id || `PUEBLO_${Date.now()}`;
    const newPueblo: Pueblo = { ...pueblo, id: puebloId };

    const created = await db.pueblo.create({
      data: toDBPueblo(newPueblo)
    });

    return toDomainPueblo(created);
  },

  /**
   * Actualiza un pueblo existente
   */
  async update(id: string, pueblo: Partial<Pueblo>): Promise<Pueblo | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: Pueblo = {
      ...existing,
      ...pueblo,
      id: existing.id, // Mantener el ID original
    };

    const result = await db.pueblo.update({
      where: { id },
      data: toDBPueblo(updated)
    });

    return toDomainPueblo(result);
  },

  /**
   * Actualiza solo el lore de un pueblo
   */
  async updateLore(id: string, lore: Pueblo['lore']): Promise<Pueblo | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.pueblo.update({
      where: { id },
      data: {
        lore: JSON.stringify(lore)
      }
    });

    return toDomainPueblo(result);
  },

  /**
   * Actualiza solo la descripción de un pueblo
   */
  async updateDescription(id: string, description: string): Promise<Pueblo | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.pueblo.update({
      where: { id },
      data: {
        description
      }
    });

    return toDomainPueblo(result);
  },

  /**
   * Elimina un pueblo
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.pueblo.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('Error deleting Pueblo:', error);
      return false;
    }
  },

  /**
   * Cuenta pueblos por worldId
   */
  async countByWorldId(worldId: string): Promise<number> {
    return await db.pueblo.count({ where: { worldId } });
  },

  /**
   * Cuenta pueblos por worldId y tipo
   */
  async countByWorldIdAndType(worldId: string, type: 'pueblo' | 'nacion'): Promise<number> {
    return await db.pueblo.count({
      where: {
        worldId,
        type
      }
    });
  },

  /**
   * Cuenta el total de pueblos
   */
  async count(): Promise<number> {
    return await db.pueblo.count();
  },

  /**
   * Elimina todos los pueblos de la base de datos
   */
  async deleteAll(): Promise<number> {
    try {
      const result = await db.pueblo.deleteMany({});
      return result.count;
    } catch (error) {
      console.error('Error deleting all pueblos:', error);
      return 0;
    }
  }
};

export default puebloDbManager;
