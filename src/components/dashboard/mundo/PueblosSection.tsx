'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pueblo, World, Edificio, PlaceType, PointOfInterest } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import * as Icons from 'lucide-react';

// Componente dinámico para renderizar iconos
function IconComponent({ name, size = 12, className = '' }: { name: string; size?: number; className?: string }) {
  const Icon = (Icons as any)[name] || Icons.MapPin;
  return <Icon size={size} className={className} />;
}

export default function PueblosSection() {
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPueblo, setEditingPueblo] = useState<Pueblo | null>(null);
  const [formData, setFormData] = useState({
    worldId: '',
    name: '',
    type: 'pueblo' as 'pueblo' | 'nacion',
    description: '',
    estado_pueblo: '',
    rumores: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pueblosRes, worldsRes, edificiosRes, placeTypesRes] = await Promise.all([
        fetch('/api/pueblos'),
        fetch('/api/worlds'),
        fetch('/api/edificios'),
        fetch('/api/place-types')
      ]);
      const pueblosResult = await pueblosRes.json();
      const worldsResult = await worldsRes.json();
      const edificiosResult = await edificiosRes.json();
      const placeTypesResult = await placeTypesRes.json();

      if (pueblosResult.success) setPueblos(pueblosResult.data);
      if (worldsResult.success) setWorlds(worldsResult.data);
      if (edificiosResult.success) setEdificios(edificiosResult.data);
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

  const handleCreatePueblo = () => {
    setEditingPueblo(null);
    setFormData({ worldId: '', name: '', type: 'pueblo', description: '', estado_pueblo: '', rumores: '' });
    setDialogOpen(true);
  };

  const handleCreateNacion = () => {
    setEditingPueblo(null);
    setFormData({ worldId: '', name: '', type: 'nacion', description: '', estado_pueblo: '', rumores: '' });
    setDialogOpen(true);
  };

  const handleEdit = (pueblo: Pueblo) => {
    setEditingPueblo(pueblo);
    setFormData({
      worldId: pueblo.worldId,
      name: pueblo.name,
      type: pueblo.type,
      description: pueblo.description,
      estado_pueblo: pueblo.lore.estado_pueblo,
      rumores: pueblo.lore.rumores.join('\n')
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const pueblo = pueblos.find(p => p.id === id);
    const tipo = pueblo?.type === 'nacion' ? 'nación' : 'pueblo';

    if (!confirm(`¿Estás seguro de que deseas eliminar este ${tipo}?`)) return;

    try {
      const response = await fetch(`/api/pueblos/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} eliminado correctamente`
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting pueblo:', error);
      toast({
        title: 'Error',
        description: `No se pudo eliminar el ${tipo}`,
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        worldId: formData.worldId,
        name: formData.name,
        type: formData.type,
        description: formData.description,
        lore: {
          estado_pueblo: formData.estado_pueblo,
          rumores: formData.rumores.split('\n').filter(r => r.trim())
        }
      };

      const url = editingPueblo ? `/api/pueblos/${editingPueblo.id}` : '/api/pueblos';
      const method = editingPueblo ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        const tipo = formData.type === 'nacion' ? 'Nación' : 'Pueblo';
        toast({
          title: 'Éxito',
          description: editingPueblo ? `${tipo} actualizada` : `${tipo} creada`
        });
        setDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving pueblo:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la región',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando pueblos y naciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Pueblos/Naciones</h3>
          <p className="text-sm text-muted-foreground">Gestiona las regiones del mundo</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreatePueblo}>
            <MapPin className="h-4 w-4 mr-2" />
            Crear Pueblo
          </Button>
          <Button onClick={handleCreateNacion} variant="secondary">
            <Building2 className="h-4 w-4 mr-2" />
            Crear Nación
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pueblos.map((pueblo) => {
          const world = worlds.find(w => w.id === pueblo.worldId);
          const isNacion = pueblo.type === 'nacion';
          const tipoLabel = isNacion ? 'Nación' : 'Pueblo';
          const tipoColor = isNacion ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';

          return (
            <Card key={pueblo.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isNacion ? <Building2 className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    {pueblo.name}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(pueblo)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pueblo.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  {world?.name || 'Mundo desconocido'} • ID: {pueblo.id}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoColor}`}>
                    {tipoLabel}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pueblo.description && (
                    <div>
                      <p className="text-sm font-medium">Descripción:</p>
                      <p className="text-sm text-muted-foreground">{pueblo.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      Estado {isNacion ? 'de la Nación' : 'del Pueblo'}:
                    </p>
                    <p className="text-sm text-muted-foreground">{pueblo.lore.estado_pueblo}</p>
                  </div>
                  {pueblo.lore.rumores.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Rumores:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {pueblo.lore.rumores.slice(0, 3).map((rumor, i) => (
                          <li key={i}>{rumor}</li>
                        ))}
                        {pueblo.lore.rumores.length > 3 && (
                          <li className="text-xs">...y {pueblo.lore.rumores.length - 3} más</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {(() => {
                    const edificiosEnPueblo = edificios.filter(e => e.puebloId === pueblo.id);
                    if (edificiosEnPueblo.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Edificaciones en esta región:</p>
                          <div className="space-y-3">
                            {edificiosEnPueblo.map(edif => {
                              const pois = edif.puntosDeInteres || [];
                              return (
                                <div key={edif.id} className="p-2 border rounded-lg bg-muted/30">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="h-3 w-3" />
                                    <span className="text-sm font-medium">{edif.name}</span>
                                  </div>
                                  {pois.length > 0 && (
                                    <div className="ml-5 space-y-1">
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        Puntos de interés ({pois.length}):
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {pois.map(poi => {
                                          const placeType = placeTypes.find(pt => pt.id === poi.tipo);
                                          return (
                                            <Badge
                                              key={poi.id}
                                              variant="outline"
                                              className="text-xs"
                                              title={poi.descripcion}
                                            >
                                              <div
                                                className="p-0.5 rounded-sm mr-1"
                                                style={{
                                                  backgroundColor: placeType?.color ? `${placeType.color}30` : 'hsl(var(--muted))'
                                                }}
                                              >
                                                <IconComponent
                                                  name={placeType?.icon || 'MapPin'}
                                                  size={10}
                                                  style={placeType?.color ? { color: placeType.color } : undefined}
                                                />
                                              </div>
                                              {poi.name}
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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
              {editingPueblo
                ? `Editar ${formData.type === 'nacion' ? 'Nación' : 'Pueblo'}`
                : `Crear Nuevo ${formData.type === 'nacion' ? 'Nación' : 'Pueblo'}`
              }
            </DialogTitle>
            <DialogDescription>
              {editingPueblo
                ? `Actualiza la información de la ${formData.type === 'nacion' ? 'nación' : 'región'}`
                : `Completa la información del nuevo ${formData.type === 'nacion' ? 'nación' : 'pueblo'}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Tipo de Región</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'pueblo' | 'nacion') => setFormData({ ...formData, type: value })}
                disabled={!!editingPueblo}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de región" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pueblo">Pueblo</SelectItem>
                  <SelectItem value="nacion">Nación</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={formData.type === 'nacion' ? "Ej: Imperio del Norte" : "Ej: Meslajho"}
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={
                  formData.type === 'nacion'
                    ? "Describe qué tipo de nación es (ej: una monarquía, una república, un imperio, etc.)"
                    : "Describe qué tipo de pueblo es (ej: un pueblo pesquero, una ciudad comercial, un asentamiento agrícola, etc.)"
                }
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="estado">
                Estado {formData.type === 'nacion' ? 'de la Nación' : 'del Pueblo'}
              </Label>
              <Textarea
                id="estado"
                value={formData.estado_pueblo}
                onChange={(e) => setFormData({ ...formData, estado_pueblo: e.target.value })}
                placeholder={
                  formData.type === 'nacion'
                    ? "Describe el estado actual de la nación"
                    : "Describe el estado actual del pueblo"
                }
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
              {editingPueblo ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
