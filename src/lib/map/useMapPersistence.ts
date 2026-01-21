/**
 * Hook personalizado para persistencia de cambios en el mapa
 * Maneja la actualización de edificios, pueblos y NPCs vía API
 */

import { useCallback } from 'react';

export interface PersistResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Hook para persistir cambios de elementos del mapa
 */
export function useMapPersistence() {
  /**
   * Actualiza un edificio mediante API
   */
  const updateBuilding = useCallback(async (id: string, updates: Partial<any>): Promise<PersistResult> => {
    try {
      const response = await fetch(`/api/edificios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update building',
      };
    }
  }, []);

  /**
   * Actualiza un pueblo/zona mediante API
   */
  const updatePueblo = useCallback(async (id: string, updates: Partial<any>): Promise<PersistResult> => {
    try {
      const response = await fetch(`/api/pueblos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update pueblo',
      };
    }
  }, []);

  /**
   * Actualiza un NPC mediante API
   */
  const updateNPC = useCallback(async (id: string, updates: Partial<any>): Promise<PersistResult> => {
    try {
      const response = await fetch(`/api/npcs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update NPC',
      };
    }
  }, []);

  /**
   * Actualiza las coordenadas de un edificio
   */
  const updateBuildingCoords = useCallback(async (
    id: string,
    coords: { worldX: number; worldZ: number }
  ): Promise<PersistResult> => {
    return updateBuilding(id, { coords });
  }, [updateBuilding]);

  /**
   * Actualiza las coordenadas de un NPC
   */
  const updateNPCCoords = useCallback(async (
    id: string,
    coords: { worldX: number; worldZ: number; worldY?: number }
  ): Promise<PersistResult> => {
    return updateNPC(id, { coords });
  }, [updateNPC]);

  /**
   * Actualiza las coordenadas de un pueblo/zona (polygon)
   */
  const updatePuebloPolygon = useCallback(async (
    id: string,
    polygon: Array<{ x: number; y: number; z?: number }>
  ): Promise<PersistResult> => {
    return updatePueblo(id, { polygon });
  }, [updatePueblo]);

  /**
   * Actualiza el nombre de un elemento genéricamente
   */
  const updateName = useCallback(async (
    type: 'building' | 'pueblo' | 'npc',
    id: string,
    name: string
  ): Promise<PersistResult> => {
    switch (type) {
      case 'building':
        return updateBuilding(id, { name });
      case 'pueblo':
        return updatePueblo(id, { name });
      case 'npc':
        return updateNPC(id, { name });
      default:
        return {
          success: false,
          error: `Unknown type: ${type}`,
        };
    }
  }, [updateBuilding, updatePueblo, updateNPC]);

  return {
    updateBuilding,
    updatePueblo,
    updateNPC,
    updateBuildingCoords,
    updateNPCCoords,
    updatePuebloPolygon,
    updateName,
  };
}
