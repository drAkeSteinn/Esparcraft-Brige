'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edificio, World, Pueblo, NPC } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function EdificiosSection() {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEdificio, setEditingEdificio] = useState<Edificio | null>(null);
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

  // Función auxiliar para parsear coordenadas permitiendo valores negativos
  const parseCoordinateValue = (value: string): number => {
    if (value === '' || value === '-') return 0;
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [edificiosRes, worldsRes, pueblosRes, npcsRes] = await Promise.all([
        fetch('/api/edificios'),
        fetch('/api/worlds'),
        fetch('/api/pueblos'),
        fetch('/api/npcs')
      ]);
      const edificiosResult = await edificiosRes.json();
      const worldsResult = await worldsRes.json();
      const pueblosResult = await pueblosRes.json();
      const npcsResult = await npcsRes.json();

      if (edificiosResult.success) setEdificios(edificiosResult.data);
      if (worldsResult.success) setWorlds(worldsResult.data);
      if (pueblosResult.success) setPueblos(pueblosResult.data);
      if (npcsResult.success) setNpcs(npcsResult.data);
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

  const filteredPueblos = pueblos.filter(p => p.worldId === formData.worldId);

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
          <p className="text-sm text-muted-foreground">Gestiona los edificios y estructuras</p>
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
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Descripción:</p>
                    <p className="text-sm text-muted-foreground">{edificio.lore || 'Sin descripción'}</p>
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
                  {(() => {
                    const npcsInEdificio = npcs.filter(npc =>
                      npc.location.scope === 'edificio' &&
                      npc.location.edificioId === edificio.id
                    );
                    if (npcsInEdificio.length > 0) {
                      return (
                        <div>
                          <p className="text-sm font-medium">Personajes en el edificio:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {npcsInEdificio.map(npc => (
                              <span
                                key={npc.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20"
                              >
                                <Users className="h-3 w-3" />
                                {npc.card.data?.name || npc.card.name || 'Sin nombre'}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
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
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit}>
              {editingEdificio ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
