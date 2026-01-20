/**
 * Hook personalizado para manejar el Viewport del Mapa 2D
 * Gestiona pan, zoom, límites y centrado
 */

import { useState, useCallback, useRef } from 'react';
import {
  ViewportState,
  ViewportLimits,
  MapPanEvent,
  MapZoomEvent
} from './types';

/**
 * Configuración por defecto del viewport
 */
const DEFAULT_VIEWPORT: ViewportState = {
  scale: 1.0,
  offsetX: 0,
  offsetY: 0,
  width: 1000,
  height: 800,
  centerX: 500,
  centerY: 400
};

/**
 * Límites por defecto del viewport
 */
const DEFAULT_LIMITS: ViewportLimits = {
  minScale: 0.1,   // 10%
  maxScale: 5.0,   // 500%
  defaultScale: 1.0
};

interface UseViewportOptions {
  initialWidth?: number;
  initialHeight?: number;
  limits?: Partial<ViewportLimits>;
  onPan?: (event: MapPanEvent) => void;
  onZoom?: (event: MapZoomEvent) => void;
}

interface UseViewportReturn {
  viewport: ViewportState;
  setViewport: (updates: Partial<ViewportState>) => void;
  resetViewport: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  handleWheel: (event: WheelEvent) => void;
  handleMouseDown: (event: React.MouseEvent) => void;
  handleMouseMove: (event: React.MouseEvent) => void;
  handleMouseUp: () => void;
  zoomToPoint: (point: { x: number; y: number }, newScale: number) => void;
  centerOnPoint: (point: { x: number; y: number }) => void;
  fitToRect: (rect: { x: number; y: number; width: number; height: number }, padding?: number) => void;
}

/**
 * Hook para manejar el viewport del mapa 2D
 * Implementa pan con arrastre y zoom con rueda centrado en puntero
 */
