'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, X, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edificio, PointOfInterest, PlaceType, NPC } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [poiDialogOpen, setPoiDialogOpen] = useState(false);
  const [editingEdificio, setEditingEdificio] = useState<Edificio | null>(null);
  const [editingPoi, setEditingPoi] = useState<PointOfInterest | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    lore: '',
    rumores: '',
    eventos_recientes: '',
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
      rumores: '',
      eventos_recientes: '',
      worldId: worlds[0]?.id || '',
      puebloId: '',
      startX: '0',
      startY: '0',
      startZ: '0',
      endX: '10',
      endY: '10',
      endZ: '10'
    });
    setDialogOpen(true);
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
      rumores: (edificio.rumores || []).join('\n'),
      eventos_recientes: edificio.eventos_recientes.join('\n'),
      worldId: edificio.worldId,
      puebloId: edificio.puebloId,
      startX: edificio.area.start.x.toString(),
      startY: edificio.area.start.y.toString(),
      startZ: edificio.area.start.z.toString(),
      endX: edificio.area.end.x.toString(),
      endY: edificio.area.end.y.toString(),
      endZ: edificio.area.end.z.toString()
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
      const payload: any = {
        name: formData.name,
        lore: formData.lore,
        rumores: formData.rumores.split('\n').filter(r => r.trim()),
        eventos_recientes: formData.eventos_recientes.split('\n').filter(e => e.trim()),
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
        setDialogOpen(false);
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {edificios.map((edificio) => {
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
              <CardDescription className="pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground leading-tight">{pueblo?.name || 'Pueblo desconocido'}</span>
                  <span className="text-muted-foreground/60 mt-0.5">•</span>
                  <span className="font-mono text-xs bg-muted/50 px-2 py-0.5 rounded border-2 border-[#2C2923] text-[#83673D] leading-tight">
                    {edificio.id}
                  </span>
                </div>
              </CardDescription>
              <CardContent className="overflow-hidden">
                <div className="max-h-96 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  <div>
                    <p className="text-sm font-medium">Descripción:</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {edificio.lore || 'Sin descripción'}
                    </p>
                  </div>

                  {edificio.rumores && edificio.rumores.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <ScrollText className="h-3.5 w-3.5 text-[#83673D]" />
                          Rumores:
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {edificio.rumores.length} {edificio.rumores.length === 1 ? 'rumor' : 'rumores'}
                        </span>
                      </div>
                      <div className="max-h-32 overflow-y-auto border-2 border-[#2C2923] bg-[#100F11] p-3 rounded">
                        <ul className="space-y-1.5">
                          {edificio.rumores.map((rumor, i) => (
                            <li key={i} className="text-sm text-[#B8B8B8] flex items-start gap-2">
                              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-[#2C2923] text-[#83673D] text-xs font-mono rounded">
                                {i + 1}
                              </span>
                              <span className="break-words">{rumor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {edificio.eventos_recientes.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <ScrollText className="h-3.5 w-3.5 text-[#83673D]" />
                          Eventos Recientes:
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {edificio.eventos_recientes.length} {edificio.eventos_recientes.length === 1 ? 'evento' : 'eventos'}
                        </span>
                      </div>
                      <div className="max-h-32 overflow-y-auto border-2 border-[#2C2923] bg-[#100F11] p-3 rounded">
                        <ul className="space-y-1.5">
                          {edificio.eventos_recientes.map((evento, i) => (
                            <li key={i} className="text-sm text-[#B8B8B8] flex items-start gap-2">
                              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-[#2C2923] text-[#83673D] text-xs font-mono rounded">
                                {i + 1}
                              </span>
                              <span className="break-words">{evento}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

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
                        {typeof edificioMemories[edificio.id].consolidatedSummary === 'string' 
                          ? edificioMemories[edificio.id].consolidatedSummary
                          : JSON.stringify(edificioMemories[edificio.id].consolidatedSummary, null, 2)
                        }
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
              <Label htmlFor="name">Nombre del Edificio</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Torre del Reloj"
              />
            </div>

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

            <div>
              <Label htmlFor="lore">Descripción/Lore</Label>
              <Textarea
                id="lore"
                value={formData.lore}
                onChange={(e) => setFormData({ ...formData, lore: e.target.value })}
                placeholder="Describe el edificio, su historia, características especiales..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="rumores">Rumores (uno por línea)</Label>
              <Textarea
                id="rumores"
                value={formData.rumores}
                onChange={(e) => setFormData({ ...formData, rumores: e.target.value })}
                placeholder="Cada rumor en una línea nueva"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="eventos_recientes">Eventos Recientes (uno por línea)</Label>
              <Textarea
                id="eventos_recientes"
                value={formData.eventos_recientes}
                onChange={(e) => setFormData({ ...formData, eventos_recientes: e.target.value })}
                placeholder="Cada evento en una línea nueva"
                rows={3}
              />
            </div>

            <div>
              <Label>Coordenadas del Área (Inicio)</Label>
              <div className="grid grid-cols-3 gap-2">
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
              <Label>Coordenadas del Área (Fin)</Label>
              <div className="grid grid-cols-3 gap-2">
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

            {/* Sección de Tipos de lugar (Puntos de interés) */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Tipos de lugar</h3>
                <Button size="sm" onClick={handleCreatePoi}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Tipo de lugar
                </Button>
              </div>

              {editingEdificio && editingEdificio.puntosDeInteres && editingEdificio.puntosDeInteres.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
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
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit}>
              {editingEdificio ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
