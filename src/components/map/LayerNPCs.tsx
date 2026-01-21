'use client';

import { useEffect, useState, useRef } from 'react';
import { Circle, Text, Group, Layer as KonvaLayer, Star } from 'react-konva';
import { useViewport } from '@/lib/map/useViewport';
import { useLayers } from '@/lib/map/useLayers';
import { CoordConverter } from '@/lib/map/coordUtils';
import { MapNPC, MapLayerType } from '@/lib/map/types';
import { ELEMENT_COLORS } from '@/lib/map/types';

interface LayerNPCsProps {
  worldId?: string;
  puebloId?: string;
  edificioId?: string;
  onNPCClick?: (npc: MapNPC, event?: React.MouseEvent) => void;
  onNPCHover?: (npc: MapNPC | null) => void;
  showLabels?: boolean;
  selectedNPCIds?: Set<string>;
  onNPCDragStart?: (npcId: string) => void;
  onNPCDrag?: (npcId: string, newPos: { worldX: number; worldZ: number }) => void;
  onNPCDragEnd?: (npcId: string, finalPos: { worldX: number; worldZ: number }) => void;
}

interface NPCData {
  id: string;
  location: {
    scope: string;
    worldId: string;
    puebloId?: string;
    edificioId?: string;
  };
  card: {
    name: string;
    description?: string;
    data?: {
      name?: string;
      description?: string;
    };
  };
}

interface EdificioData {
  id: string;
  area: {
    start: { x: number; y: number; z: number };
    end: { x: number; y: number; z: number };
  };
}

