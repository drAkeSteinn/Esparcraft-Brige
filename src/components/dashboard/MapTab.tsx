'use client';

import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { World, Pueblo, Edificio, NPC } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

type MapNode = {
  id: string;
  type: 'world' | 'pueblo' | 'edificio';
  name: string;
  x: number;
  y: number;
  parentId?: string;
  data?: World | Pueblo | Edificio | NPC;
  children?: MapNode[];
};

export default function MapTab() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [nodes, setNodes] = useState<MapNode[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    buildMapNodes();
  }, [worlds, pueblos, edificios, npcs]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [worldsRes, pueblosRes, edificiosRes, npcsRes] = await Promise.all([
        fetch('/api/worlds'),
        fetch('/api/pueblos'),
        fetch('/api/edificios'),
        fetch('/api/npcs')
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
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildMapNodes = () => {
    const mapNodes: MapNode[] = [];

    worlds.forEach((world, wIndex) => {
      const worldNode: MapNode = {
        id: world.id,
        type: 'world',
        name: world.name,
        x: 100 + (wIndex % 3) * 300,
        y: 100 + Math.floor(wIndex / 3) * 300,
        data: world,
        children: []
      };

      const worldPueblos = pueblos.filter(p => p.worldId === world.id);
      worldPueblos.forEach((pueblo, pIndex) => {
        const puebloNode: MapNode = {
          id: pueblo.id,
          type: 'pueblo',
          name: pueblo.name,
          x: worldNode.x + 50 + (pIndex % 4) * 60,
          y: worldNode.y + 80 + Math.floor(pIndex / 4) * 50,
          parentId: world.id,
          data: pueblo,
          children: []
        };

        const puebloEdificios = edificios.filter(e => e.puebloId === pueblo.id);
        puebloEdificios.forEach((edificio, eIndex) => {
          const edificioNode: MapNode = {
            id: edificio.id,
            type: 'edificio',
            name: edificio.name,
            x: puebloNode.x + 30 + (eIndex % 3) * 50,
            y: puebloNode.y + 50 + Math.floor(eIndex / 3) * 40,
            parentId: pueblo.id,
            data: edificio
          };

          if (puebloNode.children) {
            puebloNode.children.push(edificioNode);
          }
        });

        if (worldNode.children) {
          worldNode.children.push(puebloNode);
        }
      });

      mapNodes.push(worldNode);
    });

    setNodes(mapNodes);
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'world': return 'bg-purple-500';
      case 'pueblo': return 'bg-green-500';
      case 'edificio': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getNodeSize = (type: string) => {
    switch (type) {
      case 'world': return 'w-32 h-32';
      case 'pueblo': return 'w-24 h-24';
      case 'edificio': return 'w-16 h-16';
      default: return 'w-12 h-12';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando mapa...</p>
      </div>
    );
  }

  const allNodes: MapNode[] = [];
  const collectNodes = (nodeList: MapNode[]) => {
    nodeList.forEach(node => {
      allNodes.push(node);
      if (node.children) {
        collectNodes(node.children);
      }
    });
  };
  collectNodes(nodes);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mapa 2D Cognitivo</h2>
          <p className="text-muted-foreground">Visualización espacial del mundo narrativo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px] border rounded-lg">
                <div
                  className="relative min-w-[800px] min-h-[800px] cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                      transformOrigin: 'top left'
                    }}
                  >
                    {allNodes.map(node => {
                      if (!node.parentId) return null;
                      const parentNode = allNodes.find(n => n.id === node.parentId);
                      if (!parentNode) return null;

                      return (
                        <line
                          key={`line-${node.id}`}
                          x1={parentNode.x + (node.parentId?.length ? 40 : 64)}
                          y1={parentNode.y + (node.parentId?.length ? 40 : 64)}
                          x2={node.x + (node.type === 'world' ? 64 : node.type === 'pueblo' ? 48 : 32)}
                          y2={node.y + (node.type === 'world' ? 64 : node.type === 'pueblo' ? 48 : 32)}
                          stroke="#64748b"
                          strokeWidth="2"
                        />
                      );
                    })}
                  </svg>

                  <div
                    className="relative"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                      transformOrigin: 'top left'
                    }}
                  >
                    {allNodes.map(node => (
                      <div
                        key={node.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNode(node);
                        }}
                        className={`absolute rounded-lg flex items-center justify-center text-white font-semibold cursor-pointer transition-all hover:scale-110 ${getNodeColor(node.type)} ${getNodeSize(node.type)}`}
                        style={{
                          left: node.x,
                          top: node.y
                        }}
                        title={node.name}
                      >
                        <span className={`text-center px-2 ${node.type === 'edificio' ? 'text-xs' : node.type === 'pueblo' ? 'text-sm' : 'text-base'}`}>
                          {node.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[540px]">
                {selectedNode ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedNode.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">Tipo: {selectedNode.type}</p>
                      <p className="text-xs text-muted-foreground">ID: {selectedNode.id}</p>
                    </div>

                    {selectedNode.data && (
                      <div className="space-y-3">
                        {selectedNode.type === 'world' && (
                          <div>
                            <p className="text-sm font-medium">Estado del mundo:</p>
                            <p className="text-sm text-muted-foreground">{(selectedNode.data as World).lore.estado_mundo}</p>
                          </div>
                        )}

                        {selectedNode.type === 'pueblo' && (
                          <div>
                            <p className="text-sm font-medium">Estado del pueblo:</p>
                            <p className="text-sm text-muted-foreground">{(selectedNode.data as Pueblo).lore.estado_pueblo}</p>
                          </div>
                        )}

                        {selectedNode.type === 'edificio' && (
                          <div>
                            <p className="text-sm font-medium">Descripción:</p>
                            <p className="text-sm text-muted-foreground">{(selectedNode.data as Edificio).lore}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>🟣 Mundo</p>
                      <p>🟢 Pueblo</p>
                      <p>🟠 Edificio</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="text-sm">Selecciona un nodo para ver detalles</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
