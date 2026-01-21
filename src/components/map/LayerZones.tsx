'use client';

import { useEffect, useState, useRef } from 'react';
import { Line, Text, Group, Layer as KonvaLayer, Circle } from 'react-konva';
import { useViewport } from '@/lib/map/useViewport';
import { useLayers } from '@/lib/map/useLayers';
import { CoordConverter } from '@/lib/map/coordUtils';
import { MapZone, MapLayerType } from '@/lib/map/types';
import { ELEMENT_COLORS } from '@/lib/map/types';

interface LayerZonesProps {
  worldId?: string;
  onZoneClick?: (zone: MapZone, event?: React.MouseEvent) => void;
  onZoneHover?: (zone: MapZone | null) => void;
  showLabels?: boolean;
  selectedZoneIds?: Set<string>;
}

interface PuebloData {
  id: string;
  worldId: string;
  name: string;
  type: 'pueblo' | 'nacion';
  description: string;
  lore: {
    estado_pueblo: string;
    rumores: string[];
  };
  polygon?: Array<{ x: number; y: number; z: number }>;
}

export default function LayerZones({
  worldId,
  onZoneClick,
  onZoneHover,
  showLabels = true,
  selectedZoneIds = new Set()
}: LayerZonesProps) {
  const { state: viewport } = useViewport();
  const { state: layers, isLayerVisible, isLayerLocked } = useLayers();
  const [pueblos, setPueblos] = useState<PuebloData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const converter = useRef(new CoordConverter(1));
  const layerVisible = isLayerVisible(MapLayerType.Zones);
  const layerLocked = isLayerLocked(MapLayerType.Zones);

  // Cargar pueblos desde la API
  useEffect(() => {
    const fetchPueblos = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (worldId) params.append('worldId', worldId);

        const response = await fetch(`/api/pueblos?${params.toString()}`);
        if (!response.ok) {
          console.error('Error fetching pueblos:', response.statusText);
          setPueblos([]);
          return;
        }

        const data = await response.json();
        setPueblos(data.data || []);
      } catch (error) {
        console.error('Error fetching pueblos:', error);
        setPueblos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPueblos();
  }, [worldId]);

  // Transformar pueblo a formato del mapa (zona)
  const transformPuebloToZone = (pueblo: PuebloData): MapZone | null => {
    // Si no hay polígono, no podemos renderizar
    if (!pueblo.polygon || pueblo.polygon.length < 3) {
      return null;
    }

    // Transformar coordenadas del polígono
    const transformedPolygon = pueblo.polygon.map(point => {
      const pixelCoords = converter.current.minecraftToPixels({ worldX: point.x, worldZ: point.z });
      return {
        x: pixelCoords.x,
        y: pixelCoords.y,
        z: point.z
      };
    });

    // Calcular centro del polígono para labels
    const centerX = transformedPolygon.reduce((sum, p) => sum + p.x, 0) / transformedPolygon.length;
    const centerY = transformedPolygon.reduce((sum, p) => sum + p.y, 0) / transformedPolygon.length;

    return {
      id: pueblo.id,
      name: pueblo.name,
      type: pueblo.type === 'nacion' ? 'nacion' : 'pueblo',
      polygon: transformedPolygon,
      color: getElementColor(pueblo.type, false),
      selected: false,
      hovered: false,
      data: {
        description: pueblo.description,
        lore: pueblo.lore,
        tipo: pueblo.type
      }
    };
  };

  // Obtener color según tipo de zona
  const getElementColor = (type: 'pueblo' | 'nacion' | 'custom', isHovered: boolean, isSelected: boolean = false): string => {
    const colors = ELEMENT_COLORS[type === 'custom' ? 'zone' : type];
    if (isSelected) {
      return colors.selected;
    }
    if (isHovered) {
      return colors.hovered;
    }
    return colors.default;
  };

  // Convertir pueblos a zonas del mapa
  const mapZones = pueblos.map(transformPuebloToZone).filter((zone): zone is MapZone => zone !== null);

  // Manejar hover en zona
  const handleMouseEnter = (zone: MapZone) => {
    if (layerLocked) return;
    setHoveredZone(zone.id);
    onZoneHover?.(zone);
  };

  const handleMouseLeave = () => {
    setHoveredZone(null);
    onZoneHover?.(null);
  };

  const handleClick = (zone: MapZone, event?: React.MouseEvent) => {
    if (layerLocked) return;
    onZoneClick?.(zone, event);
  };

  // Determinar si mostrar labels (solo si el zoom es suficiente)
  const shouldShowLabels = showLabels && viewport.scale >= 0.6;

  // Opacidad de la capa
  const layerOpacity = layers.layers.find(l => l.type === MapLayerType.Zones)?.opacity ?? 100;

  // Si la capa no es visible, no renderizar nada
  if (!layerVisible) {
    return null;
  }

  return (
    <KonvaLayer opacity={layerOpacity / 100}>
      {loading ? (
        <Text
          text="Cargando zonas..."
          x={viewport.centerX - 50}
          y={viewport.centerY - 10}
          fontSize={14}
          fill="#666"
        />
      ) : mapZones.length === 0 ? (
        <Text
          text="No hay zonas/pueblos con polígonos"
          x={viewport.centerX - 100}
          y={viewport.centerY - 10}
          fontSize={14}
          fill="#999"
        />
      ) : (
        <>
          {mapZones.map((zone) => {
            const isHovered = hoveredZone === zone.id;
            const isSelected = selectedZoneIds.has(zone.id);
            const fillColor = getElementColor(zone.type, isHovered, isSelected);
            const strokeColor = (isHovered || isSelected) ? '#fff' : 'transparent';

            // Obtener puntos del polígono (x, y)
            const points = zone.polygon.flatMap(p => [p.x, p.y]);

            // Calcular centro para labels
            const centerX = zone.polygon.reduce((sum, p) => sum + p.x, 0) / zone.polygon.length;
            const centerY = zone.polygon.reduce((sum, p) => sum + p.y, 0) / zone.polygon.length;

            return (
              <Group
                key={zone.id}
                onMouseEnter={() => handleMouseEnter(zone)}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => handleClick(zone, e.evt)}
              >
                {/* Polígono de la zona */}
                <Line
                  points={points}
                  closed={true}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={(isHovered || isSelected) ? 2 : 0}
                  opacity={layerLocked ? 0.5 : 0.7}
                  listening={!layerLocked}
                />

                {/* Puntos del polígono (vértices) - solo si está seleccionado o hover */}
                {((isHovered || isSelected) && !layerLocked) && (
                  <>
                    {zone.polygon.map((point, index) => (
                      <Circle
                        key={index}
                        x={point.x}
                        y={point.y}
                        radius={3}
                        fill="#fff"
                        stroke={fillColor}
                        strokeWidth={2}
                      />
                    ))}
                  </>
                )}

                {/* Label con nombre de la zona */}
                {shouldShowLabels && !layerLocked && (
                  <Text
                    text={zone.name}
                    x={centerX}
                    y={centerY}
                    fontSize={14}
                    fontStyle="bold"
                    fill="#fff"
                    stroke="#000"
                    strokeWidth={3}
                    offsetX={(zone.name.length * 8) / 2}
                    offsetY={7}
                  />
                )}

                {/* Label con tipo de zona (más pequeño) */}
                {shouldShowLabels && !layerLocked && (
                  <Text
                    text={zone.type === 'nacion' ? '🏰 Nación' : '🏘️ Pueblo'}
                    x={centerX}
                    y={centerY + 18}
                    fontSize={10}
                    fill="#fff"
                    stroke="#000"
                    strokeWidth={2}
                    offsetX={35}
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
