'use client';

import { useState, useEffect, useCallback } from 'react';
import { Map, Building2, Info, Landmark, User, Layers, Square, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapStage, LayerBuildings, LayerZones, LayerNPCs, LayerUI, LayerControl, EditElementPanel } from '@/components/map';
import { MapBuilding, MapZone, MapNPC, SelectableElement } from '@/lib/map/types';
import { pointInRect } from '@/lib/map/coordUtils';
import { useMapPersistence } from '@/lib/map/useMapPersistence';

/**
 * Componente de Selección Múltiple para mostrar elementos seleccionados
 * NOTA: La selección por drag-box requiere acceso a los datos de las capas
 * La funcionalidad visual de la caja está implementada, pero la detección
 * de elementos dentro de la caja está documentada en handleSelectionBoxChange.
 */
function MultipleSelectionDisplay({
  buildings,
  zones,
  npcs,
  onClearSelection
}: {
  buildings: MapBuilding[];
  zones: MapZone[];
  npcs: MapNPC[];
  onClearSelection: () => void;
}) {
  const totalCount = buildings.length + zones.length + npcs.length;

  return (
    <Card className="border-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Square className="h-5 w-5 text-blue-500" />
            Selección Múltiple ({totalCount})
          </div>
          <button
            onClick={onClearSelection}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Deseleccionar todo (Esc)"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </CardTitle>
        <CardDescription>
          {buildings.length} edificio(s), {zones.length} zona(s), {npcs.length} NPC(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          {buildings.length > 0 && (
            <div>
              <h5 className="font-semibold mb-1 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Edificios ({buildings.length})
              </h5>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {buildings.map((building) => (
                  <div key={building.id} className="bg-primary/10 p-2 rounded">
                    <div className="font-medium">{building.name}</div>
                    <div className="text-xs text-muted-foreground">ID: {building.id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {zones.length > 0 && (
            <div>
              <h5 className="font-semibold mb-1 flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Zonas ({zones.length})
              </h5>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {zones.map((zone) => (
                  <div key={zone.id} className="bg-purple-500/10 p-2 rounded">
                    <div className="font-medium">{zone.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {zone.type === 'nacion' ? '🏰 Nación' : '🏘️ Pueblo'} • ID: {zone.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {npcs.length > 0 && (
            <div>
              <h5 className="font-semibold mb-1 flex items-center gap-2">
                <User className="h-4 w-4" />
                NPCs ({npcs.length})
              </h5>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {npcs.map((npc) => (
                  <div key={npc.id} className="bg-orange-500/10 p-2 rounded">
                    <div className="font-medium">{npc.name}</div>
                    <div className="text-xs text-muted-foreground">ID: {npc.id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 text-xs text-muted-foreground border-t">
            💡 <strong>Shift + Click</strong> para agregar/quitar de la selección
            <br />
            💡 <strong>Ctrl + A</strong> para seleccionar todo
            <br />
            💡 <strong>Arrastra (sin Shift)</strong> para seleccionar por caja (drag-box)
            <br />
            💡 <strong>Esc</strong> o click fuera para deseleccionar
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MapTab() {
  // Estado de selección simple (mantiene compatibilidad)
  const [selectedBuilding, setSelectedBuilding] = useState<MapBuilding | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<MapBuilding | null>(null);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const [hoveredZone, setHoveredZone] = useState<MapZone | null>(null);
  const [selectedNPC, setSelectedNPC] = useState<MapNPC | null>(null);
  const [hoveredNPC, setHoveredNPC] = useState<MapNPC | null>(null);

  // Estado de selección múltiple
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<Set<string>>(new Set());
  const [selectedZoneIds, setSelectedZoneIds] = useState<Set<string>>(new Set());
  const [selectedNPCIds, setSelectedNPCIds] = useState<Set<string>>(new Set());

  // Estado de UI
  const [hoveredElement, setHoveredElement] = useState<SelectableElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectableElement | null>(null);
  const [isMultiSelect, setIsMultiSelect] = useState(false);

  // Estado para drag-box selection
  const [finalSelectionBox, setFinalSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number; visible: boolean } | null>(null);

  // Estado para keyboard shortcuts
  const buildingsRef = useState<MapBuilding[]>([])[0];
  const zonesRef = useState<MapZone[]>([])[0];
  const npcsRef = useState<MapNPC[]>([])[0];

  // Estado para edición de elementos
  const [isEditing, setIsEditing] = useState(false);

  // Keyboard shortcuts: Ctrl+A (seleccionar todo), Esc (deseleccionar todo)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+A o Cmd+A (Mac) - Seleccionar todo visible
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        const allBuildingIds = new Set(buildingsRef.map(b => b.id));
        const allZoneIds = new Set(zonesRef.map(z => z.id));
        const allNPCIds = new Set(npcsRef.map(n => n.id));

        setSelectedBuildingIds(allBuildingIds);
        setSelectedZoneIds(allZoneIds);
        setSelectedNPCIds(allNPCIds);
        setIsMultiSelect(true);

        // Limpiar selección simple
        setSelectedBuilding(null);
        setSelectedZone(null);
        setSelectedNPC(null);
        setSelectedElement(null);
      }

      // Esc - Deseleccionar todo
      if (event.key === 'Escape') {
        clearAllSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [buildingsRef, zonesRef, npcsRef]);

  const clearAllSelection = useCallback(() => {
    setSelectedBuildingIds(new Set());
    setSelectedZoneIds(new Set());
    setSelectedNPCIds(new Set());
    setIsMultiSelect(false);
    setSelectedBuilding(null);
    setSelectedZone(null);
    setSelectedNPC(null);
    setSelectedElement(null);
    setHoveredElement(null);
    // Limpiar la caja de selección final
    setFinalSelectionBox(null);
  }, []);

  const handleBuildingClick = (building: MapBuilding, event?: React.MouseEvent) => {
    const isShiftKey = event?.shiftKey || false;
    const isCtrlKey = event?.ctrlKey || event?.metaKey || false;

    if (isShiftKey || isCtrlKey) {
      // Selección múltiple
      setSelectedBuildingIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(building.id)) {
          newSet.delete(building.id);
        } else {
          newSet.add(building.id);
        }
        setIsMultiSelect(newSet.size > 0);
        return newSet;
      });

      // Limpiar selección simple
      setSelectedBuilding(null);
      setSelectedZone(null);
      setSelectedNPC(null);
      setIsEditing(false);
    } else if (selectedBuildingIds.has(building.id)) {
      // Click en elemento ya seleccionado en selección múltiple - mantener selección múltiple
      setIsMultiSelect(true);
    } else {
      // Selección simple (deseleccionar otros)
      setSelectedBuildingIds(new Set());
      setSelectedZoneIds(new Set());
      setSelectedNPCIds(new Set());
      setIsMultiSelect(false);
      setSelectedBuilding(building);
      setSelectedZone(null);
      setSelectedNPC(null);
      setIsEditing(false);
    }

    // Limpiar la caja de selección
    setFinalSelectionBox(null);

    setSelectedElement({
      id: building.id,
      type: 'building',
      name: building.name,
      coords: building.coords
    });
  };

  const handleBuildingHover = (building: MapBuilding | null) => {
    setHoveredBuilding(building);
    if (building) {
      setHoveredElement({
        id: building.id,
        type: 'building',
        name: building.name,
        coords: building.coords
      });
    } else {
      setHoveredElement(null);
    }
  };

  const handleZoneClick = (zone: MapZone, event?: React.MouseEvent) => {
    const isShiftKey = event?.shiftKey || false;
    const isCtrlKey = event?.ctrlKey || event?.metaKey || false;

    if (isShiftKey || isCtrlKey) {
      // Selección múltiple
      setSelectedZoneIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(zone.id)) {
          newSet.delete(zone.id);
        } else {
          newSet.add(zone.id);
        }
        setIsMultiSelect(newSet.size > 0);
        return newSet;
      });

      // Limpiar selección simple
      setSelectedBuilding(null);
      setSelectedZone(null);
      setSelectedNPC(null);
      setIsEditing(false);
    } else if (selectedZoneIds.has(zone.id)) {
      // Click en elemento ya seleccionado en selección múltiple - mantener selección múltiple
      setIsMultiSelect(true);
    } else {
      // Selección simple
      setSelectedBuildingIds(new Set());
      setSelectedZoneIds(new Set());
      setSelectedNPCIds(new Set());
      setIsMultiSelect(false);
      setSelectedZone(zone);
      setSelectedBuilding(null);
      setSelectedNPC(null);
      setIsEditing(false);
      // Limpiar la caja de selección
      setFinalSelectionBox(null);

    setSelectedElement({
      id: zone.id,
      type: 'zone',
      name: zone.name,
      coords: { worldX: zone.polygon[0].x, worldZ: zone.polygon[0].y || 0 }
    });
  };

  const handleZoneHover = (zone: MapZone | null) => {
    setHoveredZone(zone);
    if (zone) {
      setHoveredElement({
        id: zone.id,
        type: 'zone',
        name: zone.name,
        coords: { worldX: zone.polygon[0].x, worldZ: zone.polygon[0].y || 0 }
      });
    } else {
      setHoveredElement(null);
    }
  };

  const handleNPCClick = (npc: MapNPC, event?: React.MouseEvent) => {
    const isShiftKey = event?.shiftKey || false;
    const isCtrlKey = event?.ctrlKey || event?.metaKey || false;

    if (isShiftKey || isCtrlKey) {
      // Selección múltiple
      setSelectedNPCIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(npc.id)) {
          newSet.delete(npc.id);
        } else {
          newSet.add(npc.id);
        }
        setIsMultiSelect(newSet.size > 0);
        return newSet;
      });

      // Limpiar selección simple
      setSelectedBuilding(null);
      setSelectedZone(null);
      setSelectedNPC(null);
      setIsEditing(false);
    } else if (selectedNPCIds.has(npc.id)) {
      // Click en elemento ya seleccionado en selección múltiple - mantener selección múltiple
      setIsMultiSelect(true);
    } else {
      // Selección simple
      setSelectedBuildingIds(new Set());
      setSelectedZoneIds(new Set());
      setSelectedNPCIds(new Set());
      setIsMultiSelect(false);
      setSelectedNPC(npc);
      setSelectedBuilding(null);
      setSelectedZone(null);
      setIsEditing(false);
      // Limpiar la caja de selección
      setFinalSelectionBox(null);

    setSelectedElement({
      id: npc.id,
      type: 'npc',
      name: npc.name,
      coords: npc.coords
    });
  };

  const handleNPCHover = (npc: MapNPC | null) => {
    setHoveredNPC(npc);
    if (npc) {
      setHoveredElement({
        id: npc.id,
        type: 'npc',
        name: npc.name,
        coords: npc.coords
      });
    } else {
      setHoveredElement(null);
    }
  };

  // Hooks para persistencia y arrastre
  const { saveNPCCoords } = useMapPersistence();

  // Handlers para arrastre de NPCs
  const handleNPCDragStart = useCallback((npcId: string) => {
    console.log('NPC drag started:', npcId);
  }, []);

  const handleNPCDrag = useCallback((npcId: string, newPos: { worldX: number; worldZ: number }) => {
    console.log('NPC dragging:', npcId, newPos);
    // Aquí podríamos actualizar visualmente la posición del NPC mientras se arrastra
  }, []);

  const handleNPCDragEnd = useCallback(async (npcId: string, finalPos: { worldX: number; worldZ: number }) => {
    console.log('NPC drag ended:', npcId, finalPos);

    // Guardar las nuevas coordenadas
    const result = await saveNPCCoords(npcId, finalPos);

    if (result.success) {
      console.log('NPC coordinates saved successfully');
      // Aquí podríamos mostrar un toast de confirmación
    } else {
      console.error('Error saving NPC coordinates:', result.error);
      // Aquí podríamos mostrar un toast de error
    }
  }, [saveNPCCoords]);

  const handleStageClick = () => {
    clearAllSelection();
  };

  /**
   * Maneja la finalización del drag-box selection
   * NOTA: La detección de elementos dentro de la caja requiere acceso
   * a los datos de las capas (buildingsRef, zonesRef, npcsRef)
   * Esta es una implementación básica que muestra la caja visual.
   * Para selección completa de elementos, sería necesario:
   * 1. Exponer los datos de cada capa hacia arriba (via props/context)
   * 2. Implementar detección geométrica:
   *    - Edificios: Verificar si rectángulo intersecta con la caja
   *    - Zonas: Verificar si algún punto del polígono está dentro
   *    - NPCs: Verificar si el punto está dentro
   * 3. Actualizar los Sets de selección (selectedBuildingIds, etc.)
   */
  const handleSelectionBoxChange = useCallback((
    selectionBox: { startX: number; startY: number; endX: number; endY: number; visible: boolean } | null
  ) => {
    if (selectionBox && selectionBox.visible) {
      // Guardar la caja de selección final
      setFinalSelectionBox(selectionBox);

      // LÓGICA FUTURA PARA SELECCIÓN DE ELEMENTOS:
      // Convertir coordenadas de caja de píxeles a coordenadas del viewport
      // const boxBounds = {
      //   minX: Math.min(selectionBox.startX, selectionBox.endX),
      //   maxX: Math.max(selectionBox.startX, selectionBox.endX),
      //   minY: Math.min(selectionBox.startY, selectionBox.endY),
      //   maxY: Math.max(selectionBox.startY, selectionBox.endY)
      // };

      // Verificar qué edificios están dentro de la caja
      // const buildingsInBox = buildingsRef.filter(b => {
      //   const buildingMinX = Math.min(b.pixelCoords.start.x, b.pixelCoords.end.x);
      //   const buildingMaxX = Math.max(b.pixelCoords.start.x, b.pixelCoords.end.x);
      //   const buildingMinY = Math.min(b.pixelCoords.start.y, b.pixelCoords.end.y);
      //   const buildingMaxY = Math.max(b.pixelCoords.start.y, b.pixelCoords.end.y);
      //   return buildingMinX <= boxBounds.maxX && buildingMaxX >= boxBounds.minX &&
      //          buildingMinY <= boxBounds.maxY && buildingMaxY >= boxBounds.minY;
      // });

      // Verificar qué zonas están dentro de la caja
      // const zonesInBox = zonesRef.filter(z => {
      //   return z.polygon.some(p => p.x >= boxBounds.minX && p.x <= boxBounds.maxX &&
      //                                 p.y >= boxBounds.minY && p.y <= boxBounds.maxY);
      // });

      // Verificar qué NPCs están dentro de la caja
      // const npcsInBox = npcsRef.filter(n => {
      //   return npc.pixelCoords &&
      //          npc.pixelCoords.x >= boxBounds.minX && npc.pixelCoords.x <= boxBounds.maxX &&
      //          npc.pixelCoords.y >= boxBounds.minY && npc.pixelCoords.y <= boxBounds.maxY;
      // });

      // Agregar elementos a la selección múltiple
      // setSelectedBuildingIds(prev => new Set([...prev, ...buildingsInBox.map(b => b.id)]));
      // setSelectedZoneIds(prev => new Set([...prev, ...zonesInBox.map(z => z.id)]));
      // setSelectedNPCIds(prev => new Set([...prev, ...npcsInBox.map(n => n.id)]));
      // setIsMultiSelect(true);
    } else if (selectionBox === null) {
      // Limpiar la caja de selección cuando se hace click elsewhere
      setFinalSelectionBox(null);
    }
  }, []);

  // Obtener elementos seleccionados completos
  const getSelectedBuildings = useCallback(() => {
    return buildingsRef.filter(b => selectedBuildingIds.has(b.id));
  }, [buildingsRef, selectedBuildingIds]);

  const getSelectedZones = useCallback(() => {
    return zonesRef.filter(z => selectedZoneIds.has(z.id));
  }, [zonesRef, selectedZoneIds]);

  const getSelectedNPCs = useCallback(() => {
    return npcsRef.filter(n => selectedNPCIds.has(n.id));
  }, [npcsRef, selectedNPCIds]);

  const selectedBuildings = getSelectedBuildings();
  const selectedZones = getSelectedZones();
  const selectedNPCs = getSelectedNPCs();
  const hasMultipleSelection = isMultiSelect && (selectedBuildings.length > 1 || selectedZones.length > 1 || selectedNPCs.length > 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mapa 2D Interactivo</h2>
          <p className="text-muted-foreground">Visualización espacial avanzada del mundo narrativo</p>
        </div>
        {hasMultipleSelection && (
          <div className="text-sm text-muted-foreground">
            {selectedBuildings.length + selectedZones.length + selectedNPCs.length} elementos seleccionados
          </div>
        )}
      </div>

      {/* Información de selección múltiple */}
      {hasMultipleSelection && (
        <MultipleSelectionDisplay
          buildings={selectedBuildings}
          zones={selectedZones}
          npcs={selectedNPCs}
          onClearSelection={clearAllSelection}
        />
      )}

      {/* Información del edificio seleccionado (solo si hay selección simple) */}
      {selectedBuilding && !hasMultipleSelection && !isEditing && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedBuilding.name}
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-primary hover:underline"
              >
                Editar
              </button>
            </CardTitle>
            <CardDescription>ID: {selectedBuilding.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Coordenadas Minecraft:</span>
                <p className="text-muted-foreground">
                  {selectedBuilding.coords.start.x}, {selectedBuilding.coords.start.z} →{' '}
                  {selectedBuilding.coords.end.x}, {selectedBuilding.coords.end.z}
                </p>
              </div>
              {selectedBuilding.metadata?.lore && (
                <div>
                  <span className="font-semibold">Lore:</span>
                  <p className="text-muted-foreground">{selectedBuilding.metadata.lore}</p>
                </div>
              )}
              {selectedBuilding.metadata?.puebloId && (
                <div>
                  <span className="font-semibold">Pueblo ID:</span>
                  <p className="text-muted-foreground">{selectedBuilding.metadata.puebloId}</p>
                </div>
              )}
              {selectedBuilding.metadata?.hasEvents && (
                <div>
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                    ⚠️ Tiene eventos recientes
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información de la zona seleccionada (solo si hay selección simple) */}
      {selectedZone && !hasMultipleSelection && !isEditing && (
        <Card className="border-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                {selectedZone.name}
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-purple-500 hover:underline"
              >
                Editar
              </button>
            </CardTitle>
            <CardDescription>ID: {selectedZone.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Tipo:</span>
                <p className="text-muted-foreground">
                  {selectedZone.type === 'nacion' ? '🏰 Nación' : '🏘️ Pueblo'}
                </p>
              </div>
              {selectedZone.data?.description && (
                <div>
                  <span className="font-semibold">Descripción:</span>
                  <p className="text-muted-foreground">{selectedZone.data.description}</p>
                </div>
              )}
              {selectedZone.data?.lore?.estado_pueblo && (
                <div>
                  <span className="font-semibold">Estado:</span>
                  <p className="text-muted-foreground">{selectedZone.data.lore.estado_pueblo}</p>
                </div>
              )}
              {selectedZone.data?.lore?.rumores && selectedZone.data.lore.rumores.length > 0 && (
                <div>
                  <span className="font-semibold">Rumores ({selectedZone.data.lore.rumores.length}):</span>
                  <ul className="text-muted-foreground list-disc list-inside mt-1">
                    {selectedZone.data.lore.rumores.map((rumor: string, index: number) => (
                      <li key={index}>{rumor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información del NPC seleccionado (solo si hay selección simple) */}
      {selectedNPC && !hasMultipleSelection && !isEditing && (
        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {selectedNPC.name}
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-orange-500 hover:underline"
              >
                Editar
              </button>
            </CardTitle>
            <CardDescription>ID: {selectedNPC.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Coordenadas Minecraft:</span>
                <p className="text-muted-foreground">
                  {selectedNPC.coords.worldX}, {selectedNPC.coords.worldZ}
                </p>
              </div>
              {selectedNPC.data?.location && (
                <div>
                  <span className="font-semibold">Ubicación:</span>
                  <p className="text-muted-foreground">
                    {selectedNPC.data.location.edificioId ? `Edificio: ${selectedNPC.data.location.edificioId}` : 'Ubicación desconocida'}
                  </p>
                </div>
              )}
              {selectedNPC.data?.description && (
                <div>
                  <span className="font-semibold">Descripción:</span>
                  <p className="text-muted-foreground" style={{ maxHeight: '150px', overflow: 'auto' }}>
                    {selectedNPC.data.description}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Panel de edición de elemento */}
      {isEditing && (selectedBuilding || selectedZone || selectedNPC) && !hasMultipleSelection && (
        <EditElementPanel
          element={(selectedBuilding || selectedZone || selectedNPC)!}
          onSave={() => {
            setIsEditing(false);
            // Aquí podríamos recargar los datos o usar un callback para actualizar el estado
          }}
          onCancel={() => setIsEditing(false)}
        />
      )}

      {/* Información de hover (solo si no hay selección múltiple) */}
      {hoveredBuilding && !selectedBuilding && !selectedZone && !selectedNPC && !hasMultipleSelection && (
        <Card className="bg-primary/5 border-primary/50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium">{hoveredBuilding.name}</span>
              <span className="text-muted-foreground text-xs">
                (Click para seleccionar, Shift+Click para selección múltiple)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {hoveredZone && !selectedZone && !selectedBuilding && !selectedNPC && !hasMultipleSelection && (
        <Card className="bg-purple-500/10 border-purple-500/50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <Landmark className="h-4 w-4 text-purple-500" />
              <span className="font-medium">{hoveredZone.name}</span>
              <span className="text-muted-foreground text-xs">
                ({hoveredZone.type === 'nacion' ? 'Nación' : 'Pueblo'} - Shift+Click para selección múltiple)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {hoveredNPC && !selectedNPC && !selectedBuilding && !selectedZone && !hasMultipleSelection && (
        <Card className="bg-orange-500/10 border-orange-500/50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-orange-500" />
              <span className="font-medium">{hoveredNPC.name}</span>
              <span className="text-muted-foreground text-xs">
                (Shift+Click para selección múltiple)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-4 gap-4">
        {/* Control de capas */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Control de Capas</CardTitle>
              <CardDescription>Gestiona la visibilidad y opacidad</CardDescription>
            </CardHeader>
            <CardContent>
              <LayerControl />
            </CardContent>
          </Card>
        </div>

        {/* Mapa */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Map className="h-5 w-5" />
                Mapa del Mundo
              </CardTitle>
              <CardDescription>
                Zoom y pan con el mouse. Click para seleccionar, Shift+Click para selección múltiple. Arrastra sin Shift para selección por caja.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MapStage
                width={800}
                height={600}
                onStageClick={handleStageClick}
                onSelectionBoxChange={handleSelectionBoxChange}
              >
                <LayerZones
                  onZoneClick={handleZoneClick}
                  onZoneHover={handleZoneHover}
                  showLabels={true}
                  selectedZoneIds={selectedZoneIds}
                />
                <LayerBuildings
                  onBuildingClick={handleBuildingClick}
                  onBuildingHover={handleBuildingHover}
                  showLabels={true}
                  selectedBuildingIds={selectedBuildingIds}
                />
                <LayerNPCs
                  onNPCClick={handleNPCClick}
                  onNPCHover={handleNPCHover}
                  onNPCDragStart={handleNPCDragStart}
                  onNPCDrag={handleNPCDrag}
                  onNPCDragEnd={handleNPCDragEnd}
                  showLabels={true}
                  selectedNPCIds={selectedNPCIds}
                />
                <LayerUI
                  hoveredElement={hoveredElement}
                  selectedElement={hasMultipleSelection ? null : selectedElement}
                  showTooltips={!hasMultipleSelection}
                  showBoundingBox={!hasMultipleSelection}
                  showSelectedLabels={!hasMultipleSelection}
                />
              </MapStage>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leyenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Leyenda del Mapa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Selección Múltiple</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <span>Edificio seleccionado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500" />
                  <span>Zona seleccionada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500" />
                  <span>NPC seleccionado</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Zonas y Pueblos</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span>Pueblo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500" />
                  <span>Nación</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-white border-2 border-purple-500" />
                  <span>Vértice seleccionado</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Edificios</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <span>Edificio normal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-500" />
                  <span>Edificio seleccionado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span>Edificio con actividad</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span>Indicador de eventos</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">NPCs</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500" />
                  <span>⭐ NPC (Estrella)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-400" />
                  <span>NPC seleccionado</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">UI y Selección</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-500 border-2 border-dashed" />
                  <span>Tooltip de hover</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-orange-500" />
                  <span>Bounding box</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-orange-500" />
                  <span>Label de selección</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-xs mt-4">
            * Los nombres de zonas se muestran al hacer zoom ≥ 60%
            * Los nombres de edificios se muestran al hacer zoom ≥ 80%
            * Los nombres de NPCs se muestran al hacer zoom ≥ 100%
            * <strong>Shift + Click</strong> para seleccionar múltiples elementos
            * <strong>Ctrl + A</strong> para seleccionar todos los elementos
            * <strong>Esc</strong> para deseleccionar todo
            * La capa UI siempre está sobre las demás
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
