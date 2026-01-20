'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, MapPin, ChevronDown, ChevronUp, Image as ImageIcon, X, Upload, AlertCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edificio, World, Pueblo, NPC, PlaceType, PointOfInterest } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import * as Icons from 'lucide-react';

// Componente dinámico para renderizar iconos
function IconComponent({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  const Icon = (Icons as any)[name] || Icons.MapPin;
  return <Icon size={size} className={className} />;
}

export default function EdificiosSection() {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [poiDialogOpen, setPoiDialogOpen] = useState(false);
  const [editingEdificio, setEditingEdificio] = useState<Edificio | null>(null);
  const [editingPoi, setEditingPoi] = useState<PointOfInterest | null>(null);
  const [compactView, setCompactView] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    worldId: '',
    puebloId: '',
    name: '',
    lore: '',
    eventos_recientes: '',
    area: {
      start: { x: '0', y: '64', z: '0' },
      end: { x: '10', y: '70', z: '10' }
    }
  });
  const [poiFormData, setPoiFormData] = useState({
    name: '',
    tipo: '',
    coordenadas: { x: '0', y: '64', z: '0' },
    descripcion: '',
    tags: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [coordinateWarnings, setCoordinateWarnings] = useState<string[]>([]);

  // Función auxiliar para parsear coordenadas permitiendo valores negativos
  const parseCoordinateValue = (value: string): number => {
    if (value === '' || value === '-') return 0;
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Validar si las coordenadas del POI están dentro del área del edificio
  const validateCoordinatesInArea = (
    coords: { x: number; y: number; z: number },
    area: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number } }
  ): string[] => {
    const warnings: string[] = [];

    const inRange = (value: number, min: number, max: number, axis: string) => {
      const actualMin = Math.min(min, max);
      const actualMax = Math.max(min, max);
      if (value < actualMin || value > actualMax) {
        warnings.push(`${axis}: ${value} está fuera del rango [${actualMin}, ${actualMax}]`);
      }
    };

    inRange(coords.x, area.start.x, area.end.x, 'X');
    inRange(coords.y, area.start.y, area.end.y, 'Y');
    inRange(coords.z, area.start.z, area.end.z, 'Z');

    return warnings;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [edificiosRes, worldsRes, pueblosRes, npcsRes, placeTypesRes] = await Promise.all([
        fetch('/api/edificios'),
        fetch('/api/worlds'),
        fetch('/api/pueblos'),
        fetch('/api/npcs'),
        fetch('/api/place-types')
      ]);
      const edificiosResult = await edificiosRes.json();
      const worldsResult = await worldsRes.json();
      const pueblosResult = await pueblosRes.json();
      const npcsResult = await npcsRes.json();
      const placeTypesResult = await placeTypesRes.json();

      if (edificiosResult.success) setEdificios(edificiosResult.data);
      if (worldsResult.success) setWorlds(worldsResult.data);
      if (pueblosResult.success) setPueblos(pueblosResult.data);
      if (npcsResult.success) setNpcs(npcsResult.data);
      if (placeTypesResult.success) setPlaceTypes(placeTypesResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEdificio(null);
    setFormData({
      worldId: '',
      puebloId: '',
      name: '',
      lore: '',
      eventos_recientes: '',
      area: {
        start: { x: '0', y: '64', z: '0' },
        end: { x: '10', y: '70', z: '10' }
      }
    });
    setDialogOpen(true);
  };

  const handleEdit = (edificio: Edificio) => {
    setEditingEdificio(edificio);
    setFormData({
      worldId: edificio.worldId,
      puebloId: edificio.puebloId,
      name: edificio.name,
      lore: edificio.lore,
      eventos_recientes: edificio.eventos_recientes.join('\n'),
      area: {
        start: {
          x: String(edificio.area.start.x),
          y: String(edificio.area.start.y),
          z: String(edificio.area.start.z)
        },
        end: {
          x: String(edificio.area.end.x),
          y: String(edificio.area.end.y),
          z: String(edificio.area.end.z)
        }
      }
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este edificio?')) return;

    try {
      const response = await fetch(`/api/edificios/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Edificio eliminado correctamente'
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting edificio:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el edificio',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        worldId: formData.worldId,
        puebloId: formData.puebloId,
        name: formData.name,
        lore: formData.lore,
        eventos_recientes: formData.eventos_recientes.split('\n').filter(e => e.trim()),
        area: {
          start: {
            x: parseCoordinateValue(formData.area.start.x),
            y: parseCoordinateValue(formData.area.start.y),
            z: parseCoordinateValue(formData.area.start.z)
          },
          end: {
            x: parseCoordinateValue(formData.area.end.x),
            y: parseCoordinateValue(formData.area.end.y),
            z: parseCoordinateValue(formData.area.end.z)
          }
        }
      };

      const url = editingEdificio ? `/api/edificios/${editingEdificio.id}` : '/api/edificios';
      const method = editingEdificio ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: editingEdificio ? 'Edificio actualizado' : 'Edificio creado'
        });
        setDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving edificio:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el edificio',
        variant: 'destructive'
      });
    }
  };

  // POI Functions
  const handleCreatePoi = (edificioId: string) => {
    setEditingPoi(null);
    setPoiFormData({
      name: '',
      tipo: '',
      coordenadas: { x: '0', y: '64', z: '0' },
      descripcion: '',
      tags: ''
    });
    setImageFile(null);
    setCoordinateWarnings([]);
    setPoiDialogOpen(true);
  };

  const handleEditPoi = (edificio: Edificio, poi: PointOfInterest) => {
    setEditingPoi(poi);
    setPoiFormData({
      name: poi.name,
      tipo: poi.tipo,
      coordenadas: {
        x: String(poi.coordenadas.x),
        y: String(poi.coordenadas.y),
        z: String(poi.coordenadas.z)
      },
      descripcion: poi.descripcion,
      tags: (poi.tags || []).join(', ')
    });
    setImageFile(null);
    setCoordinateWarnings([]);
    setPoiDialogOpen(true);
  };

  const handleDeletePoi = async (edificioId: string, poiId: string, poiName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el punto de interés "${poiName}"?`)) return;

    try {
      const response = await fetch(`/api/edificios/${edificioId}/points-of-interest/${poiId}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Punto de interés eliminado'
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting POI:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el punto de interés',
        variant: 'destructive'
      });
    }
  };

  const handleSubmitPoi = async () => {
    if (!editingEdificio) return;

    try {
      const coords = {
        x: parseCoordinateValue(poiFormData.coordenadas.x),
        y: parseCoordinateValue(poiFormData.coordenadas.y),
        z: parseCoordinateValue(poiFormData.coordenadas.z)
      };

      // Validar coordenadas
      const warnings = validateCoordinatesInArea(coords, {
        start: {
          x: parseCoordinateValue(formData.area.start.x),
          y: parseCoordinateValue(formData.area.start.y),
          z: parseCoordinateValue(formData.area.start.z)
        },
        end: {
          x: parseCoordinateValue(formData.area.end.x),
          y: parseCoordinateValue(formData.area.end.y),
          z: parseCoordinateValue(formData.area.end.z)
        }
      });

      if (warnings.length > 0) {
        setCoordinateWarnings(warnings);
        if (!confirm(`Las coordenadas están fuera del área del edificio:\n${warnings.join('\n')}\n\n¿Deseas continuar de todos modos?`)) {
          return;
        }
      }

      const payload: any = {
        name: poiFormData.name,
        tipo: poiFormData.tipo,
        coordenadas: coords,
        descripcion: poiFormData.descripcion,
        tags: poiFormData.tags ? poiFormData.tags.split(',').map(t => t.trim()).filter(t => t) : undefined
      };

      // Si hay imagen, primero subirla
      if (imageFile) {
        setUploading(true);
        const imageFormData = new FormData();
        imageFormData.append('image', imageFile);

        const imageResponse = await fetch(`/api/edificios/${editingEdificio.id}/points-of-interest/${editingPoi?.id || 'new'}/image`, {
          method: 'POST',
          body: imageFormData
        });

        const imageResult = await imageResponse.json();
        setUploading(false);

        if (imageResult.success) {
          payload.imagen = imageResult.data.imagePath;
        }
      }

      const url = editingPoi
        ? `/api/edificios/${editingEdificio.id}/points-of-interest/${editingPoi.id}`
        : `/api/edificios/${editingEdificio.id}/points-of-interest`;
      const method = editingPoi ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: editingPoi ? 'POI actualizado' : 'POI creado'
        });
        setPoiDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving POI:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el punto de interés',
        variant: 'destructive'
      });
    }
  };

  const handleDuplicatePoi = (poi: PointOfInterest) => {
    setEditingPoi(null);
    setPoiFormData({
      name: `${poi.name} (copia)`,
      tipo: poi.tipo,
      coordenadas: {
        x: String(poi.coordenadas.x + 1),
        y: String(poi.coordenadas.y),
        z: String(poi.coordenadas.z + 1)
      },
      descripcion: poi.descripcion,
      tags: (poi.tags || []).join(', ')
    });
    setImageFile(null);
    setCoordinateWarnings([]);
    setPoiDialogOpen(true);
  };

  const filteredPueblos = pueblos.filter(p => p.worldId === formData.worldId);

  const toggleCompactView = (edificioId: string) => {
    setCompactView(prev => ({
      ...prev,
      [edificioId]: !prev[edificioId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando edificios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Edificios</h3>
          <p className="text-sm text-muted-foreground">Gestiona los edificios, estructuras y puntos de interés</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Edificio
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {edificios.map((edificio) => {
          const world = worlds.find(w => w.id === edificio.worldId);
          const pueblo = pueblos.find(p => p.id === edificio.puebloId);
          const isCompact = compactView[edificio.id];
          const npcsInEdificio = npcs.filter(npc =>
            npc.location.scope === 'edificio' &&
            npc.location.edificioId === edificio.id
          );
          const pois = edificio.puntosDeInteres || [];

          return (
            <Card key={edificio.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {edificio.name}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(edificio)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(edificio.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {pueblo?.name || 'Pueblo desconocido'} • {world?.name || 'Mundo desconocido'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Descripción:</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {edificio.lore || 'Sin descripción'}
                    </p>
                  </div>

                  {edificio.eventos_recientes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Eventos recientes:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {edificio.eventos_recientes.slice(0, 2).map((evento, i) => (
                          <li key={i}>{evento}</li>
                        ))}
                        {edificio.eventos_recientes.length > 2 && (
                          <li className="text-xs">...y {edificio.eventos_recientes.length - 2} más</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium">Coordenadas del Área:</p>
                    <p>Inicio: X:{edificio.area.start.x}, Y:{edificio.area.start.y}, Z:{edificio.area.start.z}</p>
                    <p>Fin: X:{edificio.area.end.x}, Y:{edificio.area.end.y}, Z:{edificio.area.end.z}</p>
                  </div>

                  {npcsInEdificio.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Personajes en el edificio:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {npcsInEdificio.map(npc => (
                          <Badge
                            key={npc.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            {npc.card.data?.name || npc.card.name || 'Sin nombre'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Puntos de Interés */}
                  {pois.length > 0 && (
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Puntos de interés ({pois.length})
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleCompactView(edificio.id)}
                        >
                          {isCompact ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronUp className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      <div className={isCompact ? 'space-y-1' : 'space-y-2'}>
                        {pois.map((poi) => {
                          const placeType = placeTypes.find(pt => pt.id === poi.tipo);
                          return (
                            <div
                              key={poi.id}
                              className={isCompact ? 'flex items-center gap-2 text-xs' : 'text-sm p-2 border rounded-lg bg-muted/30'}
                            >
                              <div
                                className="p-1.5 rounded-md"
                                style={{
                                  backgroundColor: placeType?.color ? `${placeType.color}20` : 'hsl(var(--muted))'
                                }}
                              >
                                <IconComponent
                                  name={placeType?.icon || 'MapPin'}
                                  size={isCompact ? 12 : 16}
                                  style={placeType?.color ? { color: placeType.color } : undefined}
                                />
                              </div>

                              {isCompact ? (
                                <>
                                  <span className="font-medium">{poi.name}</span>
                                  <span className="text-muted-foreground">
                                    X:{poi.coordenadas.x} Y:{poi.coordenadas.y} Z:{poi.coordenadas.z}
                                  </span>
                                </>
                              ) : (
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <p className="font-medium">{poi.name}</p>
                                      <p className="text-xs text-muted-foreground mb-2">{poi.descripcion}</p>
                                      <div className="flex items-center gap-2 text-xs">
                                        <Badge variant="outline" className="text-xs">
                                          {placeType?.name || 'Sin tipo'}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                          X:{poi.coordenadas.x} Y:{poi.coordenadas.y} Z:{poi.coordenadas.z}
                                        </span>
                                      </div>
                                      {poi.tags && poi.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {poi.tags.map((tag, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {poi.imagen && (
                                    <img
                                      src={poi.imagen}
                                      alt={poi.name}
                                      className="w-16 h-16 object-cover rounded border"
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog para crear/editar Edificio */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEdificio ? 'Editar Edificio' : 'Crear Nuevo Edificio'}
            </DialogTitle>
            <DialogDescription>
              {editingEdificio ? 'Actualiza la información del edificio' : 'Completa la información del nuevo edificio'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="worldId">Mundo</Label>
              <Select
                value={formData.worldId}
                onValueChange={(value) => setFormData({ ...formData, worldId: value, puebloId: '' })}
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
            <div>
              <Label htmlFor="puebloId">Pueblo</Label>
              <Select
                value={formData.puebloId}
                onValueChange={(value) => setFormData({ ...formData, puebloId: value })}
                disabled={!formData.worldId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un pueblo" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPueblos.map((pueblo) => (
                    <SelectItem key={pueblo.id} value={pueblo.id}>
                      {pueblo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Taberna de Alvar"
              />
            </div>
            <div>
              <Label htmlFor="lore">Descripción</Label>
              <Textarea
                id="lore"
                value={formData.lore}
                onChange={(e) => setFormData({ ...formData, lore: e.target.value })}
                placeholder="Describe el edificio"
              />
            </div>
            <div>
              <Label htmlFor="eventos">Eventos recientes (uno por línea)</Label>
              <Textarea
                id="eventos"
                value={formData.eventos_recientes}
                onChange={(e) => setFormData({ ...formData, eventos_recientes: e.target.value })}
                placeholder="Cada evento en una línea nueva"
              />
            </div>

            {/* Coordenadas de Área */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Coordenadas del Área</span>
              </div>

              {/* Coordenadas Inicio */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Coordenadas Inicio</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="startX" className="text-xs">X</Label>
                    <Input
                      id="startX"
                      type="number"
                      value={formData.area.start.x}
                      onChange={(e) => setFormData({
                        ...formData,
                        area: {
                          ...formData.area,
                          start: { ...formData.area.start, x: e.target.value }
                        }
                      })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="startY" className="text-xs">Y</Label>
                    <Input
                      id="startY"
                      type="number"
                      value={formData.area.start.y}
                      onChange={(e) => setFormData({
                        ...formData,
                        area: {
                          ...formData.area,
                          start: { ...formData.area.start, y: e.target.value }
                        }
                      })}
                      placeholder="64"
                    />
                  </div>
                  <div>
                    <Label htmlFor="startZ" className="text-xs">Z</Label>
                    <Input
                      id="startZ"
                      type="number"
                      value={formData.area.start.z}
                      onChange={(e) => setFormData({
                        ...formData,
                        area: {
                          ...formData.area,
                          start: { ...formData.area.start, z: e.target.value }
                        }
                      })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Coordenadas Fin */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Coordenadas Fin</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="endX" className="text-xs">X</Label>
                    <Input
                      id="endX"
                      type="number"
                      value={formData.area.end.x}
                      onChange={(e) => setFormData({
                        ...formData,
                        area: {
                          ...formData.area,
                          end: { ...formData.area.end, x: e.target.value }
                        }
                      })}
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endY" className="text-xs">Y</Label>
                    <Input
                      id="endY"
                      type="number"
                      value={formData.area.end.y}
                      onChange={(e) => setFormData({
                        ...formData,
                        area: {
                          ...formData.area,
                          end: { ...formData.area.end, y: e.target.value }
                        }
                      })}
                      placeholder="70"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endZ" className="text-xs">Z</Label>
                    <Input
                      id="endZ"
                      type="number"
                      value={formData.area.end.z}
                      onChange={(e) => setFormData({
                        ...formData,
                        area: {
                          ...formData.area,
                          end: { ...formData.area.end, z: e.target.value }
                        }
                      })}
                      placeholder="10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Puntos de Interés existentes (solo al editar) */}
            {editingEdificio && editingEdificio.puntosDeInteres && editingEdificio.puntosDeInteres.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Puntos de Interés</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreatePoi(editingEdificio.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar POI
                  </Button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {editingEdificio.puntosDeInteres.map((poi) => {
                    const placeType = placeTypes.find(pt => pt.id === poi.tipo);
                    return (
                      <div key={poi.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                        {poi.imagen && (
                          <img
                            src={poi.imagen}
                            alt={poi.name}
                            className="w-12 h-12 object-cover rounded border"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="p-1 rounded-md"
                              style={{
                                backgroundColor: placeType?.color ? `${placeType.color}20` : 'hsl(var(--muted))'
                              }}
                            >
                              <IconComponent
                                name={placeType?.icon || 'MapPin'}
                                size={14}
                                style={placeType?.color ? { color: placeType.color } : undefined}
                              />
                            </div>
                            <span className="font-medium">{poi.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {placeType?.name || 'Sin tipo'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{poi.descripcion}</p>
                          <p className="text-xs text-muted-foreground">
                            X:{poi.coordenadas.x} Y:{poi.coordenadas.y} Z:{poi.coordenadas.z}
                          </p>
                          {poi.tags && poi.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {poi.tags.map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicatePoi(poi)}
                            title="Duplicar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditPoi(editingEdificio, poi)}
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePoi(editingEdificio.id, poi.id, poi.name)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botón para agregar POI cuando no hay ninguno */}
            {editingEdificio && (!editingEdificio.puntosDeInteres || editingEdificio.puntosDeInteres.length === 0) && (
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleCreatePoi(editingEdificio.id)}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Agregar Punto de Interés
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingEdificio ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear/editar POI */}
      <Dialog open={poiDialogOpen} onOpenChange={setPoiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPoi ? 'Editar Punto de Interés' : 'Nuevo Punto de Interés'}
            </DialogTitle>
            <DialogDescription>
              Agrega un punto de interés específico dentro del edificio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {coordinateWarnings.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Advertencia de coordenadas</p>
                  <ul className="text-sm space-y-1">
                    {coordinateWarnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="poiName">Nombre *</Label>
              <Input
                id="poiName"
                value={poiFormData.name}
                onChange={(e) => setPoiFormData({ ...poiFormData, name: e.target.value })}
                placeholder="Ej: Mesa principal, Puerta de entrada"
              />
            </div>

            <div>
              <Label htmlFor="poiTipo">Tipo *</Label>
              <Select
                value={poiFormData.tipo}
                onValueChange={(value) => setPoiFormData({ ...poiFormData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {placeTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <IconComponent name={type.icon} size={16} />
                        <span>{type.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {placeTypes.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No hay tipos creados. Ve a la pestaña "Tipos de Lugares" para crearlos.
                </p>
              )}
            </div>

            <div>
              <Label>Coordenadas *</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="poiX" className="text-xs">X</Label>
                  <Input
                    id="poiX"
                    type="number"
                    value={poiFormData.coordenadas.x}
                    onChange={(e) => setPoiFormData({
                      ...poiFormData,
                      coordenadas: { ...poiFormData.coordenadas, x: e.target.value }
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="poiY" className="text-xs">Y</Label>
                  <Input
                    id="poiY"
                    type="number"
                    value={poiFormData.coordenadas.y}
                    onChange={(e) => setPoiFormData({
                      ...poiFormData,
                      coordenadas: { ...poiFormData.coordenadas, y: e.target.value }
                    })}
                    placeholder="64"
                  />
                </div>
                <div>
                  <Label htmlFor="poiZ" className="text-xs">Z</Label>
                  <Input
                    id="poiZ"
                    type="number"
                    value={poiFormData.coordenadas.z}
                    onChange={(e) => setPoiFormData({
                      ...poiFormData,
                      coordenadas: { ...poiFormData.coordenadas, z: e.target.value }
                    })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="poiDescripcion">Descripción *</Label>
              <Textarea
                id="poiDescripcion"
                value={poiFormData.descripcion}
                onChange={(e) => setPoiFormData({ ...poiFormData, descripcion: e.target.value })}
                placeholder="Describe qué se hace en este punto de interés"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="poiTags">Tags (separados por coma)</Label>
              <Input
                id="poiTags"
                value={poiFormData.tags}
                onChange={(e) => setPoiFormData({ ...poiFormData, tags: e.target.value })}
                placeholder="Ej: interactivo, requiere llave, peligroso"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tags adicionales para organizar y categorizar puntos de interés
              </p>
            </div>

            <div>
              <Label htmlFor="poiImage">Imagen (opcional)</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="poiImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {imageFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setImageFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {imageFile && (
                  <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{imageFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(imageFile.size / 1024).toFixed(2)} KB)
                    </span>
                  </div>
                )}
                {editingPoi?.imagen && !imageFile && (
                  <div className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30">
                    <img
                      src={editingPoi.imagen}
                      alt={editingPoi.name}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <div>
                      <p className="text-sm">Imagen actual cargada</p>
                      <p className="text-xs text-muted-foreground">
                        Sube una nueva imagen para reemplazarla
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPoiDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitPoi} disabled={uploading}>
              {uploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : editingPoi ? (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Actualizar
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
