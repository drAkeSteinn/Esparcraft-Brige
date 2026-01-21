/**
 * Componente Stage para el Mapa 2D
 * Implementa pan/zoom centrado en puntero usando Konva
 */

'use client';

import { useRef, useEffect, ReactNode } from 'react';
import { Stage, Layer } from 'react-konva';
import { useViewport, UseViewportOptions } from '@/lib/map/useViewport';
import { LayerSelectionBox } from './LayerSelectionBox';

interface MapStageProps {
  children?: ReactNode;
  className?: string;
  onStageClick?: (event: any) => void;
  onStageMouseMove?: (event: any) => void;
  width?: number;
  height?: number;
  options?: UseViewportOptions;
  onSelectionBoxChange?: (selectionBox: { startX: number; startY: number; endX: number; endY: number; visible: boolean } | null) => void;
}

/**
 * Componente Stage que maneja viewport del mapa con Konva
 * - Zoom con rueda del mouse centrado en puntero
 * - Pan con arrastre del mouse
 * - Límites de zoom configurable
 * - Centrado automático del contenido
 */
export function MapStage({
  children,
  className = '',
  onStageClick,
  onStageMouseMove,
  width = 1000,
  height = 800,
  options,
  onSelectionBoxChange
}: MapStageProps) {
  const stageRef = useRef<any>(null);

  // Estado para drag-box selection
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number; visible: boolean } | null>(null);
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null);

  // Obtener funciones del hook de viewport
  const {
    viewport,
    resetViewport,
    zoomIn,
    zoomOut,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    zoomToPoint
  } = useViewport(options);

  /**
   * Maneja clicks en el stage
   */
  const handleStageClick = (event: any) => {
    // Solo eventos del stage (no de elementos)
    if (event.target === event.target.getStage()) {
      onStageClick?.(event);
    }
  };

  /**
   * Maneja mousedown para iniciar drag-box
   */
  const handleContainerMouseDown = (event: React.MouseEvent) => {
    // Solo iniciar drag-box si no es Shift/Ctrl
    // y el click fue en el fondo del stage
    const isModifierKey = event.shiftKey || event.ctrlKey || event.metaKey;

    if (!isModifierKey && event.button === 0) { // Click izquierdo sin Shift/Ctrl
      // Obtener posición del mouse relativa al contenedor
      const container = event.currentTarget as HTMLElement;
      const rect = container.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      setBoxStart({ x: mouseX, y: mouseY });
      setIsDraggingBox(true);

      // Notificar inicio de caja
      setSelectionBox({
        startX: mouseX,
        startY: mouseY,
        endX: mouseX,
        endY: mouseY,
        visible: true
      });
    }
  };

  /**
   * Maneja movimiento del mouse para actualizar drag-box
   */
  const handleContainerMouseMove = (event: React.MouseEvent) => {
    onStageMouseMove?.(event);

    if (isDraggingBox && boxStart) {
      const container = event.currentTarget as HTMLElement;
      const rect = container.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Actualizar el tamaño de la caja de selección
      const newBox = {
        startX: boxStart.x,
        startY: boxStart.y,
        endX: mouseX,
        endY: mouseY,
        visible: true
      };
      setSelectionBox(newBox);
    }
  };

  /**
   * Maneja mouseup para finalizar drag-box
   */
  const handleContainerMouseUp = () => {
    if (isDraggingBox) {
      setIsDraggingBox(false);
      setBoxStart(null);

      // Notificar finalización con la caja visible
      if (selectionBox) {
        onSelectionBoxChange?.(selectionBox);
      }
    }
  };

  /**
   * Maneja doble click para resetear el viewport
   */
  const handleDoubleClick = () => {
    resetViewport();
  };

  // Manejar eventos globales de mouse
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      handleMouseUp();
      handleContainerMouseUp();
    };

    // Agregar listener para mouseup en document
    // Esto previene que el arrastre se quede "pegado" si el mouse sale del stage
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleMouseUp, handleContainerMouseUp]);

  /**
   * Maneja redimensionamiento del contenedor
   */
  useEffect(() => {
    const updateViewportSize = () => {
      if (stageRef.current) {
        const stage = stageRef.current;
        const container = stage.container();

        if (container) {
          const rect = container.getBoundingClientRect();
          // Actualizar ancho y alto del viewport
          // (en una implementación más avanzada, esto se usaría)
          // Por ahora, mantenemos el tamaño inicial o el pasado en props
        }
      }
    };

    // Escuchar redimensionamiento de ventana
    window.addEventListener('resize', updateViewportSize);

    return () => {
      window.removeEventListener('resize', updateViewportSize);
    };
  }, [width, height]);

  return (
    <div
      className={`map-stage-container ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        cursor: isDraggingBox ? 'crosshair' : (viewport.scale > 1 ? 'grab' : 'default')
      }}
      onWheel={handleWheel}
      onMouseDown={(e) => {
        // Si es un drag-box potencial (sin Shift/Ctrl), manejar en contenedor
        const isModifierKey = e.shiftKey || e.ctrlKey || e.metaKey;
        if (!isModifierKey && e.button === 0) {
          handleContainerMouseDown(e);
        } else {
          // De lo contrario, dejar que el hook de viewport maneje el pan
          handleMouseDown(e);
        }
      }}
      onMouseMove={handleContainerMouseMove}
      onDoubleClick={handleDoubleClick}
    >
      {/* Overlay informativo de zoom */}
      <div className="zoom-overlay" style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '500',
        color: '#64748b',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        pointerEvents: 'none'
      }}>
        <span>{Math.round(viewport.scale * 100)}%</span>
      </div>

      {/* Overlay de instrucciones */}
      <div className="instructions-overlay" style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#64748b',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        pointerEvents: 'none'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span>🖱️ Arrastra para mover</span>
          <span>🔄 Rueda para zoom</span>
          <span>⏱️ Doble click para resetear</span>
          <span>📦 Arrastra para seleccionar múltiples (sin Shift/Ctrl)</span>
        </div>
      </div>

      {/* Konva Stage */}
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.offsetX}
        y={viewport.offsetY}
        draggable={false}
        onClick={handleStageClick}
      >
        <Layer>
          {children}
        </Layer>
        {/* Capa de caja de selección */}
        {selectionBox && selectionBox.visible && (
          <LayerSelectionBox selectionBox={selectionBox} />
        )}
      </Stage>
    </div>
  );
}
