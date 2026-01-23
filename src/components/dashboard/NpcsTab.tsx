'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileUp, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NPC, World, Pueblo, Edificio, SillyTavernCard, getCardField } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function NpcsTab() {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
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

      if (npcsResult.success) setNpcs(npcsResult.data);
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
    setDialogOpen(true);
    setImportedCard(null);
  };

  const handleEdit = (npc: NPC) => {
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
    setDialogOpen(true);
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
      setDialogOpen(true);
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
        setDialogOpen(false);
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

            return (
              <Card key={npc.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {cardName}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExport(npc)}
                        title="Exportar tarjeta"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(npc)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(npc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {edificio?.name || pueblo?.name || world?.name || 'Ubicación desconocida'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      ID: {npc.id}
                    </div>
                    {cardPersonality && (
                      <div>
                        <p className="text-sm font-medium">Personalidad:</p>
                        <p className="text-sm text-muted-foreground line-clamp-3">{cardPersonality}</p>
                      </div>
                    )}
                    {cardDescription && (
                      <div>
                        <p className="text-sm font-medium">Descripción:</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{cardDescription}</p>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Alcance: {npc.location.scope}
                    </div>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {editingNpc && !importedCard ? 'Editar NPC' : 'Crear Nuevo NPC'}
              </span>
              {editingNpc && (
                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-md">
                  Editando
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingNpc ? 'Actualiza la información del NPC' : 'Completa la información del nuevo NPC'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(95vh-140px)]">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="advanced">Avanzado</TabsTrigger>
                <TabsTrigger value="location">Ubicación</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-4">
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
                  <div>
                    <Label htmlFor="cardDescription">Descripción</Label>
                    <Textarea
                      id="cardDescription"
                      value={formData.cardDescription}
                      onChange={(e) => setFormData({ ...formData, cardDescription: e.target.value })}
                      placeholder="Describe al personaje"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardPersonality">Personalidad</Label>
                    <Textarea
                      id="cardPersonality"
                      value={formData.cardPersonality}
                      onChange={(e) => setFormData({ ...formData, cardPersonality: e.target.value })}
                      placeholder="Describe la personalidad del personaje"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardScenario">Escenario</Label>
                    <Textarea
                      id="cardScenario"
                      value={formData.cardScenario}
                      onChange={(e) => setFormData({ ...formData, cardScenario: e.target.value })}
                      placeholder="Describe el escenario o contexto del personaje"
                      rows={3}
                    />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cardFirstMes">Primer Mensaje</Label>
                    <Textarea
                      id="cardFirstMes"
                      value={formData.cardFirstMes}
                      onChange={(e) => setFormData({ ...formData, cardFirstMes: e.target.value })}
                      placeholder="El primer mensaje que enviará el personaje"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardMesExample">Ejemplo de Mensaje</Label>
                    <Textarea
                      id="cardMesExample"
                      value={formData.cardMesExample}
                      onChange={(e) => setFormData({ ...formData, cardMesExample: e.target.value })}
                      placeholder="Ejemplo de cómo responde el personaje"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardSystemPrompt">System Prompt</Label>
                    <Textarea
                      id="cardSystemPrompt"
                      value={formData.cardSystemPrompt}
                      onChange={(e) => setFormData({ ...formData, cardSystemPrompt: e.target.value })}
                      placeholder="Instrucciones específicas para el sistema"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardPostHistoryInstructions">Instrucciones Post-Historial</Label>
                    <Textarea
                      id="cardPostHistoryInstructions"
                      value={formData.cardPostHistoryInstructions}
                      onChange={(e) => setFormData({ ...formData, cardPostHistoryInstructions: e.target.value })}
                      placeholder="Instrucciones después de historial de chat"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardCreatorNotes">Notas del Creador</Label>
                    <Textarea
                      id="cardCreatorNotes"
                      value={formData.cardCreatorNotes}
                      onChange={(e) => setFormData({ ...formData, cardCreatorNotes: e.target.value })}
                      placeholder="Notas sobre el personaje (no visibles en el rol)"
                      rows={3}
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
                    />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="location" className="space-y-4">
              <div className="space-y-4">
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
          </Tabs>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editingNpc ? 'Actualizar NPC' : 'Crear NPC'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
}
