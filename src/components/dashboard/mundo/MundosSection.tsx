'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Building2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { World, Pueblo } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function MundosSection() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [worldMemories, setWorldMemories] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [updatingAreas, setUpdatingAreas] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorld, setEditingWorld] = useState<World | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    estado_mundo: '',
    rumores: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [worldsRes, pueblosRes] = await Promise.all([
        fetch('/api/worlds'),
        fetch('/api/pueblos')
      ]);
      const worldsResult = await worldsRes.json();
      const pueblosResult = await pueblosRes.json();
      if (worldsResult.success) setWorlds(worldsResult.data);
      if (pueblosResult.success) setPueblos(pueblosResult.data);

      // Cargar memorias de mundos en paralelo
      const memoriaPromises = worldsResult.data.map(world =>
        fetch(`/api/worlds/${world.id}/memory`)
      );

      const memoriaResponses = await Promise.all(memoriaPromises);
      const memories: Record<string, any> = {};
      memoriaResponses.forEach((response, index) => {
        if (response.ok) {
          const result = response.json();
          if (result.success && result.data.memory) {
            memories[worldsResult.data[index].id] = result.data.memory;
          }
        }
      });

      setWorldMemories(memories);
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
    setEditingWorld(null);
    setFormData({ name: '', estado_mundo: '', rumores: '' });
    setDialogOpen(true);
  };

  const handleEdit = (world: World) => {
    setEditingWorld(world);
    setFormData({
      name: world.name,
      estado_mundo: world.lore.estado_mundo,
      rumores: world.lore.rumores.join('\n')
    });
    setDialogOpen(true);
  };

  const handleUpdateAreas = async () => {
    try {
      setUpdatingAreas(true);
      const response = await fetch('/api/boundingBox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' })
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message
        });
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'No se pudieron actualizar las áreas',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating areas:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar las áreas',
        variant: 'destructive'
      });
    } finally {
      setUpdatingAreas(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este mundo?')) return;

    try {
      const response = await fetch(`/api/worlds/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Mundo eliminado correctamente'
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting world:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el mundo',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: formData.name,
        lore: {
          estado_mundo: formData.estado_mundo,
          rumores: formData.rumores.split('\n').filter(r => r.trim())
        }
      };

      const url = editingWorld ? `/api/worlds/${editingWorld.id}` : '/api/worlds';
      const method = editingWorld ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: editingWorld ? 'Mundo actualizado' : 'Mundo creado'
        });
        setDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving world:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el mundo',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando mundos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Mundos</h3>
          <p className="text-sm text-muted-foreground">Gestiona los mundos narrativos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleUpdateAreas} variant="outline" disabled={updatingAreas}>
            <RefreshCw className={`h-4 w-4 mr-2 ${updatingAreas ? 'animate-spin' : ''}`} />
            {updatingAreas ? 'Actualizando...' : 'Actualizar Áreas'}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Mundo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {worlds.map((world) => (
          <Card key={world.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {world.name}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(world)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(world.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>ID: {world.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Estado del mundo:</p>
                  <p className="text-sm text-muted-foreground">{world.lore.estado_mundo}</p>
                </div>
                {world.lore.rumores.length > 0 && (
                  <div>
                    <p className="text-sm font-medium">Rumores:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {world.lore.rumores.slice(0, 3).map((rumor, i) => (
                        <li key={i}>{rumor}</li>
                      ))}
                      {world.lore.rumores.length > 3 && (
                        <li className="text-xs">...y {world.lore.rumores.length - 3} más</li>
                      )}
                    </ul>
                  </div>
                )}
                {(() => {
                  const regionesEnMundo = pueblos.filter(p => p.worldId === world.id);
                  if (regionesEnMundo.length > 0) {
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Regiones en este mundo:</p>
                          <span className="text-xs text-muted-foreground">{regionesEnMundo.length} regiones</span>
                        </div>
                        {(world as any).area ? (
                          <div className="text-xs bg-muted/50 p-2 rounded">
                            <p className="font-medium text-primary mb-1">Área calculada:</p>
                            <p>X: {(world as any).area.start.x} → {(world as any).area.end.x}</p>
                            <p>Z: {(world as any).area.start.z} → {(world as any).area.end.z}</p>
                            <p>Dimensiones: {Math.abs((world as any).area.end.x - (world as any).area.start.x)} × {Math.abs((world as any).area.end.z - (world as any).area.start.z)}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sin área calculada (sin regiones con edificaciones)</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {regionesEnMundo.map(pueblo => (
                            <span
                              key={pueblo.id}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${
                                pueblo.type === 'nacion'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                }`}
                              >
                                {pueblo.type === 'nacion' ? <Building2 className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                {pueblo.name}
                              </span>
                            ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {worldMemories[world.id]?.consolidatedSummary && (
                  <div className="mt-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                    <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                      Último Resumen General
                    </p>
                    <p className="text-sm text-indigo-800 dark:text-indigo-200 line-clamp-3">
                      {worldMemories[world.id].consolidatedSummary}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWorld ? 'Editar Mundo' : 'Crear Nuevo Mundo'}
            </DialogTitle>
            <DialogDescription>
              {editingWorld ? 'Actualiza la información del mundo' : 'Completa la información del nuevo mundo'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Esparcraft"
              />
            </div>
            <div>
              <Label htmlFor="estado">Estado del Mundo</Label>
              <Textarea
                id="estado"
                value={formData.estado_mundo}
                onChange={(e) => setFormData({ ...formData, estado_mundo: e.target.value })}
                placeholder="Describe el estado actual del mundo"
              />
            </div>
            <div>
              <Label htmlFor="rumores">Rumores (uno por línea)</Label>
              <Textarea
                id="rumores"
                value={formData.rumores}
                onChange={(e) => setFormData({ ...formData, rumores: e.target.value })}
                placeholder="Cada rumor en una línea nueva"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit}>
              {editingWorld ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
