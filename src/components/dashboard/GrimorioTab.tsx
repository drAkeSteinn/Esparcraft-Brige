'use client';

import { useState, useEffect } from 'react';
import { FileText, User, Bot, MapPin, Globe, Plus, Edit2, Trash2, Copy, Eye, Search, X, Book, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { GrimorioCard } from '@/lib/types';
import VariablesReference from './VariablesReference';

// Categorías disponibles
const CATEGORIAS = [
  { value: 'general', label: 'General', icon: FileText, color: 'bg-slate-100 text-slate-700' },
  { value: 'jugador', label: 'Jugador', icon: User, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'npc', label: 'NPC', icon: Bot, color: 'bg-purple-100 text-purple-700' },
  { value: 'ubicacion', label: 'Ubicación', icon: MapPin, color: 'bg-orange-100 text-orange-700' },
  { value: 'mundo', label: 'Mundo', icon: Globe, color: 'bg-blue-100 text-blue-700' }
];

export default function GrimorioTab() {
  const [cards, setCards] = useState<GrimorioCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<GrimorioCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<GrimorioCard | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewCard, setPreviewCard] = useState<GrimorioCard | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [variablesRefOpen, setVariablesRefOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    key: '',
    nombre: '',
    plantilla: '',
    categoria: 'general',
    descripcion: ''
  });

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    filterCards();
  }, [searchQuery, activeTab, cards]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/grimorio');
      const result = await response.json();

      if (result.success) {
        setCards(result.data.cards);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las plantillas del grimorio',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las plantillas del grimorio',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCards = () => {
    let filtered = cards.filter(card => card.categoria === activeTab);

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(card =>
        card.nombre.toLowerCase().includes(searchLower) ||
        card.key.toLowerCase().includes(searchLower) ||
        card.plantilla.toLowerCase().includes(searchLower) ||
        (card.descripcion && card.descripcion.toLowerCase().includes(searchLower))
      );
    }

    setFilteredCards(filtered);
  };

  const handleCreate = () => {
    setEditingCard(null);
    setFormData({
      key: '',
      nombre: '',
      plantilla: '',
      categoria: activeTab,
      descripcion: ''
    });
    setDialogOpen(true);
  };

  const handleEdit = (card: GrimorioCard) => {
    setEditingCard(card);
    setFormData({
      key: card.key,
      nombre: card.nombre,
      plantilla: card.plantilla,
      categoria: card.categoria,
      descripcion: card.descripcion || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta plantilla del grimorio?')) return;

    try {
      const response = await fetch(`/api/grimorio/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Plantilla eliminada correctamente'
        });
        fetchCards();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'No se pudo eliminar la plantilla',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la plantilla',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.key.trim() || !formData.nombre.trim() || !formData.plantilla.trim() || !formData.categoria) {
        toast({
          title: 'Error',
          description: 'Faltan campos requeridos: key, nombre, plantilla, categoría',
          variant: 'destructive'
        });
        return;
      }

      const keyValid = /^[a-z0-9_-]+$/.test(formData.key.trim());

      if (!keyValid) {
        toast({
          title: 'Error',
          description: 'La key solo puede contener letras minúsculas, números y guiones bajos',
          variant: 'destructive'
        });
        return;
      }

      const url = editingCard ? `/api/grimorio/${editingCard.id}` : '/api/grimorio';
      const method = editingCard ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: editingCard ? 'Plantilla actualizada' : 'Plantilla creada'
        });
        setDialogOpen(false);
        fetchCards();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'No se pudo guardar la plantilla',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving card:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la plantilla',
        variant: 'destructive'
      });
    }
  };

  const handlePreview = async (card: GrimorioCard) => {
    try {
      const context = {
        jugador: {
          nombre: 'drAke',
          raza: 'Humano',
          nivel: '10',
          salud_actual: '100%',
          reputacion: '6',
          almakos: '1000',
          deuda: '100',
          piedras_del_alma: '5',
          hora: '10:30pm',
          clima: 'soleado'
        },
        mensaje: 'Hola'
      };

      const response = await fetch(`/api/grimorio/apply/${card.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context })
      });

      const result = await response.json();

      if (result.success) {
        setPreviewContent(result.data.template);
        setPreviewCard(card);
        setPreviewOpen(true);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo generar el preview',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el preview',
        variant: 'destructive'
      });
    }
  };

  const handleCopyTemplate = async (plantilla: string, nombre: string) => {
    try {
      await navigator.clipboard.writeText(plantilla);
      toast({
        title: 'Copiado',
        description: `Plantilla "${nombre}" copiada al portapapeles`
      });
    } catch (error) {
      console.error('Error copying template:', error);
    }
  };

  const getCategoriaInfo = (categoria: string) => {
    return CATEGORIAS.find(c => c.value === categoria) || CATEGORIAS[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando plantillas del grimorio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Grimorio</h2>
          <p className="text-sm text-muted-foreground">
            Plantillas reutilizables con variables
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setVariablesRefOpen(true)}>
            <Info className="h-4 w-4 mr-2" />
            Referencia de Variables
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre, key o texto de la plantilla..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 md:grid-cols-5 lg:w-auto lg:inline-grid">
          {CATEGORIAS.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="flex items-center gap-2">
              <cat.icon className={`h-4 w-4 ${cat.color.split(' ')[1]}`} />
              <span>{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIAS.map((cat) => (
          <TabsContent key={cat.value} value={cat.value} className="mt-6">
            {filteredCards.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No hay plantillas en esta categoría</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Clic en "Nueva Plantilla" para crear una en "{cat.label}"
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCards.map((card) => (
                  <Card key={card.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Badge variant="secondary" className="mb-2">
                            {card.key}
                          </Badge>
                          <CardTitle className="text-lg">{card.nombre}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(card)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(card)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(card.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      <div className="relative bg-muted/50 dark:bg-muted-900 rounded-lg p-4 overflow-hidden mb-3">
                        <pre className="text-xs whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                          {card.plantilla}
                        </pre>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white/95 dark:from-black/50 to-black/90 pointer-events-none" />
                      </div>

                      <div className="mt-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyTemplate(card.plantilla, card.nombre)}
                          className="w-full"
                        >
                          <Copy className="h-3 w-3 mr-2" />
                          Copiar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? 'Editar Plantilla' : 'Crear Nueva Plantilla'}
            </DialogTitle>
            <DialogDescription>
              {editingCard ? 'Actualiza la información de la plantilla' : 'Completa los campos para crear una nueva plantilla'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="key">Key (identificador único) *</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="ej: datos_jugador"
                disabled={!!editingCard}
                className={editingCard ? 'bg-muted' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Solo letras minúsculas, números y guiones bajos. Debe ser única.
              </p>
            </div>

            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="ej: Info del Jugador"
              />
            </div>

            <div>
              <Label htmlFor="categoria">Categoría *</Label>
              <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="plantilla">Plantilla *</Label>
              <Textarea
                id="plantilla"
                value={formData.plantilla}
                onChange={(e) => setFormData({ ...formData, plantilla: e.target.value })}
                placeholder="DATOS DEL AVENTURERO&#10;Nombre: {{jugador.nombre}}..."
                className="min-h-32 font-mono"
              />
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Describe para qué sirve esta plantilla..."
                rows={3}
              />
            </div>

            <div className="bg-muted/50 dark:bg-muted-900 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Book className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Variables Disponibles:</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <strong>Variables del Jugador:</strong>
                  <code className="ml-2">{'{{jugador.nombre}}, {{jugador.raza}}, {{jugador.nivel}}, {{jugador.salud_actual}}'}</code>
                </div>
                <div>
                  <strong>Variables del NPC:</strong>
                  <code className="ml-2">{'{{npc.name}}, {{npc.description}}, {{npc.personality}}'}</code>
                </div>
                <div>
                  <strong>Variables de Ubicación:</strong>
                  <code className="ml-2">{'{{mundo}}, {{pueblo}}, {{edificio}}'}</code>
                </div>
                <div>
                  <strong>Variables Abreviadas:</strong>
                  <code className="ml-2">{'{{nombre}}, {{raza}}, {{nivel}}, {{salud}}'}</code>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingCard ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Preview: {previewCard?.nombre}</DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setPreviewOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Plantilla Original:</h3>
              <div className="bg-muted/50 dark:bg-muted-900 rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                  {previewCard?.plantilla}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Resultado con Variables Reemplazadas:</h3>
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                  {previewContent}
                </pre>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => {
                setPreviewOpen(false);
                if (previewContent) {
                  navigator.clipboard.writeText(previewContent);
                  toast({
                    title: 'Copiado',
                    description: 'Resultado copiado al portapapeles'
                  });
                }
              }}>
                Copiar Resultado
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <VariablesReference open={variablesRefOpen} onClose={() => setVariablesRefOpen(false)} />
    </div>
  );
}
