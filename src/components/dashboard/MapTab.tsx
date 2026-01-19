'use client';

import { useState, useEffect } from 'react';
import { MapPin, Building, Globe, ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { World, Pueblo, Edificio } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ViewMode = 'mundo' | 'pueblo';

export default function MapTab() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [loading, setLoading] = useState(true);

  // Vista de Mundo
  const [zoomMundo, setZoomMundo] = useState(1);
  const [panMundo, setPanMundo] = useState({ x: 0, y: 0 });
  const [isDraggingMundo, setIsDraggingMundo] = useState(false);
  const [dragStartMundo, setDragStartMundo] = useState({ x: 0, y: 0 });

  // Vista de Pueblo
  const [selectedWorld, setSelectedWorld] = useState<string>('');
  const [selectedPueblo, setSelectedPueblo] = useState<string>('');
  const [zoomPueblo, setZoomPueblo] = useState(1);
  const [panPueblo, setPanPueblo] = useState({ x: 0, y: 0 });
  const [isDraggingPueblo, setIsDraggingPueblo] = useState(false);
  const [dragStartPueblo, setDragStartPueblo] = useState({ x: 0, y: 0 });
  const [selectedEdificio, setSelectedEdificio] = useState<Edificio | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [worldsRes, pueblosRes, edificiosRes] = await Promise.all([
        fetch('/api/worlds'),
        fetch('/api/pueblos'),
        fetch('/api/edificios')
      ]);
      const worldsResult = await worldsRes.json();
      const pueblosResult = await pueblosRes.json();
      const edificiosResult = await edificiosRes.json();

      if (worldsResult.success) setWorlds(worldsResult.data);
      if (pueblosResult.success) setPueblos(pueblosResult.data);
      if (edificiosResult.success) setEdificios(edificiosResult.data);

      // Seleccionar mundo por defecto si existe
      if (worldsResult.data && worldsResult.data.length > 0) {
        setSelectedWorld(worldsResult.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejo de zoom y pan para Mundo
  const handleZoomInMundo = () => setZoomMundo(z => Math.min(z + 0.2, 2));
  const handleZoomOutMundo = () => setZoomMundo(z => Math.max(z - 0.2, 0.5));
  const handleResetMundo = () => {
    setZoomMundo(1);
    setPanMundo({ x: 0, y: 0 });
  };

  const handleMouseDownMundo = (e: React.MouseEvent) => {
    setIsDraggingMundo(true);
    setDragStartMundo({ x: e.clientX - panMundo.x, y: e.clientY - panMundo.y });
  };

  const handleMouseMoveMundo = (e: React.MouseEvent) => {
    if (isDraggingMundo) {
      setPanMundo({
        x: e.clientX - dragStartMundo.x,
        y: e.clientY - dragStartMundo.y
      });
    }
  };

  const handleMouseUpMundo = () => {
    setIsDraggingMundo(false);
  };

  // Manejo de zoom y pan para Pueblo
  const handleZoomInPueblo = () => setZoomPueblo(z => Math.min(z + 0.2, 2));
  const handleZoomOutPueblo = () => setZoomPueblo(z => Math.max(z - 0.2, 0.5));
  const handleResetPueblo = () => {
    setZoomPueblo(1);
    setPanPueblo({ x: 0, y: 0 });
  };

  const handleMouseDownPueblo = (e: React.MouseEvent) => {
    setIsDraggingPueblo(true);
    setDragStartPueblo({ x: e.clientX - panPueblo.x, y: e.clientY - panPueblo.y });
  };

  const handleMouseMovePueblo = (e: React.MouseEvent) => {
    if (isDraggingPueblo) {
      setPanPueblo({
        x: e.clientX - dragStartPueblo.x,
        y: e.clientY - dragStartPueblo.y
      });
    }
  };

  const handleMouseUpPueblo = () => {
    setIsDraggingPueblo(false);
  };

  // Obtener pueblos del mundo seleccionado
  const pueblosDelMundo = pueblos.filter(p => p.worldId === selectedWorld);

  // Obtener edificios del pueblo seleccionado
  const edificiosDelPueblo = edificios.filter(e => e.puebloId === selectedPueblo);

  // Calcular centro del mapa de edificios para centrar la vista
  useEffect(() => {
    if (edificiosDelPueblo.length > 0) {
      const minX = Math.min(...edificiosDelPueblo.map(e => e.area.start.x));
      const maxX = Math.max(...edificiosDelPueblo.map(e => e.area.end.x));
      const minZ = Math.min(...edificiosDelPueblo.map(e => e.area.start.z));
      const maxZ = Math.max(...edificiosDelPueblo.map(e => e.area.end.z));

      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;

      // Ajustar el pan para centrar (simplificado)
      setPanPueblo({ x: -centerX + 400, y: -centerZ + 300 });
    }
  }, [selectedPueblo]);

  // Información del pueblo seleccionado
  const infoPueblo = pueblos.find(p => p.id === selectedPueblo);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando mapa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mapa 2D Cognitivo</h2>
          <p className="text-muted-foreground">Visualización espacial del mundo narrativo</p>
        </div>
      </div>

      <Tabs defaultValue="mundo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mundo" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>Mundo</span>
          </TabsTrigger>
          <TabsTrigger value="pueblo" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Pueblo/Nación</span>
          </TabsTrigger>
        </TabsList>

        {/* Vista de Mundo - Pueblos y Naciones */}
        <TabsContent value="mundo" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mapa del Mundo</CardTitle>
                  <CardDescription>
                    Visualización de pueblos y naciones en {worlds.find(w => w.id === selectedWorld)?.name || 'el mundo'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={handleZoomOutMundo}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-3 text-sm text-muted-foreground">
                    {Math.round(zoomMundo * 100)}%
                  </span>
                  <Button variant="outline" size="icon" onClick={handleZoomInMundo}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleResetMundo}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] border rounded-lg">
                <div
                  className="relative min-w-[1200px] min-h-[600px] cursor-grab active:cursor-grabbing bg-muted/30"
                  onMouseDown={handleMouseDownMundo}
                  onMouseMove={handleMouseMoveMundo}
                  onMouseUp={handleMouseUpMundo}
                  onMouseLeave={handleMouseUpMundo}
                >
                  <div
                    className="relative"
                    style={{
                      transform: `scale(${zoomMundo}) translate(${panMundo.x / zoomMundo}px, ${panMundo.y / zoomMundo}px)`,
                      transformOrigin: 'top left'
                    }}
                  >
                    {pueblosDelMundo.map((pueblo, index) => {
                      // Calcular posición en grid
                      const x = 150 + (index % 4) * 250;
                      const y = 100 + Math.floor(index / 4) * 200;

                      return (
                        <div
                          key={pueblo.id}
                          className={`absolute rounded-lg flex items-center justify-center font-semibold cursor-pointer transition-all hover:scale-110 shadow-lg ${
                            pueblo.type === 'nacion' ? 'bg-purple-600 w-40 h-40' : 'bg-green-600 w-32 h-32'
                          }`}
                          style={{
                            left: x,
                            top: y
                          }}
                          title={pueblo.name}
                        >
                          <div className="text-center px-3 space-y-1">
                            <MapPin className="h-6 w-6 mx-auto" />
                            <span className="text-white text-sm">{pueblo.name}</span>
                            <span className="text-white/80 text-xs capitalize">{pueblo.type}</span>
                          </div>
                        </div>
                      );
                    })}

                    {pueblosDelMundo.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-muted-foreground text-lg">
                          {worlds.length > 0 ? 'No hay pueblos en este mundo' : 'No hay mundos disponibles'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Leyenda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leyenda</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-600 rounded"></div>
                <span className="text-sm">Pueblo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-600 rounded"></div>
                <span className="text-sm">Nación</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vista de Pueblo/Nación - Edificios por Coordenadas */}
        <TabsContent value="pueblo" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div>
                  <CardTitle>Mapa de Edificios</CardTitle>
                  <CardDescription>
                    Visualización de edificios por coordenadas (X, Z)
                  </CardDescription>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Mundo</label>
                    <Select
                      value={selectedWorld}
                      onValueChange={(value) => {
                        setSelectedWorld(value);
                        setSelectedPueblo('');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un mundo" />
                      </SelectTrigger>
                      <SelectContent>
                        {worlds.map((world) => (
                          <SelectItem key={world.id} value={world.id}>
                            {world.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Pueblo/Nación</label>
                    <Select
                      value={selectedPueblo}
                      onValueChange={setSelectedPueblo}
                      disabled={!selectedWorld}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un pueblo" />
                      </SelectTrigger>
                      <SelectContent>
                        {pueblosDelMundo.map((pueblo) => (
                          <SelectItem key={pueblo.id} value={pueblo.id}>
                            {pueblo.name} ({pueblo.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="icon" onClick={handleZoomOutPueblo}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-3 text-sm text-muted-foreground">
                    {Math.round(zoomPueblo * 100)}%
                  </span>
                  <Button variant="outline" size="icon" onClick={handleZoomInPueblo}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleResetPueblo}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] border rounded-lg">
                {selectedPueblo ? (
                  <div
                    className="relative min-w-[1200px] min-h-[600px] cursor-grab active:cursor-grabbing bg-muted/30"
                    onMouseDown={handleMouseDownPueblo}
                    onMouseMove={handleMouseMovePueblo}
                    onMouseUp={handleMouseUpPueblo}
                    onMouseLeave={handleMouseUpPueblo}
                  >
                    {/* Grid de referencia */}
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(20)].map((_, i) => (
                        <div key={i} style={{
                          position: 'absolute',
                          left: 0,
                          top: i * 100,
                          width: '100%',
                          height: 1,
                          backgroundColor: '#64748b',
                          opacity: 0.1
                        }} />
                      ))}
                      {[...Array(24)].map((_, i) => (
                        <div key={i} style={{
                          position: 'absolute',
                          top: 0,
                          left: i * 100,
                          height: '100%',
                          width: 1,
                          backgroundColor: '#64748b',
                          opacity: 0.1
                        }} />
                      ))}
                    </div>

                    <div
                      className="relative"
                      style={{
                        transform: `scale(${zoomPueblo}) translate(${panPueblo.x / zoomPueblo}px, ${panPueblo.y / zoomPueblo}px)`,
                        transformOrigin: 'top left'
                      }}
                    >
                      {/* Ejes de coordenadas */}
                      <div className="absolute pointer-events-none" style={{ left: 0, top: 300 }}>
                        <div className="bg-blue-600 w-full h-0.5"></div>
                        <span className="text-blue-600 text-xs font-bold bg-background px-1">Eje Z →</span>
                      </div>

                      {edificiosDelPueblo.map((edificio, index) => {
                        // Calcular centro del edificio
                        const centerX = (edificio.area.start.x + edificio.area.end.x) / 2;
                        const centerZ = (edificio.area.start.z + edificio.area.end.z) / 2;

                        // Mapear coordenadas al canvas (escala y offset)
                        const canvasX = centerX * 10 + 500;
                        const canvasZ = centerZ * 10 + 300;

                        // Calcular ancho y alto en canvas
                        const width = Math.abs(edificio.area.end.x - edificio.area.start.x) * 10;
                        const height = Math.abs(edificio.area.end.z - edificio.area.start.z) * 10;

                        return (
                          <div
                            key={edificio.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEdificio(edificio);
                            }}
                            className="absolute bg-orange-600 rounded-lg flex items-center justify-center font-semibold cursor-pointer transition-all hover:scale-105 hover:shadow-xl border-2 border-orange-400"
                            style={{
                              left: canvasX,
                              top: canvasZ,
                              width: Math.max(width, 60),
                              height: Math.max(height, 60)
                            }}
                            title={edificio.name}
                          >
                            <div className="text-center px-2 space-y-1">
                              <Building className="h-5 w-5 mx-auto text-white" />
                              <span className="text-white text-xs">{edificio.name}</span>
                            </div>
                          </div>
                        );
                      })}

                      {edificiosDelPueblo.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-muted-foreground text-lg">
                            No hay edificios en este pueblo
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px]">
                    <div className="text-center space-y-2">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground text-lg">
                        Selecciona un pueblo/nación para ver sus edificios
                      </p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Panel de información del edificio seleccionado */}
          {selectedEdificio && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Información del Edificio</CardTitle>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedEdificio(null)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">{selectedEdificio.name}</p>
                  <p className="text-sm text-muted-foreground">{infoPueblo?.name || 'Pueblo desconocido'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Descripción:</p>
                  <p className="text-sm text-muted-foreground">{selectedEdificio.lore || 'Sin descripción'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Coordenadas del Área (X, Z):</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-mono bg-muted px-2 py-1 rounded">
                        Inicio: X={selectedEdificio.area.start.x}, Z={selectedEdificio.area.start.z}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-mono bg-muted px-2 py-1 rounded">
                        Fin: X={selectedEdificio.area.end.x}, Z={selectedEdificio.area.end.z}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>🟠 Edificio</p>
                  <p>ℹ️ Haz clic en el edificio para ver más detalles</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leyenda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leyenda</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-600 rounded"></div>
                <span className="text-sm">Edificio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-0.5 bg-blue-600"></div>
                <span className="text-sm">Eje Z</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
