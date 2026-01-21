/**
 * Hook para manejar el estado de edición de elementos del mapa
 * Permite editar propiedades y guardar cambios
 */

import { useState, useCallback } from 'react';
import { useMapPersistence } from './useMapPersistence';
import { MapBuilding, MapZone, MapNPC } from './types';

export type EditingType = 'building' | 'zone' | 'npc' | null;
export type EditingId = string | null;

export interface EditingState {
  type: EditingType;
  id: EditingId;
}

/**
 * Hook para gestión de edición de elementos del mapa
 */
export function useMapEditing() {
  const { updateBuilding, updatePueblo, updateNPC, updateName, updateBuildingCoords, updateNPCCoords } =
    useMapPersistence();

  const [editingState, setEditingState] = useState<EditingState>({ type: null, id: null });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<{ type: string; id: string; timestamp: number } | null>(
    null
  );

  /**
   * Inicia la edición de un elemento
   */
  const startEditing = useCallback((type: EditingType, id: string) => {
    setEditingState({ type, id });
    setSaveError(null);
  }, []);

  /**
   * Cancela la edición actual
   */
  const cancelEditing = useCallback(() => {
    setEditingState({ type: null, id: null });
    setSaveError(null);
  }, []);

  /**
   * Guarda cambios en un edificio
   */
  const saveBuilding = useCallback(
    async (id: string, updates: Partial<MapBuilding>): Promise<boolean> => {
      setIsSaving(true);
      setSaveError(null);

      const result = await updateBuilding(id, updates);

      if (result.success) {
        setLastSaved({
          type: 'building',
          id,
          timestamp: Date.now(),
        });
        setIsSaving(false);
        return true;
      } else {
        setSaveError(result.error || 'Failed to save building');
        setIsSaving(false);
        return false;
      }
    },
    [updateBuilding]
  );

  /**
   * Guarda cambios en un pueblo/zona
   */
  const saveZone = useCallback(async (id: string, updates: Partial<MapZone>): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);

    const result = await updatePueblo(id, updates);

    if (result.success) {
      setLastSaved({
        type: 'zone',
        id,
        timestamp: Date.now(),
      });
      setIsSaving(false);
      return true;
    } else {
      setSaveError(result.error || 'Failed to save zone');
      setIsSaving(false);
      return false;
    }
  }, [updatePueblo]);

  /**
   * Guarda cambios en un NPC
   */
  const saveNPC = useCallback(async (id: string, updates: Partial<MapNPC>): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);

    const result = await updateNPC(id, updates);

    if (result.success) {
      setLastSaved({
        type: 'npc',
        id,
        timestamp: Date.now(),
      });
      setIsSaving(false);
      return true;
    } else {
      setSaveError(result.error || 'Failed to save NPC');
      setIsSaving(false);
      return false;
    }
  }, [updateNPC]);

  /**
   * Guarda el nombre de un elemento
   */
  const saveElementName = useCallback(
    async (type: 'building' | 'zone' | 'npc', id: string, name: string): Promise<boolean> => {
      setIsSaving(true);
      setSaveError(null);

      const result = await updateName(type, id, name);

      if (result.success) {
        setLastSaved({
          type,
          id,
          timestamp: Date.now(),
        });
        setIsSaving(false);
        return true;
      } else {
        setSaveError(result.error || 'Failed to save name');
        setIsSaving(false);
        return false;
      }
    },
    [updateName]
  );

  /**
   * Guarda las coordenadas de un elemento
   */
  const saveElementCoords = useCallback(
    async (
      type: 'building' | 'npc',
      id: string,
      coords: { worldX: number; worldZ: number; worldY?: number }
    ): Promise<boolean> => {
      setIsSaving(true);
      setSaveError(null);

      let result;
      if (type === 'building') {
        result = await updateBuildingCoords(id, coords);
      } else if (type === 'npc') {
        result = await updateNPCCoords(id, coords);
      } else {
        setSaveError('Unsupported type for coords update');
        setIsSaving(false);
        return false;
      }

      if (result && result.success) {
        setLastSaved({
          type,
          id,
          timestamp: Date.now(),
        });
        setIsSaving(false);
        return true;
      } else {
        setSaveError(result?.error || 'Failed to save coordinates');
        setIsSaving(false);
        return false;
      }
    },
    [updateBuildingCoords, updateNPCCoords]
  );

  /**
   * Verifica si hay un elemento siendo editado
   */
  const isEditing = useCallback(
    (type: EditingType, id: string): boolean => {
      return editingState.type === type && editingState.id === id;
    },
    [editingState]
  );

  /**
   * Limpia el mensaje de error
   */
  const clearError = useCallback(() => {
    setSaveError(null);
  }, []);

  return {
    // Estado
    editingState,
    isSaving,
    saveError,
    lastSaved,

    // Acciones
    startEditing,
    cancelEditing,
    saveBuilding,
    saveZone,
    saveNPC,
    saveElementName,
    saveElementCoords,
    clearError,
    isEditing,
  };
}
