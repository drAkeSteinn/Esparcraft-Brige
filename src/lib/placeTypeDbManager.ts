import { db } from '@/lib/db';
import { PlaceType } from './types';

// Helper para convertir entre modelos de DB y TypeScript
function toDomainPlaceType(dbPlaceType: any): PlaceType {
  return {
    id: dbPlaceType.id,
    name: dbPlaceType.name,
    icon: dbPlaceType.icon,
    color: dbPlaceType.color || undefined,
  };
}

function toDBPlaceType(placeType: PlaceType): any {
  return {
    id: placeType.id,
    name: placeType.name,
    icon: placeType.icon,
    color: placeType.color || null,
  };
}

// PlaceType Database Manager
export const placeTypeDbManager = {
  /**
   * Obtiene todos los tipos de lugares
   */
  async getAll(): Promise<PlaceType[]> {
    const placeTypes = await db.placeType.findMany({
      orderBy: { name: 'asc' }
    });
    return placeTypes.map(toDomainPlaceType);
  },

  /**
   * Obtiene un tipo de lugar por su ID
   */
  async getById(id: string): Promise<PlaceType | null> {
    const placeType = await db.placeType.findUnique({
      where: { id }
    });
    return placeType ? toDomainPlaceType(placeType) : null;
  },

  /**
   * Crea un nuevo tipo de lugar
   */
  async create(placeType: Omit<PlaceType, 'id'>, id?: string): Promise<PlaceType> {
    const typeId = id || `PLACE_TYPE_${Date.now()}`;
    const newPlaceType: PlaceType = { ...placeType, id: typeId };

    const created = await db.placeType.create({
      data: toDBPlaceType(newPlaceType)
    });

    return toDomainPlaceType(created);
  },

  /**
   * Actualiza un tipo de lugar existente
   */
  async update(id: string, placeType: Partial<PlaceType>): Promise<PlaceType | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: PlaceType = {
      ...existing,
      ...placeType,
      id: existing.id, // Mantener el ID original
    };

    const result = await db.placeType.update({
      where: { id },
      data: toDBPlaceType(updated)
    });

    return toDomainPlaceType(result);
  },

  /**
   * Elimina un tipo de lugar
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.placeType.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('Error deleting PlaceType:', error);
      return false;
    }
  },

  /**
   * Busca tipos de lugares por nombre (búsqueda simple)
   */
  async searchByName(searchTerm: string): Promise<PlaceType[]> {
    const placeTypes = await db.placeType.findMany({
      where: {
        name: {
          contains: searchTerm,
        }
      },
      orderBy: { name: 'asc' }
    });
    return placeTypes.map(toDomainPlaceType);
  },

  /**
   * Verifica si un tipo de lugar está en uso por algún POI en la DB
   */
  async isInUse(typeId: string): Promise<boolean> {
    try {
      // Buscar edificios que tengan POIs con este tipo
      const edificios = await db.edificio.findMany({
        where: {
          puntosDeInteres: {
            not: null
          }
        }
      });

      for (const edificio of edificios) {
        if (edificio.puntosDeInteres) {
          const puntosDeInteres = JSON.parse(edificio.puntosDeInteres) as any[];
          const inUse = puntosDeInteres.some((poi: any) => poi.tipo === typeId);
          if (inUse) return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking if PlaceType is in use:', error);
      return false;
    }
  },

  /**
   * Elimina todos los tipos de lugares de la base de datos
   */
  async deleteAll(): Promise<number> {
    try {
      const result = await db.placeType.deleteMany({});
      return result.count;
    } catch (error) {
      console.error('Error deleting all PlaceTypes:', error);
      return 0;
    }
  }
};

export default placeTypeDbManager;
