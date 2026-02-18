'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, ScrollText, Building, Users, ChevronDown, ChevronRight, Globe, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Pueblo, World, Edificio, NPC, getCardField } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import GenericBackupSection from '../GenericBackupSection';

interface FormData {
  worldId: string;
  name: string;
  type: 'pueblo' | 'nacion';
  description: string;
  estado_pueblo: string;
  rumores: string;
  eventos: string;
}

export default function PueblosSection() {
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [puebloMemories, setPuebloMemories] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPueblo, setEditingPueblo] = useState<Pueblo | null>(null);
  const [expandedEdificios, setExpandedEdificios] = useState<Record<string, boolean>>({});
  const [filterWorldId, setFilterWorldId] = useState<string>('all');
  const [formData, setFormData] = useState<FormData>({
    worldId: '',
    name: '',
    type: 'pueblo',
    description: '',
    estado_pueblo: '',
    rumores: '',
    eventos: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pueblosRes, worldsRes, edificiosRes, npcsRes] = await Promise.all([
        fetch('/api/pueblos'),
        fetch('/api/worlds'),
        fetch('/api/edificios'),
        fetch('/api/npcs')
      ]);

      const pueblosResult = await pueblosRes.json();
      const worldsResult = await worldsRes.json();
      const edificiosResult = await edificiosRes.json();
      const npcsResult = await npcsRes.json();

      if (pueblosResult.success) setPueblos(pueblosResult.data);
      if (worldsResult.success) setWorlds(worldsResult.data);
      if (edificiosResult.success) setEdificios(edificiosResult.data);
      if (npcsResult.success) setNpcs(npcsResult.data);

      // Cargar memorias de pueblos en paralelo
      const memoriaPromises = pueblosResult.data.map(pueblo => 
        fetch(`/api/pueblos/${pueblo.id}/memory`)
      );

      const memoriaResponses = await Promise.all(memoriaPromises);
      const memories: Record<string, any> = {};
      memoriaResponses.forEach((response, index) => {
        if (response.ok) {
          const result = response.json();
          if (result.success && result.data.memory) {
            memories[pueblosResult.data[index].id] = result.data.memory;
          }
        }
      });

      setPuebloMemories(memories);

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
    setEditingPueblo(null);
    setFormData({
      worldId: '',
      name: '',
      type: 'pueblo' as 'pueblo',
      description: '',
      estado_pueblo: '',
      rumores: '',
      eventos: ''
    });
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
      rumores: pueblo.lore.rumores.join('\n'),
      eventos: pueblo.lore.eventos?.join('\n') || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta región?')) return;

    try {
      const response = await fetch(`/api/pueblos/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Región eliminada correctamente'
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting pueblo:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la región',
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
          rumores: formData.rumores.split('\n').filter(r => r.trim()),
          eventos: formData.eventos.split('\n').filter(e => e.trim())
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
        toast({
          title: 'Éxito',
          description: editingPueblo ? 'Región actualizada' : 'Región creada'
        });
        setDialogOpen(false);
        setEditingPueblo(null);
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
        <p className="text-muted-foreground">Cargando regiones...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Pueblos/Naciones</h2>
            <p className="text-sm text-muted-foreground">Gestiona las regiones del mundo, sus edificios y resúmenes consolidados</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Región
          </Button>
        </div>

        {/* Filtros y Estadísticas */}
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/30 border">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="filterWorld" className="text-sm font-medium">Filtrar por mundo:</Label>
            <Select value={filterWorldId} onValueChange={setFilterWorldId}>
              <SelectTrigger id="filterWorld" className="w-48">
                <SelectValue placeholder="Todos los mundos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los mundos</SelectItem>
                {worlds.map((world) => (
                  <SelectItem key={world.id} value={world.id}>
                    {world.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1" />
          
          {/* Estadísticas totales */}
          <div className="flex flex-wrap gap-2">
            {(() => {
              const filteredPueblos = filterWorldId === 'all' 
                ? pueblos 
                : pueblos.filter(p => p.worldId === filterWorldId);
              const filteredEdificios = filterWorldId === 'all'
                ? edificios
                : edificios.filter(e => {
                    const pueblo = pueblos.find(p => p.id === e.puebloId);
                    return pueblo?.worldId === filterWorldId;
                  });
              const filteredNpcs = filterWorldId === 'all'
                ? npcs
                : npcs.filter(n => n.location.worldId === filterWorldId);
              
              return (
                <>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {filteredPueblos.length} {filteredPueblos.length === 1 ? 'región' : 'regiones'}
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {filteredEdificios.length} {filteredEdificios.length === 1 ? 'edificio' : 'edificios'}
                  </Badge>
                  <Badge variant="default" className="flex items-center gap-1 bg-primary/80">
                    <Users className="h-3 w-3" />
                    {filteredNpcs.length} {filteredNpcs.length === 1 ? 'NPC' : 'NPCs'}
                  </Badge>
                </>
              );
            })()}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(filterWorldId === 'all' 
            ? pueblos 
            : pueblos.filter(p => p.worldId === filterWorldId)
          ).map((pueblo) => {
            const world = worlds.find(w => w.id === pueblo.worldId);
            const edificiosEnPueblo = edificios.filter(e => e.puebloId === pueblo.id);
            const npcsEnPueblo = npcs.filter(n => n.location.puebloId === pueblo.id);

            return (
              <Card key={pueblo.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {pueblo.name}
                      <Badge variant="outline" className={pueblo.type === 'nacion' ? 'border-purple-500 text-purple-500' : 'border-green-500 text-green-500'}>
                        {pueblo.type === 'nacion' ? 'Nación' : 'Pueblo'}
                      </Badge>
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
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="max-h-96 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    {/* Ubicación e ID */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground leading-tight">{world?.name || 'Mundo desconocido'}</span>
                      <span className="text-muted-foreground/60 mt-0.5">•</span>
                      <span className="font-mono text-xs bg-muted/50 px-2 py-0.5 rounded border-2 border-[#2C2923] text-[#83673D] leading-tight">
                        {pueblo.id}
                      </span>
                    </div>
                    {/* Estadísticas de la Región */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {edificiosEnPueblo.length} {edificiosEnPueblo.length === 1 ? 'edificio' : 'edificios'}
                      </Badge>
                      <Badge variant="default" className="flex items-center gap-1 bg-primary/80">
                        <Users className="h-3 w-3" />
                        {npcsEnPueblo.length} {npcsEnPueblo.length === 1 ? 'NPC' : 'NPCs'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm font-medium">Descripción:</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {pueblo.description || 'Sin descripción'}
                    </div>

                    {pueblo.lore.rumores.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <ScrollText className="h-3.5 w-3.5 text-[#83673D]" />
                            Rumores:
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {pueblo.lore.rumores.length} {pueblo.lore.rumores.length === 1 ? 'rumor' : 'rumores'}
                          </span>
                        </div>
                        <div className="max-h-32 overflow-y-auto border-2 border-[#2C2923] bg-[#100F11] p-3 rounded">
                          <ul className="space-y-1.5">
                            {pueblo.lore.rumores.map((rumor, i) => (
                              <li key={i} className="text-sm text-[#B8B8B8] flex items-start gap-2">
                                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-[#2C2923] text-[#83673D] text-xs font-mono rounded">
                                  {i + 1}
                                </span>
                                <span className="break-words">{rumor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    {pueblo.lore.eventos && pueblo.lore.eventos.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <ScrollText className="h-3.5 w-3.5 text-[#83673D]" />
                            Eventos:
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {pueblo.lore.eventos.length} {pueblo.lore.eventos.length === 1 ? 'evento' : 'eventos'}
                          </span>
                        </div>
                        <div className="max-h-32 overflow-y-auto border-2 border-[#2C2923] bg-[#100F11] p-3 rounded">
                          <ul className="space-y-1.5">
                            {pueblo.lore.eventos.map((evento, i) => (
                              <li key={i} className="text-sm text-[#B8B8B8] flex items-start gap-2">
                                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-[#2C2923] text-[#83673D] text-xs font-mono rounded">
                                  {i + 1}
                                </span>
                                <span className="break-words">{evento}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="mt-3">
                      <p className="text-sm font-medium">Estado:</p>
                      <div className="text-sm text-muted-foreground">
                        {pueblo.lore.estado_pueblo || 'Sin estado'}
                      </div>
                    </div>

                    {edificiosEnPueblo.length > 0 && (
                      <div className="border-t pt-3 mt-3">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <Building className="h-4 w-4 text-blue-500" />
                            Edificaciones ({edificiosEnPueblo.length})
                          </p>
                        </div>
                        <div className="space-y-2">
                        {edificiosEnPueblo.map((edificio) => {
                          const npcsEnEdificio = npcs.filter(n => n.location.edificioId === edificio.id);
                          const isExpanded = expandedEdificios[edificio.id];
                          
                          return (
                            <Collapsible 
                              key={edificio.id} 
                              open={isExpanded}
                              onOpenChange={(open) => setExpandedEdificios(prev => ({ ...prev, [edificio.id]: open }))}
                            >
                              <div className="border rounded-lg bg-muted/30">
                                <CollapsibleTrigger asChild>
                                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      )}
                                      <MapPin className="h-4 w-4 text-blue-500" />
                                      <span className="text-sm font-medium">{edificio.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">
                                        <Users className="h-3 w-3 mr-1" />
                                        {npcsEnEdificio.length} NPCs
                                      </Badge>
                                    </div>
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="px-3 pb-3 pt-0 border-t">
                                    {/* Info del edificio */}
                                    <div className="text-xs text-muted-foreground mb-2 mt-2">
                                      ID: {edificio.id}
                                    </div>
                                    {edificio.lore && (
                                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                        {edificio.lore}
                                      </p>
                                    )}
                                    
                                    {/* Lista de NPCs */}
                                    {npcsEnEdificio.length > 0 ? (
                                      <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                          Personajes en este edificio:
                                        </p>
                                        <div className="grid gap-1.5">
                                          {npcsEnEdificio.map((npc) => {
                                            const npcName = getCardField(npc.card, 'name', 'Sin nombre');
                                            const npcPersonality = getCardField(npc.card, 'personality', '');
                                            return (
                                              <div 
                                                key={npc.id} 
                                                className="flex items-center justify-between p-2 rounded bg-background/50 border"
                                              >
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium truncate">{npcName}</p>
                                                  {npcPersonality && (
                                                    <p className="text-xs text-muted-foreground truncate">
                                                      {npcPersonality.substring(0, 60)}...
                                                    </p>
                                                  )}
                                                </div>
                                                <span className="text-xs text-muted-foreground font-mono ml-2">
                                                  {npc.id.substring(0, 12)}...
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground italic">
                                        Sin NPCs en este edificio
                                      </p>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          );
                        })}
                        </div>
                      </div>
                    )}

                    {puebloMemories[pueblo.id]?.consolidatedSummary && (
                      <div className="mt-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                        <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                          Último Resumen General
                        </p>
                        <p className="text-sm text-indigo-800 dark:text-indigo-200 line-clamp-3">
                          {puebloMemories[pueblo.id].consolidatedSummary}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
            {editingPueblo ? 'Edita la información de la región' : 'Completa la información de la nueva región'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <div>
              <Label htmlFor="worldId">Mundo *</Label>
              <Select
                value={formData.worldId}
                onValueChange={(value) => setFormData({ ...formData, worldId: value, puebloId: '', type: 'pueblo' })}
                disabled={!!editingPueblo}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un mundo" />
                </SelectTrigger>
                <SelectContent>
                  {worlds.map((world) => (
                    <SelectItem key={world.id} value={world.id}>{world.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre de la región"
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                disabled={!!editingPueblo}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pueblo">Pueblo</SelectItem>
                  <SelectItem value="nacion">Nación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la región"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="estado_pueblo">Estado</Label>
              <Textarea
                id="estado_pueblo"
                value={formData.estado_pueblo}
                onChange={(e) => setFormData({ ...formData, estado_pueblo: e.target.value })}
                placeholder="Estado de la región (ej: Prospero, En guerra, en desarrollo...)"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="rumores">Rumores (uno por línea)</Label>
              <Textarea
                id="rumores"
                value={formData.rumores}
                onChange={(e) => setFormData({ ...formData, rumores: e.target.value })}
                placeholder="Rumores de la región (uno por línea)"
                rows={5}
              />
            </div>
            <div>
              <Label htmlFor="eventos">Eventos (uno por línea)</Label>
              <Textarea
                id="eventos"
                value={formData.eventos}
                onChange={(e) => setFormData({ ...formData, eventos: e.target.value })}
                placeholder="Eventos de la región (uno por línea)"
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingPueblo ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      <GenericBackupSection
        entityType="pueblos"
        entityName="Pueblo"
        entityNamePlural="Pueblos/Naciones"
        apiPath="pueblos"
      />

  </div>
  );
}
