'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileUp, FileDown, Code, AlertCircle, CheckCircle, Globe, MapPin, Building, User, ScrollText, Hash, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { NPC, World, Pueblo, Edificio, SillyTavernCard, getCardField, JsonResponseConfig } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import NPCBackupSection from './NPCBackupSection';
import NPCAttributesPanel from './NPCAttributesPanel';
import ContextoAdicionalPanel from './ContextoAdicionalPanel';
import NPCActionsPanel from './NPCActionsPanel';

export default function NpcsTab() {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [npcMemories, setNpcMemories] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [editingView, setEditingView] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingNpc, setEditingNpc] = useState<NPC | null>(null);
  const [importedCard, setImportedCard] = useState<SillyTavernCard | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    worldId: '',
    puebloId: '',
    edificioId: '',
    cardName: '',
    cardDescription: '',
    cardPersonality: '',
    cardScenario: '',
    cardFirstMes: '',
    cardMesExample: '',
    cardSystemPrompt: '',
    cardPostHistoryInstructions: '',
    cardCreatorNotes: '',
    cardAlternateGreetings: ''
  });

  // Estado para configuración JSON
  const [jsonConfig, setJsonConfig] = useState<JsonResponseConfig>({
    enabled: false,
    schema: null,
    exampleResponse: null,
    fallbackResponse: null,
    correctionPrompt: null,
    maxRetries: 2
  });
  const [jsonConfigLoading, setJsonConfigLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [npcsRes, worldsRes, pueblosRes, edificiosRes] = await Promise.all([
        fetch('/api/npcs'),
        fetch('/api/worlds'),
        fetch('/api/pueblos'),
        fetch('/api/edificios')
      ]);
      const npcsResult = await npcsRes.json();
      const worldsResult = await worldsRes.json();
      const pueblosResult = await pueblosRes.json();
      const edificiosResult = await edificiosRes.json();

      if (npcsResult.success) {
        setNpcs(npcsResult.data);
        
        // Cargar memorias de los NPCs en paralelo
        const memoryPromises = npcsResult.data.map((npc: NPC) => 
          fetch(`/api/npcs/${npc.id}/memory`)
        );
        const memoryResponses = await Promise.all(memoryPromises);
        const memories: Record<string, any> = {};
        for (let i = 0; i < memoryResponses.length; i++) {
          const memoryResult = await memoryResponses[i].json();
          if (memoryResult.success && memoryResult.data.memory) {
            memories[npcsResult.data[i].id] = memoryResult.data.memory;
          }
        }
        setNpcMemories(memories);
      }
      if (worldsResult.success) setWorlds(worldsResult.data);
      if (pueblosResult.success) setPueblos(pueblosResult.data);
      if (edificiosResult.success) setEdificios(edificiosResult.data);
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
    setEditingNpc(null);
    setImportedCard(null);
    setFormData({
      id: '',
      worldId: '',
      puebloId: 'none',
      edificioId: 'none',
      cardName: '',
      cardDescription: '',
      cardPersonality: '',
      cardScenario: '',
      cardFirstMes: '',
      cardMesExample: '',
      cardSystemPrompt: '',
      cardPostHistoryInstructions: '',
      cardCreatorNotes: '',
      cardAlternateGreetings: ''
    });
    setEditingView(true);
    setImportedCard(null);
  };

  const handleEdit = async (npc: NPC) => {
    setEditingNpc(npc);
    setImportedCard(npc.card);
    setImportOpen(false);
    // Limpiar importedCard para que al cerrar el diálogo de importación
    setImportedCard(null);
    setFormData({
      id: npc.id,
      worldId: npc.location.worldId,
      puebloId: npc.location.puebloId || 'none',
      edificioId: npc.location.edificioId || 'none',
      cardName: getCardField(npc.card, 'name', ''),
      cardDescription: getCardField(npc.card, 'description', ''),
      cardPersonality: getCardField(npc.card, 'personality', ''),
      cardScenario: getCardField(npc.card, 'scenario', ''),
      cardFirstMes: getCardField(npc.card, 'first_mes', ''),
      cardMesExample: getCardField(npc.card, 'mes_example', ''),
      cardSystemPrompt: getCardField(npc.card, 'system_prompt', ''),
      cardPostHistoryInstructions: getCardField(npc.card, 'post_history_instructions', ''),
      cardCreatorNotes: getCardField(npc.card, 'creator_notes', ''),
      cardAlternateGreetings: (getCardField(npc.card, 'alternate_greetings', []) || []).join('\n')
    });
    
    // Cargar configuración JSON del NPC
    await loadJsonConfig(npc.id);
    
    setEditingView(true);
  };

  const loadJsonConfig = async (npcId: string) => {
    try {
      setJsonConfigLoading(true);
      const response = await fetch(`/api/npcs/${npcId}/json-config`);
      const result = await response.json();
      if (result.success) {
        setJsonConfig(result.data);
      }
    } catch (error) {
      console.error('Error loading JSON config:', error);
    } finally {
      setJsonConfigLoading(false);
    }
  };

  const handleSaveJsonConfig = async () => {
    if (!editingNpc) return;
    
    try {
      const response = await fetch(`/api/npcs/${editingNpc.id}/json-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonConfig)
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Configuración JSON guardada correctamente'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving JSON config:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración JSON',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este NPC?')) return;

    try {
      const response = await fetch(`/api/npcs/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'NPC eliminado correctamente'
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting NPC:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el NPC',
        variant: 'destructive'
      });
    }
  };

  const handleExport = (npc: NPC) => {
    const dataStr = JSON.stringify(npc.card, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cardName = getCardField(npc.card, 'name', 'unknown');
    link.download = `${cardName.replace(/\s+/g, '_')}_card.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Éxito',
      description: 'Tarjeta exportada correctamente'
    });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const card = JSON.parse(text) as SillyTavernCard;

      // Get name from either data or top level
      const cardName = getCardField(card, 'name', '');

      if (!cardName) {
        throw new Error('La tarjeta no tiene un nombre válido');
      }

      // Importar la card y limpiar el formulario para crear un NUEVO NPC
      setImportedCard(card);
      setFormData({
        id: '',
        worldId: '',
        puebloId: 'none',
        edificioId: 'none',
        cardName: cardName,
        cardDescription: getCardField(card, 'description', ''),
        cardPersonality: getCardField(card, 'personality', ''),
        cardScenario: getCardField(card, 'scenario', ''),
        cardFirstMes: getCardField(card, 'first_mes', ''),
        cardMesExample: getCardField(card, 'mes_example', ''),
        cardSystemPrompt: getCardField(card, 'system_prompt', ''),
        cardPostHistoryInstructions: getCardField(card, 'post_history_instructions', ''),
        cardCreatorNotes: getCardField(card, 'creator_notes', ''),
        cardAlternateGreetings: (getCardField(card, 'alternate_greetings', []) || []).join('\n')
      });
      setEditingView(true);
      setImportOpen(false);
      toast({
        title: 'Tarjeta importada',
        description: `Tarjeta de ${cardName} importada. Lista para crear un nuevo NPC`
      });
    } catch (error) {
      console.error('Error importing card:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo importar la tarjeta',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.cardName) {
      toast({
        title: 'Error',
        description: 'El nombre del personaje es obligatorio',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Build the card, preserving existing fields if editing
      const existingCard = editingNpc?.card || {};
      const alternateGreetings = formData.cardAlternateGreetings
        .split('\n')
        .filter(g => g.trim())
        .map(g => g.trim());

      const card: SillyTavernCard = {
        ...existingCard,
        spec: existingCard.spec || 'chara_card_v3',
        spec_version: existingCard.spec_version || '3.0',
        data: {
          ...(existingCard.data || {}),
          name: formData.cardName,
          description: formData.cardDescription,
          personality: formData.cardPersonality,
          scenario: formData.cardScenario,
          first_mes: formData.cardFirstMes,
          mes_example: formData.cardMesExample,
          system_prompt: formData.cardSystemPrompt,
          post_history_instructions: formData.cardPostHistoryInstructions,
          creator_notes: formData.cardCreatorNotes,
          alternate_greetings: alternateGreetings.length > 0 ? alternateGreetings : undefined
        },
        // Top level fields for compatibility
        name: formData.cardName,
        description: formData.cardDescription,
        personality: formData.cardPersonality,
        scenario: formData.cardScenario,
        first_mes: formData.cardFirstMes,
        mes_example: formData.cardMesExample,
        system_prompt: formData.cardSystemPrompt,
        post_history_instructions: formData.cardPostHistoryInstructions,
        creator_notes: formData.cardCreatorNotes,
        alternate_greetings: alternateGreetings.length > 0 ? alternateGreetings : undefined,
        create_date: existingCard.create_date || new Date().toISOString()
      };

      const payload = {
        id: formData.id || undefined,
        location: {
          scope: formData.edificioId && formData.edificioId !== 'none' ? 'edificio' as const : formData.puebloId && formData.puebloId !== 'none' ? 'pueblo' as const : 'mundo' as const,
          worldId: formData.worldId,
          puebloId: formData.puebloId && formData.puebloId !== 'none' ? formData.puebloId : undefined,
          edificioId: formData.edificioId && formData.edificioId !== 'none' ? formData.edificioId : undefined
        },
        card
      };

      const url = editingNpc ? `/api/npcs/${editingNpc.id}` : '/api/npcs';
      const method = editingNpc ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: editingNpc ? 'NPC actualizado' : 'NPC creado'
        });
        setEditingView(false);
        fetchData();
      } else {
        throw new Error(result.error || 'No se pudo guardar el NPC');
      }
    } catch (error) {
      console.error('Error saving NPC:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar el NPC',
        variant: 'destructive'
      });
    }
  };

  const filteredPueblos = pueblos.filter(p => p.worldId === formData.worldId);
  const filteredEdificios = edificios.filter(e => e.puebloId === formData.puebloId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando NPCs...</p>
      </div>
    );
  }

  // ====== Vista de edición full-screen con panel lateral ======
  if (editingView) {
    return (
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Header de la vista de edición */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingView(false)}
            >
              ← Volver
            </Button>
            <div>
              <h2 className="text-xl font-bold">
                {editingNpc && !importedCard ? 'Editar NPC' : 'Crear Nuevo NPC'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {editingNpc ? 'Actualiza la información del NPC' : 'Completa la información del nuevo NPC'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingView(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingNpc ? 'Actualizar NPC' : 'Crear NPC'}
            </Button>
          </div>
        </div>

        {/* Contenido: panel lateral + formulario (una sola Tabs con layout flex horizontal) */}
        <Tabs defaultValue="basic" className="flex flex-row gap-4 flex-1 min-h-0 w-full">
          {/* Panel lateral con tabs verticales */}
          <div className="w-52 flex-shrink-0 border-r pr-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-2">
              Secciones
            </p>
            <TabsList className="flex flex-col h-auto gap-1 bg-transparent p-2 w-full">
              <TabsTrigger value="basic" className="justify-start w-full data-[state=active]:bg-accent">Básico</TabsTrigger>
              <TabsTrigger value="advanced" className="justify-start w-full data-[state=active]:bg-accent">Avanzado</TabsTrigger>
              <TabsTrigger value="location" className="justify-start w-full data-[state=active]:bg-accent">Ubicación</TabsTrigger>
              <TabsTrigger value="attributes" className="justify-start w-full flex items-center gap-1.5 data-[state=active]:bg-accent">
                <Hash className="h-3 w-3" />
                Atributos
              </TabsTrigger>
              <TabsTrigger value="contextos" className="justify-start w-full flex items-center gap-1.5 data-[state=active]:bg-accent">
                <MapPin className="h-3 w-3" />
                Contextos
              </TabsTrigger>
              <TabsTrigger value="actions" className="justify-start w-full flex items-center gap-1.5 data-[state=active]:bg-accent">
                <Zap className="h-3 w-3" />
                Acciones
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Contenido del formulario (scroll independiente) */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-2">
            <TabsContent value="basic" className="mt-0 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="npcId">ID del NPC (UUID de Minecraft)</Label>
                  <Input
                    id="npcId"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="Ej: 550e8400-e29b-41d4-a716-446655440000 (opcional)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Si se deja vacío, se generará un ID automáticamente
                  </p>
                </div>
                <div>
                  <Label htmlFor="cardName">Nombre del Personaje *</Label>
                  <Input
                    id="cardName"
                    value={formData.cardName}
                    onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                    placeholder="Ej: Sharam Hrafnmyrk"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cardDescription">Descripción</Label>
                <Textarea
                  id="cardDescription"
                  value={formData.cardDescription}
                  onChange={(e) => setFormData({ ...formData, cardDescription: e.target.value })}
                  placeholder="Describe al personaje"
                  rows={6}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="cardPersonality">Personalidad</Label>
                <Textarea
                  id="cardPersonality"
                  value={formData.cardPersonality}
                  onChange={(e) => setFormData({ ...formData, cardPersonality: e.target.value })}
                  placeholder="Describe la personalidad del personaje"
                  rows={6}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="cardScenario">Escenario</Label>
                <Textarea
                  id="cardScenario"
                  value={formData.cardScenario}
                  onChange={(e) => setFormData({ ...formData, cardScenario: e.target.value })}
                  placeholder="Describe el escenario o contexto del personaje"
                  rows={5}
                  className="w-full"
                />
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-0 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardFirstMes">Primer Mensaje</Label>
                  <Textarea
                    id="cardFirstMes"
                    value={formData.cardFirstMes}
                    onChange={(e) => setFormData({ ...formData, cardFirstMes: e.target.value })}
                    placeholder="El primer mensaje que enviará el personaje"
                    rows={5}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="cardMesExample">Ejemplo de Mensaje</Label>
                  <Textarea
                    id="cardMesExample"
                    value={formData.cardMesExample}
                    onChange={(e) => setFormData({ ...formData, cardMesExample: e.target.value })}
                    placeholder="Ejemplo de cómo responde el personaje"
                    rows={5}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cardSystemPrompt">System Prompt</Label>
                <Textarea
                  id="cardSystemPrompt"
                  value={formData.cardSystemPrompt}
                  onChange={(e) => setFormData({ ...formData, cardSystemPrompt: e.target.value })}
                  placeholder="Instrucciones específicas para el sistema"
                  rows={10}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="cardPostHistoryInstructions">Instrucciones Post-Historial</Label>
                <Textarea
                  id="cardPostHistoryInstructions"
                  value={formData.cardPostHistoryInstructions}
                  onChange={(e) => setFormData({ ...formData, cardPostHistoryInstructions: e.target.value })}
                  placeholder="Instrucciones después de historial de chat"
                  rows={5}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardCreatorNotes">Notas del Creador</Label>
                  <Textarea
                    id="cardCreatorNotes"
                    value={formData.cardCreatorNotes}
                    onChange={(e) => setFormData({ ...formData, cardCreatorNotes: e.target.value })}
                    placeholder="Notas sobre el personaje (no visibles en el rol)"
                    rows={4}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="cardAlternateGreetings">Saludos Alternativos (uno por línea)</Label>
                  <Textarea
                    id="cardAlternateGreetings"
                    value={formData.cardAlternateGreetings}
                    onChange={(e) => setFormData({ ...formData, cardAlternateGreetings: e.target.value })}
                    placeholder="Cada saludo en una línea nueva"
                    rows={4}
                    className="w-full"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="location" className="mt-0 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="worldId">Mundo *</Label>
                  <Select
                    value={formData.worldId}
                    onValueChange={(value) => setFormData({ ...formData, worldId: value, puebloId: 'none', edificioId: 'none' })}
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
                  <Label htmlFor="puebloId">Pueblo (opcional)</Label>
                  <Select
                    value={formData.puebloId}
                    onValueChange={(value) => setFormData({ ...formData, puebloId: value, edificioId: 'none' })}
                    disabled={!formData.worldId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un pueblo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      {filteredPueblos.map((pueblo) => (
                        <SelectItem key={pueblo.id} value={pueblo.id}>
                          {pueblo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edificioId">Edificio (opcional)</Label>
                  <Select
                    value={formData.edificioId}
                    onValueChange={(value) => setFormData({ ...formData, edificioId: value })}
                    disabled={!formData.puebloId || formData.puebloId === 'none'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un edificio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      {filteredEdificios.map((edificio) => (
                        <SelectItem key={edificio.id} value={edificio.id}>
                          {edificio.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attributes" className="mt-0 p-6 space-y-4">
              <NPCAttributesPanel
                npcId={editingNpc?.id ?? null}
                disabled={!editingNpc}
              />
            </TabsContent>

            <TabsContent value="contextos" className="mt-0 p-6 space-y-4">
              <ContextoAdicionalPanel
                entityType="npc"
                entityId={editingNpc?.id ?? null}
                disabled={!editingNpc}
              />
            </TabsContent>

            <TabsContent value="actions" className="mt-0 p-6 space-y-4">
              <NPCActionsPanel
                npcId={editingNpc?.id ?? null}
                disabled={!editingNpc}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    );
  }

  // ====== Vista normal (lista de NPCs) ======
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">NPCs</h2>
          <p className="text-muted-foreground">Gestiona los personajes (SillyTavern compatible)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileUp className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Crear NPC
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pr-4">
          {npcs.map((npc) => {
            const world = worlds.find(w => w.id === npc.location.worldId);
            const pueblo = pueblos.find(p => p.id === npc.location.puebloId);
            const edificio = edificios.find(e => e.id === npc.location.edificioId);
            const cardName = getCardField(npc.card, 'name', 'Unknown');
            const cardPersonality = getCardField(npc.card, 'personality', '');
            const cardDescription = getCardField(npc.card, 'description', '');
            const cardAvatar = getCardField(npc.card, 'avatar', null);
            const jsonEnabled = npc.card?.data?.extensions?.jsonResponse?.enabled || npc.card?.extensions?.jsonResponse?.enabled || false;

            return (
              <Card key={npc.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      {cardAvatar ? (
                        <img 
                          src={cardAvatar} 
                          alt={cardName}
                          className="w-8 h-8 rounded-full object-cover border-2 border-muted"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border-2 border-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="truncate">{cardName}</span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {jsonEnabled && (
                        <Badge variant="default" className="bg-green-600 text-xs px-1.5">
                          JSON
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExport(npc)}
                        title="Exportar tarjeta"
                        className="h-7 w-7 p-0"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(npc)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(npc.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="max-h-80 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    {/* Ubicación jerárquica */}
                    <div className="space-y-1.5">
                      {/* Mundo */}
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                        <span className="text-muted-foreground truncate">{world?.name || 'Mundo desconocido'}</span>
                      </div>
                      
                      {/* Región (si existe) */}
                      {pueblo && (
                        <div className="flex items-center gap-2 text-sm ml-4">
                          <MapPin className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          <span className="text-muted-foreground truncate">{pueblo.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            {pueblo.type === 'nacion' ? 'Nación' : 'Pueblo'}
                          </Badge>
                        </div>
                      )}
                      
                      {/* Edificio (si existe) */}
                      {edificio && (
                        <div className="flex items-center gap-2 text-sm ml-8">
                          <Building className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                          <span className="text-muted-foreground truncate">{edificio.name}</span>
                        </div>
                      )}
                    </div>

                    {/* ID y Scope */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono bg-muted/50 px-2 py-0.5 rounded border-2 border-[#2C2923] text-[#83673D]">
                        {npc.id}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {npc.location.scope}
                      </Badge>
                    </div>

                    {/* Personalidad */}
                    {cardPersonality && (
                      <div>
                        <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          Personalidad
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-3">{cardPersonality}</p>
                      </div>
                    )}

                    {/* Descripción */}
                    {cardDescription && (
                      <div>
                        <p className="text-sm font-medium mb-1">Descripción</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{cardDescription}</p>
                      </div>
                    )}

                    {/* Resumen consolidado */}
                    {npcMemories[npc.id]?.consolidatedSummary && (
                      <div className="mt-2 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                        <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 mb-1 flex items-center gap-1.5">
                          <ScrollText className="h-3 w-3" />
                          Último Resumen
                        </p>
                        <p className="text-sm text-indigo-800 dark:text-indigo-200 line-clamp-3">
                          {npcMemories[npc.id].consolidatedSummary}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Tarjeta SillyTavern</DialogTitle>
            <DialogDescription>
              Importa una tarjeta de personaje en formato JSON de SillyTavern (v3 compatible)
            </DialogDescription>
          </DialogHeader>
          <div>
            <Input
              type="file"
              accept=".json"
              onChange={handleImport}
            />
          </div>
        </DialogContent>
      </Dialog>


      <NPCBackupSection />
    </div>
  );
}
