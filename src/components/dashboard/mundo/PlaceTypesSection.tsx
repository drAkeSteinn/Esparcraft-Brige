'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlaceType } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import * as Icons from 'lucide-react';

// Lista de iconos de Lucide recomendados para tipos de lugares
const AVAILABLE_ICONS = [
  'Door', 'Table', 'Chair', 'Monitor', 'Keyboard', 'Coffee', 'Utensils',
  'Bed', 'Couch', 'Armchair', 'Book', 'Library', 'BookOpen', 'Archive',
  'Chest', 'Box', 'Package', 'Wrench', 'Hammer', 'Shield', 'Sword',
  'Sparkles', 'Flame', 'Droplet', 'Leaf', 'Flower', 'Tree', 'Sun', 'Moon',
  'Mountain', 'MapPin', 'Building', 'Home', 'Warehouse', 'Factory', 'Shop',
  'Music', 'Microphone', 'Camera', 'Film', 'Palette', 'Pen', 'Brush',
  'Crown', 'Star', 'Heart', 'Gem', 'Coins', 'Key', 'Lock', 'Unlock'
];

// Componente dinámico para renderizar iconos
function IconComponent({ name, size = 24, className = '' }: { name: string; size?: number; className?: string }) {
  const Icon = (Icons as any)[name] || Icons.MapPin;
  return <Icon size={size} className={className} />;
}

export default function PlaceTypesSection() {
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PlaceType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: 'MapPin',
    color: ''
  });
  const [iconSearch, setIconSearch] = useState('');

  useEffect(() => {
    fetchPlaceTypes();
  }, []);

  const fetchPlaceTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/place-types');
      const result = await response.json();

      if (result.success) {
        setPlaceTypes(result.data);
      }
    } catch (error) {
      console.error('Error fetching place types:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los tipos de lugares',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingType(null);
    setFormData({ name: '', icon: 'MapPin', color: '' });
    setIconSearch('');
    setDialogOpen(true);
  };

  const handleEdit = (type: PlaceType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      icon: type.icon,
      color: type.color || ''
    });
    setIconSearch('');
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el tipo de lugar "${name}"?`)) return;

    try {
      const response = await fetch(`/api/place-types/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Tipo de lugar eliminado correctamente'
        });
        fetchPlaceTypes();
      } else {
        throw new Error(result.error || 'No se pudo eliminar el tipo');
      }
    } catch (error: any) {
      console.error('Error deleting place type:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el tipo de lugar',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'El nombre del tipo es obligatorio',
        variant: 'destructive'
      });
      return;
    }

    try {
      const url = editingType ? `/api/place-types/${editingType.id}` : '/api/place-types';
      const method = editingType ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: editingType ? 'Tipo actualizado' : 'Tipo creado'
        });
        setDialogOpen(false);
        fetchPlaceTypes();
      } else {
        throw new Error(result.error || 'No se pudo guardar el tipo');
      }
    } catch (error: any) {
      console.error('Error saving place type:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el tipo de lugar',
        variant: 'destructive'
      });
    }
  };

  const filteredIcons = AVAILABLE_ICONS.filter(icon =>
    icon.toLowerCase().includes(iconSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando tipos de lugares...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Tipos de Lugares</h3>
          <p className="text-sm text-muted-foreground">
            Define categorías de lugares compartidas por todos los edificios
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Tipo
        </Button>
      </div>

      {placeTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-muted rounded-full">
                <Icons.MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No hay tipos de lugares creados</p>
                <p className="text-sm text-muted-foreground">
                  Crea tu primer tipo para comenzar a categorizar puntos de interés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {placeTypes.map((type) => (
            <Card key={type.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: type.color ? `${type.color}20` : 'hsl(var(--muted))' }}
                    >
                      <IconComponent
                        name={type.icon}
                        size={24}
                        className={type.color ? '' : 'text-muted-foreground'}
                        style={type.color ? { color: type.color } : undefined}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {type.icon}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(type)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(type.id, type.name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Editar Tipo de Lugar' : 'Crear Nuevo Tipo'}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? 'Actualiza la información del tipo de lugar'
                : 'Define un nuevo tipo de lugar para usar en puntos de interés'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Nombre del Tipo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Puerta, Mesa, Estación de trabajo"
              />
            </div>

            <div>
              <Label>Icono *</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                  <IconComponent name={formData.icon} size={32} />
                  <div className="flex-1">
                    <p className="font-medium">Icono seleccionado</p>
                    <p className="text-sm text-muted-foreground">{formData.icon}</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="iconSearch" className="text-sm">
                    Buscar icono ({filteredIcons.length} disponibles)
                  </Label>
                  <Input
                    id="iconSearch"
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    placeholder="Escribe para buscar..."
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 overflow-y-auto p-2 border rounded-lg">
                  {filteredIcons.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconName })}
                      className={`p-2 rounded-md flex items-center justify-center transition-all hover:bg-accent ${
                        formData.icon === iconName ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                      title={iconName}
                    >
                      <IconComponent name={iconName} size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="color">Color personalizado (opcional)</Label>
              <div className="flex gap-3 mt-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color || '#000000'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.color || ''}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#FF5733 o nombre de color"
                  className="flex-1"
                />
                {formData.color && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFormData({ ...formData, color: '' })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Usa código hexadecimal (#RRGGBB) o nombre de color. Deja vacío para usar el color por defecto.
              </p>
            </div>

            {/* Preview */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm font-medium mb-3">Vista previa</p>
              <div className="flex items-center gap-3">
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: formData.color ? `${formData.color}20` : 'hsl(var(--muted))' }}
                >
                  <IconComponent
                    name={formData.icon}
                    size={28}
                    style={formData.color ? { color: formData.color } : undefined}
                  />
                </div>
                <div>
                  <p className="font-medium text-lg">{formData.name || 'Nombre del Tipo'}</p>
                  <p className="text-sm text-muted-foreground">{formData.icon}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingType ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
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
