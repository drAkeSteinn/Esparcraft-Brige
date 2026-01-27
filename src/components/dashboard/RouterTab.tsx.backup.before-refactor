'use client';

import { useState, useEffect, useMemo } from 'react';
import { Send, RefreshCw, Network, MessageSquare, Globe, MapPin, Building, User, Eye, MessageCircle, FileText, Copy, Trash2, Terminal } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { World, Pueblo, Edificio, NPC, Session, GrimorioCard } from '@/lib/types';
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
  const [resumenSesionTemplateSaved, setResumenSesionTemplateSaved] = useState(false);
  const [resumenNPCTemplateSaved, setResumenNPCTemplateSaved] = useState(false);
  const [resumenEdificioTemplateSaved, setResumenEdificioTemplateSaved] = useState(false);
  const [resumenPuebloTemplateSaved, setResumenPuebloTemplateSaved] = useState(false);
  const [resumenMundoTemplateSaved, setResumenMundoTemplateSaved] = useState(false);

  // Plantillas de Grimorio
  const [grimorioCards, setGrimorioCards] = useState<GrimorioCard[]>([]);
  const [plantillaRows, setPlantillaRows] = useState<Array<{
    enabled: boolean;
    templateKey?: string;
    section: string;
  }>>([]);
  const [plantillaConfigSaved, setPlantillaConfigSaved] = useState(false);

  // Secciones disponibles del prompt
  const PROMPT_SECTIONS = [
    { id: '1', name: 'Instrucción Inicial' },
    { id: '2', name: 'MAIN PROMPT' },
    { id: '3', name: 'DESCRIPCIÓN' },
    { id: '4', name: 'PERSONALIDAD' },
    { id: '5', name: 'ESCENARIO' },
    { id: '6', name: 'EJEMPLOS DE CHAT' },
    { id: '7', name: 'LAST USER MESSAGE' },
    { id: '8', name: 'INSTRUCCIONES POST-HISTORY' }
  ];

  // Estado para almacenar las sesiones con resúmenes del NPC seleccionado
  const [npcSessionSummaries, setNpcSessionSummaries] = useState<any[]>([]);

  // Estado para almacenar los resúmenes de NPCs del edificio seleccionado
  const [edificioNPCSummaries, setEdificioNPCSummaries] = useState<any[]>([]);

  // Estado para almacenar los resúmenes de edificios del pueblo seleccionado
  const [puebloEdificioSummaries, setPuebloEdificioSummaries] = useState<any[]>([]);

  // Estado para almacenar los resúmenes de pueblos del mundo seleccionado
  const [mundoPuebloSummaries, setMundoPuebloSummaries] = useState<any[]>([]);

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
    historyLimit: 10, // Número de mensajes del historial a enviar
    lastSummary: '' // Último resumen de la sesión (si existe)
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
    allSummaries: '', // NUEVO: Todos los resúmenes de NPCs del edificio
    systemPrompt: ''
  });

  // Resumen Pueblo/Nación trigger form
  const [resumenPuebloForm, setResumenPuebloForm] = useState({
    pueblid: '',
    allSummaries: '', // Resúmenes de todos los edificios del pueblo/nación
    systemPrompt: ''
  });

  // Resumen Mundo trigger form
  const [resumenMundoForm, setResumenMundoForm] = useState({
    mundoid: '',
    allSummaries: '', // Resúmenes de todos los pueblos/naciones del mundo
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

  // Cargar plantillas de Grimorio de tipo 'plantilla' y configuración guardada
  useEffect(() => {
    const loadGrimorioCards = async () => {
      try {
        const response = await fetch('/api/grimorio');
        const result = await response.json();

        if (result.success && result.data.cards) {
          // Filtrar solo plantillas de tipo 'plantilla'
          const plantillaCards = result.data.cards.filter((card: GrimorioCard) => card.tipo === 'plantilla');
          setGrimorioCards(plantillaCards);

          // Siempre inicializar filas por defecto para todas las secciones
          const defaultRows: Array<{ enabled: boolean; templateKey: string | undefined; section: string }> = [];
          PROMPT_SECTIONS.forEach(section => {
            defaultRows.push({
              enabled: false,
              templateKey: undefined,
              section: section.id
            });
          });

          console.log('[loadGrimorioCards] defaultRows creadas:', defaultRows.length);
          console.log('[loadGrimorioCards] plantillaCards cargadas:', plantillaCards.length);

          // Cargar configuración guardada y merge con filas por defecto
          try {
            const configResponse = await fetch('/api/chat-trigger-config');
            const configResult = await configResponse.json();

            console.log('[loadGrimorioCards] ConfigResponse:', configResult);

            if (configResult.success && configResult.data.grimorioTemplates && configResult.data.grimorioTemplates.length > 0) {
              // Merge: actualizar las filas por defecto con la configuración guardada
              const mergedRows = defaultRows.map(defaultRow => {
                const savedRow = configResult.data.grimorioTemplates.find((r: any) => r.section === defaultRow.section);
                if (savedRow) {
                  return savedRow;
                }
                return defaultRow;
              });
              console.log('[loadGrimorioCards] mergedRows:', mergedRows);
              setPlantillaRows(mergedRows);
              setPlantillaConfigSaved(true);
            } else {
              // Si no hay configuración guardada, usar filas por defecto
              console.log('[loadGrimorioCards] Usando defaultRows');
              setPlantillaRows(defaultRows);
            }
          } catch (configError) {
            console.error('Error cargando configuración de plantillas:', configError);
            // Inicializar con valores por defecto
            console.log('[loadGrimorioCards] Error, usando defaultRows');
            setPlantillaRows(defaultRows);
          }
        }
      } catch (error) {
        console.error('Error cargando plantillas de Grimorio:', error);
      }
    };

    loadGrimorioCards();
  }, []);

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

  // Cargar resumen de sesión cuando se selecciona una sesión en Resumen Sesión
  useEffect(() => {
    const loadSessionSummary = async () => {
      if (resumenSesionForm.sessionid) {
        try {
          const response = await fetch(`/api/sessions/${resumenSesionForm.sessionid}/summary`);
          const result = await response.json();
          if (result.success) {
            setResumenSesionForm(prev => ({
              ...prev,
              lastSummary: result.data?.summary || ''
            }));
          }
        } catch (error) {
          console.error('Error loading session summary:', error);
        }
      } else {
        // Limpiar resumen si no hay sesión seleccionada
        setResumenSesionForm(prev => ({ ...prev, lastSummary: '' }));
      }
    };
    loadSessionSummary();
  }, [resumenSesionForm.sessionid]);

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

  // Cargar resúmenes de sesiones del NPC automáticamente cuando se selecciona un NPC
  useEffect(() => {
    const loadNPCSessionSummaries = async () => {
      if (resumenNPCForm.npcid) {
        try {
          const response = await fetch(`/api/npcs/${resumenNPCForm.npcid}/session-summaries`);
          const result = await response.json();
          if (result.success && result.data.sessions.length > 0) {
            // Guardar las sesiones con resúmenes
            setNpcSessionSummaries(result.data.sessions);
            
            // Construir string con todos los resúmenes numerados
            const summariesText = result.data.sessions
              .map((s: any, index: number) => 
                `=== Sesión ${index + 1} (${s.sessionId}) ===\n${s.summary}`
              )
              .join('\n\n');
            setResumenNPCForm(prev => ({
              ...prev,
              allSummaries: summariesText
            }));
          } else {
            // Limpiar si no hay resúmenes
            setNpcSessionSummaries([]);
            setResumenNPCForm(prev => ({
              ...prev,
              allSummaries: ''
            }));
          }
        } catch (error) {
          console.error('Error loading NPC session summaries:', error);
        }
      } else {
        // Limpiar si no hay NPC seleccionado
        setNpcSessionSummaries([]);
        setResumenNPCForm(prev => ({
          ...prev,
          allSummaries: ''
        }));
      }
    };
    loadNPCSessionSummaries();
  }, [resumenNPCForm.npcid]);

  useEffect(() => {
    // Cargar System Prompt de resumen de edificio del localStorage
    const savedResumenEdificioTemplate = localStorage.getItem('resumenEdificioTemplate');
    if (savedResumenEdificioTemplate) {
      setResumenEdificioForm(prev => ({ ...prev, systemPrompt: savedResumenEdificioTemplate }));
      setResumenEdificioTemplateSaved(true);
    }
  }, []);

  useEffect(() => {
    // Guardar System Prompt de resumen de edificio en localStorage cuando cambie
    if (resumenEdificioForm.systemPrompt) {
      localStorage.setItem('resumenEdificioTemplate', resumenEdificioForm.systemPrompt);
      setResumenEdificioTemplateSaved(true);
    }
  }, [resumenEdificioForm.systemPrompt]);

  // Cargar resúmenes de NPCs del edificio automáticamente cuando se selecciona un edificio
  useEffect(() => {
    const loadEdificioNPCSummaries = async () => {
      if (resumenEdificioForm.edificioid) {
        try {
          const response = await fetch(`/api/edificios/${resumenEdificioForm.edificioid}/npc-summaries`);
          const result = await response.json();
          if (result.success && result.data.npcs.length > 0) {
            // Guardar los NPCs con resúmenes
            setEdificioNPCSummaries(result.data.npcs);
            
            // Construir string con todos los resúmenes numerados
            const summariesText = result.data.npcs
              .filter((n: any) => n.consolidatedSummary)
              .map((n: any, index: number) =>
                `=== NPC ${index + 1}: ${n.npcName} (ID: ${n.npcId}) ===\n${n.consolidatedSummary}`
              )
              .join('\n\n');
            setResumenEdificioForm(prev => ({
              ...prev,
              allSummaries: summariesText
            }));
          } else {
            // Limpiar si no hay resúmenes
            setEdificioNPCSummaries([]);
            setResumenEdificioForm(prev => ({
              ...prev,
              allSummaries: ''
            }));
          }
        } catch (error) {
          console.error('Error loading edificio NPC summaries:', error);
        }
      } else {
        // Limpiar si no hay edificio seleccionado
        setEdificioNPCSummaries([]);
        setResumenEdificioForm(prev => ({
          ...prev,
          allSummaries: ''
        }));
      }
    };
    loadEdificioNPCSummaries();
  }, [resumenEdificioForm.edificioid]);

  useEffect(() => {
    // Cargar System Prompt de resumen de pueblo del localStorage
    const savedResumenPuebloTemplate = localStorage.getItem('resumenPuebloTemplate');
    if (savedResumenPuebloTemplate) {
      setResumenPuebloForm(prev => ({ ...prev, systemPrompt: savedResumenPuebloTemplate }));
      setResumenPuebloTemplateSaved(true);
    }
  }, []);

  useEffect(() => {
    // Cargar System Prompt de resumen de mundo del localStorage
    const savedResumenMundoTemplate = localStorage.getItem('resumenMundoTemplate');
    if (savedResumenMundoTemplate) {
      setResumenMundoForm(prev => ({ ...prev, systemPrompt: savedResumenMundoTemplate }));
      setResumenMundoTemplateSaved(true);
    }
  }, []);

  useEffect(() => {
    // Guardar System Prompt de resumen de pueblo en localStorage cuando cambie
    if (resumenPuebloForm.systemPrompt) {
      localStorage.setItem('resumenPuebloTemplate', resumenPuebloForm.systemPrompt);
      setResumenPuebloTemplateSaved(true);
    }
  }, [resumenPuebloForm.systemPrompt]);

  // Cargar resúmenes de edificios del pueblo automáticamente cuando se selecciona un pueblo
  useEffect(() => {
    const loadPuebloEdificioSummaries = async () => {
      if (resumenPuebloForm.pueblid) {
        try {
          const response = await fetch(`/api/pueblos/${resumenPuebloForm.pueblid}/edificio-summaries`);
          const result = await response.json();
          if (result.success && result.data.edificios.length > 0) {
            // Guardar los edificios con resúmenes
            setPuebloEdificioSummaries(result.data.edificios);
            
            // Construir string con todos los resúmenes numerados
            const summariesText = result.data.edificios
              .filter((e: any) => e.consolidatedSummary)
              .map((e: any, index: number) =>
                `=== Edificio ${index + 1}: ${e.edificioName} (ID: ${e.edificioId}) ===\n${e.consolidatedSummary}`
              )
              .join('\n\n');
            setResumenPuebloForm(prev => ({
              ...prev,
              allSummaries: summariesText
            }));
          } else {
            // Limpiar si no hay resúmenes
            setPuebloEdificioSummaries([]);
            setResumenPuebloForm(prev => ({
              ...prev,
              allSummaries: ''
            }));
          }
        } catch (error) {
          console.error('Error loading pueblo edificio summaries:', error);
        }
      } else {
        // Limpiar si no hay pueblo seleccionado
        setPuebloEdificioSummaries([]);
        setResumenPuebloForm(prev => ({
          ...prev,
          allSummaries: ''
        }));
      }
    };
    loadPuebloEdificioSummaries();
  }, [resumenPuebloForm.pueblid]);

  useEffect(() => {
    // Guardar System Prompt de resumen de mundo en localStorage cuando cambie
    if (resumenMundoForm.systemPrompt) {
      localStorage.setItem('resumenMundoTemplate', resumenMundoForm.systemPrompt);
      setResumenMundoTemplateSaved(true);
    }
  }, [resumenMundoForm.systemPrompt]);

  // Cargar resúmenes de pueblos del mundo automáticamente cuando se selecciona un mundo
  useEffect(() => {
    const loadMundoPuebloSummaries = async () => {
      if (resumenMundoForm.mundoid) {
        try {
          const response = await fetch(`/api/worlds/${resumenMundoForm.mundoid}/pueblo-summaries`);
          const result = await response.json();
          if (result.success && result.data.pueblos.length > 0) {
            // Guardar los pueblos con resúmenes
            setMundoPuebloSummaries(result.data.pueblos);
            
            // Construir string con todos los resúmenes numerados
            const summariesText = result.data.pueblos
              .filter((p: any) => p.consolidatedSummary)
              .map((p: any, index: number) =>
                `=== Pueblo/Nación ${index + 1}: ${p.puebloName} (ID: ${p.puebloId}) ===\n${p.consolidatedSummary}`
              )
              .join('\n\n');
            setResumenMundoForm(prev => ({
              ...prev,
              allSummaries: summariesText
            }));
          } else {
            // Limpiar si no hay resúmenes
            setMundoPuebloSummaries([]);
            setResumenMundoForm(prev => ({
              ...prev,
              allSummaries: ''
            }));
          }
        } catch (error) {
          console.error('Error loading mundo pueblo summaries:', error);
        }
      } else {
        // Limpiar si no hay mundo seleccionado
        setMundoPuebloSummaries([]);
        setResumenMundoForm(prev => ({
          ...prev,
          allSummaries: ''
        }));
      }
    };
    loadMundoPuebloSummaries();
  }, [resumenMundoForm.mundoid]);

  // Cargar resumen de sesión cuando se selecciona una sesión existente
  useEffect(() => {
    const loadSessionSummary = async () => {
      if (chatForm.playersessionid && chatForm.sessionType === 'exist') {
        try {
          const response = await fetch(`/api/sessions/${chatForm.playersessionid}/summary`);
          const result = await response.json();
          if (result.success) {
            setChatForm(prev => ({
              ...prev,
              lastSummary: result.data?.summary || ''
            }));
          }
        } catch (error) {
          console.error('Error loading session summary:', error);
        }
      } else {
        // Limpiar resumen si no hay sesión seleccionada o es nueva sesión
        setChatForm(prev => ({ ...prev, lastSummary: '' }));
      }
    };
    loadSessionSummary();
  }, [chatForm.playersessionid, chatForm.sessionType]);

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

  const handleSaveResumenEdificioTemplate = () => {
    localStorage.setItem('resumenEdificioTemplate', resumenEdificioForm.systemPrompt);
    setResumenEdificioTemplateSaved(true);
    toast({
      title: 'Template de Resumen Edificio Guardado',
      description: 'El system prompt de resumen de edificio se ha guardado correctamente'
    });
  };

  const handleSaveResumenPuebloTemplate = () => {
    localStorage.setItem('resumenPuebloTemplate', resumenPuebloForm.systemPrompt);
    setResumenPuebloTemplateSaved(true);
    toast({
      title: 'Template de Resumen Pueblo Guardado',
      description: 'El system prompt de resumen de pueblo se ha guardado correctamente'
    });
  };

  const handleSaveResumenMundoTemplate = () => {
    localStorage.setItem('resumenMundoTemplate', resumenMundoForm.systemPrompt);
    setResumenMundoTemplateSaved(true);
    toast({
      title: 'Template de Resumen Mundo Guardado',
      description: 'El system prompt de resumen de mundo se ha guardado correctamente'
    });
  };

  const handleSavePlantillaConfig = async () => {
    try {
      const response = await fetch('/api/chat-trigger-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grimorioTemplates: plantillaRows })
      });

      const result = await response.json();

      if (result.success) {
        setPlantillaConfigSaved(true);
        toast({
          title: 'Configuración de Plantillas Guardada',
          description: 'La configuración de plantillas Grimorio se ha guardado correctamente y se usará para todos los triggers de chat'
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Error al guardar la configuración',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving plantilla config:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración de plantillas',
        variant: 'destructive'
      });
    }
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

  const generateDenizenScript = (payload: any): string => {
    if (!payload) return '';

    // Para Denizen corriendo localmente: usar puerto directo (3000)
    // Para Denizen en otra máquina: usar la IP de red con puerto 81
    const apiUrl = 'http://127.0.0.1:3000/api/v1';
    // Alternativas:
    // - http://localhost:81/api/v1 (si localhost resuelve a IPv6)
    // - http://21.0.8.121:81/api/v1 (IP de red externa)

    // Construir el script de Denizen
    let script = `- definemap headers 'Content-Type:application/json accept:application/json'\n`;
    script += `- definemap consulta:\n`;

    // Agregar mode y npcid primero
    if (payload.mode) script += `    "mode": "${payload.mode}"\n`;
    if (payload.npcid) script += `    "npcid": "${payload.npcid}"\n`;
    if (payload.playersessionid) script += `    "playersessionid": "${payload.playersessionid}"\n`;
    if (payload.message) script += `    "message": "${payload.message}"\n`;

    // Agregar jugador si existe
    if (payload.jugador) {
      script += `    "jugador":\n`;
      const jugadorKeys = ['nombre', 'raza', 'nivel', 'almakos', 'deuda', 'piedras_del_alma', 'salud_actual', 'reputacion', 'hora', 'clima'];
      jugadorKeys.forEach(key => {
        if (payload.jugador[key] !== undefined) {
          const value = typeof payload.jugador[key] === 'string'
            ? `"${payload.jugador[key]}"`
            : payload.jugador[key];
          script += `      "${key}": ${value}\n`;
        }
      });
    }

    script += `- ~webget ${apiUrl} data:<[consulta].to_json> headers:<[headers]> save:response`;

    return script;
  };

  const filteredPueblos = pueblos.filter(p => p.worldId === chatForm.npcid);
  const filteredEdificios = edificios.filter(e => e.puebloId === chatForm.npcid);

  const buildChatPayload = () => {
    const npc = npcs.find(n => n.id === chatForm.npcid);
    if (!npc) return null;

    const world = worlds.find(w => w.id === npc.location?.worldId);
    const pueblo = pueblos.find(p => p.id === npc.location?.puebloId);
    const edificio = edificios.find(e => e.id === npc.location?.edificioId);

    let playersessionid = chatForm.playersessionid;
    if (chatForm.sessionType === 'new') {
      playersessionid = undefined;
    }

    return {
      npcid: chatForm.npcid,
      playersessionid,
      jugador: chatForm.jugador,
      message: chatForm.mensaje, // Mensaje del jugador (message en lugar de mensaje)
      lastSummary: chatForm.lastSummary, // Último resumen de la sesión
      grimorioTemplates: plantillaRows, // Plantillas de Grimorio activas
      context: {
        mundo: world,
        pueblo,
        edificio
      }
    };
  };

  const buildResumenSesionPayload = () => {
    return {
      npcid: resumenSesionForm.npcid,
      playersessionid: resumenSesionForm.sessionid,
      lastSummary: resumenSesionForm.lastSummary,
      chatHistory: resumenSesionForm.chatHistory
    };
  };

  const buildResumenNPCPayload = () => {
    return {
      npcid: resumenNPCForm.npcid,
      allSummaries: resumenNPCForm.allSummaries
    };
  };

  const buildResumenEdificioPayload = () => {
    return {
      triggertype: 'resumen_edificio',
      edificioid: resumenEdificioForm.edificioid,
      allSummaries: resumenEdificioForm.allSummaries // NUEVO: Resúmenes de todos los NPCs del edificio
    };
  };

  const buildResumenPuebloPayload = () => {
    return {
      pueblid: resumenPuebloForm.pueblid,
      allSummaries: resumenPuebloForm.allSummaries // Resúmenes de todos los edificios del pueblo/nación
    };
  };

  const buildResumenMundoPayload = () => {
    return {
      mundoid: resumenMundoForm.mundoid,
      allSummaries: resumenMundoForm.allSummaries // Resúmenes de todos los pueblos/naciones del mundo
    };
  };

  const buildNuevoLorePayload = () => {
    const base = {
      scope: nuevoLoreForm.scope
    };

    if (nuevoLoreForm.scope === 'mundo') {
      return { ...base, targetId: nuevoLoreForm.mundoid };
    } else if (nuevoLoreForm.scope === 'pueblo') {
      return { ...base, targetId: nuevoLoreForm.pueblid };
    }
    return base;
  };

  // Constantes para mostrar llaves dobles en JSX
  const KEY_EXAMPLE_1 = '{' + '{';
  const KEY_EXAMPLE_2 = '}' + '}';

  // Función para reemplazar keys {{key}} por valores reales (con soporte recursivo)
  const replaceKeys = (text: string, context: any): string => {
    if (!text) return '';

    // Función auxiliar para hacer una sola pasada de reemplazo
    const replaceSinglePass = (inputText: string): string => {
      return inputText.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match: string, key: string) => {
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

        // Historial del NPC
        if (key === 'npc_historial' || key === 'npc.historial') {
          if (context.session && context.session.messages && context.session.messages.length > 0) {
            return context.session.messages.map((msg: any) => {
              const role = msg.role === 'user' ? 'Usuario' : 'NPC';
              return `${role}: ${msg.content}`;
            }).join('\n');
          }
          return '(Sin historial)';
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
          if (jugadorKey === 'mensaje') return context.mensaje || ''; // Mensaje del jugador actual
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

        // Edificio object keys (edificio.name, edificio.lore, etc.)
        if (key.startsWith('edificio.')) {
          const edificioKey = key.replace('edificio.', '');
          if (edificioKey === 'name' || edificioKey === 'nombre') return context.edificio?.name || '';
          if (edificioKey === 'descripcion') return context.edificio?.lore || ''; // lore es un string directo en edificios
          if (edificioKey === 'lore') return context.edificio?.lore || '';
          if (edificioKey === 'eventos' || edificioKey === 'eventos_recientes') {
            if (context.edificio?.eventos_recientes && context.edificio.eventos_recientes.length > 0) {
              return context.edificio.eventos_recientes.map(e => `- ${e}`).join('\n');
            }
            return '(Sin eventos)';
          }
          if (edificioKey === 'type') return context.edificio?.type || '';
          if (edificioKey === 'poislist' || edificioKey === 'puntos_de_interes_list') {
            if (context.edificio?.puntosDeInteres && context.edificio.puntosDeInteres.length > 0) {
              return context.edificio.puntosDeInteres.map((poi: any) => {
                const nombre = poi.name || 'Sin nombre';
                const descripcion = poi.descripcion || '';
                const coords = poi.coordenadas || { x: 0, y: 0, z: 0 };
                return `- ${nombre} (${descripcion}) {"coordenadas": {"x": ${coords.x},"y": ${coords.y},"z": ${coords.z}}}`;
              }).join('\n');
            }
            return '(Sin puntos de interés)';
          }
        }

        // NPC keys para edificio (todos los NPCs en el edificio)
        if (key === 'npcs_count') {
          return context.npcs?.length?.toString() || '0';
        }
        if (key === 'npcs_names') {
          return context.npcs?.map((n: any) => n.card?.data?.name || n.card?.name).join(', ') || '';
        }

        // Pueblo object keys (pueblo.name, pueblo.type, etc.)
        if (key.startsWith('pueblo.')) {
          const puebloKey = key.replace('pueblo.', '');
          if (puebloKey === 'name' || puebloKey === 'nombre') return context.pueblo?.name || '';
          if (puebloKey === 'tipo') return context.pueblo?.type || '';
          if (puebloKey === 'descripcion') return context.pueblo?.description || ''; // Descripción general
          if (puebloKey === 'estado') return context.pueblo?.lore?.estado_pueblo || '';
          if (puebloKey === 'rumores') {
            if (context.pueblo?.lore?.rumores && context.pueblo.lore.rumores.length > 0) {
              return context.pueblo.lore.rumores.map(r => `- ${r}`).join('\n');
            }
            return '(Sin rumores)';
          }
        }

        // Edificios keys para pueblo (todos los edificios en el pueblo)
        if (key === 'edificios_count') {
          return context.edificios?.length?.toString() || '0';
        }
        if (key === 'edificios_names') {
          return context.edificios?.map((e: any) => e.name).join(', ') || '';
        }
        if (key === 'edificios_list') {
          return context.edificios?.map((e: any) => `- ${e.name}`).join('\n') || '';
        }

        // Mundo object keys (mundo.name, mundo.lore, etc.)
        if (key.startsWith('mundo.')) {
          const mundoKey = key.replace('mundo.', '');
          if (mundoKey === 'name' || mundoKey === 'nombre') return context.mundo?.name || '';
          if (mundoKey === 'estado' || mundoKey === 'estado_mundo') return context.mundo?.lore?.estado_mundo || '';
          if (mundoKey === 'rumores') {
            if (context.mundo?.lore?.rumores && context.mundo.lore.rumores.length > 0) {
              return context.mundo.lore.rumores.map(r => `- ${r}`).join('\n');
            }
            return '(Sin rumores)';
          }
        }

        // Pueblos keys para mundo (todos los pueblos/naciones en el mundo)
        if (key === 'pueblos_count') {
          return context.pueblos?.length?.toString() || '0';
        }
        if (key === 'pueblos_names') {
          return context.pueblos?.map((p: any) => p.name).join(', ') || '';
        }
        if (key === 'pueblos_list') {
          return context.pueblos?.map((p: any) => `- ${p.name}`).join('\n') || '';
        }

        // Si la key no existe, retorna el match original
        return match;
      });
    };

    // Procesamiento recursivo: hacer múltiples pasadas hasta que no haya más cambios
    let result = text;
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      const previousResult = result;
      result = replaceSinglePass(result);

      // Si no hubo cambios en esta iteración, terminamos
      if (result === previousResult) {
        break;
      }

      iterations++;
    }

    return result;
  };

  // Función para procesar plantillas de Grimorio y expandir sus variables
  const processGrimorioTemplates = (
    templates: Array<{ enabled: boolean; templateKey?: string; section: string }> | undefined,
    keyContext: any,
    grimorioCards: GrimorioCard[]
  ): Array<{ sectionName: string; content: string; bgColor: string; templateKey: string }> => {
    if (!templates || templates.length === 0) return [];

    const processedTemplates: Array<{ sectionName: string; content: string; bgColor: string; templateKey: string }> = [];

    // Mapeo de secciones a sus nombres y colores
    const sectionMap: Record<string, { name: string; bgColor: string }> = {
      '1': { name: 'Instrucción Inicial', bgColor: 'bg-blue-50 dark:bg-blue-950' },
      '2': { name: 'MAIN PROMPT', bgColor: 'bg-green-50 dark:bg-green-950' },
      '3': { name: 'DESCRIPCIÓN', bgColor: 'bg-emerald-50 dark:bg-emerald-950' },
      '4': { name: 'PERSONALIDAD', bgColor: 'bg-teal-50 dark:bg-teal-950' },
      '5': { name: 'ESCENARIO', bgColor: 'bg-purple-50 dark:bg-purple-950' },
      '6': { name: 'EJEMPLOS DE CHAT', bgColor: 'bg-pink-50 dark:bg-pink-950' },
      '7': { name: 'LAST USER MESSAGE', bgColor: 'bg-slate-50 dark:bg-slate-950' },
      '8': { name: 'INSTRUCCIONES POST-HISTORY', bgColor: 'bg-red-50 dark:bg-red-950' }
    };

    // Filtrar plantillas activas y procesarlas
    templates.forEach(template => {
      if (template.enabled && template.templateKey) {
        const templateCard = grimorioCards.find(card => card.key === template.templateKey);

        if (templateCard && templateCard.tipo === 'plantilla') {
          const sectionInfo = sectionMap[template.section];

          if (sectionInfo) {
            // Expandir la plantilla con variables primarias usando replaceKeys
            const expandedTemplate = replaceKeys(templateCard.plantilla || '', keyContext);

            processedTemplates.push({
              sectionName: sectionInfo.name,
              content: expandedTemplate,
              bgColor: sectionInfo.bgColor,
              templateKey: template.templateKey
            });
          }
        }
      }
    });

    return processedTemplates;
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
    const session = sessions.find(s => s.id === payload.playersessionid);

    // Crear contexto para reemplazo de keys
    const keyContext = {
      npc,
      world,
      mundo: world, // Alias para variables {{mundo.*}}
      pueblo,
      edificio,
      jugador: payload.jugador,
      session, // Para variable {{npc.historial}}
      mensaje: payload.message, // Para variable {{jugador.mensaje}}
      lastSummary: payload.lastSummary // Para mostrar el último resumen
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

    // 4. World Lore (Mundo, Pueblo, Edificio) - REMOVIDO
    // Estas secciones ya no se agregan automáticamente al prompt
    // Las variables {{mundo.estado}}, {{mundo.rumores}}, {{pueblo.estado}}, {{pueblo.rumores}},
    // {{edificio.descripcion}}, {{edificio.eventos}} pueden usarse manualmente en Template User o system_prompt
    /*
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
    */

    // Pueblo Lore - REMOVIDO
    /*
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
    */

    // Edificio Lore - REMOVIDO
    /*
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
    */

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

    // 7. Template User (plantilla del jugador) - SIEMPRE mostrar, incluso vacío
    // Usar payload.templateUser en lugar de chatForm.templateUser para consistencia
    const templateUserText = replaceKeys(payload.templateUser || '', keyContext);
    prompt += `${templateUserText}\n\n`;
    sections.push({
      label: 'Template User',
      content: templateUserText,
      bgColor: 'bg-indigo-50 dark:bg-indigo-950'
    });

    // 7. Plantillas de Grimorio (si hay activas)
    const grimorioTemplates = processGrimorioTemplates(
      payload.grimorioTemplates,
      keyContext,
      grimorioCards
    );

    // Insertar plantillas de Grimorio en sus secciones correspondientes
    grimorioTemplates.forEach(template => {
      // Buscar el nombre de la plantilla para mostrar en el label
      const templateCard = grimorioCards.find(card => card.key === template.templateKey);
      const templateName = templateCard?.name || template.templateKey || 'Plantilla';

      prompt += `${template.content}\n\n`;
      sections.push({
        label: `📝 ${templateName} (${template.sectionName})`,
        content: template.content,
        bgColor: template.bgColor
      });
    });

    // 8. Historial y Último Mensaje
    let historyText = '';

    // 8.0. Último Resumen (si existe)
    if (payload.lastSummary) {
      prompt += `Último Resumen:\n${payload.lastSummary}\n\n`;
      sections.push({
        label: 'Último Resumen',
        content: `Último Resumen:\n${payload.lastSummary}`,
        bgColor: 'bg-indigo-50 dark:bg-indigo-950'
      });
    }

    // 8.1. Chat History (historial de la sesión) - limitado por historyLimit
    const historyLimit = chatForm.historyLimit || 10;
    if (session && session.messages && session.messages.length > 0) {
      const messagesToShow = session.messages.slice(-historyLimit);
      messagesToShow.forEach((msg: any) => {
        const role = msg.role === 'user' ? 'Usuario' : 'NPC';
        historyText += `${role}: ${msg.content}\n`;
      });
      historyText += '\n';
    }

    // 8.2. Last User Message (incluye último resumen, historial de la sesión y último mensaje)
    if (payload.message) {
      const mensajeReemplazado = replaceKeys(payload.message, keyContext);
      
      // Obtener el último resumen (prioridad al de la sesión guardado o payload.lastSummary)
      const lastSummary = payload.lastSummary || session?.lastPrompt || '(Sin último resumen)';
      
      // Obtener el historial completo de la sesión
      let sessionHistoryText = '(Sin historial)';
      if (session && session.messages && session.messages.length > 0) {
        sessionHistoryText = session.messages.map((msg: any) => {
          const role = msg.role === 'user' ? 'Usuario' : 'NPC';
          return `${role}: ${msg.content}`;
        }).join('\n');
      }
      
      historyText += `Último resumen:\n${lastSummary}\n\nHistorial de la sesión:\n${sessionHistoryText}\n\nMensaje: ${mensajeReemplazado}`;
    }

    // Siempre mostrar la sección, aunque esté vacía
    if (!historyText) {
      historyText = '(Sin historial ni mensaje)';
    }

    prompt += historyText + '\n\n';
    sections.push({
      label: 'Last User Message',
      content: historyText,
      bgColor: 'bg-slate-50 dark:bg-slate-950'
    });

    // 9. POST-HISTORY
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
    const session = sessions.find(s => s.id === payload.playersessionid);

    // Buscar world, pueblo y edificio del NPC para las variables de ubicación
    const world = worlds.find(w => w.id === npc?.location?.worldId);
    const pueblo = pueblos.find(p => p.id === npc?.location?.puebloId);
    const edificio = edificios.find(e => e.id === npc?.location?.edificioId);

    // Crear contexto para reemplazo de keys
    const keyContext = {
      npc,
      world,
      mundo: world, // Alias para variables {{mundo.*}}
      pueblo,
      edificio
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

    // 2. Historial de la Sesión (mensajes completos)
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

    // 3. Último Resumen (si es que lo hay)
    if (payload.lastSummary) {
      prompt += `Último Resumen:\n${payload.lastSummary}\n\n`;
      sections.push({
        label: 'Último Resumen',
        content: `Último Resumen:\n${payload.lastSummary}`,
        bgColor: 'bg-indigo-50 dark:bg-indigo-950'
      });
    }

    return { text: prompt, sections };
  };

  const buildResumenNPCPreview = (payload: any): { text: string; sections: Array<{ label: string; content: string; bgColor: string }> } => {
    if (!payload) return { text: '', sections: [] };

    const npc = npcs.find(n => n.id === payload.npcid);

    // Buscar world, pueblo y edificio del NPC para las variables de ubicación
    const world = worlds.find(w => w.id === npc?.location?.worldId);
    const pueblo = pueblos.find(p => p.id === npc?.location?.puebloId);
    const edificio = edificios.find(e => e.id === npc?.location?.edificioId);

    // Crear contexto para reemplazo de keys
    const keyContext = {
      npc,
      world,
      mundo: world, // Alias para variables {{mundo.*}}
      pueblo,
      edificio
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

    return { text: prompt, sections };
  };

  const buildResumenEdificioPreview = (payload: any): { text: string; sections: Array<{ label: string; content: string; bgColor: string }> } => {
    if (!payload) return { text: '', sections: [] };

    const edificio = edificios.find(e => e.id === payload.edificioid);
    const npcsEnEdificio = npcs.filter(n => n.location.edificioId === payload.edificioid);
    const mundo = worlds.find(w => w.id === edificio?.worldId);
    const pueblo = pueblos.find(p => p.id === edificio?.puebloId);

    // Crear contexto para reemplazo de keys
    const keyContext = {
      edificio,
      npcs: npcsEnEdificio,
      mundo,
      mundo: mundo, // Alias para variables {{mundo.*}}
      pueblo
    };

    const sections: Array<{ label: string; content: string; bgColor: string }> = [];
    let prompt = '';

    // 1. System Prompt (solo de la plantilla del usuario para este tipo de trigger)
    const userSystemPrompt = resumenEdificioForm.systemPrompt || '';
    if (userSystemPrompt) {
      const systemPromptText = replaceKeys(userSystemPrompt, keyContext);
      prompt += systemPromptText + '\n\n';
      sections.push({
        label: 'System Prompt',
        content: systemPromptText,
        bgColor: 'bg-green-50 dark:bg-green-950'
      });
    }

    // 2. Resúmenes de Todos los NPCs del Edificio
    if (payload.allSummaries) {
      prompt += `Resúmenes de los NPCs del edificio:\n${payload.allSummaries}\n\n`;
      sections.push({
        label: 'Resúmenes de los NPCs del Edificio',
        content: `Resúmenes de los NPCs del edificio:\n${payload.allSummaries}`,
        bgColor: 'bg-purple-50 dark:bg-purple-950'
      });
    }

    // 3. Contexto del Pueblo/Mundo del Edificio
    if (pueblo || mundo) {
      const contextTemplate = `CONTEXTO DE LA REGIÓN
Tipo: {{pueblo.tipo}}
Nombre: {{pueblo.name}}
Rumores:
{{pueblo.rumores}}

CONTEXTO DEL MUNDO ({{mundo.name}})
Estado: {{mundo.estado}}
Rumores:
{{mundo.rumores}}`;

      const contextText = replaceKeys(contextTemplate, keyContext);
      prompt += contextText + '\n';
      sections.push({
        label: 'Contexto de la Región',
        content: contextText,
        bgColor: 'bg-teal-50 dark:bg-teal-950'
      });
    }

    return { text: prompt, sections };
  };

  const buildResumenPuebloPreview = (payload: any): { text: string; sections: Array<{ label: string; content: string; bgColor: string }> } => {
    if (!payload) return { text: '', sections: [] };

    const pueblo = pueblos.find(p => p.id === payload.pueblid);
    const edificiosEnPueblo = edificios.filter(e => e.puebloId === payload.pueblid);
    const mundo = worlds.find(w => w.id === pueblo?.worldId);

    // Crear contexto para reemplazo de keys
    const keyContext = {
      pueblo,
      edificios: edificiosEnPueblo,
      mundo,
      mundo: mundo, // Alias para variables {{mundo.*}}
      pueblos: worlds.filter(w => w.id === mundo?.id)
    };

    const sections: Array<{ label: string; content: string; bgColor: string }> = [];
    let prompt = '';

    // 1. System Prompt (solo de la plantilla del usuario para este tipo de trigger)
    const userSystemPrompt = resumenPuebloForm.systemPrompt || '';
    if (userSystemPrompt) {
      const systemPromptText = replaceKeys(userSystemPrompt, keyContext);
      prompt += systemPromptText + '\n\n';
      sections.push({
        label: 'System Prompt',
        content: systemPromptText,
        bgColor: 'bg-green-50 dark:bg-green-950'
      });
    }

    // 2. Resúmenes de Todos los Edificios del Pueblo
    if (payload.allSummaries) {
      prompt += `Resúmenes de los edificios del pueblo/nación:\n${payload.allSummaries}\n\n`;
      sections.push({
        label: 'Resúmenes de los Edificios del Pueblo/Nación',
        content: `Resúmenes de los edificios del pueblo/nación:\n${payload.allSummaries}`,
        bgColor: 'bg-purple-50 dark:bg-purple-950'
      });
    }

    // 3. Contexto del Mundo del Pueblo
    if (mundo) {
      const contextTemplate = `CONTEXTO DEL MUNDO ({{mundo.name}})
Estado: {{mundo.estado}}
Rumores:
{{mundo.rumores}}`;

      const contextText = replaceKeys(contextTemplate, keyContext);
      prompt += contextText + '\n';
      sections.push({
        label: 'Contexto del Mundo',
        content: contextText,
        bgColor: 'bg-teal-50 dark:bg-teal-950'
      });
    }

    return { text: prompt, sections };
  };

  const buildResumenMundoPreview = (payload: any): { text: string; sections: Array<{ label: string; content: string; bgColor: string }> } => {
    if (!payload) return { text: '', sections: [] };

    const mundo = worlds.find(w => w.id === payload.mundoid);
    const pueblosEnMundo = pueblos.filter(p => p.worldId === payload.mundoid);

    // Crear contexto para reemplazo de keys
    const keyContext = {
      mundo,
      mundo: mundo, // Alias para variables {{mundo.*}}
      pueblos: pueblosEnMundo
    };

    const sections: Array<{ label: string; content: string; bgColor: string }> = [];
    let prompt = '';

    // 1. System Prompt (solo de la plantilla del usuario para este tipo de trigger)
    const userSystemPrompt = resumenMundoForm.systemPrompt || '';
    if (userSystemPrompt) {
      const systemPromptText = replaceKeys(userSystemPrompt, keyContext);
      prompt += systemPromptText + '\n\n';
      sections.push({
        label: 'System Prompt',
        content: systemPromptText,
        bgColor: 'bg-green-50 dark:bg-green-950'
      });
    }

    // 2. Resúmenes de Todos los Pueblos/Naciones del Mundo
    if (payload.allSummaries) {
      prompt += `Resúmenes de los pueblos/naciones del mundo:\n${payload.allSummaries}\n\n`;
      sections.push({
        label: 'Resúmenes de los Pueblos/Naciones del Mundo',
        content: `Resúmenes de los pueblos/naciones del mundo:\n${payload.allSummaries}`,
        bgColor: 'bg-purple-50 dark:bg-purple-950'
      });
    }

    return { text: prompt, sections };
  };

  const buildNuevoLorePreview = (payload: any): { text: string; sections: Array<{ label: string; content: string; bgColor: string }> } => {
    if (!payload) return { text: '', sections: [] };

    // Crear contexto basado en el scope
    const mundo = worlds.find(w => w.id === nuevoLoreForm.mundoid);
    const pueblo = pueblos.find(p => p.id === nuevoLoreForm.pueblid);
    const edificio = edificios.find(e => e.id === nuevoLoreForm.edificioid);

    // Contexto dinámico según el scope seleccionado
    const keyContext: any = {
      mundo,
      mundo: mundo, // Alias para variables {{mundo.*}}
      pueblo,
      edificio,
      scope: nuevoLoreForm.scope,
      loreType: nuevoLoreForm.loreType
    };

    const sections: Array<{ label: string; content: string; bgColor: string }> = [];
    let prompt = '';

    // 1. System Prompt (solo de la plantilla del usuario para este tipo de trigger)
    const userSystemPrompt = nuevoLoreForm.systemPrompt || '';
    if (userSystemPrompt) {
      const systemPromptText = replaceKeys(userSystemPrompt, keyContext);
      prompt += systemPromptText + '\n\n';
      sections.push({
        label: 'System Prompt',
        content: systemPromptText,
        bgColor: 'bg-green-50 dark:bg-green-950'
      });
    }

    // 2. Contexto de información según scope (usando replaceKeys para variables anidadas)
    let contextInfoText = '';

    if (nuevoLoreForm.scope === 'mundo' && mundo) {
      const mundoTemplate = `CONTEXTO DEL MUNDO
Mundo: {{mundo.name}}
Estado del Mundo: {{mundo.estado}}
Rumores:
{{mundo.rumores}}`;

      contextInfoText = replaceKeys(mundoTemplate, keyContext);
      sections.push({
        label: 'Contexto del Mundo',
        content: contextInfoText,
        bgColor: 'bg-blue-50 dark:bg-blue-950'
      });
    } else if (nuevoLoreForm.scope === 'pueblo' && pueblo && mundo) {
      const puebloTemplate = `CONTEXTO DE LA REGIÓN
Pueblo/Nación: {{pueblo.name}}
Tipo: {{pueblo.tipo}}
Descripción: {{pueblo.descripcion}}
Estado: {{pueblo.estado}}
Rumores:
{{pueblo.rumores}}

CONTEXTO DEL MUNDO
Mundo: {{mundo.name}}
Estado del Mundo: {{mundo.estado}}
Rumores:
{{mundo.rumores}}`;

      contextInfoText = replaceKeys(puebloTemplate, keyContext);
      sections.push({
        label: 'Contexto del Pueblo/Nación',
        content: contextInfoText,
        bgColor: 'bg-amber-50 dark:bg-amber-950'
      });
    } else if (nuevoLoreForm.scope === 'edificio' && edificio && pueblo && mundo) {
      const edificioTemplate = `CONTEXTO DEL EDIFICIO
Edificio: {{edificio.name}}
Descripción: {{edificio.descripcion}}
Tipo: {{edificio.type}}
Eventos recientes:
{{edificio.eventos}}
POIs disponibles:
{{edificio.poislist}}

CONTEXTO DE LA REGIÓN
Pueblo/Nación: {{pueblo.name}}
Tipo: {{pueblo.tipo}}
Rumores:
{{pueblo.rumores}}

CONTEXTO DEL MUNDO
Mundo: {{mundo.name}}
Estado del Mundo: {{mundo.estado}}
Rumores:
{{mundo.rumores}}`;

      contextInfoText = replaceKeys(edificioTemplate, keyContext);
      sections.push({
        label: 'Contexto del Edificio',
        content: contextInfoText,
        bgColor: 'bg-orange-50 dark:bg-orange-950'
      });
    }

    prompt += contextInfoText + '\n';

    // 3. Contexto del nuevo lore
    if (nuevoLoreForm.context) {
      const contextProcessed = replaceKeys(nuevoLoreForm.context, keyContext);
      prompt += `CONTEXTO DEL NUEVO LORE:\n${contextProcessed}\n\n`;
      sections.push({
        label: 'Contexto del Nuevo Lore',
        content: contextProcessed,
        bgColor: 'bg-purple-50 dark:bg-purple-950'
      });
    }

    // 4. Tipo de Lore
    if (nuevoLoreForm.loreType) {
      prompt += `TIPO DE LORE: ${nuevoLoreForm.loreType}\n\n`;
      sections.push({
        label: 'Tipo de Lore',
        content: nuevoLoreForm.loreType,
        bgColor: 'bg-teal-50 dark:bg-teal-950'
      });
    }

    return { text: prompt, sections };
  };

  // Construir payloads y previews con useMemo para actualizar automáticamente
  const chatPayload = useMemo(() => buildChatPayload(), [chatForm, npcs, worlds, pueblos, edificios, sessions]);
  const chatPromptData = useMemo(() => buildChatPreview(chatPayload), [chatPayload, chatForm, npcs, worlds, pueblos, edificios, sessions, grimorioCards]);
  const chatPrompt = chatPromptData.text;
  const chatPromptSections = chatPromptData.sections;
  const resumenSesionPayload = useMemo(() => buildResumenSesionPayload(), [resumenSesionForm]);
  const resumenSesionPromptData = useMemo(() => buildResumenSesionPreview(resumenSesionPayload), [resumenSesionPayload, resumenSesionForm, npcs, sessions]);
  const resumenSesionPrompt = resumenSesionPromptData.text;
  const resumenSesionSections = resumenSesionPromptData.sections;
  const resumenNPCPayload = useMemo(() => buildResumenNPCPayload(), [resumenNPCForm]);
  const resumenNPCPromptData = useMemo(() => buildResumenNPCPreview(resumenNPCPayload), [resumenNPCPayload, resumenNPCForm, npcs]);
  const resumenNPCPrompt = resumenNPCPromptData.text;
  const resumenNPCSections = resumenNPCPromptData.sections;
  const resumenEdificioPayload = useMemo(() => buildResumenEdificioPayload(), [resumenEdificioForm]);
  const resumenEdificioPromptData = useMemo(() => buildResumenEdificioPreview(resumenEdificioPayload), [resumenEdificioPayload, resumenEdificioForm]);
  const resumenEdificioPrompt = resumenEdificioPromptData.text;
  const resumenEdificioSections = resumenEdificioPromptData.sections;
  const resumenPuebloPayload = useMemo(() => buildResumenPuebloPayload(), [resumenPuebloForm]);
  const resumenPuebloPromptData = useMemo(() => buildResumenPuebloPreview(resumenPuebloPayload), [resumenPuebloPayload, resumenPuebloForm]);
  const resumenPuebloPrompt = resumenPuebloPromptData.text;
  const resumenPuebloSections = resumenPuebloPromptData.sections;
  const resumenMundoPayload = useMemo(() => buildResumenMundoPayload(), [resumenMundoForm]);
  const resumenMundoPromptData = useMemo(() => buildResumenMundoPreview(resumenMundoPayload), [resumenMundoPayload, resumenMundoForm]);
  const resumenMundoPrompt = resumenMundoPromptData.text;
  const resumenMundoSections = resumenMundoPromptData.sections;
  const nuevoLorePayload = useMemo(() => buildNuevoLorePayload(), [nuevoLoreForm]);
  const nuevoLorePromptData = useMemo(() => buildNuevoLorePreview(nuevoLorePayload), [nuevoLorePayload, nuevoLoreForm, worlds, pueblos, edificios]);
  const nuevoLorePrompt = nuevoLorePromptData.text;
  const nuevoLoreSections = nuevoLorePromptData.sections;

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
          <TabsList className="grid w-full grid-cols-7">
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
          <TabsTrigger value="resumen_pueblo">
            <MapPin className="h-4 w-4 mr-2" />
            Resumen Pueblo
          </TabsTrigger>
          <TabsTrigger value="resumen_mundo">
            <Globe className="h-4 w-4 mr-2" />
            Resumen Mundo
          </TabsTrigger>
          <TabsTrigger value="nuevo_lore">
            <FileText className="h-4 w-4 mr-2" />
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
                      <CardTitle>Plantillas Grimorio</CardTitle>
                      <CardDescription>Selecciona plantillas del Grimorio para insertar en las secciones del prompt. Las plantillas pueden contener variables primarias.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {plantillaConfigSaved && (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <RefreshCw className="h-3 w-3" />
                          Guardado
                        </div>
                      )}
                      <Badge variant="outline">
                        {plantillaRows.filter(r => r.enabled).length} activas
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Header de columnas */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground mb-2">
                    <div className="col-span-1">Habilitar</div>
                    <div className="col-span-5">Plantilla</div>
                    <div className="col-span-6">Sección del Prompt</div>
                  </div>

                  {/* Filas para cada sección */}
                  <div className="space-y-2">
                    {PROMPT_SECTIONS.map((section, index) => {
                      const row = plantillaRows[index];
                      // Si no hay fila, crear una por defecto
                      const safeRow = row || { enabled: false, templateKey: undefined, section: section.id };

                      return (
                        <div key={section.id} className="grid grid-cols-12 gap-2 items-center py-2">
                          {/* Switch para habilitar */}
                          <div className="col-span-1 flex justify-center">
                            <Switch
                              id={`switch-${section.id}`}
                              checked={safeRow.enabled ?? false}
                              onCheckedChange={(checked) => {
                                const newRows = [...plantillaRows];
                                while (newRows.length <= index) {
                                  newRows.push({ enabled: false, templateKey: undefined, section: PROMPT_SECTIONS[newRows.length].id });
                                }
                                newRows[index] = { ...newRows[index], enabled: checked };
                                setPlantillaRows(newRows);
                                setPlantillaConfigSaved(false);
                              }}
                            />
                          </div>

                          {/* Dropdown de plantillas */}
                          <div className="col-span-5">
                            <Select
                              value={safeRow.templateKey === undefined ? "none" : safeRow.templateKey}
                              onValueChange={(value) => {
                                const newRows = [...plantillaRows];
                                while (newRows.length <= index) {
                                  newRows.push({ enabled: false, templateKey: undefined, section: PROMPT_SECTIONS[newRows.length].id });
                                }
                                newRows[index] = { ...newRows[index], templateKey: value === "none" ? undefined : value };
                                setPlantillaRows(newRows);
                                setPlantillaConfigSaved(false);
                              }}
                              disabled={!safeRow.enabled}
                            >
                              <SelectTrigger id={`plantilla-select-${section.id}`}>
                                <SelectValue placeholder="Seleccionar plantilla..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- Ninguna --</SelectItem>
                                {grimorioCards.map((card) => (
                                  <SelectItem key={card.id} value={card.key}>
                                    {card.nombre} ({card.key})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Dropdown de secciones */}
                          <div className="col-span-6">
                            <Select
                              value={safeRow.section || section.id}
                              onValueChange={(value) => {
                                const newRows = [...plantillaRows];
                                while (newRows.length <= index) {
                                  newRows.push({ enabled: false, templateKey: undefined, section: PROMPT_SECTIONS[newRows.length].id });
                                }
                                newRows[index] = { ...newRows[index], section: value };
                                setPlantillaRows(newRows);
                                setPlantillaConfigSaved(false);
                              }}
                              disabled={!safeRow.enabled}
                            >
                              <SelectTrigger id={`section-select-${section.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROMPT_SECTIONS.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Botón de guardar configuración */}
                  <div className="pt-4 border-t">
                    <Button
                      onClick={handleSavePlantillaConfig}
                      className="w-full"
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Guardar Configuración
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Esta configuración se usará para todos los triggers de chat
                    </p>
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
                    placeholder="Escribe el mensaje del jugador... (puedes usar variables como {{jugador.nombre}}, {{mundo.estado}}, {{mundo.rumores}}, {{pueblo.rumores}}, {{edificio.eventos}}, etc.)"
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
                          <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}jugador.mensaje{KEY_EXAMPLE_2}</span>
                        </div>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">Variables del NPC:</p>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.name{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.description{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.personality{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npc.scenario{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}npc.historial{KEY_EXAMPLE_2}</span>
                        </div>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">Variables de Ubicación:</p>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificio{KEY_EXAMPLE_2}</span>
                        </div>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">Variables del Mundo:</p>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}mundo.estado{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}mundo.rumores{KEY_EXAMPLE_2}</span>
                        </div>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">Variables del Pueblo:</p>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.name{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}pueblo.tipo{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}pueblo.descripcion{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}pueblo.estado{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}pueblo.rumores{KEY_EXAMPLE_2}</span>
                        </div>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">Variables del Edificio:</p>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificio.name{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}edificio.descripcion{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}edificio.eventos{KEY_EXAMPLE_2}</span>
                          <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}edificio.poislist{KEY_EXAMPLE_2}</span>
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="h-5 w-5" />
                      Script de Denizen
                    </CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generateDenizenScript(chatPayload), 'Script de Denizen copiado')}
                    disabled={!chatPayload}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto font-mono">
                      {generateDenizenScript(chatPayload) || 'Selecciona un NPC y completa los campos para ver el script de Denizen'}
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
                    placeholder="Instrucciones para generar el resumen (puedes usar {{npc.name}}, {{jugador.nombre}}, {{mundo.estado}}, {{mundo.rumores}}, {{pueblo.tipo}}, {{pueblo.descripcion}}, {{pueblo.estado}}, {{pueblo.rumores}}, {{edificio.descripcion}}, {{edificio.eventos}}, {{edificio.poislist}}, etc.)"
                    rows={6}
                  />
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
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}jugador.mensaje{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables del Mundo:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}mundo.estado{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}mundo.rumores{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables del Pueblo:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.name{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}pueblo.tipo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}pueblo.descripcion{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}pueblo.estado{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}pueblo.rumores{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables del Edificio:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificio{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificio.name{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}edificio.descripcion{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}edificio.eventos{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}edificio.poislist{KEY_EXAMPLE_2}</span>
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

                <Button
                  className="w-full"
                  onClick={() => {
                    if (resumenSesionPayload && resumenSesionPayload.playersessionid) {
                      sendRequest('resumen_sesion', resumenSesionPayload);
                    }
                  }}
                  disabled={!resumenSesionPayload.npcid || !resumenSesionForm.sessionid}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Generar Resumen de Sesión
                </Button>
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
                  {npcSessionSummaries.length > 0 ? (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-3">
                          {npcSessionSummaries.map((session, index) => (
                            <div key={session.sessionId} className="border rounded-lg p-3 bg-background">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">Sesión {index + 1}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    ID: {session.sessionId}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{session.messageCount} mensajes</span>
                                </div>
                              </div>
                              <p className="text-sm text-foreground line-clamp-4">
                                {session.summary}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-6 bg-muted/50 text-center">
                      <p className="text-sm text-muted-foreground">
                        {resumenNPCForm.npcid 
                          ? "Este NPC no tiene sesiones con resúmenes generados aún."
                          : "Selecciona un NPC para ver sus sesiones con resúmenes."
                        }
                      </p>
                    </div>
                  )}
                  <Textarea
                    className="hidden"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Resumen de Edificio</CardTitle>
                <CardDescription>Genera un resumen consolidado de todos los NPCs en el edificio</CardDescription>
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
                  <div className="flex items-center justify-between mb-2">
                    <Label>System Prompt</Label>
                    {resumenEdificioTemplateSaved && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <RefreshCw className="h-3 w-3" />
                        Guardado
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={resumenEdificioForm.systemPrompt}
                    onChange={(e) => setResumenEdificioForm({ ...resumenEdificioForm, systemPrompt: e.target.value })}
                    placeholder="Instrucciones para generar el resumen del edificio (puedes usar {{edificio.name}}, {{edificio.lore}}, {{npcs_count}}, etc.)"
                    rows={6}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveResumenEdificioTemplate}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Guardar Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        localStorage.removeItem('resumenEdificioTemplate');
                        setResumenEdificioForm(prev => ({ ...prev, systemPrompt: '' }));
                        setResumenEdificioTemplateSaved(false);
                        toast({
                          title: 'Template Eliminado',
                          description: 'El system prompt de resumen de edificio ha sido eliminado'
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Resúmenes de Todos los NPCs del Edificio</Label>
                  {edificioNPCSummaries.length > 0 ? (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-3">
                          {edificioNPCSummaries.map((npc, index) => (
                            <div key={npc.npcId} className="border rounded-lg p-3 bg-background">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">NPC {index + 1}</Badge>
                                  <span className="text-sm font-medium">{npc.npcName}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  ID: {npc.npcId}
                                </span>
                              </div>
                              <p className="text-sm text-foreground line-clamp-4">
                                {npc.consolidatedSummary}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-6 bg-muted/50 text-center">
                      <p className="text-sm text-muted-foreground">
                        {resumenEdificioForm.edificioid
                          ? "Este edificio no tiene NPCs con resúmenes generados aún."
                          : "Selecciona un edificio para ver sus NPCs con resúmenes."
                        }
                      </p>
                    </div>
                  )}
                  <Textarea
                    className="hidden"
                    value={resumenEdificioForm.allSummaries}
                    onChange={(e) => setResumenEdificioForm({ ...resumenEdificioForm, allSummaries: e.target.value })}
                    placeholder="Pega aquí los resúmenes de todos los NPCs en este edificio..."
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
                      <p className="font-semibold text-foreground mb-1">Variables del Edificio:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificio.name{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificio.descripcion{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificio.eventos{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificio.type{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}edificio.poislist{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables de NPCs:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npcs_count{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}npcs_names{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables de Ubicación:</p>
                      <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.name{KEY_EXAMPLE_2}</span>
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
                    {countTokens(resumenEdificioPrompt)} tokens / {countWords(resumenEdificioPrompt)} palabras
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {resumenEdificioSections.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          Selecciona un edificio y completa los campos para ver el prompt
                        </div>
                      ) : (
                        resumenEdificioSections.map((section, index) => (
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
                  {resumenEdificioSections.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(resumenEdificioPrompt, 'Prompt copiado')}
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
                    {countTokens(JSON.stringify(resumenEdificioPayload || {}, null, 2))} tokens
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      {JSON.stringify(resumenEdificioPayload || {}, null, 2) || '{}'}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={() => resumenEdificioPayload && sendRequest('resumen_edificio', resumenEdificioPayload)}
                disabled={!resumenEdificioForm.edificioid || !resumenEdificioForm.allSummaries}
              >
                <Send className="h-5 w-5 mr-2" />
                Generar Resumen de Edificio
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Resumen Pueblo Trigger */}
        <TabsContent value="resumen_pueblo" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Resumen de Pueblo/Nación</CardTitle>
                <CardDescription>Genera un resumen consolidado de todos los edificios en el pueblo/nación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Pueblo/Nación</Label>
                  <Select
                    value={resumenPuebloForm.pueblid}
                    onValueChange={(v) => setResumenPuebloForm({ ...resumenPuebloForm, pueblid: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona pueblo/nación" />
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>System Prompt</Label>
                    {resumenPuebloTemplateSaved && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <RefreshCw className="h-3 w-3" />
                        Guardado
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={resumenPuebloForm.systemPrompt}
                    onChange={(e) => setResumenPuebloForm({ ...resumenPuebloForm, systemPrompt: e.target.value })}
                    placeholder="Instrucciones para generar el resumen del pueblo/nación (puedes usar {{pueblo.name}}, {{pueblo.type}}, {{edificios_count}}, etc.)"
                    rows={6}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveResumenPuebloTemplate}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Guardar Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        localStorage.removeItem('resumenPuebloTemplate');
                        setResumenPuebloForm(prev => ({ ...prev, systemPrompt: '' }));
                        setResumenPuebloTemplateSaved(false);
                        toast({
                          title: 'Template Eliminado',
                          description: 'El system prompt de resumen de pueblo ha sido eliminado'
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Resúmenes de Todos los Edificios del Pueblo/Nación</Label>
                  {puebloEdificioSummaries.length > 0 ? (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-3">
                          {puebloEdificioSummaries.map((edificio, index) => (
                            <div key={edificio.edificioId} className="border rounded-lg p-3 bg-background">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">Edificio {index + 1}</Badge>
                                  <span className="text-sm font-medium">{edificio.edificioName}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  ID: {edificio.edificioId}
                                </span>
                              </div>
                              <p className="text-sm text-foreground line-clamp-4">
                                {edificio.consolidatedSummary}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-6 bg-muted/50 text-center">
                      <p className="text-sm text-muted-foreground">
                        {resumenPuebloForm.pueblid
                          ? "Este pueblo/nación no tiene edificios con resúmenes generados aún."
                          : "Selecciona un pueblo/nación para ver sus edificios con resúmenes."
                        }
                      </p>
                    </div>
                  )}
                  <Textarea
                    className="hidden"
                    value={resumenPuebloForm.allSummaries}
                    onChange={(e) => setResumenPuebloForm({ ...resumenPuebloForm, allSummaries: e.target.value })}
                    placeholder="Pega aquí los resúmenes de todos los edificios en este pueblo/nación..."
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
                      <p className="font-semibold text-foreground mb-1">Variables del Pueblo/Nación:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.name{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.type{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.estado{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.rumores{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables de Edificios:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificios_count{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificios_names{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificios_list{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables de Ubicación:</p>
                      <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.name{KEY_EXAMPLE_2}</span>
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
                    {countTokens(resumenPuebloPrompt)} tokens / {countWords(resumenPuebloPrompt)} palabras
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {resumenPuebloSections.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          Selecciona un pueblo/nación y completa los campos para ver el prompt
                        </div>
                      ) : (
                        resumenPuebloSections.map((section, index) => (
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
                  {resumenPuebloSections.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(resumenPuebloPrompt, 'Prompt copiado')}
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
                    {countTokens(JSON.stringify(resumenPuebloPayload || {}, null, 2))} tokens
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      {JSON.stringify(resumenPuebloPayload || {}, null, 2) || '{}'}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={() => resumenPuebloPayload && sendRequest('resumen_pueblo', resumenPuebloPayload)}
                disabled={!resumenPuebloForm.pueblid || !resumenPuebloForm.allSummaries}
              >
                <Send className="h-5 w-5 mr-2" />
                Generar Resumen de Pueblo/Nación
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Resumen Mundo Trigger */}
        <TabsContent value="resumen_mundo" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Resumen de Mundo</CardTitle>
                <CardDescription>Genera un resumen consolidado de todos los pueblos/naciones del mundo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Mundo</Label>
                  <Select
                    value={resumenMundoForm.mundoid}
                    onValueChange={(v) => setResumenMundoForm({ ...resumenMundoForm, mundoid: v })}
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>System Prompt</Label>
                    {resumenMundoTemplateSaved && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <RefreshCw className="h-3 w-3" />
                        Guardado
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={resumenMundoForm.systemPrompt}
                    onChange={(e) => setResumenMundoForm({ ...resumenMundoForm, systemPrompt: e.target.value })}
                    placeholder="Instrucciones para generar el resumen del mundo (puedes usar {{mundo.name}}, {{mundo.estado_mundo}}, {{pueblos_count}}, etc.)"
                    rows={6}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveResumenMundoTemplate}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Guardar Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        localStorage.removeItem('resumenMundoTemplate');
                        setResumenMundoForm(prev => ({ ...prev, systemPrompt: '' }));
                        setResumenMundoTemplateSaved(false);
                        toast({
                          title: 'Template Eliminado',
                          description: 'El system prompt de resumen de mundo ha sido eliminado'
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Resúmenes de Todos los Pueblos/Naciones del Mundo</Label>
                  {mundoPuebloSummaries.length > 0 ? (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-3">
                          {mundoPuebloSummaries.map((pueblo, index) => (
                            <div key={pueblo.puebloId} className="border rounded-lg p-3 bg-background">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">Pueblo/Nación {index + 1}</Badge>
                                  <span className="text-sm font-medium">{pueblo.puebloName}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  ID: {pueblo.puebloId}
                                </span>
                              </div>
                              <p className="text-sm text-foreground line-clamp-4">
                                {pueblo.consolidatedSummary}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-6 bg-muted/50 text-center">
                      <p className="text-sm text-muted-foreground">
                        {resumenMundoForm.mundoid
                          ? "Este mundo no tiene pueblos/naciones con resúmenes generados aún."
                          : "Selecciona un mundo para ver sus pueblos/naciones con resúmenes."
                        }
                      </p>
                    </div>
                  )}
                  <Textarea
                    className="hidden"
                    value={resumenMundoForm.allSummaries}
                    onChange={(e) => setResumenMundoForm({ ...resumenMundoForm, allSummaries: e.target.value })}
                    placeholder="Pega aquí los resúmenes de todos los pueblos/naciones del mundo..."
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
                      <p className="font-semibold text-foreground mb-1">Variables del Mundo:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo.name{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}mundo.estado{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo.estado_mundo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo.rumores{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables del Pueblo:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.name{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.tipo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.descripcion{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.estado{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.rumores{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables de Pueblos/Naciones:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblos_count{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblos_names{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblos_list{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables de Ubicación:</p>
                      <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblos{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo.name{KEY_EXAMPLE_2}</span>
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
                    {countTokens(resumenMundoPrompt)} tokens / {countWords(resumenMundoPrompt)} palabras
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {resumenMundoSections.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          Selecciona un mundo y completa los campos para ver el prompt
                        </div>
                      ) : (
                        resumenMundoSections.map((section, index) => (
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
                  {resumenMundoSections.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(resumenMundoPrompt, 'Prompt copiado')}
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
                    {countTokens(JSON.stringify(resumenMundoPayload || {}, null, 2))} tokens
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      {JSON.stringify(resumenMundoPayload || {}, null, 2) || '{}'}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={() => resumenMundoPayload && sendRequest('resumen_mundo', resumenMundoPayload)}
                disabled={!resumenMundoForm.mundoid}
              >
                <Send className="h-5 w-5 mr-2" />
                Generar Resumen de Mundo
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Nuevo Lore Trigger */}
        <TabsContent value="nuevo_lore" className="space-y-4">
          {/* Preview del Prompt */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Visualizador de Prompt
                </CardTitle>
                <CardDescription>
                  Vista previa del prompt que se enviará al AI
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {countTokens(nuevoLorePrompt)} tokens / {countWords(nuevoLorePrompt)} palabras
              </Badge>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {nuevoLoreSections.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Selecciona el alcance y completa los campos para ver el prompt
                    </div>
                  ) : (
                    nuevoLoreSections.map((section, index) => (
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
              {nuevoLorePrompt && (
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(nuevoLorePrompt, 'Prompt copiado')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => nuevoLorePayload && copyToClipboard(JSON.stringify(nuevoLorePayload, null, 2), 'JSON copiado')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar JSON
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

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