export default function LayerNPCs({
  worldId,
  puebloId,
  edificioId,
  onNPCClick,
  onNPCHover,
  showLabels = true,
  selectedNPCIds = new Set(),
  onNPCDragStart,
  onNPCDrag,
  onNPCDragEnd,
}: LayerNPCsProps) {
  const { state: viewport } = useViewport();
  const { state: layers, isLayerVisible, isLayerLocked } = useLayers();
  const [npcs, setNPCs] = useState<NPCData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredNPC, setHoveredNPC] = useState<string | null>(null);
  const [edificiosCache, setEdificiosCache] = useState<Record<string, EdificioData>>({});

  const converter = useRef(new CoordConverter(1));
  const layerVisible = isLayerVisible(MapLayerType.NPCs);
  const layerLocked = isLayerLocked(MapLayerType.NPCs);

  // Cargar NPCs desde la API
  useEffect(() => {
    const fetchNPCs = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (worldId) params.append('worldId', worldId);
        if (puebloId) params.append('puebloId', puebloId);
        if (edificioId) params.append('edificioId', edificioId);

        const response = await fetch(`/api/npcs?${params.toString()}`);
        if (!response.ok) {
          console.error('Error fetching npcs:', response.statusText);
          setNPCs([]);
          return;
        }

        const data = await response.json();
        const npcsData = data.data || [];
        setNPCs(npcsData);

        // Cargar edificios para los NPCs que tienen edificioId
        const edificioIds = npcsData
          .filter(npc => npc.location.edificioId)
          .map(npc => npc.location.edificioId);

        if (edificioIds.length > 0) {
          const edificiosData: Record<string, EdificioData> = {};
          await Promise.all(
            [...new Set(edificioIds)].map(async (edificioId) => {
              try {
                const edificioResponse = await fetch(`/api/edificios/${edificioId}`);
                if (edificioResponse.ok) {
                  const edificioData = await edificioResponse.json();
                  edificiosData[edificioId] = edificioData.data;
                }
              } catch (error) {
                console.error(`Error fetching edificio ${edificioId}:`, error);
              }
            })
          );
          setEdificiosCache(edificiosData);
        }
      } catch (error) {
        console.error('Error fetching npcs:', error);
        setNPCs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNPCs();
  }, [worldId, puebloId, edificioId]);

  // Calcular posición del NPC basado en su edificio
  const calculateNPCPosition = (npc: NPCData): { x: number; z: number } | null => {
    if (!npc.location.edificioId) {
      return null;
    }

    const edificio = edificiosCache[npc.location.edificioId];
    if (!edificio) {
      return null;
    }

    const { start, end } = edificio.area;

    // Calcular centro del edificio
    const centerX = (start.x + end.x) / 2;
    const centerZ = (start.z + end.z) / 2;

    return { x: centerX, z: centerZ };
  };

  // Transformar NPC a formato del mapa
  const transformNPCToMapNPC = (npc: NPCData): MapNPC | null => {
    const position = calculateNPCPosition(npc);
    if (!position) {
      return null;
    }

    // Obtener nombre del NPC
    const npcName = npc.card.data?.name || npc.card.name;

    // Obtener coordenadas en píxeles
    const pixelCoords = converter.current.minecraftToPixels({
      worldX: position.x,
      worldZ: position.z
    });

    return {
      id: npc.id,
      name: npcName,
      coords: { worldX: position.x, worldZ: position.z },
      pixelCoords,
      color: ELEMENT_COLORS.npc.default,
      selected: false,
      hovered: false,
      data: {
        location: npc.location,
        description: npc.card.description || npc.card.data?.description
      }
    };
  };

  // Convertir NPCs a formato del mapa
  const mapNPCs = npcs.map(transformNPCToMapNPC).filter((npc): npc is MapNPC => npc !== null);

  // Manejar hover en NPC
  const handleMouseEnter = (npc: MapNPC) => {
    if (layerLocked) return;
    setHoveredNPC(npc.id);
    onNPCHover?.(npc);
  };

  const handleMouseLeave = () => {
    setHoveredNPC(null);
    onNPCHover?.(null);
  };

  const handleClick = (npc: MapNPC, event?: React.MouseEvent) => {
    if (layerLocked) return;
    onNPCClick?.(npc, event);
  };

  // Manejar arrastre de NPC
  const handleNPCDragStart = (npc: MapNPC, event: any) => {
    if (layerLocked) return;
    onNPCDragStart?.(npc.id);
  };

  const handleNPCDrag = (npc: MapNPC, event: any) => {
    if (layerLocked) return;

    // Obtener posición actual del mouse en píxeles
    const pixelX = event.target.x();
    const pixelY = event.target.y();

    // Convertir a coordenadas de Minecraft
    const mcCoords = converter.current.pixelsToMinecraft({ x: pixelX, y: pixelY });
    onNPCDrag?.(npc.id, { worldX: mcCoords.worldX, worldZ: mcCoords.worldZ });
  };

  const handleNPCDragEnd = (npc: MapNPC, event: any) => {
    if (layerLocked) return;

    // Obtener posición final del mouse en píxeles
    const pixelX = event.target.x();
    const pixelY = event.target.y();

    // Convertir a coordenadas de Minecraft
    const mcCoords = converter.current.pixelsToMinecraft({ x: pixelX, y: pixelY });
    onNPCDragEnd?.(npc.id, { worldX: mcCoords.worldX, worldZ: mcCoords.worldZ });
  };

  // Determinar si mostrar labels (solo si el zoom es suficiente)
  const shouldShowLabels = showLabels && viewport.scale >= 1.0;

  // Opacidad de la capa
  const layerOpacity = layers.layers.find(l => l.type === MapLayerType.NPCs)?.opacity ?? 100;

  // Si la capa no es visible, no renderizar nada
  if (!layerVisible) {
    return null;
  }

  return (
    <KonvaLayer opacity={layerOpacity / 100}>
      {loading ? (
        <Text
          text="Cargando NPCs..."
          x={viewport.centerX - 50}
          y={viewport.centerY - 10}
          fontSize={14}
          fill="#666"
        />
      ) : mapNPCs.length === 0 ? (
        <Text
          text="No hay NPCs con ubicación conocida"
          x={viewport.centerX - 100}
          y={viewport.centerY - 10}
          fontSize={14}
          fill="#999"
        />
      ) : (
        <>
          {mapNPCs.map((npc) => {
            const isHovered = hoveredNPC === npc.id;
            const isSelected = selectedNPCIds.has(npc.id);
            const fillColor = isSelected
              ? ELEMENT_COLORS.npc.selected
              : (isHovered ? ELEMENT_COLORS.npc.hovered : npc.color);
            const strokeColor = isHovered || isSelected ? '#fff' : 'transparent';
            const strokeWidth = isHovered || isSelected ? 2 : 0;

            return (
              <Group
                key={npc.id}
                onMouseEnter={() => handleMouseEnter(npc)}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => handleClick(npc, e.evt)}
              >
                {/* Ícono del NPC - Estrella de 5 puntas */}
                <Star
                  x={npc.pixelCoords?.x || 0}
                  y={npc.pixelCoords?.y || 0}
                  innerRadius={6}
                  outerRadius={12}
                  numPoints={5}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  opacity={layerLocked ? 0.5 : 1}
                  listening={!layerLocked}
                  rotation={-90} // Apuntar hacia arriba
                  draggable={!layerLocked}
                  onDragStart={(e) => handleNPCDragStart(npc, e)}
                  onDragMove={(e) => handleNPCDrag(npc, e)}
                  onDragEnd={(e) => handleNPCDragEnd(npc, e)}
                />

                {/* Círculo alrededor del NPC (para mejor visibilidad) */}
                <Circle
                  x={npc.pixelCoords?.x || 0}
                  y={npc.pixelCoords?.y || 0}
                  radius={14}
                  stroke={isHovered || isSelected ? '#fff' : 'rgba(245, 158, 11, 0.3)'}
                  strokeWidth={isHovered || isSelected ? 2 : 1}
                  fill="transparent"
                  listening={false}
                />

                {/* Label con nombre del NPC */}
                {shouldShowLabels && !layerLocked && (
                  <Text
                    text={npc.name}
                    x={npc.pixelCoords?.x || 0}
                    y={npc.pixelCoords?.y || 0}
                    fontSize={11}
                    fontStyle="bold"
                    fill="#fff"
                    stroke="#000"
                    strokeWidth={2}
                    offsetY={20}
                    offsetX={(npc.name.length * 6) / 2}
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
