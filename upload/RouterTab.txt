'use client';

import { useState, useEffect } from 'react';
import { Send, RefreshCw, Network, MessageSquare, Globe, MapPin, Building, User, Eye, MessageCircle, FileText, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { World, Pueblo, Edificio, NPC, Session } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function RouterTab() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [resumenSesionTemplateSaved, setResumenSesionTemplateSaved] = useState(false);
  const [resumenNPCTemplateSaved, setResumenNPCTemplateSaved] = useState(false);

  // Chat trigger form
  const [chatForm, setChatForm] = useState({
    sessionType: 'new' as 'new' | 'exist',
    npcid: '',
    playersessionid: '',
    jugador: {
      nombre: '',
      raza: '',
      nivel: '',
      almakos: '',
      deuda: '',
      piedras_del_alma: '',
      salud_actual: '',
      reputacion: '',
      hora: '',
      clima: ''
    },
    mensaje: '', // Mensaje del jugador (context por mensaje)
    templateUser: '' // Plantilla del usuario (reemplaza systemPrompt)
  });

  // Resumen sesion trigger form
  const [resumenSesionForm, setResumenSesionForm] = useState({
    npcid: '',
    sessionid: '',
    lastSummary: '', // Último resumen de la sesión
    chatHistory: '', // Historial de la sesión
    systemPrompt: ''
  });

  // Resumen NPC trigger form
  const [resumenNPCForm, setResumenNPCForm] = useState({
    npcid: '',
    allSummaries: '', // NUEVO: Todos los resúmenes del NPC
    systemPrompt: ''
  });

  // Resumen edificio trigger form
  const [resumenEdificioForm, setResumenEdificioForm] = useState({
    edificioid: '',
    systemPrompt: ''
  });

  // Nuevo lore trigger form
  const [nuevoLoreForm, setNuevoLoreForm] = useState({
    scope: 'mundo' as 'mundo' | 'pueblo' | 'edificio',
    mundoid: '',
    pueblid: '',
    edificioid: '',
    loreType: '',
    context: '',
    systemPrompt: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Cargar Template User del localStorage
    const savedTemplate = localStorage.getItem('userTemplate');
    if (savedTemplate) {
      setChatForm(prev => ({ ...prev, templateUser: savedTemplate }));
      setTemplateSaved(true);
    }
  }, []);

  useEffect(() => {
    // Guardar Template User en localStorage cuando cambie
    if (chatForm.templateUser) {
      localStorage.setItem('userTemplate', chatForm.templateUser);
      setTemplateSaved(true);
    }
  }, [chatForm.templateUser]);

  useEffect(() => {
    // Cargar System Prompt de resumen de sesión del localStorage
    const savedResumenTemplate = localStorage.getItem('resumenSesionTemplate');
    if (savedResumenTemplate) {
      setResumenSesionForm(prev => ({ ...prev, systemPrompt: savedResumenTemplate }));
      setResumenSesionTemplateSaved(true);
    }
  }, []);

  useEffect(() => {
    // Guardar System Prompt de resumen de sesión en localStorage cuando cambie
    if (resumenSesionForm.systemPrompt) {
      localStorage.setItem('resumenSesionTemplate', resumenSesionForm.systemPrompt);
      setResumenSesionTemplateSaved(true);
    }
  }, [resumenSesionForm.systemPrompt]);

  useEffect(() => {
    // Cargar System Prompt de resumen NPC del localStorage
    const savedResumenNPCTemplate = localStorage.getItem('resumenNPCTemplate');
    if (savedResumenNPCTemplate) {
      setResumenNPCForm(prev => ({ ...prev, systemPrompt: savedResumenNPCTemplate }));
      setResumenNPCTemplateSaved(true);
    }
  }, []);

  useEffect(() => {
    // Guardar System Prompt de resumen NPC en localStorage cuando cambie
    if (resumenNPCForm.systemPrompt) {
      localStorage.setItem('resumenNPCTemplate', resumenNPCForm.systemPrompt);
      setResumenNPCTemplateSaved(true);
    }
  }, [resumenNPCForm.systemPrompt]);

  const handleSaveTemplate = () => {
    localStorage.setItem('userTemplate', chatForm.templateUser);
    setTemplateSaved(true);
    toast({
      title: 'Template Guardado',
      description: 'El template del usuario se ha guardado correctamente'
    });
  };

  const handleSaveResumenSesionTemplate = () => {
    localStorage.setItem('resumenSesionTemplate', resumenSesionForm.systemPrompt);
    setResumenSesionTemplateSaved(true);
    toast({
      title: 'Template de Resumen Guardado',
      description: 'El system prompt de resumen de sesión se ha guardado correctamente'
    });
  };

  const handleSaveResumenNPCTemplate = () => {
    localStorage.setItem('resumenNPCTemplate', resumenNPCForm.systemPrompt);
    setResumenNPCTemplateSaved(true);
    toast({
      title: 'Template de Resumen NPC Guardado',
      description: 'El system prompt de resumen NPC se ha guardado correctamente'
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [worldsRes, pueblosRes, edificiosRes, npcsRes, sessionsRes] = await Promise.all([
        fetch('/api/worlds'),
        fetch('/api/pueblos'),
        fetch('/api/edificios'),
        fetch('/api/npcs'),
        fetch('/api/sessions')
      ]);
      const worldsResult = await worldsRes.json();
      const pueblosResult = await pueblosRes.json();
      const edificiosResult = await edificiosRes.json();
      const npcsResult = await npcsRes.json();
      const sessionsResult = await sessionsRes.json();

      if (worldsResult.success) setWorlds(worldsResult.data);
      if (pueblosResult.success) setPueblos(pueblosResult.data);
      if (edificiosResult.success) setEdificios(edificiosResult.data);
      if (npcsResult.success) setNpcs(npcsResult.data);
      if (sessionsResult.success) setSessions(sessionsResult.data);
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

  const countTokens = (text: string): number => {
    return Math.ceil(text.length / 4);
  };

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: label,
      description: 'Copiado al portapapeles'
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredPueblos = pueblos.filter(p => p.worldId === chatForm.npcid);
  const filteredEdificios = edificios.filter(e => e.puebloId === chatForm.npcid);

  const buildChatPayload = () => {
    const npc = npcs.find(n => n.id === chatForm.npcid);
    if (!npc) return null;

    const world = worlds.find(w => w.id === npc.location.worldId);
    const pueblo = pueblos.find(p => p.id === npc.location.puebloId);
    const edificio = edificios.find(e => e.id === npc.location.edificioId);

    let sessionid = chatForm.playersessionid;
    if (chatForm.sessionType === 'new') {
      sessionid = '';
    }

    return {
      triggertype: 'chat',
      sesion: chatForm.sessionType,
      npcid: chatForm.npcid,
      sessionid,
      jugador: chatForm.jugador,
      mensaje: chatForm.mensaje, // Mensaje del jugador (context por mensaje)
      context: {
        mundo: world,
        pueblo,
        edificio
      }
    };
  };

  const buildResumenSesionPayload = () => {
    return {
      triggertype: 'resumen_sesion',
      npcid: resumenSesionForm.npcid,
      sessionid: resumenSesionForm.sessionid,
      lastSummary: resumenSesionForm.lastSummary,
      chatHistory: resumenSesionForm.chatHistory
    };
  };

  const buildResumenNPCPayload = () => {
    return {
      triggertype: 'resumen_npc',
      npcid: resumenNPCForm.npcid,
      allSummaries: resumenNPCForm.allSummaries
    };
  };

  const buildResumenEdificioPayload = () => {
    return {
      triggertype: 'resumen_edificio',
      edificioid: resumenEdificioForm.edificioid
    };
  };

  const buildNuevoLorePayload = () => {
    const base = {
      triggertype: 'nuevo_lore',
      scope: nuevoLoreForm.scope
    };

    if (nuevoLoreForm.scope === 'mundo') {
      return { ...base, mundoid: nuevoLoreForm.mundoid };
    } else if (nuevoLoreForm.scope === 'pueblo') {
      return { ...base, pueblid: nuevoLoreForm.pueblid };
    } else if (nuevoLoreForm.scope === 'edificio') {
      return { ...base, edificioid: nuevoLoreForm.edificioid };
    }
    return base;
  };

  // Constantes para mostrar llaves dobles en JSX
  const KEY_EXAMPLE_1 = '{' + '{';
  const KEY_EXAMPLE_2 = '}' + '}';

  // Función para reemplazar keys {{key}} por valores reales
  const replaceKeys = (text: string, context: any): string => {
    if (!text) return '';

    // Reemplaza todas las llaves dobles {{key}} por sus valores
    return text.replace(/\{\{([\w.]+)\}\}/g, (match: string, key: string) => {
      // NPC object keys (npc.name, npc.description, etc.)
      if (key.startsWith('npc.')) {
        const npcKey = key.replace('npc.', '');
        if (npcKey === 'name' || npcKey === 'nombre') return context.npc?.card?.data?.name || context.npc?.card?.name || '';
        if (npcKey === 'description' || npcKey === 'descripcion') return context.npc?.card?.data?.description || context.npc?.card?.description || '';
        if (npcKey === 'personality' || npcKey === 'personalidad') return context.npc?.card?.data?.personality || '';
        if (npcKey === 'scenario') return context.npc?.card?.data?.scenario || '';
      }

      // NPC keys
      if (key === 'npcid' || key === 'npc_name' || key === 'npc.name' || key === 'npc') {
        return context.npc?.card?.data?.name || context.npc?.card?.name || '';
      }
      if (key === 'npc_description' || key === 'npc.description') {
        return context.npc?.card?.data?.description || context.npc?.card?.description || '';
      }
      if (key === 'npc_personality' || key === 'npc.personality') {
        return context.npc?.card?.data?.personality || '';
      }

      // Player keys (nombre, playername, player_name)
      if (key === 'playername' || key === 'player_name' || key === 'nombre') {
        return context.jugador?.nombre || '';
      }
      if (key === 'player_race' || key === 'player_raza' || key === 'raza') {
        return context.jugador?.raza || '';
      }
      if (key === 'player_level' || key === 'player_nivel' || key === 'nivel') {
        return context.jugador?.nivel || '';
      }
      if (key === 'player_health' || key === 'player_salud' || key === 'salud_actual' || key === 'salud') {
        return context.jugador?.salud_actual || '';
      }
      if (key === 'player_reputation' || key === 'player_reputacion' || key === 'reputacion' || key === 'reputación') {
        return context.jugador?.reputacion || '';
      }
      if (key === 'player_time' || key === 'player_hora' || key === 'hora') {
        return context.jugador?.hora || '';
      }
      if (key === 'player_weather' || key === 'player_clima' || key === 'clima') {
        return context.jugador?.clima || '';
      }
      if (key === 'almakos') {
        return context.jugador?.almakos || '';
      }
      if (key === 'deuda') {
        return context.jugador?.deuda || '';
      }
      if (key === 'piedras_del_alma' || key === 'piedras') {
        return context.jugador?.piedras_del_alma || '';
      }

      // Jugador object keys (jugador.nombre, jugador.raza, etc.)
      if (key.startsWith('jugador.')) {
        const jugadorKey = key.replace('jugador.', '');
        if (jugadorKey === 'nombre') return context.jugador?.nombre || '';
        if (jugadorKey === 'raza') return context.jugador?.raza || '';
        if (jugadorKey === 'nivel') return context.jugador?.nivel || '';
        if (jugadorKey === 'salud_actual' || jugadorKey === 'salud') return context.jugador?.salud_actual || '';
        if (jugadorKey === 'reputacion' || jugadorKey === 'reputación') return context.jugador?.reputacion || '';
        if (jugadorKey === 'hora') return context.jugador?.hora || '';
        if (jugadorKey === 'clima') return context.jugador?.clima || '';
        if (jugadorKey === 'almakos') return context.jugador?.almakos || '';
        if (jugadorKey === 'deuda') return context.jugador?.deuda || '';
        if (jugadorKey === 'piedras_del_alma' || jugadorKey === 'piedras') return context.jugador?.piedras_del_alma || '';
      }

      // Location keys
      if (key === 'world_name' || key === 'mundo_nombre' || key === 'mundo') {
        return context.world?.name || '';
      }
      if (key === 'pueblo_name' || key === 'pueblo') {
        return context.pueblo?.name || '';
      }
      if (key === 'edificio_name' || key === 'edificio') {
        return context.edificio?.name || '';
      }

      // Si la key no existe, retorna el match original
      return match;
    });
  };

  const sendRequest = async (triggerType: string, payload: any) => {
    try {
      const res = await fetch('/api/reroute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: triggerType.replace('_', '_'),
          ...payload
        })
      });

      const data = await res.json();

      setResponse({
        request: payload,
        response: data,
        timestamp: new Date().toISOString()
      });

      setResponseDialogOpen(true);

      if (data.success) {
        toast({
          title: 'Éxito',
          description: `Trigger "${triggerType}" ejecutado correctamente`
        });
        fetchData(); // Refresh to get updated data
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Error en la respuesta',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error sending request:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar la petición',
        variant: 'destructive'
      });
    }
  };

  const buildChatPreview = (payload: any): { text: string; sections: Array<{ label: string; content: string; bgColor: string }> } => {
    if (!payload) return { text: '', sections: [] };

    const npc = npcs.find(n => n.id === payload.npcid);
    const world = worlds.find(w => w.id === npc?.location?.worldId);
    const pueblo = pueblos.find(p => p.id === npc?.location?.puebloId);
    const edificio = edificios.find(e => e.id === npc?.location?.edificioId);
    const session = sessions.find(s => s.id === payload.sessionid);

    // Crear contexto para reemplazo de keys
    const keyContext = {
      npc,
      world,
      pueblo,
      edificio,
      jugador: payload.jugador
    };

    const sections: Array<{ label: string; content: string; bgColor: string }> = [];
    let prompt = '';

    // 1. Instrucción inicial
    const instruction = `Escribe ÚNICAMENTE la próxima respuesta de {{npc.name}} en reacción al último mensaje de {{jugador.nombre}}.`;
    const instructionText = replaceKeys(instruction, keyContext);
    prompt += `${instructionText}\n\n`;
    sections.push({
      label: 'Instrucción',
      content: instructionText,
      bgColor: 'bg-blue-50 dark:bg-blue-950'
    });

    // 2. Mainprompt (de la card del NPC)
    const mainPrompt = npc?.card?.data?.system_prompt || npc?.card?.system_prompt || '';
    if (mainPrompt) {
      const mainPromptText = replaceKeys(mainPrompt, keyContext);
      prompt += `${mainPromptText}\n\n`;
      sections.push({
        label: 'Main Prompt',
        content: mainPromptText,
        bgColor: 'bg-green-50 dark:bg-green-950'
      });
    }

    // 3. Descripción (de la card del NPC)
    const description = npc?.card?.data?.description || npc?.card?.description || '';
    if (description) {
      const descriptionText = replaceKeys(description, keyContext);
      prompt += `${descriptionText}\n\n`;
      sections.push({
        label: 'Descripción',
        content: descriptionText,
        bgColor: 'bg-emerald-50 dark:bg-emerald-950'
      });
    }

    // 3.1 Personalidad (de la card del NPC)
    const personality = npc?.card?.data?.personality || '';
    if (personality) {
      const personalityText = replaceKeys(personality, keyContext);
      prompt += `${personalityText}\n\n`;
      sections.push({
        label: 'Personalidad',
        content: personalityText,
        bgColor: 'bg-teal-50 dark:bg-teal-950'
      });
    }

    // 4. World Lore (Mundo, Pueblo, Edificio)
    let worldLoreText = '';
    if (world?.lore) {
      if (world.lore.estado_mundo) {
        worldLoreText += `Estado del Mundo: ${world.lore.estado_mundo}\n`;
      }
      if (world.lore.rumores && world.lore.rumores.length > 0) {
        worldLoreText += 'Rumores:\n';
        world.lore.rumores.forEach((rumor: string, idx: number) => {
          worldLoreText += `  - ${rumor}\n`;
        });
      }
    }

    if (worldLoreText) {
      const worldName = world?.name || 'Mundo';
      prompt += `Mundo: ${worldName}\n${worldLoreText}\n`;
      sections.push({
        label: `Mundo: ${worldName}`,
        content: `Mundo: ${worldName}\n${worldLoreText}`,
        bgColor: 'bg-yellow-50 dark:bg-yellow-950'
      });
    }

    // Pueblo Lore
    let puebloLoreText = '';
    if (pueblo?.lore) {
      if (pueblo.lore.estado_pueblo) {
        puebloLoreText += `Estado del Pueblo: ${pueblo.lore.estado_pueblo}\n`;
      }
      if (pueblo.lore.rumores && pueblo.lore.rumores.length > 0) {
        puebloLoreText += 'Rumores:\n';
        pueblo.lore.rumores.forEach((rumor: string, idx: number) => {
          puebloLoreText += `  - ${rumor}\n`;
        });
      }
    }

    if (puebloLoreText) {
      const puebloName = pueblo?.name || 'Pueblo';
      prompt += `Pueblo: ${puebloName}\n${puebloLoreText}\n`;
      sections.push({
        label: `Pueblo: ${puebloName}`,
        content: `Pueblo: ${puebloName}\n${puebloLoreText}`,
        bgColor: 'bg-amber-50 dark:bg-amber-950'
      });
    }

    // Edificio Lore
    let edificioLoreText = '';
    if (edificio?.lore) {
      if (edificio.lore.descripcion) {
        edificioLoreText += `Descripción: ${edificio.lore.descripcion}\n`;
      }
      if (edificio.lore.eventos_recientes && Object.keys(edificio.lore.eventos_recientes).length > 0) {
        edificioLoreText += 'Eventos Recientes:\n';
        Object.entries(edificio.lore.eventos_recientes).forEach(([key, value]: [string, any]) => {
          edificioLoreText += `  - ${value}\n`;
        });
      }
      if (edificio.area) {
        edificioLoreText += `Área: Desde (${edificio.area.start?.x || 0}, ${edificio.area.start?.y || 0}, ${edificio.area.start?.z || 0}) hasta (${edificio.area.end?.x || 0}, ${edificio.area.end?.y || 0}, ${edificio.area.end?.z || 0})\n`;
      }
    }

    if (edificioLoreText) {
      const edificioName = edificio?.name || 'Edificio';
      prompt += `Edificio: ${edificioName}\n${edificioLoreText}\n`;
      sections.push({
        label: `Edificio: ${edificioName}`,
        content: `Edificio: ${edificioName}\n${edificioLoreText}`,
        bgColor: 'bg-orange-50 dark:bg-orange-950'
      });
    }

    // 5. Scenario
    if (npc?.card?.data?.scenario) {
      const scenarioText = replaceKeys(npc.card.data.scenario, keyContext);
      prompt += `${scenarioText}\n\n`;
      sections.push({
        label: 'Scenario',
        content: scenarioText,
        bgColor: 'bg-purple-50 dark:bg-purple-950'
      });
    }

    // 6. Chat Examples
    if (npc?.card?.data?.mes_example) {
      const examplesText = replaceKeys(npc.card.data.mes_example, keyContext);
      prompt += `${examplesText}\n\n`;
      sections.push({
        label: 'Chat Examples',
        content: examplesText,
        bgColor: 'bg-pink-50 dark:bg-pink-950'
      });
    }

    // 7. Template User (plantilla del jugador)
    if (chatForm.templateUser) {
      const templateUserText = replaceKeys(chatForm.templateUser, keyContext);
      prompt += `${templateUserText}\n\n`;
      sections.push({
        label: 'Template User',
        content: templateUserText,
        bgColor: 'bg-indigo-50 dark:bg-indigo-950'
      });
    }

    // 8. Chat History
    if (session && session.messages && session.messages.length > 0) {
      let chatHistoryText = '';
      session.messages.forEach((msg: any) => {
        const role = msg.role === 'user' ? 'Usuario' : 'NPC';
        chatHistoryText += `${role}: ${msg.content}\n`;
      });
      prompt += chatHistoryText + '\n';
      sections.push({
        label: 'Chat History',
        content: chatHistoryText,
        bgColor: 'bg-gray-50 dark:bg-gray-950'
      });
    }

    // 9. Last User Message (mensaje del jugador)
    let lastUserMessageText = '';
    lastUserMessageText += `Jugador: ${payload.jugador?.nombre || 'Desconocido'}\n`;
    if (payload.jugador?.raza) lastUserMessageText += `Raza: ${payload.jugador.raza}\n`;
    if (payload.jugador?.nivel) lastUserMessageText += `Nivel: ${payload.jugador.nivel}\n`;
    if (payload.jugador?.salud_actual) lastUserMessageText += `Salud: ${payload.jugador.salud_actual}\n`;
    if (payload.jugador?.reputacion) lastUserMessageText += `Reputación: ${payload.jugador.reputacion}\n`;
    if (payload.jugador?.almakos) lastUserMessageText += `Almakos: ${payload.jugador.almakos}\n`;
    if (payload.jugador?.deuda) lastUserMessageText += `Deuda: ${payload.jugador.deuda}\n`;
    if (payload.jugador?.piedras_del_alma) lastUserMessageText += `Piedras del Alma: ${payload.jugador.piedras_del_alma}\n`;
    if (payload.jugador?.hora) lastUserMessageText += `Hora: ${payload.jugador.hora}\n`;
    if (payload.jugador?.clima) lastUserMessageText += `Clima: ${payload.jugador.clima}\n`;
    if (payload.mensaje) lastUserMessageText += `\nMensaje: ${payload.mensaje}`;

    prompt += lastUserMessageText + '\n\n';
    sections.push({
      label: 'Last User Message',
      content: lastUserMessageText,
      bgColor: 'bg-slate-50 dark:bg-slate-950'
    });

    // 10. POST-HISTORY
    if (npc?.card?.data?.post_history_instructions) {
      const phiText = replaceKeys(npc.card.data.post_history_instructions, keyContext);
      prompt += `${phiText}\n\n`;
      sections.push({
        label: 'POST-HISTORY',
        content: phiText,
        bgColor: 'bg-red-50 dark:bg-red-950'
      });
    }

    return { text: prompt, sections };
  };

  const buildResumenSesionPreview = (payload: any): { text: string; sections: Array<{ label: string; content: string; bgColor: string }> } => {
    if (!payload) return { text: '', sections: [] };

    const npc = npcs.find(n => n.id === payload.npcid);
    const session = sessions.find(s => s.id === payload.sessionid);

    // Crear contexto para reemplazo de keys
    const keyContext = {
      npc
    };

    const sections: Array<{ label: string; content: string; bgColor: string }> = [];
    let prompt = '';

    // 1. System Prompt (solo de la plantilla del usuario para este tipo de trigger)
    const userSystemPrompt = resumenSesionForm.systemPrompt || '';
    if (userSystemPrompt) {
      const systemPromptText = replaceKeys(userSystemPrompt, keyContext);
      prompt += systemPromptText + '\n\n';
      sections.push({
        label: 'System Prompt',
        content: systemPromptText,
        bgColor: 'bg-green-50 dark:bg-green-950'
      });
    }

    // 2. Último Resumen (si es que lo hay)
    if (payload.lastSummary) {
      prompt += `Último Resumen:\n${payload.lastSummary}\n\n`;
      sections.push({
        label: 'Último Resumen',
        content: `Último Resumen:\n${payload.lastSummary}`,
        bgColor: 'bg-indigo-50 dark:bg-indigo-950'
      });
    }

    // 3. Historial de la Sesión (mensajes completos)
    if (session && session.messages && session.messages.length > 0) {
      let chatHistoryText = 'Historial de la Sesión:\n';
      session.messages.forEach((msg: any) => {
        const role = msg.role === 'user' ? 'Usuario' : 'NPC';
        chatHistoryText += `${role}: ${msg.content}\n`;
      });
      prompt += chatHistoryText + '\n';
      sections.push({
        label: 'Historial de la Sesión',
        content: chatHistoryText,
        bgColor: 'bg-gray-50 dark:bg-gray-950'
      });
    }

    return { text: prompt, sections };
  };

  const buildResumenNPCPreview = (payload: any): { text: string; sections: Array<{ label: string; content: string; bgColor: string }> } => {
    if (!payload) return { text: '', sections: [] };

    const npc = npcs.find(n => n.id === payload.npcid);

    // Crear contexto para reemplazo de keys
    const keyContext = {
      npc
    };

    const sections: Array<{ label: string; content: string; bgColor: string }> = [];
    let prompt = '';

    // 1. System Prompt (solo de la plantilla del usuario para este tipo de trigger)
    const userSystemPrompt = resumenNPCForm.systemPrompt || '';
    if (userSystemPrompt) {
      const systemPromptText = replaceKeys(userSystemPrompt, keyContext);
      prompt += systemPromptText + '\n\n';
      sections.push({
        label: 'System Prompt',
        content: systemPromptText,
        bgColor: 'bg-green-50 dark:bg-green-950'
      });
    }

    // 2. Todos los Resúmenes del NPC
    if (payload.allSummaries) {
      prompt += `Resúmenes del NPC:\n${payload.allSummaries}\n\n`;
      sections.push({
        label: 'Resúmenes del NPC',
        content: `Resúmenes del NPC:\n${payload.allSummaries}`,
        bgColor: 'bg-indigo-50 dark:bg-indigo-950'
      });
    }

    // 3. Información del NPC
    if (npc) {
      let npcInfoText = `NPC: ${npc.card?.data?.name || npc.card?.name || ''}\n`;
      if (npc.card?.data?.description || npc.card?.description) {
        npcInfoText += `Descripción: ${npc.card?.data?.description || npc.card?.description}\n`;
      }
      if (npc.card?.data?.personality) {
        npcInfoText += `Personalidad: ${npc.card?.data?.personality}\n`;
      }
      prompt += npcInfoText + '\n';
      sections.push({
        label: 'Información del NPC',
        content: npcInfoText,
        bgColor: 'bg-yellow-50 dark:bg-yellow-950'
      });
    }

    return { text: prompt, sections };
  };

  const chatPayload = buildChatPayload();
  const chatPromptData = buildChatPreview(chatPayload);
  const chatPrompt = chatPromptData.text;
  const chatPromptSections = chatPromptData.sections;
  const resumenSesionPayload = buildResumenSesionPayload();
  const resumenSesionPromptData = buildResumenSesionPreview(resumenSesionPayload);
  const resumenSesionPrompt = resumenSesionPromptData.text;
  const resumenSesionSections = resumenSesionPromptData.sections;
  const resumenNPCPayload = buildResumenNPCPayload();
  const resumenNPCPromptData = buildResumenNPCPreview(resumenNPCPayload);
  const resumenNPCPrompt = resumenNPCPromptData.text;
  const resumenNPCSections = resumenNPCPromptData.sections;
  const resumenEdificioPayload = buildResumenEdificioPayload();
  const nuevoLorePayload = buildNuevoLorePayload();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Router de Triggers</h2>
          <p className="text-muted-foreground">Testea y visualiza peticiones a Denizen</p>
        </div>
        <Button onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Recargar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        </div>
      ) : (
        <>
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="resumen_sesion">
              <MessageCircle className="h-4 w-4 mr-2" />
            Resumen Sesión
          </TabsTrigger>
          <TabsTrigger value="resumen_npc">
            <User className="h-4 w-4 mr-2" />
            Resumen NPC
          </TabsTrigger>
          <TabsTrigger value="resumen_edificio">
            <Building className="h-4 w-4 mr-2" />
            Resumen Edificio
          </TabsTrigger>
          <TabsTrigger value="nuevo_lore">
            <Globe className="h-4 w-4 mr-2" />
            Nuevo Lore
          </TabsTrigger>
        </TabsList>

        {/* Chat Trigger */}
        <TabsContent value="chat" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración Chat</CardTitle>
                  <CardDescription>Define los parámetros del trigger de chat</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo de Sesión</Label>
                      <Select
                        value={chatForm.sessionType}
                        onValueChange={(v: 'new' | 'exist') => setChatForm({ ...chatForm, sessionType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Nueva</SelectItem>
                          <SelectItem value="exist">Existente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>NPC</Label>
                      <Select
                        value={chatForm.npcid}
                        onValueChange={(v) => setChatForm({ ...chatForm, npcid: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona NPC" />
                        </SelectTrigger>
                        <SelectContent>
                          {npcs.map((npc) => (
                            <SelectItem key={npc.id} value={npc.id}>
                              {npc.card.data?.name || npc.card.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {chatForm.sessionType === 'exist' && (
                    <div>
                      <Label>ID de Sesión</Label>
                      <Select
                        value={chatForm.playersessionid}
                        onValueChange={(v) => setChatForm({ ...chatForm, playersessionid: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona sesión" />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.filter(s => s.npcId === chatForm.npcid).map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.id.slice(-8)} ({session.messages.length} msgs)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Datos del Jugador</CardTitle>
                  <CardDescription>Información del personaje del jugador</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        value={chatForm.jugador.nombre}
                        onChange={(e) => setChatForm({ ...chatForm, jugador: { ...chatForm.jugador, nombre: e.target.value } })}
                        placeholder="Nombre del jugador"
                      />
                    </div>
                    <div>
                      <Label>Raza</Label>
                      <Input
                        value={chatForm.jugador.raza}
                        onChange={(e) => setChatForm({ ...chatForm, jugador: { ...chatForm.jugador, raza: e.target.value } })}
                        placeholder="Ej: Humano, Elfo, etc."
                      />
                    </div>
                    <div>
                      <Label>Nivel</Label>
                      <Input
                        value={chatForm.jugador.nivel}
                        onChange={(e) => setChatForm({ ...chatForm, jugador: { ...chatForm.jugador, nivel: e.target.value } })}
                        placeholder="Nivel del jugador"
                      />
                    </div>
                    <div>
                      <Label>Almakos</Label>
                      <Input
                        value={chatForm.jugador.almakos}
                        onChange={(e) => setChatForm({ ...chatForm, jugador: { ...chatForm.jugador, almakos: e.target.value } })}
                        placeholder="Cantidad de almakos"
                      />
                    </div>
                    <div>
                      <Label>Deuda</Label>
                      <Input
                        value={chatForm.jugador.deuda}
                        onChange={(e) => setChatForm({ ...chatForm, jugador: { ...chatForm.jugador, deuda: e.target.value } })}
                        placeholder="Deuda actual"
                      />
                    </div>
                    <div>
                      <Label>Piedras del Alma</Label>
                      <Input
                        value={chatForm.jugador.piedras_del_alma}
                        onChange={(e) => setChatForm({ ...chatForm, jugador: { ...chatForm.jugador, piedras_del_alma: e.target.value } })}
                        placeholder="Piedras del alma"
                      />
                    </div>
                    <div>
                      <Label>Salud Actual</Label>
                      <Input
                        value={chatForm.jugador.salud_actual}
                        onChange={(e) => setChatForm({ ...chatForm, jugador: { ...chatForm.jugador, salud_actual: e.target.value } })}
                        placeholder="Salud actual"
                      />
                    </div>
                    <div>
                      <Label>Reputación</Label>
                      <Input
                        value={chatForm.jugador.reputacion}
                        onChange={(e) => setChatForm({ ...chatForm, jugador: { ...chatForm.jugador, reputacion: e.target.value } })}
                        placeholder="Reputación"
                      />
                    </div>
                    <div>
                      <Label>Hora</Label>
                      <Input
                        value={chatForm.jugador.hora}
                        onChange={(e) => setChatForm({ ...chatForm, jugador: { ...chatForm.jugador, hora: e.target.value } })}
                        placeholder="Ej: 14:30, atardecer, etc."
                      />
                    </div>
                    <div>
                      <Label>Clima</Label>
                      <Input
                        value={chatForm.jugador.clima}
                        onChange={(e) => setChatForm({ ...chatForm, jugador: { ...chatForm.jugador, clima: e.target.value } })}
                        placeholder="Ej: soleado, lluvioso, etc."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Template User</CardTitle>
                      <CardDescription>Plantilla estándar del usuario (se usa en todas las interacciones con NPCs). Usa las variables disponibles en el glosario.</CardDescription>
                    </div>
                    {templateSaved && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <RefreshCw className="h-3 w-3" />
                        Guardado
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={chatForm.templateUser}
                    onChange={(e) => setChatForm({ ...chatForm, templateUser: e.target.value })}
                    placeholder="Ej: Eres un guerrero de nivel {{jugador.nivel}} de raza {{jugador.raza}} llamado {{jugador.nombre}}. Tu salud actual es {{jugador.salud_actual}} y estás en {{edificio}}."
                    rows={6}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveTemplate}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Guardar Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        localStorage.removeItem('userTemplate');
                        setChatForm(prev => ({ ...prev, templateUser: '' }));
                        setTemplateSaved(false);
                        toast({
                          title: 'Template Eliminado',
                          description: 'El template del usuario ha sido eliminado'
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mensaje del Jugador</CardTitle>
                  <CardDescription>Último mensaje enviado por el jugador (context por mensaje)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={chatForm.mensaje}
                    onChange={(e) => setChatForm({ ...chatForm, mensaje: e.target.value })}
                    placeholder="Escribe el mensaje del jugador..."
                    rows={3}
                  />

                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Glosario de Variables Disponibles
                    </h4>
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="font-semibold text-foreground mb-1">Variables del Jugador:</p>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}jugador.nombre{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}jugador.raza{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}jugador.nivel{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}jugador.salud_actual{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}jugador.reputacion{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}jugador.almakos{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}jugador.deuda{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}jugador.piedras_del_alma{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}jugador.hora{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}jugador.clima{KEY_EXAMPLE_2}</span>
                        </div>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">Variables del NPC:</p>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.name{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.description{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.personality{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.scenario{KEY_EXAMPLE_2}</span>
                        </div>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">Variables de Ubicación:</p>
                        <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificio{KEY_EXAMPLE_2}</span>
                        </div>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">Variables Abreviadas:</p>
                        <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}nombre{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}raza{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}nivel{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}salud{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}playername{KEY_EXAMPLE_2}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Visualizador de Prompt
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {countTokens(chatPrompt)} tokens / {countWords(chatPrompt)} palabras
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {chatPromptSections.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          Selecciona un NPC y completa los campos para ver el prompt
                        </div>
                      ) : (
                        chatPromptSections.map((section, index) => (
                          <div key={index} className={`rounded-lg border ${section.bgColor}`}>
                            <div className="border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 px-3 py-2">
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {section.label}
                              </span>
                            </div>
                            <pre className="text-sm p-4 whitespace-pre-wrap overflow-x-auto">
                              {section.content}
                            </pre>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  {chatPrompt && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(chatPrompt, 'Prompt copiado')}
                      >
                        {copied ? <RefreshCw className="h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        {copied ? 'Copiado' : 'Copiar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(chatPayload?.context ? {...chatPayload, context: null} : chatPayload, null, 2), 'JSON copiado')}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Copiar JSON
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      JSON de Request (Completo)
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {countTokens(JSON.stringify(chatPayload || {}, null, 2))} tokens
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      {JSON.stringify(chatPayload || {}, null, 2) || '{}'}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={() => chatPayload && sendRequest('chat', chatPayload)}
                disabled={!chatPayload || !chatPayload.npcid || (chatForm.sessionType === 'exist' && !chatForm.playersessionid)}
              >
                <Send className="h-5 w-5 mr-2" />
                Enviar Trigger de Chat
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Resumen Sesión Trigger */}
        <TabsContent value="resumen_sesion" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Resumen</CardTitle>
                <CardDescription>Selecciona NPC y sesión para generar el resumen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>NPC</Label>
                    <Select
                      value={resumenSesionForm.npcid}
                      onValueChange={(v) => setResumenSesionForm({ ...resumenSesionForm, npcid: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona NPC" />
                      </SelectTrigger>
                      <SelectContent>
                        {npcs.map((npc) => (
                          <SelectItem key={npc.id} value={npc.id}>
                            {npc.card.data?.name || npc.card.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sesión</Label>
                    <Select
                      value={resumenSesionForm.sessionid}
                      onValueChange={(v) => setResumenSesionForm({ ...resumenSesionForm, sessionid: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona sesión" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.filter(s => s.npcId === resumenSesionForm.npcid).map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.id.slice(-8)} ({session.messages.length} msgs)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>System Prompt</Label>
                  <Textarea
                    value={resumenSesionForm.systemPrompt}
                    onChange={(e) => setResumenSesionForm({ ...resumenSesionForm, systemPrompt: e.target.value })}
                    placeholder="Instrucciones para generar el resumen (puedes usar {{npc.name}}, {{mundo}}, {{pueblo}}, {{edificio}}, etc.)"
                    rows={6}
                  />
                </div>

                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Glosario de Variables Disponibles
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables del NPC:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.name{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.description{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.personality{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.scenario{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables de Ubicación:</p>
                      <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificio{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables Abreviadas:</p>
                      <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npcid{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}playername{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveResumenSesionTemplate}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Guardar Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem('resumenSesionTemplate');
                      setResumenSesionForm(prev => ({ ...prev, systemPrompt: '' }));
                      setResumenSesionTemplateSaved(false);
                      toast({
                        title: 'Template Eliminado',
                        description: 'El template de resumen de sesión ha sido eliminado'
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  className="w-full"
                  onClick={() => resumenSesionPayload && sendRequest('resumen_sesion', resumenSesionPayload)}
                  disabled={!resumenSesionPayload.npcid || !resumenSesionForm.sessionid}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Generar Resumen de Sesión
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Visualizador de Prompt
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {resumenSesionTemplateSaved && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <RefreshCw className="h-3 w-3" />
                        Guardado
                      </div>
                    )}
                    <Badge variant="secondary">
                      {countTokens(resumenSesionPrompt)} tokens / {countWords(resumenSesionPrompt)} palabras
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {resumenSesionSections.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          Selecciona un NPC y una sesión para ver el prompt
                        </div>
                      ) : (
                        resumenSesionSections.map((section, index) => (
                          <div key={index} className={`rounded-lg border ${section.bgColor}`}>
                            <div className="border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 px-3 py-2">
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {section.label}
                              </span>
                            </div>
                            <pre className="text-sm p-4 whitespace-pre-wrap overflow-x-auto">
                              {section.content}
                            </pre>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  {resumenSesionPrompt && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(resumenSesionPrompt, 'Prompt copiado')}
                      >
                        {copied ? <RefreshCw className="h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        {copied ? 'Copiado' : 'Copiar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(resumenSesionPayload, null, 2), 'JSON copiado')}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Copiar JSON
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      JSON de Request
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {countTokens(JSON.stringify(resumenSesionPayload || {}, null, 2))} tokens
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      {JSON.stringify(resumenSesionPayload || {}, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Resumen NPC Trigger */}
        <TabsContent value="resumen_npc" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Resumen NPC</CardTitle>
                <CardDescription>Genera un resumen consolidado de las interacciones del NPC</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>NPC</Label>
                  <Select
                    value={resumenNPCForm.npcid}
                    onValueChange={(v) => setResumenNPCForm({ ...resumenNPCForm, npcid: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona NPC" />
                    </SelectTrigger>
                    <SelectContent>
                      {npcs.map((npc) => (
                        <SelectItem key={npc.id} value={npc.id}>
                          {npc.card.data?.name || npc.card.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>System Prompt</Label>
                    {resumenNPCTemplateSaved && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <RefreshCw className="h-3 w-3" />
                        Guardado
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={resumenNPCForm.systemPrompt}
                    onChange={(e) => setResumenNPCForm({ ...resumenNPCForm, systemPrompt: e.target.value })}
                    placeholder="Instrucciones para generar el resumen del NPC (puedes usar {{npc.name}}, {{npc.description}}, {{npc.personality}}, etc.)"
                    rows={6}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveResumenNPCTemplate}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Guardar Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        localStorage.removeItem('resumenNPCTemplate');
                        setResumenNPCForm(prev => ({ ...prev, systemPrompt: '' }));
                        setResumenNPCTemplateSaved(false);
                        toast({
                          title: 'Template Eliminado',
                          description: 'El system prompt de resumen NPC ha sido eliminado'
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Todos los Resúmenes del NPC</Label>
                  <Textarea
                    value={resumenNPCForm.allSummaries}
                    onChange={(e) => setResumenNPCForm({ ...resumenNPCForm, allSummaries: e.target.value })}
                    placeholder="Pega aquí todos los resúmenes previos del NPC..."
                    rows={6}
                  />
                </div>

                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Glosario de Variables Disponibles
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables del NPC:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.name{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.description{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.personality{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.scenario{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables de Ubicación:</p>
                      <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificio{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables Abreviadas:</p>
                      <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npcid{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc_name{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Visualizador de Prompt
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {countTokens(resumenNPCPrompt)} tokens / {countWords(resumenNPCPrompt)} palabras
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {resumenNPCSections.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          Selecciona un NPC y completa los campos para ver el prompt
                        </div>
                      ) : (
                        resumenNPCSections.map((section, index) => (
                          <div key={index} className={`rounded-lg border ${section.bgColor}`}>
                            <div className="border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 px-3 py-2">
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {section.label}
                              </span>
                            </div>
                            <pre className="text-sm p-4 whitespace-pre-wrap overflow-x-auto">
                              {section.content}
                            </pre>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  {resumenNPCSections.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(resumenNPCPrompt, 'Prompt copiado')}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {copied ? 'Copiado' : 'Copiar'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      JSON de Request
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {countTokens(JSON.stringify(resumenNPCPayload || {}, null, 2))} tokens
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      {JSON.stringify(resumenNPCPayload || {}, null, 2) || '{}'}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={() => resumenNPCPayload && sendRequest('resumen_npc', resumenNPCPayload)}
                disabled={!resumenNPCForm.npcid || !resumenNPCForm.allSummaries}
              >
                <Send className="h-5 w-5 mr-2" />
                Generar Resumen de NPC
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Resumen Edificio Trigger */}
        <TabsContent value="resumen_edificio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Edificio</CardTitle>
              <CardDescription>Genera un resumen basado en los resúmenes de NPCs del edificio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Edificio</Label>
                <Select
                  value={resumenEdificioForm.edificioid}
                  onValueChange={(v) => setResumenEdificioForm({ ...resumenEdificioForm, edificioid: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona edificio" />
                  </SelectTrigger>
                  <SelectContent>
                    {edificios.map((edificio) => (
                      <SelectItem key={edificio.id} value={edificio.id}>
                        {edificio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>System Prompt</Label>
                <Textarea
                  value={resumenEdificioForm.systemPrompt}
                  onChange={(e) => setResumenEdificioForm({ ...resumenEdificioForm, systemPrompt: e.target.value })}
                  placeholder="Instrucciones adicionales (puedes usar {KEY_EXAMPLE_1}npcid{KEY_EXAMPLE_2} y {KEY_EXAMPLE_1}playername{KEY_EXAMPLE_2}, etc.)"
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => resumenEdificioPayload && sendRequest('resumen_npc', { triggertype: 'resumen_edificio', ...resumenEdificioPayload })}
                disabled={!resumenEdificioForm.edificioid}
              >
                <Send className="h-4 w-4 mr-2" />
                Generar Resumen de Edificio
              </Button>

              {resumenEdificioPayload && (
                <div className="mt-4">
                  <Label>JSON Preview:</Label>
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(resumenEdificioPayload, null, 2)}
                  </pre>
                  <Badge variant="secondary" className="mt-2">
                    {countTokens(JSON.stringify(resumenEdificioPayload, null, 2))} tokens
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nuevo Lore Trigger */}
        <TabsContent value="nuevo_lore" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nuevo Lore</CardTitle>
              <CardDescription>Añade lore narrativo al mundo, pueblo o edificio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Alcance</Label>
                <Select
                  value={nuevoLoreForm.scope}
                  onValueChange={(v: 'mundo' | 'pueblo' | 'edificio') => {
                    setNuevoLoreForm({ ...nuevoLoreForm, scope: v, mundoid: '', pueblid: '', edificioid: '', loreType: '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mundo">Mundo</SelectItem>
                    <SelectItem value="pueblo">Pueblo</SelectItem>
                    <SelectItem value="edificio">Edificio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {nuevoLoreForm.scope === 'mundo' && (
                <div>
                  <Label>Mundo</Label>
                  <Select
                    value={nuevoLoreForm.mundoid}
                    onValueChange={(v) => setNuevoLoreForm({ ...nuevoLoreForm, mundoid: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona mundo" />
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
              )}

              {nuevoLoreForm.scope === 'pueblo' && (
                <div>
                  <Label>Pueblo</Label>
                  <Select
                    value={nuevoLoreForm.pueblid}
                    onValueChange={(v) => setNuevoLoreForm({ ...nuevoLoreForm, pueblid: v, mundoid: pueblos.find(p => p.id === nuevoLoreForm.pueblid)?.worldId || '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona pueblo" />
                    </SelectTrigger>
                    <SelectContent>
                      {pueblos.map((pueblo) => (
                        <SelectItem key={pueblo.id} value={pueblo.id}>
                          {pueblo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
              )}

              {nuevoLoreForm.scope === 'edificio' && (
                <div>
                  <Label>Edificio</Label>
                  <Select
                    value={nuevoLoreForm.edificioid}
                    onValueChange={(v) => setNuevoLoreForm({ ...nuevoLoreForm, edificioid: v, pueblid: pueblos.find(p => p.id === nuevoLoreForm.pueblid)?.worldId || '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona edificio" />
                    </SelectTrigger>
                    <SelectContent>
                      {edificios.map((edificio) => (
                        <SelectItem key={edificio.id} value={edificio.id}>
                          {edificio.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Tipo de Lore</Label>
                <Select
                  value={nuevoLoreForm.loreType}
                  onValueChange={(v: string) => setNuevoLoreForm({ ...nuevoLoreForm, loreType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de lore" />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rumores">Rumores</SelectItem>
                      <SelectItem value="estado_mundo">Estado Mundo</SelectItem>
                      <SelectItem value="estado_pueblo">Estado Pueblo</SelectItem>
                      <SelectItem value="descripcion">Descripción Edificio</SelectItem>
                      <SelectItem value="nuevo_evento">Nuevo Evento</SelectItem>
                      <SelectItem value="nuevo_item">Nuevo Ítem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                <Label>Contexto</Label>
                <Textarea
                  value={nuevoLoreForm.context}
                  onChange={(e) => setNuevoLoreForm({ ...nuevoLoreForm, context: e.target.value })}
                  placeholder="Ej: Una batalla reciente en las afueras de Meslajho..."
                  rows={4}
                />
              </div>

              <div>
                <Label>System Prompt</Label>
                <Textarea
                  value={nuevoLoreForm.systemPrompt}
                  onChange={(e) => setNuevoLoreForm({ ...nuevoLoreForm, systemPrompt: e.target.value })}
                  placeholder="Instrucciones adicionales (puedes usar {KEY_EXAMPLE_1}npcid{KEY_EXAMPLE_2} y {KEY_EXAMPLE_1}playername{KEY_EXAMPLE_2}, etc.)"
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => nuevoLorePayload && sendRequest('nuevo_lore', nuevoLorePayload)}
                disabled={!(
                  (nuevoLoreForm.scope === 'mundo' && nuevoLoreForm.mundoid) ||
                  (nuevoLoreForm.scope === 'pueblo' && nuevoLoreForm.pueblid) ||
                  (nuevoLoreForm.scope === 'edificio' && nuevoLoreForm.edificioid)
                )}
              >
                <Send className="h-4 w-4 mr-2" />
                Generar Nuevo Lore
              </Button>

              {nuevoLorePayload && nuevoLoreForm.scope !== 'mundo' && (
                <div className="mt-4">
                  <Label>JSON Preview:</Label>
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(nuevoLorePayload, null, 2)}
                  </pre>
                  <Badge variant="secondary" className="mt-2">
                    {countTokens(JSON.stringify(nuevoLorePayload, null, 2))} tokens
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Respuesta del Trigger</DialogTitle>
              <DialogDescription>
                Respuesta recibida del servidor
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Request</h3>
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(response?.request, null, 2)}
                  </pre>
                  <Badge variant="secondary" className="mt-2">
                    {response?.request ? countTokens(JSON.stringify(response.request, null, 2)) : 0} tokens
                  </Badge>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Response</h3>
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(response?.response, null, 2)}
                  </pre>
                  <Badge variant={response?.response?.success ? 'default' : 'destructive'} className="mt-2">
                    {response?.response?.success ? countTokens(JSON.stringify(response.response, null, 2)) : 0} tokens
                  </Badge>
                </div>

                {response?.timestamp && (
                  <div className="text-xs text-muted-foreground">
                    Timestamp: {new Date(response.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(JSON.stringify(response, null, 2), 'Respuesta copiada')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Respuesta Completa
              </Button>
              <Button onClick={() => setResponseDialogOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </>
      )}
    </div>
  );
}
