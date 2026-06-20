'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, X, ScrollText, Users, Building, Globe, Filter, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edificio, PointOfInterest, PlaceType, NPC, World, Pueblo } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import ContextoAdicionalPanel from '../ContextoAdicionalPanel';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import GenericBackupSection from '../GenericBackupSection';

export default function EdificiosSection() {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [edificioMemories, setEdificioMemories] = useState<Record<string, any>>({});
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingView, setEditingView] = useState(false);
  const [poiDialogOpen, setPoiDialogOpen] = useState(false);
  const [editingEdificio, setEditingEdificio] = useState<Edificio | null>(null);
  const [editingPoi, setEditingPoi] = useState<PointOfInterest | null>(null);
  const [filterWorldId, setFilterWorldId] = useState<string>('all');
  const [filterPuebloId, setFilterPuebloId] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    lore: '',
    worldId: '',
    puebloId: '',
    startX: '',
    startY: '',
    startZ: '',
    endX: '',
    endY: '',
    endZ: ''
  });
  const [poiFormData, setPoiFormData] = useState({
    name: '',
    coordenadas: { x: '', y: '', z: '' },
    descripcion: '',
    tipo: '',
    tags: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [edificiosRes, worldsRes, pueblosRes, placeTypesRes, npcsRes] = await Promise.all([
        fetch('/api/edificios'),
        fetch('/api/worlds'),
        fetch('/api/pueblos'),
        fetch('/api/place-types'),
        fetch('/api/npcs')
      ]);

      const edificiosResult = await edificiosRes.json();
      const worldsResult = await worldsRes.json();
      const pueblosResult = await pueblosRes.json();
      const placeTypesResult = await placeTypesRes.json();
      const npcsResult = await npcsRes.json();

      if (edificiosResult.success) setEdificios(edificiosResult.data);
      if (worldsResult.success) setWorlds(worldsResult.data);
      if (pueblosResult.success) setPueblos(pueblosResult.data);
      if (placeTypesResult.success) setPlaceTypes(placeTypesResult.data);
      if (npcsResult.success) setNpcs(npcsResult.data);

      // Cargar memorias de edificios en paralelo
      const memoriaPromises = edificiosResult.data.map(edificio =>
        fetch(`/api/edificios/${edificio.id}/memory`)
      );

      const memoriaResponses = await Promise.all(memoriaPromises);
      const memories: Record<string, any> = {};
      for (let i = 0; i < memoriaResponses.length; i++) {
        const response = memoriaResponses[i];
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.memory) {
            memories[edificiosResult.data[i].id] = result.data.memory;
          }
        }
      }

      setEdificioMemories(memories);

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
      name: '',
      lore: '',
      worldId: worlds[0]?.id || '',
      puebloId: '',
      startX: '0',
      startY: '0',
      startZ: '0',
      endX: '10',
      endY: '10',
      endZ: '10'
    });
    setEditingView(true);
  };

  const handleCreatePoi = () => {
    setEditingPoi(null);
    setPoiFormData({
      name: '',
      coordenadas: { x: '', y: '', z: '' },
      descripcion: '',
      tipo: placeTypes[0]?.id || '',
      tags: ''
    });
    setPoiDialogOpen(true);
  };

  const handleEditPoi = (poi: PointOfInterest) => {
    setEditingPoi(poi);
    setPoiFormData({
      name: poi.name,
      coordenadas: {
        x: poi.coordenadas.x.toString(),
        y: poi.coordenadas.y.toString(),
        z: poi.coordenadas.z.toString()
      },
      descripcion: poi.descripcion,
      tipo: poi.tipo,
      tags: poi.tags?.join(', ') || ''
    });
    setPoiDialogOpen(true);
  };

  const handleDeletePoi = (poiId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este punto de interés?')) return;

    if (editingEdificio) {
      const updatedEdificio = {
        ...editingEdificio,
        puntosDeInteres: (editingEdificio.puntosDeInteres || []).filter(poi => poi.id !== poiId)
      };
      setEditingEdificio(updatedEdificio);
    }
  };

  const handleSavePoi = () => {
    if (!editingEdificio) return;

    const newPoi: PointOfInterest = {
      id: editingPoi?.id || `POI_${Date.now()}`,
      name: poiFormData.name,
      coordenadas: {
        x: parseInt(poiFormData.coordenadas.x) || 0,
        y: parseInt(poiFormData.coordenadas.y) || 0,
        z: parseInt(poiFormData.coordenadas.z) || 0
      },
      descripcion: poiFormData.descripcion,
      tipo: poiFormData.tipo,
      tags: poiFormData.tags.split(',').map(t => t.trim()).filter(t => t)
    };

    let updatedPois;
    if (editingPoi) {
      // Editar POI existente
      updatedPois = (editingEdificio.puntosDeInteres || []).map(poi =>
        poi.id === editingPoi.id ? newPoi : poi
      );
    } else {
      // Agregar nuevo POI
      updatedPois = [...(editingEdificio.puntosDeInteres || []), newPoi];
    }

    setEditingEdificio({
      ...editingEdificio,
      puntosDeInteres: updatedPois
    });

    setPoiDialogOpen(false);
  };

  const handleEdit = (edificio: Edificio) => {
    setEditingEdificio(edificio);
    setFormData({
      name: edificio.name,
      lore: edificio.lore,
      worldId: edificio.worldId,
      puebloId: edificio.puebloId,
      startX: edificio.area.start.x.toString(),
      startY: edificio.area.start.y.toString(),
      startZ: edificio.area.start.z.toString(),
      endX: edificio.area.end.x.toString(),
      endY: edificio.area.end.y.toString(),
      endZ: edificio.area.end.z.toString()
    });
    setEditingView(true);
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
      const payload: any = {
        name: formData.name,
        lore: formData.lore,
        worldId: formData.worldId,
        puebloId: formData.puebloId,
        area: {
          start: {
            x: parseInt(formData.startX) || 0,
            y: parseInt(formData.startY) || 0,
            z: parseInt(formData.startZ) || 0
          },
          end: {
            x: parseInt(formData.endX) || 10,
            y: parseInt(formData.endY) || 10,
            z: parseInt(formData.endZ) || 10
          }
        }
      };

      // Incluir puntos de interés si existen
      if (editingEdificio && editingEdificio.puntosDeInteres) {
        payload.puntosDeInteres = editingEdificio.puntosDeInteres;
      }

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
        setEditingView(false);
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'No se pudo guardar el edificio',
          variant: 'destructive'
        });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando edificios...</p>
      </div>
    );
  }

  // ====== Vista de edición full-screen ======
  if (editingView) {
    return (
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setEditingView(false)}>
              ← Volver
            </Button>
            <div>
              <h2 className="text-xl font-bold">
                {editingEdificio ? 'Editar Edificio' : 'Crear Nuevo Edificio'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {editingEdificio ? 'Actualiza la información del edificio' : 'Completa la información del nuevo edificio'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingView(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editingEdificio ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </div>

        {/* Contenido del formulario con scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="space-y-6 max-w-4xl">
            {/* === Sección: Datos básicos === */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 border-b pb-2">Datos básicos</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Edificio</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Torre del Reloj"
                  />
                </div>
                <div>
                  <Label htmlFor="lore">Estado del Edificio</Label>
                  <Textarea
                    id="lore"
                    value={formData.lore}
                    onChange={(e) => setFormData({ ...formData, lore: e.target.value })}
                    placeholder="Describe el edificio, su historia, características especiales..."
                    rows={5}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* === Sección: Ubicación === */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 border-b pb-2">Ubicación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="worldId">Mundo</Label>
                  <Select
                    value={formData.worldId}
                    onValueChange={(value) => setFormData({ ...formData, worldId: value, puebloId: '' })}
                  >
                    <SelectTrigger id="worldId">
                      <SelectValue placeholder="Selecciona un mundo" />
                    </SelectTrigger>
                    <SelectContent>
                      {worlds.map(world => (
                        <SelectItem key={world.id} value={world.id}>
                          {world.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="puebloId">Región/Pueblo</Label>
                  <Select
                    value={formData.puebloId}
                    onValueChange={(value) => setFormData({ ...formData, puebloId: value })}
                  >
                    <SelectTrigger id="puebloId">
                      <SelectValue placeholder="Selecciona una región" />
                    </SelectTrigger>
                    <SelectContent>
                      {pueblos.filter(p => p.worldId === formData.worldId).map(pueblo => (
                        <SelectItem key={pueblo.id} value={pueblo.id}>
                          {pueblo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* === Sección: Área === */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 border-b pb-2">Coordenadas del Área</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Inicio (start)</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div>
                      <Label htmlFor="startX" className="text-xs">X</Label>
                      <Input
                        id="startX"
                        type="number"
                        value={formData.startX}
                        onChange={(e) => setFormData({ ...formData, startX: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="startY" className="text-xs">Y</Label>
                      <Input
                        id="startY"
                        type="number"
                        value={formData.startY}
                        onChange={(e) => setFormData({ ...formData, startY: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="startZ" className="text-xs">Z</Label>
                      <Input
                        id="startZ"
                        type="number"
                        value={formData.startZ}
                        onChange={(e) => setFormData({ ...formData, startZ: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Fin (end)</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div>
                      <Label htmlFor="endX" className="text-xs">X</Label>
                      <Input
                        id="endX"
                        type="number"
                        value={formData.endX}
                        onChange={(e) => setFormData({ ...formData, endX: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endY" className="text-xs">Y</Label>
                      <Input
                        id="endY"
                        type="number"
                        value={formData.endY}
                        onChange={(e) => setFormData({ ...formData, endY: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endZ" className="text-xs">Z</Label>
                      <Input
                        id="endZ"
                        type="number"
                        value={formData.endZ}
                        onChange={(e) => setFormData({ ...formData, endZ: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* === Sección: Tipos de lugar (POIs) === */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2 flex-1">Tipos de lugar ({editingEdificio?.puntosDeInteres?.length || 0})</h3>
                <Button size="sm" onClick={handleCreatePoi} className="ml-3">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Tipo de lugar
                </Button>
              </div>
              {editingEdificio && editingEdificio.puntosDeInteres && editingEdificio.puntosDeInteres.length > 0 ? (
                <div className="space-y-2">
                  {editingEdificio.puntosDeInteres.map((poi) => {
                    const placeType = placeTypes.find(pt => pt.id === poi.tipo);
                    return (
                      <div key={poi.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{placeType?.name || poi.tipo}</Badge>
                            <span className="font-medium">{poi.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{poi.descripcion}</p>
                          <p className="text-xs text-muted-foreground">
                            Coordenadas: X:{poi.coordenadas.x}, Y:{poi.coordenadas.y}, Z:{poi.coordenadas.z}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPoi(poi)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePoi(poi.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay tipos de lugar agregados. Haz clic en "Agregar Tipo de lugar" para comenzar.
                </p>
              )}
            </div>

            {/* === Sección: Contextos Adicionales === */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 border-b pb-2">Contextos Adicionales</h3>
              <ContextoAdicionalPanel
                entityType="edificio"
                entityId={editingEdificio?.id ?? null}
                disabled={!editingEdificio}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Edificios</h2>
          <p className="text-sm text-muted-foreground">Gestiona los edificios y sus resúmenes consolidados</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Edificio
        </Button>
      </div>

      {/* Filtros y Estadísticas */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/30 border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          {/* Filtro por Mundo */}
          <Select 
            value={filterWorldId} 
            onValueChange={(value) => {
              setFilterWorldId(value);
              setFilterPuebloId('all'); // Reset pueblo filter when world changes
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mundo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los mundos</SelectItem>
              {worlds.map((world) => (
                <SelectItem key={world.id} value={world.id}>
                  {world.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ChevronRight className="h-4 w-4 text-muted-foreground" />

          {/* Filtro por Región */}
          <Select value={filterPuebloId} onValueChange={setFilterPuebloId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Región" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las regiones</SelectItem>
              {pueblos
                .filter(p => filterWorldId === 'all' || p.worldId === filterWorldId)
                .map((pueblo) => (
                  <SelectItem key={pueblo.id} value={pueblo.id}>
                    {pueblo.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1" />
        
        {/* Estadísticas totales */}
        <div className="flex flex-wrap gap-2">
          {(() => {
            const filteredEdificios = edificios.filter(e => {
              if (filterPuebloId !== 'all') {
                return e.puebloId === filterPuebloId;
              }
              if (filterWorldId !== 'all') {
                const pueblo = pueblos.find(p => p.id === e.puebloId);
                return pueblo?.worldId === filterWorldId;
              }
              return true;
            });
            const filteredNpcs = npcs.filter(n => {
              if (filterPuebloId !== 'all') {
                return n.location.puebloId === filterPuebloId;
              }
              if (filterWorldId !== 'all') {
                return n.location.worldId === filterWorldId;
              }
              return true;
            });
            
            return (
              <>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {filteredEdificios.length} {filteredEdificios.length === 1 ? 'edificio' : 'edificios'}
                </Badge>
                <Badge variant="default" className="flex items-center gap-1 bg-primary/80">
                  <Users className="h-3 w-3" />
                  {filteredNpcs.length} {filteredNpcs.length === 1 ? 'NPC' : 'NPCs'}
                </Badge>
              </>
            );
          })()}
        </div>
      </div>

      {/* Breadcrumb */}
      {(filterWorldId !== 'all' || filterPuebloId !== 'all') && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>Mundos</span>
          {filterWorldId !== 'all' && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-foreground">
                {worlds.find(w => w.id === filterWorldId)?.name}
              </span>
            </>
          )}
          {filterPuebloId !== 'all' && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-foreground">
                {pueblos.find(p => p.id === filterPuebloId)?.name}
              </span>
            </>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-2"
            onClick={() => {
              setFilterWorldId('all');
              setFilterPuebloId('all');
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Limpiar filtro
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {edificios.filter(e => {
          if (filterPuebloId !== 'all') {
            return e.puebloId === filterPuebloId;
          }
          if (filterWorldId !== 'all') {
            const pueblo = pueblos.find(p => p.id === e.puebloId);
            return pueblo?.worldId === filterWorldId;
          }
          return true;
        }).map((edificio) => {
          const world = worlds.find(w => w.id === edificio.worldId);
          const pueblo = pueblos.find(p => p.id === edificio.puebloId);
          // Filtrar NPCs asignados a este edificio
          const edificioNpcs = npcs.filter(npc => 
            npc.location.scope === 'edificio' && npc.location.edificioId === edificio.id
          );

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
              </CardHeader>
              <CardContent className="overflow-hidden">
                <div className="max-h-96 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {/* Ubicación e ID */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground leading-tight">{pueblo?.name || 'Pueblo desconocido'}</span>
                    <span className="text-muted-foreground/60 mt-0.5">•</span>
                    <span className="font-mono text-xs bg-muted/50 px-2 py-0.5 rounded border-2 border-[#2C2923] text-[#83673D] leading-tight">
                      {edificio.id}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Descripción:</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {edificio.lore || 'Sin estado'}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground">Coordenadas del Área:</p>
                    <p>Inicio: X:{edificio.area.start.x}, Y:{edificio.area.start.y}, Z:{edificio.area.start.z}</p>
                    <p>Fin: X:{edificio.area.end.x}, Y:{edificio.area.end.y}, Z:{edificio.area.end.z}</p>
                  </div>

                  {edificioMemories[edificio.id]?.consolidatedSummary && (
                    <div className="mt-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                      <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                        Último Resumen General
                      </p>
                      <p className="text-sm text-indigo-800 dark:text-indigo-200 line-clamp-3">
                        {edificioMemories[edificio.id].consolidatedSummary}
                      </p>
                    </div>
                  )}

                  {edificio.puntosDeInteres && edificio.puntosDeInteres.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Tipos de lugar ({edificio.puntosDeInteres.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {edificio.puntosDeInteres.map((poi, i) => {
                          const placeType = placeTypes.find(pt => pt.id === poi.tipo);
                          return (
                            <Badge key={i} variant="secondary" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              {placeType?.name || poi.tipo}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {edificioNpcs.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">NPCs asignados ({edificioNpcs.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {edificioNpcs.map((npc) => {
                          const npcName = npc.card?.data?.name || npc.card?.name || 'NPC sin nombre';
                          const npcAvatar = npc.card?.data?.avatar || npc.card?.avatar;
                          const npcInitial = typeof npcName === 'string' && npcName.length > 0 
                            ? npcName.charAt(0).toUpperCase() 
                            : 'N';
                          return (
                            <div
                              key={npc.id}
                              className="flex items-center gap-2 bg-secondary/50 px-2 py-1 rounded-md"
                              title={npcName}
                            >
                              <Avatar className="h-5 w-5">
                                {npcAvatar ? (
                                  <AvatarImage src={npcAvatar} alt={npcName} />
                                ) : (
                                  <AvatarFallback className="text-[10px]">
                                    {npcInitial}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <span className="text-xs font-medium">
                                {npcName}
                              </span>
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

      {/* Dialog para agregar/editar Puntos de Interés */}
      <Dialog open={poiDialogOpen} onOpenChange={setPoiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPoi ? 'Editar Tipo de lugar' : 'Nuevo Tipo de lugar'}
            </DialogTitle>
            <DialogDescription>
              {editingPoi ? 'Actualiza la información del punto de interés' : 'Agrega un nuevo punto de interés al edificio'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="poiTipo">Tipo de lugar</Label>
              <Select
                value={poiFormData.tipo}
                onValueChange={(value) => setPoiFormData({ ...poiFormData, tipo: value })}
              >
                <SelectTrigger id="poiTipo">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {placeTypes.map(pt => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="poiName">Nombre</Label>
              <Input
                id="poiName"
                value={poiFormData.name}
                onChange={(e) => setPoiFormData({ ...poiFormData, name: e.target.value })}
                placeholder="Ej: Mesa 1, Silla de la barra..."
              />
            </div>

            <div>
              <Label htmlFor="poiDescripcion">Descripción</Label>
              <Textarea
                id="poiDescripcion"
                value={poiFormData.descripcion}
                onChange={(e) => setPoiFormData({ ...poiFormData, descripcion: e.target.value })}
                placeholder="Describe qué se hace en este punto..."
                rows={3}
              />
            </div>

            <div>
              <Label>Coordenadas</Label>
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
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="poiTags">Tags (separados por coma)</Label>
              <Input
                id="poiTags"
                value={poiFormData.tags}
                onChange={(e) => setPoiFormData({ ...poiFormData, tags: e.target.value })}
                placeholder="Ej: comercio, descanso, social"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSavePoi}>
              {editingPoi ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>

      <GenericBackupSection
        entityType="edificios"
        entityName="Edificio"
        entityNamePlural="Edificios"
        apiPath="edificios"
      />
      </Dialog>
    </div>
  );
}
