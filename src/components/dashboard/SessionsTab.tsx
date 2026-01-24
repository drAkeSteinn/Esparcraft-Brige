'use client';

import { useState, useEffect } from 'react';
import { Trash2, Play, Eye, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Session, NPC, World, Pueblo, Edificio } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [loading, setLoading] = useState(true);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [testForm, setTestForm] = useState({
    npcid: '',
    message: '',
    mode: 'chat'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, npcsRes, worldsRes, pueblosRes, edificiosRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/npcs'),
        fetch('/api/worlds'),
        fetch('/api/pueblos'),
        fetch('/api/edificios')
      ]);
      const sessionsResult = await sessionsRes.json();
      const npcsResult = await npcsRes.json();
      const worldsResult = await worldsRes.json();
      const pueblosResult = await pueblosRes.json();
      const edificiosResult = await edificiosRes.json();

      if (sessionsResult.success) {
        setSessions(sessionsResult.data);
        // Load summaries for all sessions
        const summariesPromises = sessionsResult.data.map((session: Session) => 
          fetch(`/api/sessions/${session.id}/summary`)
            .then(res => res.json())
            .then(result => ({ sessionId: session.id, summary: result.data?.summary }))
            .catch(() => ({ sessionId: session.id, summary: null }))
        );
        const summariesData = await Promise.all(summariesPromises);
        const summariesMap: Record<string, string> = {};
        summariesData.forEach(({ sessionId, summary }) => {
          if (summary) {
            summariesMap[sessionId] = summary;
          }
        });
        setSummaries(summariesMap);
      }
      if (npcsResult.success) setNpcs(npcsResult.data);
      if (worldsResult.success) setWorlds(worldsResult.data);
      if (pueblosResult.success) setPueblos(pueblosResult.data);
      if (edificiosResult.success) setEdificios(edificiosResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta sesión?')) return;

    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Sesión eliminada correctamente'
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la sesión',
        variant: 'destructive'
      });
    }
  };

  const handleViewSession = (session: Session) => {
    setSelectedSession(session);
    setTestDialogOpen(true);
  };

  const handlePreviewPrompt = async () => {
    if (!testForm.npcid) {
      toast({
        title: 'Error',
        description: 'Selecciona un NPC',
        variant: 'destructive'
      });
      return;
    }

    try {
      const payload = {
        mode: testForm.mode,
        npcid: testForm.npcid,
        message: testForm.message,
        playersessionid: ''
      };

      const response = await fetch(`/api/reroute?preview=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        setPreviewData(result.data);
        setPreviewDialogOpen(true);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo generar la vista previa',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error previewing prompt:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar la vista previa',
        variant: 'destructive'
      });
    }
  };

  const handleSendChat = async () => {
    if (!testForm.npcid || !testForm.message) {
      toast({
        title: 'Error',
        description: 'Completa todos los campos',
        variant: 'destructive'
      });
      return;
    }

    try {
      const payload = {
        mode: 'chat',
        npcid: testForm.npcid,
        message: testForm.message,
        playersessionid: selectedSession?.id || ''
      };

      const response = await fetch('/api/reroute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Respuesta recibida'
        });
        setTestForm({ ...testForm, message: '' });
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo enviar el mensaje',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error sending chat:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive'
      });
    }
  };

  const getNpcName = (npcId: string) => {
    const npc = npcs.find(n => n.id === npcId);
    return npc?.card.name || 'NPC Desconocido';
  };

  const getNpcLocation = (npcId: string) => {
    const npc = npcs.find(n => n.id === npcId);
    if (!npc) return 'Ubicación desconocida';

    const mundo = worlds.find(w => w.id === npc.location.worldId);
    const pueblo = pueblos.find(p => p.id === npc.location.puebloId);
    const edificio = edificios.find(e => e.id === npc.location.edificioId);

    return `${edificio?.name || ''} ${pueblo?.name || ''} ${mundo?.name || ''}`.trim() || mundo?.name || 'Ubicación desconocida';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando sesiones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sesiones y Prompts</h2>
          <p className="text-muted-foreground">Visualiza y gestiona las sesiones de chat</p>
        </div>
        <Button onClick={() => {
          setSelectedSession(null);
          setTestForm({ npcid: '', message: '', mode: 'chat' });
          setTestDialogOpen(true);
        }}>
          <Play className="h-4 w-4 mr-2" />
          Nueva Prueba
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pr-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {getNpcName(session.npcId)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewPrompt()}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(session.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {getNpcLocation(session.npcId)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mensajes:</span>
                    <span className="font-medium">{session.messages.length}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>Creada: {new Date(session.startTime).toLocaleString()}</p>
                    <p>Última actividad: {new Date(session.lastActivity).toLocaleString()}</p>
                  </div>
                  {session.messages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Último mensaje:</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {session.messages[session.messages.length - 1].content}
                      </p>
                    </div>
                  )}
                  {summaries[session.id] && (
                    <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <p className="text-xs font-semibold mb-1 flex items-center gap-1 text-indigo-700 dark:text-indigo-300">
                        <MessageSquare className="h-3 w-3" />
                        Último Resumen:
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {summaries[session.id]}
                      </p>
                    </div>
                  )}
                  <Button
                    className="w-full mt-2"
                    variant="outline"
                    onClick={() => {
                      setSelectedSession(session);
                      setTestForm({ npcid: session.npcId, message: '', mode: 'chat' });
                      setTestDialogOpen(true);
                    }}
                  >
                    Continuar Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedSession ? 'Continuar Chat' : 'Nueva Prueba de Chat'}
            </DialogTitle>
            <DialogDescription>
              Interactúa con un NPC usando el sistema Bridge IA
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="space-y-4">
              <div>
                <Label htmlFor="npcid">NPC</Label>
                <Select
                  value={testForm.npcid}
                  onValueChange={(value) => setTestForm({ ...testForm, npcid: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un NPC" />
                  </SelectTrigger>
                  <SelectContent>
                    {npcs.map((npc) => (
                      <SelectItem key={npc.id} value={npc.id}>
                        {npc.card.name} - {getNpcLocation(npc.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="message">Mensaje</Label>
                <Textarea
                  id="message"
                  value={testForm.message}
                  onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
                  placeholder="Escribe tu mensaje..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSendChat} className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Enviar Mensaje
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePreviewPrompt}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Prompt
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="history">
              <ScrollArea className="h-[400px]">
                {selectedSession && selectedSession.messages.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSession.messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg ${
                          msg.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-secondary/10 mr-8'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium capitalize">
                            {msg.role === 'user' ? 'Jugador' : 'NPC'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No hay mensajes en esta sesión
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visualizador de Prompt</DialogTitle>
            <DialogDescription>
              Vista previa del prompt que se enviará al LLM
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[600px]">
            {previewData && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">System Prompt</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">{previewData.systemPrompt}</pre>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Messages ({previewData.messages.length})</h3>
                  <div className="space-y-2">
                    {previewData.messages.map((msg: any, i: number) => (
                      <div key={i} className="bg-muted p-3 rounded-lg">
                        <div className="text-xs font-medium text-muted-foreground mb-1 capitalize">
                          {msg.role}
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Tokens estimados: {previewData.estimatedTokens}</p>
                </div>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
