/**
 * Hook para manejar elementos arrastrables en el mapa
 * Permite mover edificios, NPCs y otros elementos con drag-and-drop
 */

import { useState, useCallback, useRef } from 'react';
import { MinecraftCoords, PixelCoords } from './types';
import { coordConverter } from './coordUtils';

export interface DragState {
  isDragging: boolean;
  elementId: string | null;
  elementPosition: MinecraftCoords | null;
  dragStart: { x: number; y: number } | null;
}

export interface UseDraggableElementOptions {
  elementId: string;
  initialPosition: MinecraftCoords;
  viewportScale: number;
  viewportOffsetX: number;
  viewportOffsetY: number;
  onDragStart?: (elementId: string) => void;
  onDrag?: (elementId: string, newPosition: MinecraftCoords) => void;
  onDragEnd?: (elementId: string, finalPosition: MinecraftCoords) => void;
  snapToGrid?: boolean;
  gridSize?: number;
}

/**
 * Hook para elementos arrastrables en el mapa
 */
export function useDraggableElement(options: UseDraggableElementOptions) {
  const {
    elementId,
    initialPosition,
    viewportScale,
    viewportOffsetX,
    viewportOffsetY,
    onDragStart,
    onDrag,
    onDragEnd,
    snapToGrid = false,
    gridSize = 1,
  } = options;

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    elementId: null,
    elementPosition: initialPosition,
    dragStart: null,
  });

  const dragStartRef = useRef<MinecraftCoords | null>(null);

  /**
   * Convierte posición de pixel a coordenadas de Minecraft
   */
  const pixelToMinecraft = useCallback(
    (pixelX: number, pixelY: number): MinecraftCoords => {
      const px: PixelCoords = { x: pixelX, y: pixelY };
      const mc = coordConverter.pixelToMinecraft(px, {
        scale: viewportScale,
        offsetX: viewportOffsetX,
        offsetY: viewportOffsetY,
      });

      // Aplicar snap a grilla si está activado
      if (snapToGrid) {
        const snappedX = Math.round(mc.worldX / gridSize) * gridSize;
        const snappedZ = Math.round(mc.worldZ / gridSize) * gridSize;
        return { worldX: snappedX, worldZ: snappedZ, worldY: mc.worldY };
      }

      return mc;
    },
    [viewportScale, viewportOffsetX, viewportOffsetY, snapToGrid, gridSize]
  );

  /**
   * Inicia el arrastre
   */
  const handleDragStart = useCallback(
    (event: any) => {
      event.cancelBubble = true; // Prevenir propagación

      // Obtener posición inicial del elemento
      const startPos: MinecraftCoords = {
        worldX: dragState.elementPosition?.worldX ?? initialPosition.worldX,
        worldZ: dragState.elementPosition?.worldZ ?? initialPosition.worldZ,
        worldY: dragState.elementPosition?.worldY ?? initialPosition.worldY,
      };

      dragStartRef.current = startPos;

      setDragState({
        isDragging: true,
        elementId,
        elementPosition: startPos,
        dragStart: { x: event.evt.offsetX, y: event.evt.offsetY },
      });

      onDragStart?.(elementId);
    },
    [elementId, initialPosition, dragState.elementPosition, onDragStart]
  );

  /**
   * Maneja el movimiento durante el arrastre
   */
  const handleDragMove = useCallback(
    (event: any) => {
      if (!dragState.isDragging) return;

      // Calcular nueva posición basada en el movimiento del mouse
      const pixelX = event.evt.offsetX;
      const pixelY = event.evt.offsetY;

      // Convertir a coordenadas de Minecraft
      const mc = pixelToMinecraft(pixelX, pixelY);

      // Actualizar posición del elemento
      const newPosition: MinecraftCoords = {
        worldX: mc.worldX,
        worldZ: mc.worldZ,
        worldY: dragState.elementPosition?.worldY ?? initialPosition.worldY,
      };

      setDragState((prev) => ({
        ...prev,
        elementPosition: newPosition,
      }));

      onDrag?.(elementId, newPosition);
    },
    [dragState.isDragging, dragState.elementPosition, initialPosition, elementId, pixelToMinecraft, onDrag]
  );

  /**
   * Termina el arrastre
   */
  const handleDragEnd = useCallback(
    (event: any) => {
      if (!dragState.isDragging) return;

      // Obtener posición final
      const pixelX = event.evt.offsetX;
      const pixelY = event.evt.offsetY;

      const mc = pixelToMinecraft(pixelX, pixelY);

      const finalPosition: MinecraftCoords = {
        worldX: mc.worldX,
        worldZ: mc.worldZ,
        worldY: dragState.elementPosition?.worldY ?? initialPosition.worldY,
      };

      setDragState({
        isDragging: false,
        elementId: null,
        elementPosition: finalPosition,
        dragStart: null,
      });

      onDragEnd?.(elementId, finalPosition);
      dragStartRef.current = null;
    },
    [
      dragState.isDragging,
      dragState.elementPosition,
      initialPosition,
      elementId,
      pixelToMinecraft,
      onDragEnd,
    ]
  );

  /**
   * Cancela el arrastre (por ejemplo, cuando se presiona Escape)
   */
  const cancelDrag = useCallback(() => {
    if (!dragState.isDragging) return;

    // Restaurar posición original
    const originalPosition = dragStartRef.current ?? initialPosition;

    setDragState({
      isDragging: false,
      elementId: null,
      elementPosition: originalPosition,
      dragStart: null,
    });

    dragStartRef.current = null;
  }, [dragState.isDragging, initialPosition]);

  return {
    dragState,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    cancelDrag,
  };
}
