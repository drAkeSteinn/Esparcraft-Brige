/**
 * Utilidades de Coordenadas para el Mapa 2D Interactivo
 * Conversiones y transformaciones entre Minecraft y Pixels
 */

import {
  MinecraftCoords,
  PixelCoords,
  CoordTransformOptions,
  CoordTransformResult,
  GridSnapResult,
  CoordBounds
} from './types';

/**
 * Utilidades de conversión de coordenadas
 */
export const coordConverter: CoordConverter = {
  /**
   * Convierte coordenadas Minecraft a píxeles
   * x = worldX * scale + offsetX
   * y = worldZ * scale + offsetY
   */
  minecraftToPixel(
    mc: MinecraftCoords,
    options: CoordTransformOptions
  ): PixelCoords {
    const { scale = 1, offsetX = 0, offsetY = 0 } = options;

    return {
      x: mc.worldX * scale + offsetX,
      y: mc.worldZ * scale + offsetY
    };
  },

  /**
   * Convierte coordenadas píxeles a Minecraft
   * worldX = (x - offsetX) / scale
   * worldZ = (y - offsetY) / scale
   */
  pixelToMinecraft(
    px: PixelCoords,
    options: CoordTransformOptions
  ): MinecraftCoords {
    const { scale = 1, offsetX = 0, offsetY = 0 } = options;

    return {
      worldX: (px.x - offsetX) / scale,
      worldZ: (px.y - offsetY) / scale
    };
  },

  /**
   * Aplica snap a grilla para coordenadas Minecraft
   */
  snapToGrid(mc: MinecraftCoords, gridSize: number): GridSnapResult {
    const snappedX = Math.round(mc.worldX / gridSize) * gridSize;
    const snappedZ = Math.round(mc.worldZ / gridSize) * gridSize;
    const snapped = snappedX !== mc.worldX || snappedZ !== mc.worldZ;

    return {
      snappedX,
      snappedZ,
      snapped
    };
  },

  /**
   * Calcula distancia euclidiana entre dos puntos (en Minecraft coords)
   */
  distance(a: MinecraftCoords, b: MinecraftCoords): number {
    const dx = b.worldX - a.worldX;
    const dz = b.worldZ - a.worldZ;
    return Math.sqrt(dx * dx + dz * dz);
  },

  /**
   * Normaliza un rectángulo (asegura que start <= end)
   */
  normalizeRect(bounds: CoordBounds): CoordBounds {
    const minX = Math.min(bounds.start.worldX, bounds.end.worldX);
    const maxX = Math.max(bounds.start.worldX, bounds.end.worldX);
    const minZ = Math.min(bounds.start.worldZ, bounds.end.worldZ);
    const maxZ = Math.max(bounds.start.worldZ, bounds.end.worldZ);

    return {
      start: { worldX: minX, worldZ: minZ },
      end: { worldX: maxX, worldZ: maxZ }
    };
  }
};

/**
 * Transforma un array de coordenadas Minecraft a píxeles
 */
export function transformCoordsToPixels(
  coords: MinecraftCoords[],
  options: CoordTransformOptions
): PixelCoords[] {
  return coords.map(mc => coordConverter.minecraftToPixel(mc, options));
}

/**
 * Transforma un array de coordenadas píxeles a Minecraft
 */
export function transformPixelsToMinecraft(
  coords: PixelCoords[],
  options: CoordTransformOptions
): MinecraftCoords[] {
  return coords.map(px => coordConverter.pixelToMinecraft(px, options));
}

/**
 * Calcula el centro de un rectángulo (en coordenadas Minecraft)
 */
export function getRectCenter(bounds: CoordBounds): MinecraftCoords {
  const centerX = (bounds.start.worldX + bounds.end.worldX) / 2;
  const centerZ = (bounds.start.worldZ + bounds.end.worldZ) / 2;

  return {
    worldX: centerX,
    worldZ: centerZ
  };
}

/**
 * Calcula el área de un rectángulo (en bloques de Minecraft)
 */
export function getRectArea(bounds: CoordBounds): number {
  const width = Math.abs(bounds.end.worldX - bounds.start.worldX);
  const length = Math.abs(bounds.end.worldZ - bounds.start.worldZ);
  return width * length;
}

