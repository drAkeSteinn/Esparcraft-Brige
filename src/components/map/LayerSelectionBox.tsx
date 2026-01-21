'use client';

import { Layer as KonvaLayer, Rect } from 'react-konva';
import { useViewport } from '@/lib/map/useViewport';

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  visible: boolean;
}

interface LayerSelectionBoxProps {
  selectionBox: SelectionBox;
}

/**
 * Componente que renderiza la caja de selección (drag-box)
 * Muestra un rectángulo semitransparente con borde punteado
 */
export default function LayerSelectionBox({ selectionBox }: LayerSelectionBoxProps) {
  const { state: viewport } = useViewport();

  // Calcular posición y tamaño del rectángulo
  const x = Math.min(selectionBox.startX, selectionBox.endX);
  const y = Math.min(selectionBox.startY, selectionBox.endY);
  const width = Math.abs(selectionBox.endX - selectionBox.startX);
  const height = Math.abs(selectionBox.endY - selectionBox.startY);

  // Si la caja no es visible o tiene tamaño cero, no renderizar
  if (!selectionBox.visible || width < 5 || height < 5) {
    return null;
  }

  return (
    <KonvaLayer listening={false}>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray={[5, 5]}
        cornerRadius={4}
        opacity={1}
      />
    </KonvaLayer>
  );
}
