import { db } from '@/lib/db';
import { World } from './types';

// Verificar que db.world está disponible
if (typeof db !== 'object' || db === null) {
  throw new Error('Prisma db client is not initialized');
}

if (!db.world) {
  console.error('db.world is undefined. db keys:', Object.keys(db));
}


// Helper para convertir entre modelos de DB y TypeScript
function toDomainWorld(dbWorld: any): World {
  return {
    id: dbWorld.id,
    name: dbWorld.name,
    lore: dbWorld.lore ? JSON.parse(dbWorld.lore) : {
      estado_mundo: '',
      rumores: [],
      eventos: []
    },
    area: dbWorld.area ? JSON.parse(dbWorld.area) : undefined,
  };
}

function toDBWorld(world: World): any {
  return {
    id: world.id,
    name: world.name,
    lore: JSON.stringify(world.lore),
    area: world.area ? JSON.stringify(world.area) : null,
  };
}

// World Database Manager
export const worldDbManager = {
  /**
   * Obtiene todos los mundos
   */
  async getAll(): Promise<World[]> {
    const worlds = await db.world.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return worlds.map(toDomainWorld);
  },

  /**
   * Obtiene un mundo por su ID
   */
  async getById(id: string): Promise<World | null> {
    const world = await db.world.findUnique({
      where: { id }
    });
    return world ? toDomainWorld(world) : null;
  },

  /**
   * Obtiene un mundo por su nombre
   */
  async getByName(name: string): Promise<World | null> {
    const world = await db.world.findFirst({
      where: { name }
    });
    return world ? toDomainWorld(world) : null;
  },

  /**
   * Obtiene todos los mundos con sus pueblos relacionados
   */
  async getAllWithPueblos(): Promise<(World & { pueblos: any[] })[]> {
    const worlds = await db.world.findMany({
      include: {
        pueblos: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return worlds.map((dbWorld: any) => ({
      ...toDomainWorld(dbWorld),
      pueblos: dbWorld.pueblos,
    }));
  },

  /**
   * Obtiene un mundo con sus pueblos y edificios relacionados
   */
  async getByIdWithRelations(id: string): Promise<(World & { pueblos: any[]; edificios: any[]; npcs: any[] }) | null> {
    const world = await db.world.findUnique({
      where: { id },
      include: {
        pueblos: true,
        edificios: true,
        npcs: true,
      }
    });

    if (!world) return null;

    return {
      ...toDomainWorld(world),
      pueblos: world.pueblos,
      edificios: world.edificios,
      npcs: world.npcs,
    };
  },

  /**
   * Crea un nuevo mundo
   */
  async create(world: Omit<World, 'id'>, id?: string): Promise<World> {
    const worldId = id || `WORLD_${Date.now()}`;
    const newWorld: World = { ...world, id: worldId };

    const created = await db.world.create({
      data: toDBWorld(newWorld)
    });

    return toDomainWorld(created);
  },

  /**
   * Actualiza un mundo existente
   */
  async update(id: string, world: Partial<World>): Promise<World | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: World = {
      ...existing,
      ...world,
      id: existing.id, // Mantener el ID original
    };

    const result = await db.world.update({
      where: { id },
      data: toDBWorld(updated)
    });

    return toDomainWorld(result);
  },

  /**
   * Actualiza solo el lore de un mundo
   */
  async updateLore(id: string, lore: World['lore']): Promise<World | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.world.update({
      where: { id },
      data: {
        lore: JSON.stringify(lore)
      }
    });

    return toDomainWorld(result);
  },

  /**
   * Elimina un mundo
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.world.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('Error deleting World:', error);
      return false;
    }
  },

  /**
   * Busca mundos por nombre (búsqueda parcial)
   */
  async searchByName(searchTerm: string): Promise<World[]> {
    const worlds = await db.world.findMany({
      where: {
        name: {
          contains: searchTerm,
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return worlds.map(toDomainWorld);
  },

  /**
   * Cuenta el total de mundos
   */
  async count(): Promise<number> {
    return await db.world.count();
  },

  /**
   * Elimina todos los mundos de la base de datos
   */
  async deleteAll(): Promise<number> {
    try {
      const result = await db.world.deleteMany({});
      return result.count;
    } catch (error) {
      console.error('Error deleting all worlds:', error);
      return 0;
    }
  }
};

export default worldDbManager;