export function useViewport(options: UseViewportOptions = {}): UseViewportReturn {
  const {
    initialWidth = 1000,
    initialHeight = 800,
    limits: customLimits,
    onPan,
    onZoom
  } = options;

  // Combinar límites con los personalizados
  const limits = { ...DEFAULT_LIMITS, ...customLimits };

  // Estado del viewport
  const [viewport, setViewportState] = useState<ViewportState>({
    ...DEFAULT_VIEWPORT,
    width: initialWidth,
    height: initialHeight,
    centerX: initialWidth / 2,
    centerY: initialHeight / 2
  });

  // Referencias para tracking de arrastre
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastWheelTimeRef = useRef(0);

  /**
   * Actualiza el centro del viewport basado en scale y offsets
   */
  const updateCenter = useCallback(() => {
    setViewportState(prev => ({
      ...prev,
      centerX: (prev.width / 2) - (prev.offsetX / prev.scale),
      centerY: (prev.height / 2) - (prev.offsetY / prev.scale)
    }));
  }, []);

  /**
   * Actualiza el viewport con múltiples propiedades
   */
  const setViewport = useCallback((updates: Partial<ViewportState>) => {
    setViewportState(prev => {
      const newState = { ...prev, ...updates };

      // Aplicar límites de scale
      if (newState.scale !== undefined) {
        newState.scale = Math.max(limits.minScale, Math.min(limits.maxScale, newState.scale));
      }

      return newState;
    });

    // Actualizar centro después del setState
    setTimeout(updateCenter, 0);
  }, [limits, updateCenter]);

  /**
   * Resetea el viewport a su estado inicial
   */
  const resetViewport = useCallback(() => {
    setViewport({
      scale: limits.defaultScale,
      offsetX: 0,
      offsetY: 0
    });
  }, [limits.defaultScale, setViewport]);

  /**
   * Zoom in (aumentar scale)
   */
  const zoomIn = useCallback(() => {
    setViewport(prev => {
      const newScale = Math.min(limits.maxScale, prev.scale * 1.1);
      const zoomEvent: MapZoomEvent = {
        scale: newScale,
        centerX: prev.centerX,
        centerY: prev.centerY,
        delta: newScale - prev.scale
      };
      onZoom?.(zoomEvent);
      return { scale: newScale };
    });
  }, [limits.maxScale, onZoom, setViewport]);

  /**
   * Zoom out (disminuir scale)
   */
  const zoomOut = useCallback(() => {
    setViewport(prev => {
      const newScale = Math.max(limits.minScale, prev.scale / 1.1);
      const zoomEvent: MapZoomEvent = {
        scale: newScale,
        centerX: prev.centerX,
        centerY: prev.centerY,
        delta: newScale - prev.scale
      };
      onZoom?.(zoomEvent);
      return { scale: newScale };
    });
  }, [limits.minScale, onZoom, setViewport]);

  /**
   * Zoom a un punto específico (usado para zoom centrado en puntero del mouse)
   * Fórmula: newOffset = oldOffset - (mousePos - mousePos * newScale / oldScale)
   */
  const zoomToPoint = useCallback((point: { x: number; y: number }, newScale: number) => {
    setViewport(prev => {
      const clampedScale = Math.max(limits.minScale, Math.min(limits.maxScale, newScale));
      const scaleRatio = clampedScale / prev.scale;

      // Calcular nuevo offset para mantener el punto bajo el mouse
      const newOffsetX = point.x - (point.x - prev.offsetX) * scaleRatio;
      const newOffsetY = point.y - (point.y - prev.offsetY) * scaleRatio;

      const zoomEvent: MapZoomEvent = {
        scale: clampedScale,
        centerX: prev.centerX,
        centerY: prev.centerY,
        delta: clampedScale - prev.scale
      };
      onZoom?.(zoomEvent);

      return {
        scale: clampedScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      };
    });
  }, [limits, onZoom, setViewport]);

  /**
   * Centra el viewport en un punto específico
   */
  const centerOnPoint = useCallback((point: { x: number; y: number }) => {
    setViewport(prev => ({
      offsetX: (prev.width / 2) - point.x * prev.scale,
      offsetY: (prev.height / 2) - point.y * prev.scale
    }));
  }, [setViewport]);

  /**
   * Ajusta el viewport para mostrar un rectángulo completo con padding
   */
  const fitToRect = useCallback((
    rect: { x: number; y: number; width: number; height: number },
    padding = 50
  ) => {
    setViewport(prev => {
      const rectWidthWithPadding = rect.width + padding * 2;
      const rectHeightWithPadding = rect.height + padding * 2;

      const scaleX = prev.width / rectWidthWithPadding;
      const scaleY = prev.height / rectHeightWithPadding;
      const newScale = Math.min(limits.maxScale, Math.max(limits.minScale, Math.min(scaleX, scaleY)));

      const centerOffsetX = (prev.width / 2) - (rect.x + rect.width / 2) * newScale;
      const centerOffsetY = (prev.height / 2) - (rect.y + rect.height / 2) * newScale;

      return {
        scale: newScale,
        offsetX: centerOffsetX,
        offsetY: centerOffsetY
      };
    });
  }, [limits, setViewport]);

  /**
   * Maneja evento de rueda del mouse para zoom centrado en puntero
   */
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();

    // Debounce para evitar zoom excesivo
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 50) {
      return;
    }
    lastWheelTimeRef.current = now;

    const delta = event.deltaY > 0 ? -0.1 : 0.1; // Scroll hacia arriba = zoom in
    const newScale = viewport.scale + delta;

    // Obtener posición del mouse relativa al viewport
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    zoomToPoint({ x: mouseX, y: mouseY }, newScale);
  }, [viewport.scale, zoomToPoint]);

  /**
   * Inicia el arrastre del viewport (pan)
   */
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    // Solo arrastrar con botón izquierdo o medio
    if (event.button === 0 || event.button === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: event.clientX - viewport.offsetX,
        y: event.clientY - viewport.offsetY
      };
    }
  }, [viewport.offsetX, viewport.offsetY]);

  /**
   * Maneja movimiento del mouse durante el arrastre
   */
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const newOffsetX = event.clientX - dragStartRef.current.x;
    const newOffsetY = event.clientY - dragStartRef.current.y;

    setViewport({
      offsetX: newOffsetX,
      offsetY: newOffsetY
    });

    const panEvent: MapPanEvent = {
      deltaX: newOffsetX - viewport.offsetX,
      deltaY: newOffsetY - viewport.offsetY,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    };
    onPan?.(panEvent);
  }, [viewport.offsetX, viewport.offsetY, setViewport, onPan]);

  /**
   * Termina el arrastre del viewport
   */
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return {
    viewport,
    setViewport,
    resetViewport,
    zoomIn,
    zoomOut,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    zoomToPoint,
    centerOnPoint,
    fitToRect
  };
}
