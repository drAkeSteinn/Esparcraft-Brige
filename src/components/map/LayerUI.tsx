'use client';

import { Text, Group, Layer as KonvaLayer, Rect, Tag, Line } from 'react-konva';
import { useViewport } from '@/lib/map/useViewport';
import { useLayers } from '@/lib/map/useLayers';
import { MapLayerType, SelectableElement } from '@/lib/map/types';

interface LayerUIProps {
  hoveredElement?: SelectableElement | null;
  selectedElement?: SelectableElement | null;
  showTooltips?: boolean;
  showBoundingBox?: boolean;
  showSelectedLabels?: boolean;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  element: SelectableElement | null;
}

export default function LayerUI({
  hoveredElement,
  selectedElement,
  showTooltips = true,
  showBoundingBox = true,
  showSelectedLabels = true
}: LayerUIProps) {
  const { state: viewport } = useViewport();
  const { isLayerVisible, isLayerLocked } = useLayers();
  const layerVisible = isLayerVisible(MapLayerType.UI);
  const layerLocked = isLayerLocked(MapLayerType.UI);

  // Calcular posición del tooltip
  const tooltipX = hoveredElement ? viewport.offsetX + hoveredElement.coords.worldX * viewport.scale : 0;
  const tooltipY = hoveredElement ? viewport.offsetY + (hoveredElement.coords.worldZ || hoveredElement.coords.worldX || 0) * viewport.scale - 50 : 0;

  // Calcular tamaño del bounding box
  const boxSize = 14 * viewport.scale;

  return (
    <KonvaLayer>
      {/* Tooltip de hover */}
      {showTooltips && hoveredElement && layerVisible && (
        <Group>
          {/* Fondo del tooltip */}
          <Rect
            x={tooltipX - 100}
            y={tooltipY - 60}
            width={200}
            height={60}
            fill="rgba(0, 0, 0, 0.85)"
            cornerRadius={8}
            stroke="#fff"
            strokeWidth={2}
            shadowBlur={10}
            shadowColor="rgba(0, 0, 0, 0.3)"
          />

          {/* Nombre del elemento */}
          <Text
            x={tooltipX}
            y={tooltipY - 45}
            text={hoveredElement.name}
            fontSize={14}
            fontStyle="bold"
            fill="#fff"
            align="center"
            width={180}
            ellipsis={true}
          />

          {/* Tipo del elemento */}
          <Text
            x={tooltipX}
            y={tooltipY - 25}
            text={hoveredElement.type}
            fontSize={11}
            fill="#ccc"
            align="center"
          />

          {/* ID del elemento */}
          <Text
            x={tooltipX}
            y={tooltipY - 10}
            text={`ID: ${hoveredElement.id}`}
            fontSize={10}
            fill="#999"
            align="center"
          />
        </Group>
      )}

      {/* Bounding box para elemento seleccionado */}
      {showBoundingBox && selectedElement && layerVisible && (
        <Group>
          <Rect
            x={viewport.offsetX + (selectedElement.coords.worldX - boxSize / 2) * viewport.scale}
            y={viewport.offsetY + ((selectedElement.coords.worldZ || selectedElement.coords.worldX || 0) - boxSize / 2) * viewport.scale}
            width={boxSize}
            height={boxSize}
            stroke="#fbbf24"
            strokeWidth={3}
            dash={[10, 5]}
            fill="transparent"
            listening={false}
          />

          {/* Efecto de pulso (segundo borde) */}
          <Rect
            x={viewport.offsetX + (selectedElement.coords.worldX - boxSize / 2) * viewport.scale}
            y={viewport.offsetY + ((selectedElement.coords.worldZ || selectedElement.coords.worldX || 0) - boxSize / 2) * viewport.scale}
            width={boxSize}
            height={boxSize}
            stroke="#fbbf24"
            strokeWidth={2}
            dash={[10, 5]}
            fill="transparent"
            opacity={0.5}
            listening={false}
          />

          {/* Equinas del bounding box */}
          <Rect
            x={viewport.offsetX + (selectedElement.coords.worldX - boxSize / 2 - 3) * viewport.scale}
            y={viewport.offsetY + ((selectedElement.coords.worldZ || selectedElement.coords.worldX || 0) - boxSize / 2 - 3) * viewport.scale}
            width={boxSize + 6}
            height={boxSize + 6}
            stroke="#fbbf24"
            strokeWidth={2}
            cornerRadius={2}
            fill="transparent"
            listening={false}
          />
        </Group>
      )}

      {/* Label de elemento seleccionado */}
      {showSelectedLabels && selectedElement && layerVisible && (
        <Group>
          <Text
            x={viewport.offsetX + selectedElement.coords.worldX * viewport.scale}
            y={viewport.offsetY + ((selectedElement.coords.worldZ || selectedElement.coords.worldX || 0) + boxSize / 2 + 5) * viewport.scale}
            text={`Seleccionado: ${selectedElement.name}`}
            fontSize={13}
            fontStyle="bold"
            fill="#fff"
            stroke="#000"
            strokeWidth={3}
            align="center"
            offsetX={(selectedElement.name.length * 8) / 2}
            listening={false}
          />

          {/* Línea conectora al elemento */}
          <Line
            points={[
              viewport.offsetX + selectedElement.coords.worldX * viewport.scale,
              viewport.offsetY + ((selectedElement.coords.worldZ || selectedElement.coords.worldX || 0) + boxSize / 2) * viewport.scale,
              viewport.offsetX + selectedElement.coords.worldX * viewport.scale,
              viewport.offsetY + ((selectedElement.coords.worldZ || selectedElement.coords.worldX || 0) + boxSize / 2) * viewport.scale
            ]}
            stroke="#fbbf24"
            strokeWidth={2}
            strokeDasharray={[5, 3]}
            listening={false}
          />
        </Group>
      )}
    </KonvaLayer>
  );
}
