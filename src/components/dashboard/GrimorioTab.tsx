'use client';

import { useState, useEffect } from 'react';
import { FileText, User, Bot, MapPin, Globe, Plus, Edit2, Trash2, Copy, Eye, Search, X, Book, Info, Database } from 'lucide-react';
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
import { GrimorioCard, GrimorioCardType, GrimorioCardCategory } from '@/lib/types';
import { isValidPrimaryVariableKey, isValidTemplateKey, extractTemplateVariables } from '@/lib/grimorioUtils';
import VariablesReference from './VariablesReference';
import VariableTag from './VariableTag';

// Tipos de cards
const TIPOS_CARD = [
  { value: 'variable', label: 'Variable Primaria', icon: Database, color: 'bg-rose-100 text-rose-700', description: 'Solo informativa - documentación de variables del sistema' },
  { value: 'plantilla', label: 'Plantilla', icon: FileText, color: 'bg-fantasy-aged-gold text-fantasy-deep-black', description: 'Reutilizable - puede contener variables anidadas' }
];

// Categorías disponibles (todas en la misma fila con estilo consistente)
const CATEGORIAS = [
  { value: 'general', label: 'General', icon: FileText, color: 'bg-fantasy-aged-gold text-fantasy-deep-black' },
  { value: 'jugador', label: 'Jugador', icon: User, color: 'bg-fantasy-aged-gold text-fantasy-deep-black' },
  { value: 'npc', label: 'NPC', icon: Bot, color: 'bg-fantasy-aged-gold text-fantasy-deep-black' },
  { value: 'ubicacion', label: 'Ubicación', icon: MapPin, color: 'bg-fantasy-aged-gold text-fantasy-deep-black' },
  { value: 'mundo', label: 'Mundo', icon: Globe, color: 'bg-fantasy-aged-gold text-fantasy-deep-black' },
  { value: 'variables', label: 'Variables', icon: Database, color: 'bg-rose-100 text-rose-700', description: 'Variables primarias del sistema' }
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
  const [tipoFilter, setTipoFilter] = useState<GrimorioCardType | 'todos'>('todos');

  // Form state
  const [formData, setFormData] = useState({
    key: '',
    nombre: '',
    plantilla: '',
    categoria: 'general' as GrimorioCardCategory,
    tipo: 'plantilla' as GrimorioCardType,
    descripcion: ''
  });

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    filterCards();
  }, [searchQuery, activeTab, cards, tipoFilter]);

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

    // Filtro por tipo
    if (tipoFilter !== 'todos') {
      filtered = filtered.filter(card => card.tipo === tipoFilter);
    }

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
      categoria: activeTab as GrimorioCardCategory,
      tipo: 'plantilla' as GrimorioCardType,
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
      tipo: card.tipo,
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

  // Helpers para validación
  const getRequiredFields = () => {
    if (formData.tipo === 'variable' && editingCard) {
      // Variables primarias en modo edición: solo nombre es obligatorio
      return ['nombre'];
    } else if (formData.tipo === 'variable' && !editingCard) {
      // Variables primarias en modo creación: bloqueado
      return [];
    } else if (formData.tipo === 'plantilla') {
      // Plantillas: key, nombre, plantilla y categoria son obligatorios
      return ['key', 'nombre', 'plantilla', 'categoria', 'tipo'];
    } else {
      // Otros casos: validación estándar
      return ['key', 'nombre', 'plantilla', 'categoria', 'tipo'];
    }
  };

  const getMissingFields = () => {
    const requiredFields = getRequiredFields();
    return requiredFields.filter(field => !formData[field as keyof typeof formData]?.toString().trim());
  };

  const handleSubmit = async () => {
    try {
      // Validaciones
      const missingFields = getMissingFields();
      if (missingFields.length > 0) {
        toast({
          title: 'Error',
          description: `Faltan campos requeridos: ${missingFields.join(', ')}`,
          variant: 'destructive'
        });
        return;
      }

      // Validación de formato de key según tipo
      if (formData.tipo === 'variable') {
        if (!isValidPrimaryVariableKey(formData.key)) {
          toast({
            title: 'Formato de key inválido',
            description: 'Las variables primarias deben seguir el formato: jugador.*, npc.*, mundo.*, pueblo.*, edificio.*, o ser una variable simple (nombre, raza, nivel, etc.)',
            variant: 'destructive'
          });
          return;
        }
      } else if (formData.tipo === 'plantilla') {
        if (!isValidTemplateKey(formData.key)) {
          toast({
            title: 'Formato de key inválido',
            description: 'Las plantillas deben tener un nombre simple sin puntos (ej: user_data, quest_info, greeting_message)',
            variant: 'destructive'
          });
          return;
        }
      }

      // Validación de plantillas anidadas
      const nestedTemplates = extractTemplateVariables(formData.plantilla);
      if (nestedTemplates.length > 0) {
        toast({
          title: 'Plantillas anidadas no permitidas',
          description: `Las plantillas no pueden contener otras plantillas anidadas. Se encontraron: ${nestedTemplates.map(t => `"${t}"`).join(', ')}`,
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

        // Mostrar advertencias si las hay
        if (result.validations?.warnings && result.validations.warnings.length > 0) {
          result.validations.warnings.forEach(warning => {
            toast({
              title: 'Advertencia',
              description: warning,
              variant: 'default'
            });
          });
        }

        setDialogOpen(false);
        fetchCards();
      } else {
        toast({
          title: 'Error',
          description: result.error || result.message || 'No se pudo guardar la plantilla',
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

  const getCategoriaInfo = (categoria: GrimorioCardCategory) => {
    return CATEGORIAS.find(c => c.value === categoria) || CATEGORIAS[0];
  };

  const getTipoInfo = (tipo: GrimorioCardType) => {
    return TIPOS_CARD.find(t => t.value === tipo) || TIPOS_CARD[0];
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
          {activeTab !== 'variables' && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Plantilla
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-col sm:flex-row">
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
        <Select value={tipoFilter} onValueChange={(value: GrimorioCardType | 'todos') => setTipoFilter(value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span>Todos los tipos</span>
              </div>
            </SelectItem>
            {TIPOS_CARD.map((tipo) => (
              <SelectItem key={tipo.value} value={tipo.value}>
                <div className="flex items-center gap-2">
                  <tipo.icon className={`h-4 w-4 ${tipo.color.split(' ')[1]}`} />
                  <span>{tipo.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
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
                {filteredCards.map((card) => {
                  const tipoInfo = getTipoInfo(card.tipo);
                  return (
                    <Card key={card.id} className={`flex flex-col border-2 ${tipoInfo.value === 'variable' ? 'border-fantasy-textured bg-fantasy-deep-black' : 'border-fantasy-aged-gold bg-fantasy-deep-black'}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <VariableTag variableKey={card.key} className="mb-2" />
                            <CardTitle className="text-lg">{card.nombre}</CardTitle>
                          </div>
                          <div className="flex gap-1 items-center">
                            {tipoInfo.value === 'variable' ? (
                              <tipoInfo.icon className="h-5 w-5 text-slate-500" />
                            ) : (
                              <FileText className="h-5 w-5 text-fantasy-aged-gold" />
                            )}
                            {tipoInfo.value === 'variable' && (
                              <Badge variant="outline" className={`ml-2 ${tipoInfo.color} text-xs`}>
                                {tipoInfo.label}
                              </Badge>
                            )}
                            {tipoInfo.value === 'plantilla' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(card)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4 text-fantasy-aged-gold" />
                              </Button>
                            )}
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
                        {tipoInfo.value === 'plantilla' ? (
                          <>
                            <div className="bg-fantasy-deep-black rounded-lg p-4 mb-3 border-2 border-fantasy-textured">
                              <pre className="text-xs whitespace-pre-wrap break-words max-h-32 overflow-y-auto text-foreground">
                                {card.plantilla}
                              </pre>
                            </div>
                            <div className="mt-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyTemplate(card.plantilla, card.nombre)}
                                className="w-full"
                              >
                                <Copy className="h-3 w-3 mr-2" />
                                Copiar Plantilla
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-fantasy-deep-black rounded-lg p-4 mb-3 border border-fantasy-textured">
                              <p className="text-sm text-foreground">
                                {card.descripcion || 'Sin descripción'}
                              </p>
                            </div>
                            <div className="mt-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyTemplate(`{{${card.key}}}`, card.nombre)}
                                className="w-full"
                              >
                                <Copy className="h-3 w-3 mr-2" />
                                Copiar Key
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCard
                ? (formData.tipo === 'variable' ? 'Editar Variable Primaria' : 'Editar Plantilla')
                : (formData.tipo === 'variable' ? 'Crear Nueva Variable Primaria' : 'Crear Nueva Plantilla')
              }
            </DialogTitle>
            <DialogDescription>
              {editingCard
                ? (formData.tipo === 'variable' ? 'Actualiza la información de la variable primaria' : 'Actualiza la información de la plantilla')
                : (formData.tipo === 'variable' ? 'Completa los campos para crear una variable primaria (documentación)' : 'Completa los campos para crear una plantilla reutilizable')
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Campo de categoría */}
            <div>
              <Label htmlFor="categoria">Categoría *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value: GrimorioCardCategory) => setFormData({ ...formData, categoria: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <cat.icon className={`h-4 w-4 ${cat.color.split(' ')[1]}`} />
                        <span>{cat.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-px border-b border-fantasy-textured my-6"></div>

            {/* Campos del formulario */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="key">Key (identificador único) *</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="ej: user_data, quest_info"
                  disabled={formData.tipo === 'variable' && editingCard}
                />
                {formData.tipo === 'plantilla' && (
                  <p className="text-xs text-fantasy-aged-gold mt-1">
                    El nombre simple sin puntos para usar en plantillas
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="ej: Datos del Usuario, Información de Quest"
                />
                <p className="text-xs text-fantasy-aged-gold mt-1">
                  El nombre descriptivo de la plantilla
                </p>
              </div>

              {formData.tipo === 'plantilla' && (
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
              )}

              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder={formData.tipo === 'variable' ? 'Describe para qué sirve esta variable del sistema...' : 'Describe para qué sirve esta plantilla...'}
                  rows={3}
                />
              </div>
            </div>

            {/* Mensajes informativos */}
            {formData.tipo === 'variable' && editingCard && (
              <div className="bg-fantasy-deep-black rounded-lg p-4 border border-fantasy-textured">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-fantasy-aged-gold mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-semibold text-fantasy-aged-gold">Modo Edición de Variable Primaria</h4>
                    <p className="text-sm text-fantasy-aged-gold">
                      Solo puedes editar el nombre y la descripción. La key, categoría y tipo son fijos porque las variables primarias son del sistema.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {formData.tipo === 'plantilla' && (
              <div className="bg-fantasy-deep-black rounded-lg p-4 border border-fantasy-textured">
                <div className="flex items-center gap-2 mb-2">
                  <Book className="h-4 w-4 text-fantasy-aged-gold" />
                  <h3 className="text-sm font-semibold text-fantasy-aged-gold">Variables Disponibles:</h3>
                </div>
                <div className="text-xs text-foreground space-y-2">
                  <p>Variables primarias: jugador.*, npc.*, mundo.*, etc.</p>
                  <p className="text-xs text-fantasy-aged-gold">
                    Ejemplos: <span className="font-mono text-fantasy-aged-gold">user_data</span>, <span className="font-mono text-fantasy-aged-gold">quest_info</span>
                  </p>
                  <p className="text-xs text-fantasy-aged-gold">
                    Las plantillas pueden incluir variables primarias del sistema.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleSubmit}>
              {editingCard ? 'Actualizar' : 'Crear'} {formData.tipo === 'variable' ? 'Variable' : 'Plantilla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen} showCloseButton={false}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Previsualización</DialogTitle>
            <DialogDescription>
              {previewCard && `Plantilla: ${previewCard.nombre}`}
            </DialogDescription>
          </DialogHeader>
          {previewCard && (
            <div className="bg-fantasy-deep-black rounded-lg p-4 border border-fantasy-textured">
              <pre className="text-xs whitespace-pre-wrap break-words max-h-96 overflow-y-auto text-foreground">
                {previewContent}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <VariablesReference open={variablesRefOpen} onClose={() => setVariablesRefOpen(false)} />
    </div>
  );
}