/**
 * Verifica si un punto está dentro de un rectángulo
 */
export function pointInRect(
  point: MinecraftCoords,
  bounds: CoordBounds
): boolean {
  const normalized = coordConverter.normalizeRect(bounds);
  const minX = Math.min(normalized.start.worldX, normalized.end.worldX);
  const maxX = Math.max(normalized.start.worldX, normalized.end.worldX);
  const minZ = Math.min(normalized.start.worldZ, normalized.end.worldZ);
  const maxZ = Math.max(normalized.start.worldZ, normalized.end.worldZ);

  return (
    point.worldX >= minX &&
    point.worldX <= maxX &&
    point.worldZ >= minZ &&
    point.worldZ <= maxZ
  );
}

/**
 * Verifica si dos rectángulos se intersectan
 */
export function rectsIntersect(
  rect1: CoordBounds,
  rect2: CoordBounds
): boolean {
  const norm1 = coordConverter.normalizeRect(rect1);
  const norm2 = coordConverter.normalizeRect(rect2);

  const min1X = Math.min(norm1.start.worldX, norm1.end.worldX);
  const max1X = Math.max(norm1.start.worldX, norm1.end.worldX);
  const min1Z = Math.min(norm1.start.worldZ, norm1.end.worldZ);
  const max1Z = Math.max(norm1.start.worldZ, norm1.end.worldZ);

  const min2X = Math.min(norm2.start.worldX, norm2.end.worldX);
  const max2X = Math.max(norm2.start.worldX, norm2.end.worldX);
  const min2Z = Math.min(norm2.start.worldZ, norm2.end.worldZ);
  const max2Z = Math.max(norm2.start.worldZ, norm2.end.worldZ);

  return !(
    max1X < min2X ||
    min1X > max2X ||
    max1Z < min2Z ||
    min1Z > max2Z
  );
}

/**
 * Clona coordenadas Minecraft
 */
export function cloneMinecraftCoords(coords: MinecraftCoords): MinecraftCoords {
  return {
    worldX: coords.worldX,
    worldY: coords.worldY,
    worldZ: coords.worldZ
  };
}

/**
 * Clona coordenadas Pixels
 */
export function clonePixelCoords(coords: PixelCoords): PixelCoords {
  return {
    x: coords.x,
    y: coords.y
  };
}

/**
 * Crea coordenadas Minecraft vacías
 */
export function emptyMinecraftCoords(): MinecraftCoords {
  return {
    worldX: 0,
    worldY: 0,
    worldZ: 0
  };
}

/**
 * Crea coordenadas Pixel vacías
 */
export function emptyPixelCoords(): PixelCoords {
  return {
    x: 0,
    y: 0
  };
}

/**
 * Verifica si dos coordenadas Minecraft son iguales
 */
export function coordsEqual(
  a: MinecraftCoords,
  b: MinecraftCoords,
  tolerance = 0.001
): boolean {
  return (
    Math.abs(a.worldX - b.worldX) < tolerance &&
    Math.abs(a.worldZ - b.worldZ) < tolerance &&
    (a.worldY === b.worldY || Math.abs((a.worldY || 0) - (b.worldY || 0)) < tolerance)
  );
}

/**
 * Añade un offset a coordenadas Minecraft
 */
export function addOffset(
  coords: MinecraftCoords,
  offsetX: number,
  offsetZ: number
): MinecraftCoords {
  return {
    worldX: coords.worldX + offsetX,
    worldY: coords.worldY,
    worldZ: coords.worldZ + offsetZ
  };
}

/**
 * Calcula el bounding box de un array de puntos
 */
export function getBoundingBox(
  points: MinecraftCoords[]
): CoordBounds | null {
  if (points.length === 0) return null;

  const worldXValues = points.map(p => p.worldX);
  const worldZValues = points.map(p => p.worldZ);

  const minX = Math.min(...worldXValues);
  const maxX = Math.max(...worldXValues);
  const minZ = Math.min(...worldZValues);
  const maxZ = Math.max(...worldZValues);

  return {
    start: { worldX: minX, worldZ: minZ },
    end: { worldX: maxX, worldZ: maxZ }
  };
}
