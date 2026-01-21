'use client';

import { useEffect, useState } from 'react';
import { Rect, Text, Group, Layer as KonvaLayer } from 'react-konva';
import { useViewport } from '@/lib/map/useViewport';
import { useLayers } from '@/lib/map/useLayers';
import { CoordConverter } from '@/lib/map/coordUtils';
import { MapBuilding } from '@/lib/map/types';
import { ELEMENT_COLORS } from '@/lib/map/types';

interface LayerBuildingsProps {
  worldId?: string;
  puebloId?: string;
  onBuildingClick?: (building: MapBuilding, event?: React.MouseEvent) => void;
  onBuildingHover?: (building: MapBuilding | null) => void;
  showLabels?: boolean;
  selectedBuildingIds?: Set<string>;
}

interface EdificioData {
  id: string;
  worldId: string;
  puebloId: string;
  name: string;
  lore: string;
  eventos_recientes: string[];
  area: {
    start: { x: number; y: number; z: number };
    end: { x: number; y: number; z: number };
  };
  puntosDeInteres?: any[];
}

export default function LayerBuildings({
  worldId,
  puebloId,
  onBuildingClick,
  onBuildingHover,
  showLabels = true,
  selectedBuildingIds = new Set()
}: LayerBuildingsProps) {
  const { state: viewport } = useViewport();
  const { layers, isLayerVisible, isLayerLocked } = useLayers();
  const [edificios, setEdificios] = useState<EdificioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);

  const layerVisible = isLayerVisible('buildings');
  const layerLocked = isLayerLocked('buildings');

  // Cargar edificios desde la API
  useEffect(() => {
    const fetchEdificios = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (worldId) params.append('worldId', worldId);
        if (puebloId) params.append('puebloId', puebloId);

        const response = await fetch(`/api/edificios?${params.toString()}`);
        if (!response.ok) {
          console.error('Error fetching edificios:', response.statusText);
          setEdificios([]);
          return;
        }

        const data = await response.json();
        setEdificios(data.data || []);
      } catch (error) {
        console.error('Error fetching edificios:', error);
        setEdificios([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEdificios();
  }, [worldId, puebloId]);

  // Transformar edificio a formato del mapa
  const transformEdificio = (edificio: EdificioData): MapBuilding => {
    const { start, end } = edificio.area;

    // Normalizar coordenadas (asegurar que start sea menor que end)
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);

    const startCoords = { x: minX, z: minZ };
    const endCoords = { x: maxX, z: maxZ };

    const pixelStart = CoordConverter.minecraftToPixel(startCoords, { scale: 1 });
    const pixelEnd = CoordConverter.minecraftToPixel(endCoords, { scale: 1 });

    return {
      id: edificio.id,
      name: edificio.name,
      type: 'building',
      coords: { start: startCoords, end: endCoords },
      pixelCoords: { start: pixelStart, end: pixelEnd },
      color: ELEMENT_COLORS.building,
      metadata: {
        puebloId: edificio.puebloId,
        lore: edificio.lore,
        hasEvents: edificio.eventos_recientes && edificio.eventos_recientes.length > 0
      }
    };
  };

  // Convertir edificios a formato del mapa
  const mapBuildings = edificios.map(transformEdificio);

  // Manejar hover en edificio
  const handleMouseEnter = (building: MapBuilding) => {
    if (layerLocked) return;
    setHoveredBuilding(building.id);
    onBuildingHover?.(building);
  };

  const handleMouseLeave = () => {
    setHoveredBuilding(null);
    onBuildingHover?.(null);
  };

  const handleClick = (building: MapBuilding, event?: React.MouseEvent) => {
    if (layerLocked) return;
    onBuildingClick?.(building, event);
  };

  // Determinar si mostrar labels (solo si el zoom es suficiente)
  const shouldShowLabels = showLabels && viewport?.scale >= 0.8;

  // Colores para edificios
  const getBuildingColor = (building: MapBuilding, isHovered: boolean) => {
    // Selección múltiple tiene prioridad sobre hover
    if (selectedBuildingIds.has(building.id)) {
      return ELEMENT_COLORS.building.selected;
    }
    if (isHovered) {
      return ELEMENT_COLORS.building.hovered;
    }
    return building.metadata?.hasEvents
      ? ELEMENT_COLORS.activity // Edificios con actividad
      : ELEMENT_COLORS.building.default; // Edificios normales
  };

  // Opacidad de la capa
  const layerOpacity = layers.layers['buildings']?.opacity ?? 100;

  // Si la capa no es visible, no renderizar nada
  if (!layerVisible) {
    return null;
  }

  return (
    <KonvaLayer opacity={layerOpacity / 100}>
      {loading ? (
        <Text
          text="Cargando edificios..."
          x={viewport.centerX - 50}
          y={viewport.centerY - 10}
          fontSize={14}
          fill="#666"
        />
      ) : (
        <>
          {mapBuildings.map((building) => {
            const isHovered = hoveredBuilding === building.id;
            const isSelected = selectedBuildingIds.has(building.id);
            const color = getBuildingColor(building, isHovered);

            return (
              <Group
                key={building.id}
                onMouseEnter={() => handleMouseEnter(building)}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => handleClick(building, e.evt)}
              >
                {/* Rectángulo del edificio */}
                <Rect
                  x={Math.min(building.pixelCoords.start.x, building.pixelCoords.end.x)}
                  y={Math.min(building.pixelCoords.start.y, building.pixelCoords.end.y)}
                  width={Math.abs(building.pixelCoords.end.x - building.pixelCoords.start.x)}
                  height={Math.abs(building.pixelCoords.end.y - building.pixelCoords.start.y)}
                  fill={color}
                  stroke={(isHovered || isSelected) ? '#fff' : 'transparent'}
                  strokeWidth={(isHovered || isSelected) ? 2 : 0}
                  opacity={layerLocked ? 0.5 : 1}
                  listening={!layerLocked}
                />

                {/* Label con nombre del edificio */}
                {shouldShowLabels && !layerLocked && (
                  <Text
                    text={building.name}
                    x={Math.min(building.pixelCoords.start.x, building.pixelCoords.end.x)}
                    y={Math.min(building.pixelCoords.start.y, building.pixelCoords.end.y) - 15}
                    fontSize={12}
                    fill="#fff"
                    stroke="#000"
                    strokeWidth={2}
                    padding={2}
                    ellipsis={true}
                    width={Math.abs(building.pixelCoords.end.x - building.pixelCoords.start.x)}
                    align="center"
                  />
                )}

                {/* Indicador de actividad */}
                {building.metadata?.hasEvents && !isHovered && (
                  <Rect
                    x={Math.max(building.pixelCoords.start.x, building.pixelCoords.end.x) - 8}
                    y={Math.max(building.pixelCoords.start.y, building.pixelCoords.end.y) - 8}
                    width={6}
                    height={6}
                    fill="#ef4444"
                    cornerRadius={3}
                  />
                )}
              </Group>
            );
          })}
        </>
      )}
    </KonvaLayer>
  );
}
