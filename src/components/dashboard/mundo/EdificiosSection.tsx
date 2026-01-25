'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edificio } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function EdificiosSection() {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [edificioMemories, setEdificioMemories] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEdificio, setEditingEdificio] = useState<Edificio | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    lore: '',
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [edificiosRes, worldsRes, pueblosRes] = await Promise.all([
        fetch('/api/edificios'),
        fetch('/api/worlds'),
        fetch('/api/pueblos')
      ]);

      const edificiosResult = await edificiosRes.json();
      const worldsResult = await worldsRes.json();
      const pueblosResult = await pueblosRes.json();

      if (edificiosResult.success) setEdificios(edificiosResult.data);
      if (worldsResult.success) setWorlds(worldsResult.data);
      if (pueblosResult.success) setPueblos(pueblosResult.data);

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

  const handleEdit = (edificio: Edificio) => {
    setEditingEdificio(edificio);
    setFormData({
      name: edificio.name,
      lore: edificio.lore,
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
      const payload = {
        name: formData.name,
        lore: formData.lore,
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
              <CardDescription>
                {pueblo?.name || 'Pueblo desconocido'} • {world?.name || 'Mundo desconocido'}
              </CardDescription>
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
                      <p className="text-sm font-medium">Eventos Recientes:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {edificio.eventos_recientes.slice(0, 2).map((evento, i) => (
                          <li key={i}>{evento}</li>
                        ))}
                        {edificio.eventos_recientes.length > 2 && (
                          <li className="text-xs text-muted-foreground">...y {edificio.eventos_recientes.length - 2} más</li>
                        )}
                      </ul>
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
                        {edificioMemories[edificio.id].consolidatedSummary}
                      </p>
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
