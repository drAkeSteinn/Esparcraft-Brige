// Tipos para el mapa 2D

import { World, Pueblo, Edificio, NPC } from '@/lib/types';

export interface MapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MapEntity {
  id: string;
  name: string;
  type: 'world' | 'pueblo' | 'edificio' | 'npc';
  x: number;
  z: number;
  width: number;
  height: number;
  color: string;
  data: World | Pueblo | Edificio | NPC;
  parentId?: string;
}

export interface MapLayerVisibility {
  worlds: boolean;
  pueblos: boolean;
  edificios: boolean;
  npcs: boolean;
  grid: boolean;
  labels: boolean;
}

export interface SelectedEntity {
  type: 'world' | 'pueblo' | 'edificio' | 'npc';
  id: string;
  data: World | Pueblo | Edificio | NPC;
}

export interface MapState {
  scale: number;
  position: { x: number; y: number };
  selectedEntity: SelectedEntity | null;
  hoveredEntity: SelectedEntity | null;
  layerVisibility: MapLayerVisibility;
  filterWorldId: string | null;
  filterPuebloId: string | null;
}

// Colores para cada tipo de entidad
export const ENTITY_COLORS = {
  world: {
    fill: 'rgba(99, 102, 241, 0.15)',
    stroke: 'rgb(99, 102, 241)',
    hover: 'rgba(99, 102, 241, 0.25)',
  },
  pueblo: {
    fill: 'rgba(34, 197, 94, 0.15)',
    stroke: 'rgb(34, 197, 94)',
    hover: 'rgba(34, 197, 94, 0.25)',
  },
  nacion: {
    fill: 'rgba(168, 85, 247, 0.15)',
    stroke: 'rgb(168, 85, 247)',
    hover: 'rgba(168, 85, 247, 0.25)',
  },
  edificio: {
    fill: 'rgba(249, 115, 22, 0.2)',
    stroke: 'rgb(249, 115, 22)',
    hover: 'rgba(249, 115, 22, 0.3)',
  },
  npc: {
    fill: 'rgba(236, 72, 153, 0.3)',
    stroke: 'rgb(236, 72, 153)',
    hover: 'rgba(236, 72, 153, 0.5)',
  },
};

// Calcular bounds totales del mapa
export function calculateMapBounds(
  edificios: Edificio[],
  padding: number = 100
): MapBounds {
  if (edificios.length === 0) {
    return { minX: 0, maxX: 1000, minZ: 0, maxZ: 1000 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  edificios.forEach(e => {
    minX = Math.min(minX, e.area.start.x);
    maxX = Math.max(maxX, e.area.end.x);
    minZ = Math.min(minZ, e.area.start.z);
    maxZ = Math.max(maxZ, e.area.end.z);
  });

  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minZ: minZ - padding,
    maxZ: maxZ + padding,
  };
}

// Calcular área de un pueblo a partir de sus edificios
export function calculatePuebloArea(edificios: Edificio[]): { x: number; z: number; width: number; height: number } | null {
  const puebloEdificios = edificios;
  if (puebloEdificios.length === 0) return null;

  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  puebloEdificios.forEach(e => {
    minX = Math.min(minX, e.area.start.x);
    maxX = Math.max(maxX, e.area.end.x);
    minZ = Math.min(minZ, e.area.start.z);
    maxZ = Math.max(maxZ, e.area.end.z);
  });

  return {
    x: minX,
    z: minZ,
    width: maxX - minX,
    height: maxZ - minZ,
  };
}
