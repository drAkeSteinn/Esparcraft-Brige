/**
 * Hook personalizado para manejar el sistema de capas del mapa
 * Gestiona visibilidad, opacidad, bloqueo y orden de renderizado
 */

import { useState, useCallback } from 'react';
import {
  LayersState,
  LayerConfig,
  MapLayerType,
  DEFAULT_LAYERS
} from './types';

/**
 * Opciones para el hook de capas
 */
interface UseLayersOptions {
  initialLayers?: Partial<Record<MapLayerType, Partial<LayerConfig>>>;
  onLayerChange?: (layerType: MapLayerType, changes: Partial<LayerConfig>) => void;
}

/**
 * Hook para manejar el sistema de capas del mapa
 */
export function useLayers(options: UseLayersOptions = {}) {
  const { initialLayers, onLayerChange } = options;

  // Estado de todas las capas
  const [layers, setLayers] = useState<Record<MapLayerType, LayerConfig>>({
    ...DEFAULT_LAYERS,
    ...initialLayers
  });

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('buildings');

  /**
   * Actualiza el estado de una capa específica
   */
  const updateLayer = useCallback((
    layerType: MapLayerType,
    updates: Partial<LayerConfig>
  ) => {
    setLayers(prev => {
      const newState = {
        ...prev,
        [layerType]: {
          ...prev[layerType],
          ...updates
        }
      };
      onLayerChange?.(layerType, updates);
      return newState;
    });
  }, [onLayerChange]);

  /**
   * Alternar visibilidad de una capa
   */
  const toggleLayer = useCallback((layerType: MapLayerType) => {
    setLayers(prev => ({
      ...prev,
      [layerType]: {
        ...prev[layerType],
        visible: !prev[layerType].visible
      }
    }));
    onLayerChange?.(layerType, { visible: !layers[layerType].visible });
  }, [layers, onLayerChange]);

  /**
   * Activar una capa específica
   */
  const activateLayer = useCallback((layerType: MapLayerType) => {
    setLayers(prev => ({
      ...prev,
      [layerType]: {
        ...prev[layerType],
        visible: true
      }
    }));
    setActiveLayer(layerType);
    onLayerChange?.(layerType, { visible: true });
  }, [onLayerChange]);

  /**
   * Alternar bloqueo de una capa
   */
  const toggleLock = useCallback((layerType: MapLayerType) => {
    setLayers(prev => ({
      ...prev,
      [layerType]: {
        ...prev[layerType],
        locked: !prev[layerType].locked
      }
    }));
    onLayerChange?.(layerType, { locked: !layers[layerType].locked });
  }, [layers, onLayerChange]);

  /**
   * Cambiar opacidad de una capa
   */
  const changeOpacity = useCallback((
    layerType: MapLayerType,
    opacity: number
  ) => {
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    setLayers(prev => ({
      ...prev,
      [layerType]: {
        ...prev[layerType],
        opacity: clampedOpacity
      }
    }));
    onLayerChange?.(layerType, { opacity: clampedOpacity });
  }, [onLayerChange]);

  /**
   * Resetear todas las capas a su estado por defecto
   */
  const resetLayers = useCallback(() => {
    setLayers(DEFAULT_LAYERS);
    onLayerChange?.('buildings', DEFAULT_LAYERS.buildings);
  }, [onLayerChange]);

  /**
   * Activar solo capas visibles (alternar entre capas)
   */
  const nextLayer = useCallback(() => {
    const layerTypes = Object.keys(layers) as MapLayerType[];
    const visibleLayers = layerTypes.filter(type => layers[type].visible);
    if (visibleLayers.length === 0) return;

    const currentIndex = visibleLayers.indexOf(activeLayer);
    const nextIndex = (currentIndex + 1) % visibleLayers.length;
    const nextLayerType = visibleLayers[nextIndex];

    setActiveLayer(nextLayerType);
  }, [layers, activeLayer, onLayerChange]);

  /**
   * Obtener información de una capa
   */
  const getLayerInfo = useCallback((layerType: MapLayerType) => {
    return layers[layerType] || DEFAULT_LAYERS[layerType];
  }, [layers]);

  /**
   * Verificar si una capa es visible
   */
  const isLayerVisible = useCallback((layerType: MapLayerType): boolean => {
    return layers[layerType]?.visible ?? DEFAULT_LAYERS[layerType].visible;
  }, [layers]);

  /**
   * Verificar si una capa está bloqueada
   */
  const isLayerLocked = useCallback((layerType: MapLayerType): boolean => {
    return layers[layerType]?.locked ?? DEFAULT_LAYERS[layerType].locked;
  }, [layers]);

  /**
   * Obtener todas las capas ordenadas por z-index
   */
  const getOrderedLayers = useCallback((): Array<LayerConfig> => {
    return Object.values(layers)
      .sort((a, b) => a.zIndex - b.zIndex);
  }, [layers]);

  /**
   * Obtener solo capas visibles ordenadas por z-index
   */
  const getVisibleLayers = useCallback((): Array<LayerConfig> => {
    return Object.values(layers)
      .filter(layer => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex);
  }, [layers]);

  /**
   * Obtener z-index de una capa
   */
  const getLayerZIndex = useCallback((layerType: MapLayerType): number => {
    return layers[layerType]?.zIndex ?? DEFAULT_LAYERS[layerType].zIndex;
  }, [layers]);

  /**
   * Activar capas predefinidas para diferentes modos de vista
   */
  const activatePreset = useCallback((preset: 'all' | 'buildings-only' | 'map-only') => {
    const presets = {
      all: {
        background: { visible: true },
        zones: { visible: true },
        buildings: { visible: true },
        npcs: { visible: true },
        routes: { visible: true },
        activity: { visible: false },
        ui: { visible: true }
      },
      'buildings-only': {
        background: { visible: true },
        zones: { visible: false },
        buildings: { visible: true },
        npcs: { visible: false },
        routes: { visible: false },
        activity: { visible: false },
        ui: { visible: true }
      },
      'map-only': {
        background: { visible: true },
        zones: { visible: true },
        buildings: { visible: false },
        npcs: { visible: false },
        routes: visible: false },
        activity: { visible: false },
        ui: { visible: true }
      }
    };

    const presetConfig = presets[preset];
    setLayers(prev => {
      const newState = { ...prev };
      Object.entries(presetConfig).forEach(([type, updates]) => {
        const layerType = type as MapLayerType;
        if (updates) {
          newState[layerType] = {
            ...prev[layerType],
            ...updates
          };
        }
      });
      return newState;
    });

    onLayerChange?.('buildings', presetConfig);
  }, [onLayerChange]);

  /**
   * Obtiene el estado completo de las capas
   */
  const layersState: LayersState = {
    layers,
    activeLayer
  };

  return {
    layers,
    activeLayer,
    layersState,
    setLayers,
    updateLayer,
    toggleLayer,
    activateLayer,
    toggleLock,
    changeOpacity,
    resetLayers,
    nextLayer,
    getLayerInfo,
    isLayerVisible,
    isLayerLocked,
    getOrderedLayers,
    getVisibleLayers,
    getLayerZIndex,
    activatePreset
  };
}
