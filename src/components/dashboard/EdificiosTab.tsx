'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edificio, World, Pueblo } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function EdificiosTab() {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEdificio, setEditingEdificio] = useState<Edificio | null>(null);
  const [formData, setFormData] = useState({
    worldId: '',
    puebloId: '',
    name: '',
    lore: '',
    eventos_recientes: ''
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
    setFormData({ worldId: '', puebloId: '', name: '', lore: '', eventos_recientes: '' });
    setDialogOpen(true);
  };

  const handleEdit = (edificio: Edificio) => {
    setEditingEdificio(edificio);
    setFormData({
      worldId: edificio.worldId,
      puebloId: edificio.puebloId,
      name: edificio.name,
      lore: edificio.lore,
      eventos_recientes: edificio.eventos_recientes.join('\n')
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
          start: { x: 0, y: 64, z: 0 },
          end: { x: 10, y: 70, z: 10 }
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
          <h2 className="text-2xl font-bold">Edificios</h2>
          <p className="text-muted-foreground">Gestiona los edificios y estructuras</p>
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
                  <div className="text-xs text-muted-foreground">
                    Área: {edificio.area.start.x}, {edificio.area.start.z} → {edificio.area.end.x}, {edificio.area.end.z}
                  </div>
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
