'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { World } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function WorldsTab() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorld, setEditingWorld] = useState<World | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    estado_mundo: '',
    rumores: ''
  });

  useEffect(() => {
    fetchWorlds();
  }, []);

  const fetchWorlds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/worlds');
      const result = await response.json();
      if (result.success) {
        setWorlds(result.data);
      }
    } catch (error) {
      console.error('Error fetching worlds:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los mundos',
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
        fetchWorlds();
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
        fetchWorlds();
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
          <h2 className="text-2xl font-bold">Mundos</h2>
          <p className="text-muted-foreground">Gestiona los mundos narrativos</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Mundo
        </Button>
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
