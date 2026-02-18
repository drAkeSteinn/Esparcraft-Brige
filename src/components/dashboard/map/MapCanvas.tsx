'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle, Line } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { World, Pueblo, Edificio, NPC, getCardField } from '@/lib/types';
import { MapBounds, MapLayerVisibility, SelectedEntity, ENTITY_COLORS, calculateMapBounds } from './types';

interface MapCanvasProps {
  worlds: World[];
  pueblos: Pueblo[];
  edificios: Edificio[];
  npcs: NPC[];
  layerVisibility: MapLayerVisibility;
  filterWorldId: string | null;
  filterPuebloId: string | null;
  selectedEntity: SelectedEntity | null;
  onSelectEntity: (entity: SelectedEntity | null) => void;
  onHoverEntity: (entity: SelectedEntity | null) => void;
}

export default function MapCanvas({
  worlds,
  pueblos,
  edificios,
  npcs,
  layerVisibility,
  filterWorldId,
  filterPuebloId,
  selectedEntity,
  onSelectEntity,
  onHoverEntity,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Calcular bounds del mapa
  const filteredEdificios = edificios.filter(e => {
    if (filterPuebloId) return e.puebloId === filterPuebloId;
    if (filterWorldId) {
      const pueblo = pueblos.find(p => p.id === e.puebloId);
      return pueblo?.worldId === filterWorldId;
    }
    return true;
  });

  const bounds = calculateMapBounds(filteredEdificios, 200);

  // Ajustar dimensiones al contenedor
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Zoom con rueda del mouse
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limitar zoom
    const clampedScale = Math.min(Math.max(newScale, 0.1), 5);

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setScale(clampedScale);
    setPosition(newPos);
  }, [scale, position]);

  // Drag del stage
  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    setPosition({
      x: e.target.x(),
      y: e.target.y(),
    });
  }, []);

  // Convertir coordenadas del juego a canvas
  const gameToCanvas = (gameX: number, gameZ: number) => {
    // Invertir Z para que el norte esté arriba
    return {
      x: gameX - bounds.minX,
      y: bounds.maxZ - gameZ, // Z invertida
    };
  };

  // Zoom para ajustar todo el mapa
  const fitToScreen = useCallback(() => {
    const mapWidth = bounds.maxX - bounds.minX;
    const mapHeight = bounds.maxZ - bounds.minZ;

    if (mapWidth <= 0 || mapHeight <= 0) return;

    const scaleX = dimensions.width / mapWidth;
    const scaleY = dimensions.height / mapHeight;
    const newScale = Math.min(scaleX, scaleY) * 0.9;

    setScale(newScale);
    setPosition({
      x: (dimensions.width - mapWidth * newScale) / 2,
      y: (dimensions.height - mapHeight * newScale) / 2,
    });
  }, [bounds, dimensions]);

  // Auto-fit al cargar - solo una vez cuando se cargan los datos
  const hasFittedRef = useRef(false);
  useEffect(() => {
    if (filteredEdificios.length > 0 && !hasFittedRef.current && dimensions.width > 0) {
      hasFittedRef.current = true;
      // Usar setTimeout para evitar setState durante render
      const timer = setTimeout(() => {
        const mapWidth = bounds.maxX - bounds.minX;
        const mapHeight = bounds.maxZ - bounds.minZ;
        if (mapWidth > 0 && mapHeight > 0) {
          const scaleX = dimensions.width / mapWidth;
          const scaleY = dimensions.height / mapHeight;
          const newScale = Math.min(scaleX, scaleY) * 0.9;
          setScale(newScale);
          setPosition({
            x: (dimensions.width - mapWidth * newScale) / 2,
            y: (dimensions.height - mapHeight * newScale) / 2,
          });
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [filteredEdificios.length, dimensions.width, bounds]);

  // Dibujar grid
  const renderGrid = () => {
    if (!layerVisibility.grid) return null;

    const gridSize = 100;
    const lines: JSX.Element[] = [];

    // Líneas verticales
    for (let x = Math.floor(bounds.minX / gridSize) * gridSize; x <= bounds.maxX; x += gridSize) {
      const canvasX = gameToCanvas(x, 0).x;
      lines.push(
        <Line
          key={`v-${x}`}
          points={[canvasX, 0, canvasX, bounds.maxZ - bounds.minZ]}
          stroke="rgba(100, 100, 100, 0.2)"
          strokeWidth={1}
        />
      );
    }

    // Líneas horizontales
    for (let z = Math.floor(bounds.minZ / gridSize) * gridSize; z <= bounds.maxZ; z += gridSize) {
      const canvasY = gameToCanvas(0, z).y;
      lines.push(
        <Line
          key={`h-${z}`}
          points={[0, canvasY, bounds.maxX - bounds.minX, canvasY]}
          stroke="rgba(100, 100, 100, 0.2)"
          strokeWidth={1}
        />
      );
    }

    return <Group>{lines}</Group>;
  };

  // Dibujar regiones (pueblos/naciones)
  const renderPueblos = () => {
    if (!layerVisibility.pueblos) return null;

    const filteredPueblos = pueblos.filter(p => {
      if (filterPuebloId) return p.id === filterPuebloId;
      if (filterWorldId) return p.worldId === filterWorldId;
      return true;
    });

    return filteredPueblos.map(pueblo => {
      // Calcular bounds de la región basándose en sus edificios
      const puebloEdificios = filteredEdificios.filter(e => e.puebloId === pueblo.id);
      if (puebloEdificios.length === 0) return null;

      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      puebloEdificios.forEach(e => {
        minX = Math.min(minX, e.area.start.x);
        maxX = Math.max(maxX, e.area.end.x);
        minZ = Math.min(minZ, e.area.start.z);
        maxZ = Math.max(maxZ, e.area.end.z);
      });

      const padding = 50;
      const start = gameToCanvas(minX - padding, maxZ + padding);
      const end = gameToCanvas(maxX + padding, minZ - padding);

      const width = end.x - start.x;
      const height = end.y - start.y;

      const isSelected = selectedEntity?.id === pueblo.id && selectedEntity?.type === 'pueblo';
      const colors = pueblo.type === 'nacion' ? ENTITY_COLORS.nacion : ENTITY_COLORS.pueblo;

      return (
        <Group key={pueblo.id}>
          <Rect
            x={start.x}
            y={start.y}
            width={width}
            height={height}
            fill={isSelected ? colors.hover : colors.fill}
            stroke={colors.stroke}
            strokeWidth={isSelected ? 3 : 2}
            cornerRadius={8}
            onClick={() => onSelectEntity({ type: 'pueblo', id: pueblo.id, data: pueblo })}
            onTap={() => onSelectEntity({ type: 'pueblo', id: pueblo.id, data: pueblo })}
            onMouseEnter={() => onHoverEntity({ type: 'pueblo', id: pueblo.id, data: pueblo })}
            onMouseLeave={() => onHoverEntity(null)}
          />
          {layerVisibility.labels && (
            <Text
              x={start.x + 10}
              y={start.y + 10}
              text={pueblo.name}
              fontSize={14}
              fontStyle="bold"
              fill={colors.stroke}
            />
          )}
        </Group>
      );
    });
  };

  // Dibujar edificios
  const renderEdificios = () => {
    if (!layerVisibility.edificios) return null;

    return filteredEdificios.map(edificio => {
      const start = gameToCanvas(edificio.area.start.x, edificio.area.start.z);
      const end = gameToCanvas(edificio.area.end.x, edificio.area.end.z);

      const width = end.x - start.x;
      const height = start.y - end.y; // Invertido porque Y del canvas va hacia abajo

      const isSelected = selectedEntity?.id === edificio.id && selectedEntity?.type === 'edificio';

      return (
        <Group key={edificio.id}>
          <Rect
            x={start.x}
            y={end.y}
            width={width}
            height={height}
            fill={isSelected ? ENTITY_COLORS.edificio.hover : ENTITY_COLORS.edificio.fill}
            stroke={ENTITY_COLORS.edificio.stroke}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={4}
            onClick={() => onSelectEntity({ type: 'edificio', id: edificio.id, data: edificio })}
            onTap={() => onSelectEntity({ type: 'edificio', id: edificio.id, data: edificio })}
            onMouseEnter={() => onHoverEntity({ type: 'edificio', id: edificio.id, data: edificio })}
            onMouseLeave={() => onHoverEntity(null)}
          />
          {layerVisibility.labels && width > 30 && height > 20 && (
            <Text
              x={start.x + 4}
              y={end.y + 4}
              text={edificio.name}
              fontSize={10}
              fill={ENTITY_COLORS.edificio.stroke}
              width={width - 8}
              ellipsis={true}
            />
          )}
        </Group>
      );
    });
  };

  // Dibujar NPCs
  const renderNpcs = () => {
    if (!layerVisibility.npcs) return null;

    const filteredNpcs = npcs.filter(npc => {
      if (filterPuebloId) return npc.location.puebloId === filterPuebloId;
      if (filterWorldId) return npc.location.worldId === filterWorldId;
      return true;
    });

    return filteredNpcs.map(npc => {
      // Obtener posición del NPC basándose en su ubicación
      let x = 0, z = 0;

      if (npc.location.scope === 'edificio' && npc.location.edificioId) {
        const edificio = edificios.find(e => e.id === npc.location.edificioId);
        if (edificio) {
          x = (edificio.area.start.x + edificio.area.end.x) / 2;
          z = (edificio.area.start.z + edificio.area.end.z) / 2;
        }
      } else if (npc.location.scope === 'pueblo' && npc.location.puebloId) {
        const puebloEdificios = filteredEdificios.filter(e => e.puebloId === npc.location.puebloId);
        if (puebloEdificios.length > 0) {
          let sumX = 0, sumZ = 0;
          puebloEdificios.forEach(e => {
            sumX += (e.area.start.x + e.area.end.x) / 2;
            sumZ += (e.area.start.z + e.area.end.z) / 2;
          });
          x = sumX / puebloEdificios.length;
          z = sumZ / puebloEdificios.length;
        }
      } else if (npc.location.scope === 'mundo' && npc.location.worldId) {
        const worldEdificios = filteredEdificios.filter(e => {
          const pueblo = pueblos.find(p => p.id === e.puebloId);
          return pueblo?.worldId === npc.location.worldId;
        });
        if (worldEdificios.length > 0) {
          let sumX = 0, sumZ = 0;
          worldEdificios.forEach(e => {
            sumX += (e.area.start.x + e.area.end.x) / 2;
            sumZ += (e.area.start.z + e.area.end.z) / 2;
          });
          x = sumX / worldEdificios.length;
          z = sumZ / worldEdificios.length;
        }
      }

      const canvasPos = gameToCanvas(x, z);
      const isSelected = selectedEntity?.id === npc.id && selectedEntity?.type === 'npc';
      const npcName = getCardField(npc.card, 'name', 'NPC');

      return (
        <Group key={npc.id}>
          <Circle
            x={canvasPos.x}
            y={canvasPos.y}
            radius={isSelected ? 10 : 7}
            fill={isSelected ? ENTITY_COLORS.npc.hover : ENTITY_COLORS.npc.fill}
            stroke={ENTITY_COLORS.npc.stroke}
            strokeWidth={isSelected ? 3 : 2}
            onClick={() => onSelectEntity({ type: 'npc', id: npc.id, data: npc })}
            onTap={() => onSelectEntity({ type: 'npc', id: npc.id, data: npc })}
            onMouseEnter={() => onHoverEntity({ type: 'npc', id: npc.id, data: npc })}
            onMouseLeave={() => onHoverEntity(null)}
          />
          {layerVisibility.labels && (
            <Text
              x={canvasPos.x + 10}
              y={canvasPos.y - 5}
              text={npcName}
              fontSize={9}
              fill={ENTITY_COLORS.npc.stroke}
            />
          )}
        </Group>
      );
    });
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-muted/30 rounded-lg overflow-hidden">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
      >
        <Layer>
          {renderGrid()}
          {renderPueblos()}
          {renderEdificios()}
          {renderNpcs()}
        </Layer>
      </Stage>
    </div>
  );
}
