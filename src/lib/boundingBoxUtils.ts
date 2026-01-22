import { Area, Coords3D, World, Pueblo, Edificio } from './types';
import { edificioManager, puebloManager } from './fileManager';

/**
 * Calcula el bounding box mínimo que contiene todas las coordenadas dadas
 * @param areas Array de áreas a combinar
 * @returns Area combinada o null si no hay áreas
 */
export function calculateBoundingBox(areas: Area[]): Area | null {
  if (!areas || areas.length === 0) {
    return null;
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const area of areas) {
    const { start, end } = area;

    minX = Math.min(minX, start.x, end.x);
    maxX = Math.max(maxX, start.x, end.x);

    minY = Math.min(minY, start.y, end.y);
    maxY = Math.max(maxY, start.y, end.y);

    minZ = Math.min(minZ, start.z, end.z);
    maxZ = Math.max(maxZ, start.z, end.z);
  }

  return {
    start: { x: minX, y: minY, z: minZ } as Coords3D,
    end: { x: maxX, y: maxY, z: maxZ } as Coords3D
  };
}

/**
 * Calcula el área de un bounding box
 * @param area Área del bounding box
 * @returns Área (ancho * profundidad en el plano XZ)
 */
export function calculateBoundingBoxArea(area: Area): number {
  const width = Math.abs(area.end.x - area.start.x);
  const depth = Math.abs(area.end.z - area.start.z);
  return width * depth;
}

/**
 * Obtiene las coordenadas del centro de un bounding box
 * @param area Área del bounding box
 * @returns Coordenadas del centro
 */
export function getBoundingBoxCenter(area: Area): Coords3D {
  return {
    x: (area.start.x + area.end.x) / 2,
    y: (area.start.y + area.end.y) / 2,
    z: (area.start.z + area.end.z) / 2
  } as Coords3D;
}

/**
 * Calcula el bounding box de un pueblo basado en sus edificaciones
 * @param puebloId ID del pueblo
 * @returns Área calculada o null si no tiene edificaciones
 */
export function calculatePuebloBoundingBox(puebloId: string): Area | null {
  const edificios = edificioManager.getByPuebloId(puebloId);

  if (!edificios || edificios.length === 0) {
    return null;
  }

  const areas = edificios.map(edificio => edificio.area);
  return calculateBoundingBox(areas);
}

/**
 * Calcula el bounding box de un mundo basado en los bounding boxes de sus pueblos
 * @param worldId ID del mundo
 * @returns Área calculada o null si no tiene pueblos con área
 */
export function calculateWorldBoundingBox(worldId: string): Area | null {
  const pueblos = puebloManager.getByWorldId(worldId);

  if (!pueblos || pueblos.length === 0) {
    return null;
  }

  // Recopilar solo los pueblos que tienen área
  const areas: Area[] = [];
  for (const pueblo of pueblos) {
    const puebloArea = calculatePuebloBoundingBox(pueblo.id);
    if (puebloArea) {
      areas.push(puebloArea);
    }
  }

  if (areas.length === 0) {
    return null;
  }

  return calculateBoundingBox(areas);
}

/**
 * Actualiza el área de un pueblo calculándola desde sus edificaciones
 * @param puebloId ID del pueblo
 * @returns Pueblo actualizado con su área o null si hay error
 */
export function updatePuebloArea(puebloId: string): Pueblo | null {
  const area = calculatePuebloBoundingBox(puebloId);

  if (!area) {
    // Si no tiene área, eliminar el campo area si existe
    const existing = puebloManager.getById(puebloId);
    if (existing && 'area' in existing) {
      const { area: _removed, ...puebloWithoutArea } = existing as any;
      return puebloManager.update(puebloId, puebloWithoutArea);
    }
    return puebloManager.getById(puebloId);
  }

  return puebloManager.update(puebloId, { area });
}

/**
 * Actualiza el área de un mundo calculándola desde sus pueblos
 * @param worldId ID del mundo
 * @returns Mundo actualizado con su área o null si hay error
 */
export function updateWorldArea(worldId: string): World | null {
  const area = calculateWorldBoundingBox(worldId);

  if (!area) {
    // Si no tiene área, eliminar el campo area si existe
    const existing = worldManager.getById(worldId);
    if (existing && 'area' in existing) {
      const { area: _removed, ...worldWithoutArea } = existing as any;
      return worldManager.update(worldId, worldWithoutArea);
    }
    return worldManager.getById(worldId);
  }

  return worldManager.update(worldId, { area });
}

/**
 * Actualiza todas las áreas de los pueblos y mundos
 * @returns Estadísticas de la actualización
 */
export function updateAllAreas(): {
  pueblosUpdated: number;
  pueblosTotal: number;
  mundosUpdated: number;
  mundosTotal: number;
} {
  const pueblos = puebloManager.getAll();
  let pueblosUpdated = 0;

  for (const pueblo of pueblos) {
    const area = calculatePuebloBoundingBox(pueblo.id);
    if (area) {
      puebloManager.update(pueblo.id, { area });
      pueblosUpdated++;
    } else if (pueblo.area) {
      // Eliminar área si ya no tiene edificaciones
      const { area: _removed, ...puebloWithoutArea } = pueblo as any;
      puebloManager.update(pueblo.id, puebloWithoutArea);
    }
  }

  const mundos = worldManager.getAll();
  let mundosUpdated = 0;

  for (const mundo of mundos) {
    const area = calculateWorldBoundingBox(mundo.id);
    if (area) {
      worldManager.update(mundo.id, { area });
      mundosUpdated++;
    } else if ((mundo as any).area) {
      // Eliminar área si ya no tiene pueblos con edificaciones
      const { area: _removed, ...worldWithoutArea } = mundo as any;
      worldManager.update(mundo.id, worldWithoutArea);
    }
  }

  return {
    pueblosUpdated,
    pueblosTotal: pueblos.length,
    mundosUpdated,
    mundosTotal: mundos.length
  };
}

/**
 * Obtiene estadísticas de coordenadas de un área
 * @param area Área a analizar
 * @returns Objeto con estadísticas
 */
export function getAreaStats(area: Area) {
  const center = getBoundingBoxCenter(area);
  const dimensions = {
    width: Math.abs(area.end.x - area.start.x),
    height: Math.abs(area.end.y - area.start.y),
    depth: Math.abs(area.end.z - area.start.z)
  };

  return {
    center,
    dimensions,
    area: dimensions.width * dimensions.depth,
    coordinates: {
      minX: area.start.x,
      maxX: area.end.x,
      minY: area.start.y,
      maxY: area.end.y,
      minZ: area.start.z,
      maxZ: area.end.z
    }
  };
}

// Exportar worldManager desde fileManager para evitar dependencia circular
import { worldManager } from './fileManager';
