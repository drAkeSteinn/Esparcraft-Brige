'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Filter, ChevronRight, Globe, MapPin, Building, Users, X, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { World, Pueblo, Edificio, NPC } from '@/lib/types';
import { MapLayerVisibility, SelectedEntity } from './map/types';
import MapCanvas from './map/MapCanvas';
import LayerControls from './map/LayerControls';
import MapSidebar from './map/MapSidebar';

export default function MapTab() {
  // Data state
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);

  // Map state
  const [layerVisibility, setLayerVisibility] = useState<MapLayerVisibility>({
    worlds: true,
    pueblos: true,
    edificios: true,
    npcs: true,
    grid: true,
    labels: true,
  });
  const [filterWorldId, setFilterWorldId] = useState<string | null>(null);
  const [filterPuebloId, setFilterPuebloId] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<SelectedEntity | null>(null);
  const [scale, setScale] = useState(1);

  // Ref para el canvas
  const canvasRef = useRef<{ fitToScreen: () => void }>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [worldsRes, pueblosRes, edificiosRes, npcsRes] = await Promise.all([
          fetch('/api/worlds'),
          fetch('/api/pueblos'),
          fetch('/api/edificios'),
          fetch('/api/npcs'),
        ]);

        const worldsResult = await worldsRes.json();
        const pueblosResult = await pueblosRes.json();
        const edificiosResult = await edificiosRes.json();
        const npcsResult = await npcsRes.json();

        if (worldsResult.success) setWorlds(worldsResult.data);
        if (pueblosResult.success) setPueblos(pueblosResult.data);
        if (edificiosResult.success) setEdificios(edificiosResult.data);
        if (npcsResult.success) setNpcs(npcsResult.data);
      } catch (error) {
        console.error('Error fetching map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Toggle layer
  const handleToggleLayer = (layer: keyof MapLayerVisibility) => {
    setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.1));
  const handleFitScreen = () => {
    // Reset filters first
    setFilterWorldId(null);
    setFilterPuebloId(null);
    // The fit will happen via useEffect in MapCanvas
  };

  // Filter handlers
  const handleFilterWorldChange = (value: string) => {
    if (value === 'all') {
      setFilterWorldId(null);
      setFilterPuebloId(null);
    } else {
      setFilterWorldId(value);
      setFilterPuebloId(null);
    }
  };

  const handleFilterPuebloChange = (value: string) => {
    if (value === 'all') {
      setFilterPuebloId(null);
    } else {
      setFilterPuebloId(value);
    }
  };

  // Get filtered stats
  const getFilteredStats = () => {
    const filteredEdificios = edificios.filter(e => {
      if (filterPuebloId) return e.puebloId === filterPuebloId;
      if (filterWorldId) {
        const pueblo = pueblos.find(p => p.id === e.puebloId);
        return pueblo?.worldId === filterWorldId;
      }
      return true;
    });

    const filteredPueblos = pueblos.filter(p => {
      if (filterWorldId) return p.worldId === filterWorldId;
      return true;
    });

    const filteredNpcs = npcs.filter(n => {
      if (filterPuebloId) return n.location.puebloId === filterPuebloId;
      if (filterWorldId) return n.location.worldId === filterWorldId;
      return true;
    });

    return {
      pueblos: filteredPueblos.length,
      edificios: filteredEdificios.length,
      npcs: filteredNpcs.length,
    };
  };

  // Filtered pueblos for dropdown
  const filteredPueblosForDropdown = pueblos.filter(p => {
    if (!filterWorldId) return true;
    return p.worldId === filterWorldId;
  });

  const stats = getFilteredStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando mapa...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Mapa 2D</h2>
          <p className="text-muted-foreground">Visualización espacial del universo narrativo</p>
        </div>
      </div>

      {/* Filters and Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/30 border mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />

          {/* World Filter */}
          <Select value={filterWorldId || 'all'} onValueChange={handleFilterWorldChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mundo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los mundos</SelectItem>
              {worlds.map(world => (
                <SelectItem key={world.id} value={world.id}>
                  {world.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ChevronRight className="h-4 w-4 text-muted-foreground" />

          {/* Pueblo Filter */}
          <Select
            value={filterPuebloId || 'all'}
            onValueChange={handleFilterPuebloChange}
            disabled={!filterWorldId}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Región" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las regiones</SelectItem>
              {filteredPueblosForDropdown.map(pueblo => (
                <SelectItem key={pueblo.id} value={pueblo.id}>
                  {pueblo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {stats.pueblos} {stats.pueblos === 1 ? 'región' : 'regiones'}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Building className="h-3 w-3" />
            {stats.edificios} {stats.edificios === 1 ? 'edificio' : 'edificios'}
          </Badge>
          <Badge variant="default" className="flex items-center gap-1 bg-primary/80">
            <Users className="h-3 w-3" />
            {stats.npcs} {stats.npcs === 1 ? 'NPC' : 'NPCs'}
          </Badge>
        </div>

        {/* Clear filters */}
        {(filterWorldId || filterPuebloId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterWorldId(null);
              setFilterPuebloId(null);
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Breadcrumb */}
      {(filterWorldId || filterPuebloId) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Globe className="h-4 w-4" />
          <span>Mundos</span>
          {filterWorldId && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-foreground">
                {worlds.find(w => w.id === filterWorldId)?.name}
              </span>
            </>
          )}
          {filterPuebloId && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-foreground">
                {pueblos.find(p => p.id === filterPuebloId)?.name}
              </span>
            </>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative">
            <MapCanvas
              worlds={worlds}
              pueblos={pueblos}
              edificios={edificios}
              npcs={npcs}
              layerVisibility={layerVisibility}
              filterWorldId={filterWorldId}
              filterPuebloId={filterPuebloId}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
              onHoverEntity={setHoveredEntity}
            />

            {/* Hover Tooltip */}
            {hoveredEntity && (
              <div className="absolute top-4 left-4 bg-background/95 backdrop-blur border rounded-lg px-3 py-2 shadow-lg pointer-events-none">
                <div className="flex items-center gap-2">
                  {hoveredEntity.type === 'pueblo' && <MapPin className="h-4 w-4 text-green-500" />}
                  {hoveredEntity.type === 'edificio' && <Building className="h-4 w-4 text-orange-500" />}
                  {hoveredEntity.type === 'npc' && <Users className="h-4 w-4 text-pink-500" />}
                  <span className="font-medium text-sm">
                    {hoveredEntity.type === 'pueblo' && (hoveredEntity.data as Pueblo).name}
                    {hoveredEntity.type === 'edificio' && (hoveredEntity.data as Edificio).name}
                    {hoveredEntity.type === 'npc' && (hoveredEntity.data as NPC).card?.data?.name || 'NPC'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {hoveredEntity.type}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 flex flex-col gap-4 flex-shrink-0">
          <LayerControls
            layerVisibility={layerVisibility}
            onToggleLayer={handleToggleLayer}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitScreen={handleFitScreen}
            scale={scale}
          />
          <div className="flex-1 overflow-y-auto">
            <MapSidebar
              selectedEntity={selectedEntity}
              onClose={() => setSelectedEntity(null)}
              npcs={npcs}
              edificios={edificios}
              pueblos={pueblos}
              worlds={worlds}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
