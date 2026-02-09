import { db } from '@/lib/db';
import { Edificio } from './types';


// Helper para convertir entre modelos de DB y TypeScript
function toDomainEdificio(dbEdificio: any): Edificio {
  return {
    id: dbEdificio.id,
    worldId: dbEdificio.worldId,
    puebloId: dbEdificio.puebloId,
    name: dbEdificio.name,
    lore: dbEdificio.lore,
    rumores: dbEdificio.rumores ? JSON.parse(dbEdificio.rumores) : undefined,
    eventos_recientes: dbEdificio.eventos_recientes ? JSON.parse(dbEdificio.eventos_recientes) : [],
    area: dbEdificio.area ? JSON.parse(dbEdificio.area) : { start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 0, z: 0 } },
    puntosDeInteres: dbEdificio.puntosDeInteres ? JSON.parse(dbEdificio.puntosDeInteres) : undefined,
  };
}

function toDBEdificio(edificio: Edificio): any {
  return {
    id: edificio.id,
    worldId: edificio.worldId,
    puebloId: edificio.puebloId,
    name: edificio.name,
    lore: edificio.lore,
    rumores: edificio.rumores ? JSON.stringify(edificio.rumores) : null,
    eventos_recientes: edificio.eventos_recientes ? JSON.stringify(edificio.eventos_recientes) : null,
    area: JSON.stringify(edificio.area),
    puntosDeInteres: edificio.puntosDeInteres ? JSON.stringify(edificio.puntosDeInteres) : null,
  };
}

// Edificio Database Manager
export const edificioDbManager = {
  /**
   * Obtiene todos los edificios
   */
  async getAll(): Promise<Edificio[]> {
    const edificios = await db.edificio.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return edificios.map(toDomainEdificio);
  },

  /**
   * Obtiene un edificio por su ID
   */
  async getById(id: string): Promise<Edificio | null> {
    const edificio = await db.edificio.findUnique({
      where: { id }
    });
    return edificio ? toDomainEdificio(edificio) : null;
  },

  /**
   * Obtiene edificios por worldId
   */
  async getByWorldId(worldId: string): Promise<Edificio[]> {
    const edificios = await db.edificio.findMany({
      where: { worldId },
      orderBy: { createdAt: 'desc' }
    });
    return edificios.map(toDomainEdificio);
  },

  /**
   * Obtiene edificios por puebloId
   */
  async getByPuebloId(puebloId: string): Promise<Edificio[]> {
    const edificios = await db.edificio.findMany({
      where: { puebloId },
      orderBy: { createdAt: 'desc' }
    });
    return edificios.map(toDomainEdificio);
  },

  /**
   * Obtiene un edificio con su mundo, pueblo y NPCs relacionados
   */
  async getByIdWithRelations(id: string): Promise<(Edificio & { mundo: any; pueblo: any; npcs: any[] }) | null> {
    const edificio = await db.edificio.findUnique({
      where: { id },
      include: {
        mundo: true,
        pueblo: true,
        npcs: true,
      }
    });

    if (!edificio) return null;

    return {
      ...toDomainEdificio(edificio),
      mundo: edificio.mundo,
      pueblo: edificio.pueblo,
      npcs: edificio.npcs,
    };
  },

  /**
   * Busca edificios por nombre (búsqueda parcial)
   */
  async searchByName(searchTerm: string, worldId?: string, puebloId?: string): Promise<Edificio[]> {
    const where: any = {
      name: {
        contains: searchTerm,
      }
    };

    if (worldId) {
      where.worldId = worldId;
    }

    if (puebloId) {
      where.puebloId = puebloId;
    }

    const edificios = await db.edificio.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return edificios.map(toDomainEdificio);
  },

  /**
   * Crea un nuevo edificio
   */
  async create(edificio: Omit<Edificio, 'id'>, id?: string): Promise<Edificio> {
    const edificioId = id || `EDIF_${Date.now()}`;
    const newEdificio: Edificio = { ...edificio, id: edificioId };

    const created = await db.edificio.create({
      data: toDBEdificio(newEdificio)
    });

    return toDomainEdificio(created);
  },

  /**
   * Actualiza un edificio existente
   */
  async update(id: string, edificio: Partial<Edificio>): Promise<Edificio | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: Edificio = {
      ...existing,
      ...edificio,
      id: existing.id, // Mantener el ID original
    };

    const result = await db.edificio.update({
      where: { id },
      data: toDBEdificio(updated)
    });

    return toDomainEdificio(result);
  },

  /**
   * Actualiza solo el lore de un edificio
   */
  async updateLore(id: string, lore: string): Promise<Edificio | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.edificio.update({
      where: { id },
      data: {
        lore
      }
    });

    return toDomainEdificio(result);
  },

  /**
   * Actualiza los eventos recientes de un edificio
   */
  async updateEventosRecientes(id: string, eventos_recientes: string[]): Promise<Edificio | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.edificio.update({
      where: { id },
      data: {
        eventos_recientes: JSON.stringify(eventos_recientes)
      }
    });

    return toDomainEdificio(result);
  },

  /**
   * Actualiza los rumores de un edificio
   */
  async updateRumores(id: string, rumores: string[]): Promise<Edificio | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.edificio.update({
      where: { id },
      data: {
        rumores: JSON.stringify(rumores)
      }
    });

    return toDomainEdificio(result);
  },

  /**
   * Actualiza los puntos de interés de un edificio
   */
  async updatePuntosDeInteres(id: string, puntosDeInteres: any[]): Promise<Edificio | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.edificio.update({
      where: { id },
      data: {
        puntosDeInteres: JSON.stringify(puntosDeInteres)
      }
    });

    return toDomainEdificio(result);
  },

  /**
   * Elimina un edificio
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.edificio.delete({
        where: { id }
      });
      return true;
    }
    catch (error) {
      console.error('Error deleting Edificio:', error);
      return false;
    }
  },

  /**
   * Cuenta edificios por worldId
   */
  async countByWorldId(worldId: string): Promise<number> {
    return await db.edificio.count({ where: { worldId } });
  },

  /**
   * Cuenta edificios por puebloId
   */
  async countByPuebloId(puebloId: string): Promise<number> {
    return await db.edificio.count({ where: { puebloId } });
  },

  /**
   * Cuenta el total de edificios
   */
  async count(): Promise<number> {
    return await db.edificio.count();
  },

  /**
   * Elimina todos los edificios de la base de datos
   */
  async deleteAll(): Promise<number> {
    try {
      const result = await db.edificio.deleteMany({});
      return result.count;
    } catch (error) {
      console.error('Error deleting all edificios:', error);
      return 0;
    }
  }
};

export default edificioDbManager;
