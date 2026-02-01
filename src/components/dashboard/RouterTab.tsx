'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, Network, MessageSquare, Globe, MapPin, Building, User, Eye, MessageCircle, FileText, Copy, Trash2, Terminal, Loader2, Layers } from 'lucide-react';
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
import { World, Pueblo, Edificio, NPC, Session } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { usePromptPreview } from '@/hooks/usePromptPreview';
import ResumenGeneral from '@/components/dashboard/ResumenGeneralMiniDashboard';

export default function RouterTab() {
  // Preview hook
  const { previewPrompt, loading: previewLoading } = usePromptPreview();

  // Debounce refs
  const chatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resumenSesionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resumenNPCTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resumenEdificioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resumenPuebloTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resumenMundoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nuevoLoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Preview data from backend
  const [chatPreviewData, setChatPreviewData] = useState<any>(null);
  const [resumenSesionPreviewData, setResumenSesionPreviewData] = useState<any>(null);
  const [resumenNPCPreviewData, setResumenNPCPreviewData] = useState<any>(null);
  const [resumenEdificioPreviewData, setResumenEdificioPreviewData] = useState<any>(null);
  const [resumenPuebloPreviewData, setResumenPuebloPreviewData] = useState<any>(null);
  const [resumenMundoPreviewData, setResumenMundoPreviewData] = useState<any>(null);
  const [nuevoLorePreviewData, setNuevoLorePreviewData] = useState<any>(null);

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
      nombre: 'Gerardo Lopez',  // ← Datos de prueba para preview
      raza: 'Humano',
      nivel: '10',
      almakos: '1000',
      deuda: '100',
      piedras_del_alma: '5',
      salud_actual: '10',
      reputacion: '6',
      hora: '10:30pm',
      clima: 'soleado'
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

  useEffect(() => {
    // ✅ Cargar System Prompt de resumen de sesión de la API
    const loadResumenSesionConfig = async () => {
      try {
        const response = await fetch('/api/resumen-sesion-trigger-config');
        const result = await response.json();

        if (result.success && result.data.systemPrompt) {
          setResumenSesionForm(prev => ({ ...prev, systemPrompt: result.data.systemPrompt }));
          setResumenSesionTemplateSaved(true);
        } else {
          setResumenSesionTemplateSaved(false);
        }
      } catch (error) {
        console.error('[useEffect resumenSesion] Error cargando System Prompt de la API:', error);
      }
    };

    loadResumenSesionConfig();
  }, []);

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
    // ✅ Cargar System Prompt de resumen NPC de la API
    const loadResumenNPCConfig = async () => {
      try {
        const response = await fetch('/api/resumen-npc-trigger-config');
        const result = await response.json();

        if (result.success && result.data.systemPrompt) {
          setResumenNPCForm(prev => ({ ...prev, systemPrompt: result.data.systemPrompt }));
          setResumenNPCTemplateSaved(true);
        } else {
          setResumenNPCTemplateSaved(false);
        }
      } catch (error) {
        console.error('[useEffect resumenNPC] Error cargando System Prompt de la API:', error);
      }
    };

    loadResumenNPCConfig();
  }, []);

  // Cargar resúmenes de sesiones del NPC automáticamente cuando se selecciona un NPC
  useEffect(() => {
    const loadNPCSessionSummaries = async () => {
      if (resumenNPCForm.npcid) {
        try {
          // ✅ Usar endpoint correcto que incluye playerName
          const response = await fetch(`/api/npcs/${resumenNPCForm.npcid}/summaries`);
          const result = await response.json();

          if (result.success && result.data.summaries.length > 0) {
            // Guardar los resúmenes con metadata completa
            setNpcSessionSummaries(result.data.summaries);

            // ✅ Formatear los resúmenes con el nuevo formato especificado
            // Agrupar resúmenes por nombre de jugador
            const summariesByPlayer = result.data.summaries.reduce((acc: Record<string, any[]>, s: any) => {
              const playerName = s.playerName || 'Unknown';
              if (!acc[playerName]) {
                acc[playerName] = [];
              }
              acc[playerName].push(s);
              return acc;
            }, {});

            // Construir el formato especificado
            const memoriesSections: string[] = [];
            for (const [playerName, summaries] of Object.entries(summariesByPlayer)) {
              memoriesSections.push(`Memoria de ${playerName}`);
              summaries.forEach((s: any) => {
                memoriesSections.push(s.summary);
              });
            }

            const summariesText = `***
MEMORIAS DE LOS AVENTUREROS
${memoriesSections.join('\n')}
***`;

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
    // ✅ Cargar System Prompt de resumen de edificio de la API
    const loadResumenEdificioConfig = async () => {
      try {
        const response = await fetch('/api/resumen-edificio-trigger-config');
        const result = await response.json();

        if (result.success && result.data.systemPrompt) {
          setResumenEdificioForm(prev => ({ ...prev, systemPrompt: result.data.systemPrompt }));
          setResumenEdificioTemplateSaved(true);
        } else {
          setResumenEdificioTemplateSaved(false);
        }
      } catch (error) {
        console.error('[useEffect resumenEdificio] Error cargando System Prompt de la API:', error);
      }
    };

    loadResumenEdificioConfig();
  }, []);

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

            // ✅ Formatear las memorias de los NPCs (sin === NPC N: ===)
            const summariesText = result.data.npcs
              .filter((n: any) => n.consolidatedSummary)
              .map((n: any, index: number) =>
                `NPC ${index + 1}: ${n.npcName} (ID: ${n.npcId})\n${n.consolidatedSummary}`
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
    // ✅ Cargar System Prompt de resumen de pueblo de la API
    const loadResumenPuebloConfig = async () => {
      try {
        const response = await fetch('/api/resumen-pueblo-trigger-config');
        const result = await response.json();

        if (result.success && result.data.systemPrompt) {
          setResumenPuebloForm(prev => ({ ...prev, systemPrompt: result.data.systemPrompt }));
          setResumenPuebloTemplateSaved(true);
        } else {
          setResumenPuebloTemplateSaved(false);
        }
      } catch (error) {
        console.error('[useEffect resumenPueblo] Error cargando System Prompt de la API:', error);
      }
    };

    loadResumenPuebloConfig();
  }, []);

  useEffect(() => {
    // ✅ Cargar System Prompt de resumen de mundo de la API
    const loadResumenMundoConfig = async () => {
      try {
        const response = await fetch('/api/resumen-mundo-trigger-config');
        const result = await response.json();

        if (result.success && result.data.systemPrompt) {
          setResumenMundoForm(prev => ({ ...prev, systemPrompt: result.data.systemPrompt }));
          setResumenMundoTemplateSaved(true);
        } else {
          setResumenMundoTemplateSaved(false);
        }
      } catch (error) {
        console.error('[useEffect resumenMundo] Error cargando System Prompt de la API:', error);
      }
    };

    loadResumenMundoConfig();
  }, []);

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

            // ✅ Formatear las memorias de los edificios (sin === ===)
            const summariesText = result.data.edificios
              .filter((e: any) => e.consolidatedSummary)
              .map((e: any, index: number) =>
                `Edificio ${index + 1}: ${e.edificioName} (ID: ${e.edificioId})\n${e.consolidatedSummary}`
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
  // ✅ También cargar datos del jugador de la sesión
  useEffect(() => {
    const loadSessionData = async () => {
      if (chatForm.playersessionid && chatForm.sessionType === 'exist') {
        try {
          // Cargar summary como antes
          const summaryResponse = await fetch(`/api/sessions/${chatForm.playersessionid}/summary`);
          const summaryResult = await summaryResponse.json();
          if (summaryResult.success) {
            setChatForm(prev => ({
              ...prev,
              lastSummary: summaryResult.data?.summary || ''
            }));
          }

          // ✅ NUEVO: Cargar sesión completa para obtener datos del jugador
          const sessionResponse = await fetch(`/api/sessions/${chatForm.playersessionid}`);
          const sessionResult = await sessionResponse.json();
          if (sessionResult.success && sessionResult.data?.jugador) {
            console.log('[RouterTab] Cargando datos del jugador de la sesión:', sessionResult.data.jugador);
            setChatForm(prev => ({
              ...prev,
              jugador: {
                nombre: sessionResult.data.jugador.nombre || prev.jugador.nombre,
                raza: sessionResult.data.jugador.raza || prev.jugador.raza,
                nivel: sessionResult.data.jugador.nivel || prev.jugador.nivel,
                almakos: sessionResult.data.jugador.almakos || prev.jugador.almakos,
                deuda: sessionResult.data.jugador.deuda || prev.jugador.deuda,
                piedras_del_alma: sessionResult.data.jugador.piedras_del_alma || prev.jugador.piedras_del_alma,
                salud_actual: sessionResult.data.jugador.salud_actual || prev.jugador.salud_actual,
                reputacion: sessionResult.data.jugador.reputacion || prev.jugador.reputacion,
                hora: sessionResult.data.jugador.hora || prev.jugador.hora,
                clima: sessionResult.data.jugador.clima || prev.jugador.clima
              }
            }));
          } else {
            console.log('[RouterTab] La sesión no tiene datos del jugador, usando datos de prueba actuales');
          }
        } catch (error) {
          console.error('Error loading session data:', error);
        }
      } else {
        // Limpiar resumen si no hay sesión seleccionada o es nueva sesión
        setChatForm(prev => ({ ...prev, lastSummary: '' }));
        // Para nueva sesión, mantener datos de prueba actuales (ya están definidos en el estado inicial)
      }
    };
    loadSessionData();
  }, [chatForm.playersessionid, chatForm.sessionType]);

  // Debounced preview for chat trigger
  useEffect(() => {
    const loadChatPreview = async () => {
      const payload = buildChatPayload();

      // ✅ Validaciones: verificar que haya datos mínimos antes de hacer el preview
      if (!payload) {
        setChatPreviewData(null);
        return;
      }

      // Verificar que haya un NPC seleccionado
      if (!payload.npcid || payload.npcid.trim() === '') {
        setChatPreviewData(null);
        return;
      }

      // Verificar que haya un mensaje (opcional, pero necesario para un preview significativo)
      // if (!payload.message || payload.message.trim() === '') {
      //   setChatPreviewData(null);
      //   return;
      // }

      try {
        const data = await previewPrompt(payload);
        console.log('[RouterTab] CHAT PREVIEW DATA RECIBIDA:', data);
        setChatPreviewData(data);
      } catch (error) {
        console.error('Error loading chat preview:', error);
        setChatPreviewData(null);
      }
    };

    if (chatTimeoutRef.current) {
      clearTimeout(chatTimeoutRef.current);
    }
    chatTimeoutRef.current = setTimeout(loadChatPreview, 500);

    return () => {
      if (chatTimeoutRef.current) {
        clearTimeout(chatTimeoutRef.current);
      }
    };
  }, [
    chatForm.npcid,
    chatForm.playersessionid,
    chatForm.sessionType,
    JSON.stringify(chatForm.jugador), // ✅ Cambiado para detectar cambios en propiedades del objeto
    chatForm.mensaje,
    chatForm.lastSummary
  ]);

  // Debounced preview for resumen sesion trigger
  useEffect(() => {
    const loadResumenSesionPreview = async () => {
      const payload = buildResumenSesionPayload();
      if (!payload || !payload.npcid || !payload.playersessionid) {
        setResumenSesionPreviewData(null);
        return;
      }

      try {
        const data = await previewPrompt(payload);
        setResumenSesionPreviewData(data);
      } catch (error) {
        console.error('Error loading resumen sesion preview:', error);
        setResumenSesionPreviewData(null);
      }
    };

    if (resumenSesionTimeoutRef.current) {
      clearTimeout(resumenSesionTimeoutRef.current);
    }
    resumenSesionTimeoutRef.current = setTimeout(loadResumenSesionPreview, 500);

    return () => {
      if (resumenSesionTimeoutRef.current) {
        clearTimeout(resumenSesionTimeoutRef.current);
      }
    };
  }, [
    resumenSesionForm.npcid,
    resumenSesionForm.sessionid,
    resumenSesionForm.lastSummary,
    resumenSesionForm.systemPrompt
  ]);

  // Debounced preview for resumen NPC trigger
  useEffect(() => {
    const loadResumenNPCPreview = async () => {
      const payload = buildResumenNPCPayload();
      if (!payload || !payload.npcid) {
        setResumenNPCPreviewData(null);
        return;
      }

      try {
        const data = await previewPrompt(payload);
        setResumenNPCPreviewData(data);
      } catch (error) {
        console.error('Error loading resumen NPC preview:', error);
        setResumenNPCPreviewData(null);
      }
    };

    if (resumenNPCTimeoutRef.current) {
      clearTimeout(resumenNPCTimeoutRef.current);
    }
    resumenNPCTimeoutRef.current = setTimeout(loadResumenNPCPreview, 500);

    return () => {
      if (resumenNPCTimeoutRef.current) {
        clearTimeout(resumenNPCTimeoutRef.current);
      }
    };
  }, [resumenNPCForm.npcid, resumenNPCForm.allSummaries, resumenNPCForm.systemPrompt]);

  // Debounced preview for resumen edificio trigger
  useEffect(() => {
    const loadResumenEdificioPreview = async () => {
      const payload = buildResumenEdificioPayload();
      if (!payload || !payload.edificioid) {
        setResumenEdificioPreviewData(null);
        return;
      }

      try {
        const data = await previewPrompt(payload);
        setResumenEdificioPreviewData(data);
      } catch (error) {
        console.error('Error loading resumen edificio preview:', error);
        setResumenEdificioPreviewData(null);
      }
    };

    if (resumenEdificioTimeoutRef.current) {
      clearTimeout(resumenEdificioTimeoutRef.current);
    }
    resumenEdificioTimeoutRef.current = setTimeout(loadResumenEdificioPreview, 500);

    return () => {
      if (resumenEdificioTimeoutRef.current) {
        clearTimeout(resumenEdificioTimeoutRef.current);
      }
    };
  }, [resumenEdificioForm.edificioid, resumenEdificioForm.allSummaries]);

  // Debounced preview for resumen pueblo trigger
  useEffect(() => {
    const loadResumenPuebloPreview = async () => {
      const payload = buildResumenPuebloPayload();
      if (!payload || !payload.pueblid) {
        setResumenPuebloPreviewData(null);
        return;
      }

      try {
        const data = await previewPrompt(payload);
        setResumenPuebloPreviewData(data);
      } catch (error) {
        console.error('Error loading resumen pueblo preview:', error);
        setResumenPuebloPreviewData(null);
      }
    };

    if (resumenPuebloTimeoutRef.current) {
      clearTimeout(resumenPuebloTimeoutRef.current);
    }
    resumenPuebloTimeoutRef.current = setTimeout(loadResumenPuebloPreview, 500);

    return () => {
      if (resumenPuebloTimeoutRef.current) {
        clearTimeout(resumenPuebloTimeoutRef.current);
      }
    };
  }, [resumenPuebloForm.pueblid, resumenPuebloForm.allSummaries]);

  // Debounced preview for resumen mundo trigger
  useEffect(() => {
    const loadResumenMundoPreview = async () => {
      const payload = buildResumenMundoPayload();
      if (!payload || !payload.mundoid) {
        setResumenMundoPreviewData(null);
        return;
      }

      try {
        const data = await previewPrompt(payload);
        setResumenMundoPreviewData(data);
      } catch (error) {
        console.error('Error loading resumen mundo preview:', error);
        setResumenMundoPreviewData(null);
      }
    };

    if (resumenMundoTimeoutRef.current) {
      clearTimeout(resumenMundoTimeoutRef.current);
    }
    resumenMundoTimeoutRef.current = setTimeout(loadResumenMundoPreview, 500);

    return () => {
      if (resumenMundoTimeoutRef.current) {
        clearTimeout(resumenMundoTimeoutRef.current);
      }
    };
  }, [resumenMundoForm.mundoid, resumenMundoForm.allSummaries]);

  // Debounced preview for nuevo lore trigger
  useEffect(() => {
    const loadNuevoLorePreview = async () => {
      const payload = buildNuevoLorePayload();
      if (!payload || !payload.scope || !payload.targetId) {
        setNuevoLorePreviewData(null);
        return;
      }

      try {
        const data = await previewPrompt(payload);
        setNuevoLorePreviewData(data);
      } catch (error) {
        console.error('Error loading nuevo lore preview:', error);
        setNuevoLorePreviewData(null);
      }
    };

    if (nuevoLoreTimeoutRef.current) {
      clearTimeout(nuevoLoreTimeoutRef.current);
    }
    nuevoLoreTimeoutRef.current = setTimeout(loadNuevoLorePreview, 500);

    return () => {
      if (nuevoLoreTimeoutRef.current) {
        clearTimeout(nuevoLoreTimeoutRef.current);
      }
    };
  }, [
    nuevoLoreForm.scope,
    nuevoLoreForm.mundoid,
    nuevoLoreForm.pueblid,
    nuevoLoreForm.loreType,
    nuevoLoreForm.context
  ]);

  const handleSaveResumenSesionTemplate = async () => {
    try {
      const response = await fetch('/api/resumen-sesion-trigger-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemPrompt: resumenSesionForm.systemPrompt
        })
      });

      const result = await response.json();

      if (result.success) {
        setResumenSesionTemplateSaved(true);
        toast({
          title: 'Template de Resumen Guardado',
          description: 'El system prompt de resumen de sesión se ha guardado correctamente'
        });
      } else {
        toast({
          title: 'Error al Guardar',
          description: result.error || 'No se pudo guardar el system prompt',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[handleSaveResumenSesionTemplate] Error:', error);
      toast({
        title: 'Error al Guardar',
        description: 'No se pudo guardar el system prompt',
        variant: 'destructive'
      });
    }
  };

  const handleSaveResumenNPCTemplate = async () => {
    try {
      const response = await fetch('/api/resumen-npc-trigger-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemPrompt: resumenNPCForm.systemPrompt
        })
      });

      const result = await response.json();

      if (result.success) {
        setResumenNPCTemplateSaved(true);
        toast({
          title: 'Template de Resumen NPC Guardado',
          description: 'El system prompt de resumen NPC se ha guardado correctamente'
        });
      } else {
        toast({
          title: 'Error al Guardar',
          description: result.error || 'No se pudo guardar el system prompt',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[handleSaveResumenNPCTemplate] Error:', error);
      toast({
        title: 'Error al Guardar',
        description: 'No se pudo guardar el system prompt',
        variant: 'destructive'
      });
    }
  };

  const handleSaveResumenEdificioTemplate = async () => {
    try {
      const response = await fetch('/api/resumen-edificio-trigger-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemPrompt: resumenEdificioForm.systemPrompt
        })
      });

      const result = await response.json();

      if (result.success) {
        setResumenEdificioTemplateSaved(true);
        toast({
          title: 'Template de Resumen Edificio Guardado',
          description: 'El system prompt de resumen de edificio se ha guardado correctamente'
        });
      } else {
        toast({
          title: 'Error al Guardar',
          description: result.error || 'No se pudo guardar el system prompt',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[handleSaveResumenEdificioTemplate] Error:', error);
      toast({
        title: 'Error al Guardar',
        description: 'No se pudo guardar el system prompt',
        variant: 'destructive'
      });
    }
  };

  const handleSaveResumenPuebloTemplate = async () => {
    try {
      const response = await fetch('/api/resumen-pueblo-trigger-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemPrompt: resumenPuebloForm.systemPrompt
        })
      });

      const result = await response.json();

      if (result.success) {
        setResumenPuebloTemplateSaved(true);
        toast({
          title: 'Template de Resumen Pueblo Guardado',
          description: 'El system prompt de resumen de pueblo se ha guardado correctamente'
        });
      } else {
        toast({
          title: 'Error al Guardar',
          description: result.error || 'No se pudo guardar el system prompt',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[handleSaveResumenPuebloTemplate] Error:', error);
      toast({
        title: 'Error al Guardar',
        description: 'No se pudo guardar el system prompt',
        variant: 'destructive'
      });
    }
  };

  const handleSaveResumenMundoTemplate = async () => {
    try {
      const response = await fetch('/api/resumen-mundo-trigger-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemPrompt: resumenMundoForm.systemPrompt
        })
      });

      const result = await response.json();

      if (result.success) {
        setResumenMundoTemplateSaved(true);
        toast({
          title: 'Template de Resumen Mundo Guardado',
          description: 'El system prompt de resumen de mundo se ha guardado correctamente'
        });
      } else {
        toast({
          title: 'Error al Guardar',
          description: result.error || 'No se pudo guardar el system prompt',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[handleSaveResumenMundoTemplate] Error:', error);
      toast({
        title: 'Error al Guardar',
        description: 'No se pudo guardar el system prompt',
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
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  };

  const countWords = (text: string): number => {
    if (!text) return 0;
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
      mode: 'chat',  // ← AGREGAR: campo mode obligatorio
      npcid: chatForm.npcid,
      playersessionid,
      jugador: chatForm.jugador,
      message: chatForm.mensaje, // Mensaje del jugador (message en lugar de mensaje)
      lastSummary: chatForm.lastSummary, // Último resumen de la sesión
      context: {
        mundo: world,
        pueblo,
        edificio
      }
    };
  };

  const buildResumenSesionPayload = () => {
    const payload = {
      mode: 'resumen_sesion',
      npcid: resumenSesionForm.npcid,
      playersessionid: resumenSesionForm.sessionid,
      systemPrompt: resumenSesionForm.systemPrompt,
      lastSummary: resumenSesionForm.lastSummary,
      // chatHistory no se incluye aquí, el backend lo obtiene automáticamente de la sesión
      // ✅ NO ENVIAR grimorioTemplates EN EL MODO RESUMEN SESIÓN
      // Este modo no usa plantillas de Grimorio, solo usa el System Prompt del archivo de configuración
    };

    return payload;
  };

  const buildResumenNPCPayload = () => {
    return {
      mode: 'resumen_npc',
      npcid: resumenNPCForm.npcid,
      systemPrompt: resumenNPCForm.systemPrompt,
      allSummaries: resumenNPCForm.allSummaries
    };
  };

  const buildResumenEdificioPayload = () => {
    return {
      mode: 'resumen_edificio',  // ✅ CORREGIDO: 'mode' en lugar de 'triggertype'
      edificioid: resumenEdificioForm.edificioid,
      systemPrompt: resumenEdificioForm.systemPrompt,  // ✅ NUEVO: Agregar systemPrompt
      allSummaries: resumenEdificioForm.allSummaries // Resúmenes de todos los NPCs del edificio
    };
  };

  const buildResumenPuebloPayload = () => {
    return {
      mode: 'resumen_pueblo',  // ✅ CORREGIDO: 'mode' en lugar de missing
      pueblid: resumenPuebloForm.pueblid,
      systemPrompt: resumenPuebloForm.systemPrompt,  // ✅ NUEVO: Agregar systemPrompt
      allSummaries: resumenPuebloForm.allSummaries // Resúmenes de todos los edificios del pueblo/nación
    };
  };

  const buildResumenMundoPayload = () => {
    return {
      mode: 'resumen_mundo',  // ✅ NUEVO: Agregar mode
      mundoid: resumenMundoForm.mundoid,
      systemPrompt: resumenMundoForm.systemPrompt,  // ✅ NUEVO: Agregar systemPrompt
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

  // Computed values for UI
  const chatPrompt = chatPreviewData?.lastPrompt || '';
  const chatPromptSections = chatPreviewData?.sections || [];
  const chatPayload = buildChatPayload();

  const resumenSesionPrompt = resumenSesionPreviewData?.lastPrompt || '';
  const resumenSesionSections = resumenSesionPreviewData?.sections || [];
  const resumenSesionPayload = buildResumenSesionPayload();

  const resumenNPCPrompt = resumenNPCPreviewData?.lastPrompt || '';
  const resumenNPCSections = resumenNPCPreviewData?.sections || [];
  const resumenNPCPayload = buildResumenNPCPayload();

  const resumenEdificioPrompt = resumenEdificioPreviewData?.lastPrompt || '';
  const resumenEdificioSections = resumenEdificioPreviewData?.sections || [];
  const resumenEdificioPayload = buildResumenEdificioPayload();

  const resumenPuebloPrompt = resumenPuebloPreviewData?.lastPrompt || '';
  const resumenPuebloSections = resumenPuebloPreviewData?.sections || [];
  const resumenPuebloPayload = buildResumenPuebloPayload();

  const resumenMundoPrompt = resumenMundoPreviewData?.lastPrompt || '';
  const resumenMundoSections = resumenMundoPreviewData?.sections || [];
  const resumenMundoPayload = buildResumenMundoPayload();

  const nuevoLorePrompt = nuevoLorePreviewData?.lastPrompt || '';
  const nuevoLoreSections = nuevoLorePreviewData?.sections || [];
  const nuevoLorePayload = buildNuevoLorePayload();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Router de Triggers</h2>
          <p className="text-muted-foreground">Sistema de envío de prompts a la API de rerouting</p>
        </div>
        <Badge variant="outline">
          <Network className="h-3 w-3 mr-1" />
          {worlds.length} mundos, {pueblos.length} pueblos, {edificios.length} edificios, {npcs.length} NPCs
        </Badge>
      </div>

      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Respuesta del Trigger</DialogTitle>
            <DialogDescription>
              Última respuesta recibida del sistema de triggers
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (response?.request) {
                  const script = generateDenizenScript(response.request);
                  copyToClipboard(script, 'Script Denizen copiado');
                }
              }}
            >
              <Terminal className="h-4 w-4 mr-2" />
              Copiar Script Denizen
            </Button>
            <Button onClick={() => setResponseDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Tabs */}
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
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
          <TabsTrigger value="resumen_general">
            <Layers className="h-4 w-4 mr-2" />
            Resumen General
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
                  <CardTitle>Mensaje del Jugador</CardTitle>
                  <CardDescription>Último mensaje enviado por el jugador (context por mensaje)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={chatForm.mensaje}
                    onChange={(e) => setChatForm({ ...chatForm, mensaje: e.target.value })}
                    placeholder="Escribe aquí el mensaje del jugador..."
                    rows={4}
                  />
                  {chatForm.lastSummary && (
                    <div>
                      <Label>Último Resumen de Sesión</Label>
                      <Textarea
                        value={chatForm.lastSummary}
                        onChange={(e) => setChatForm({ ...chatForm, lastSummary: e.target.value })}
                        placeholder="Resumen de la sesión anterior..."
                        rows={3}
                        className="text-sm bg-muted/50"
                      />
                    </div>
                  )}
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
                    placeholder="Escribe aquí el mensaje del jugador..."
                    rows={4}
                  />
                  {chatForm.lastSummary && (
                    <div>
                      <Label>Último Resumen de Sesión</Label>
                      <Textarea
                        value={chatForm.lastSummary}
                        onChange={(e) => setChatForm({ ...chatForm, lastSummary: e.target.value })}
                        placeholder="Resumen de la sesión anterior..."
                        rows={3}
                        className="text-sm bg-muted/50"
                      />
                    </div>
                  )}
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
                  {previewLoading ? (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Cargando...
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {countTokens(chatPrompt)} tokens / {countWords(chatPrompt)} palabras
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {previewLoading ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">Cargando preview...</p>
                        </div>
                      ) : chatPromptSections.length === 0 ? (
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
                  {chatPromptSections.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(chatPrompt, 'Prompt copiado')}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {copied ? 'Copiado' : 'Copiar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setChatPreviewData(null)}
                      >
                        <Eye className="h-4 w-4" />
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
                disabled={!chatForm.npcid || !chatForm.mensaje}
              >
                <Send className="h-5 w-5 mr-2" />
                Enviar Chat
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Resumen Sesión Trigger */}
        <TabsContent value="resumen_sesion" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Resumen de Sesión</CardTitle>
                <CardDescription>Genera un resumen consolidado del historial de chat de una sesión</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>System Prompt</Label>
                    {resumenSesionTemplateSaved && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <RefreshCw className="h-3 w-3" />
                        Guardado
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={resumenSesionForm.systemPrompt}
                    onChange={(e) => setResumenSesionForm({ ...resumenSesionForm, systemPrompt: e.target.value })}
                    placeholder="Escribe aquí el system prompt personalizado para generar el resumen de la sesión. Puedes usar variables como {{npc.name}}, {{mundo}}, etc..."
                    rows={4}
                    className="text-sm bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Soporta variables primarias y plantillas de Grimorio. Si se deja vacío, se usará el system prompt por defecto.
                  </p>
                  <div className="flex gap-2 mt-2">
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
                      onClick={async () => {
                        try {
                          // Guardar string vacío en la API
                          const response = await fetch('/api/resumen-sesion-trigger-config', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              systemPrompt: ''
                            })
                          });

                          const result = await response.json();

                          if (result.success) {
                            setResumenSesionForm(prev => ({ ...prev, systemPrompt: '' }));
                            setResumenSesionTemplateSaved(false);
                            toast({
                              title: 'Template Eliminado',
                              description: 'El system prompt de resumen de sesión ha sido eliminado'
                            });
                          } else {
                            toast({
                              title: 'Error al Eliminar',
                              description: result.error || 'No se pudo eliminar el system prompt',
                              variant: 'destructive'
                            });
                          }
                        } catch (error) {
                          console.error('[Eliminar Template] Error:', error);
                          toast({
                            title: 'Error al Eliminar',
                            description: 'No se pudo eliminar el system prompt',
                            variant: 'destructive'
                          });
                        }
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Template
                    </Button>
                  </div>
                </div>

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
                      disabled={!resumenSesionForm.npcid}
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
                  <div className="flex items-center justify-between mb-2">
                    <Label>Último Resumen</Label>
                    {resumenSesionForm.lastSummary && (
                      <Badge variant="secondary" className="text-xs">
                        Resumen disponible
                      </Badge>
                    )}
                  </div>
                  {resumenSesionForm.lastSummary ? (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <p className="text-sm whitespace-pre-wrap">{resumenSesionForm.lastSummary}</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-muted/30 text-center">
                      <p className="text-sm text-muted-foreground">
                        Esta sesión no tiene un resumen anterior.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Historial de Chat</Label>
                    {resumenSesionForm.sessionid && (
                      <Badge variant="secondary" className="text-xs">
                        {sessions.find(s => s.id === resumenSesionForm.sessionid)?.messages.length || 0} mensajes
                      </Badge>
                    )}
                  </div>
                  {resumenSesionForm.sessionid ? (
                    <ScrollArea className="border rounded-lg bg-muted/50">
                      <div className="p-4 space-y-3">
                        {(() => {
                          const session = sessions.find(s => s.id === resumenSesionForm.sessionid);
                          if (!session || session.messages.length === 0) {
                            return (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                Esta sesión no tiene mensajes de chat.
                              </p>
                            );
                          }
                          return session.messages.map((msg, index) => (
                            <div key={index} className="border-l-2 border-muted-foreground/20 pl-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={msg.role === 'user' ? 'default' : 'secondary'} className="text-xs">
                                  {msg.role === 'user' ? 'Usuario' : 'Asistente'}
                                </Badge>
                                {msg.timestamp && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(msg.timestamp).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          ));
                        })()}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="border rounded-lg p-6 bg-muted/30 text-center">
                      <p className="text-sm text-muted-foreground">
                        {resumenSesionForm.npcid
                          ? "Selecciona una sesión para ver su historial de chat."
                          : "Selecciona un NPC primero para ver las sesiones disponibles."
                        }
                      </p>
                    </div>
                  )}
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
                  {previewLoading ? (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Cargando...
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {countTokens(resumenSesionPrompt)} tokens / {countWords(resumenSesionPrompt)} palabras
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {previewLoading ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">Cargando preview...</p>
                        </div>
                      ) : resumenSesionSections.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          Selecciona una sesión y completa los campos para ver el prompt
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
                  {resumenSesionSections.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(resumenSesionPrompt, 'Prompt copiado')}
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
                    {countTokens(JSON.stringify(resumenSesionPayload || {}, null, 2))} tokens
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      {JSON.stringify(resumenSesionPayload || {}, null, 2) || '{}'}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={() => resumenSesionPayload && sendRequest('resumen_sesion', resumenSesionPayload)}
                disabled={!resumenSesionForm.npcid || !resumenSesionForm.sessionid}
              >
                <Send className="h-5 w-5 mr-2" />
                Generar Resumen de Sesión
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Resumen NPC Trigger */}
        <TabsContent value="resumen_npc" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Resumen de NPC</CardTitle>
                <CardDescription>Genera un resumen consolidado de todas las sesiones de un NPC</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    placeholder="Escribe aquí el system prompt personalizado para generar el resumen consolidado del NPC. Puedes usar variables como {{npc.name}}, {{mundo}}, etc..."
                    rows={4}
                    className="text-sm bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Soporta variables primarias y plantillas de Grimorio. Si se deja vacío, se usará el system prompt por defecto.
                  </p>
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
                      onClick={async () => {
                        try {
                          // Guardar string vacío en la API
                          const response = await fetch('/api/resumen-npc-trigger-config', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              systemPrompt: ''
                            })
                          });

                          const result = await response.json();

                          if (result.success) {
                            setResumenNPCForm(prev => ({ ...prev, systemPrompt: '' }));
                            setResumenNPCTemplateSaved(false);
                            toast({
                              title: 'Template Eliminado',
                              description: 'El system prompt de resumen NPC ha sido eliminado'
                            });
                          } else {
                            toast({
                              title: 'Error al Eliminar',
                              description: result.error || 'No se pudo eliminar el system prompt',
                              variant: 'destructive'
                            });
                          }
                        } catch (error) {
                          console.error('[Eliminar Template NPC] Error:', error);
                          toast({
                            title: 'Error al Eliminar',
                            description: 'No se pudo eliminar el system prompt',
                            variant: 'destructive'
                          });
                        }
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Template
                    </Button>
                  </div>
                </div>

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
                    <Label>Resúmenes de Sesiones del NPC</Label>
                  </div>
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
                    placeholder="Pega aquí los resúmenes de todas las sesiones de este NPC..."
                    rows={6}
                  />
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
                  {previewLoading ? (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Cargando...
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {countTokens(resumenNPCPrompt)} tokens / {countWords(resumenNPCPrompt)} palabras
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {previewLoading ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">Cargando preview...</p>
                        </div>
                      ) : resumenNPCSections.length === 0 && !resumenNPCPrompt ? (
                        <div className="text-center text-muted-foreground py-8">
                          Selecciona un NPC y completa los campos para ver el prompt
                        </div>
                      ) : resumenNPCSections.length > 0 ? (
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
                      ) : (
                        <div className="rounded-lg border bg-white/50 dark:bg-black/20">
                          <div className="border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 px-3 py-2">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Prompt Completo
                            </span>
                          </div>
                          <pre className="text-sm p-4 whitespace-pre-wrap overflow-x-auto">
                            {resumenNPCPrompt}
                          </pre>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  {(resumenNPCSections.length > 0 || resumenNPCPrompt) && (
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
                    placeholder="Escribe aquí el system prompt personalizado para generar el resumen consolidado del edificio. Puedes usar variables como {{edificio.name}}, {{npcs_count}}, etc..."
                    rows={4}
                    className="text-sm bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Soporta variables primarias y plantillas de Grimorio. Si se deja vacío, se usará el system prompt por defecto.
                  </p>
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
                      onClick={async () => {
                        try {
                          // Guardar string vacío en la API
                          const response = await fetch('/api/resumen-edificio-trigger-config', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              systemPrompt: ''
                            })
                          });

                          const result = await response.json();

                          if (result.success) {
                            setResumenEdificioForm(prev => ({ ...prev, systemPrompt: '' }));
                            setResumenEdificioTemplateSaved(false);
                            toast({
                              title: 'Template Eliminado',
                              description: 'El system prompt de resumen de edificio ha sido eliminado'
                            });
                          } else {
                            toast({
                              title: 'Error al Eliminar',
                              description: result.error || 'No se pudo eliminar el system prompt',
                              variant: 'destructive'
                            });
                          }
                        } catch (error) {
                          console.error('[Eliminar Template Edificio] Error:', error);
                          toast({
                            title: 'Error al Eliminar',
                            description: 'No se pudo eliminar el system prompt',
                            variant: 'destructive'
                          });
                        }
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Template
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
                  {previewLoading ? (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Cargando...
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {countTokens(resumenEdificioPrompt)} tokens / {countWords(resumenEdificioPrompt)} palabras
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {previewLoading ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">Cargando preview...</p>
                        </div>
                      ) : resumenEdificioSections.length === 0 ? (
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
                <CardDescription>Genera un resumen consolidado de todos los edificios del pueblo/nación</CardDescription>
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
                    placeholder="Escribe aquí el system prompt personalizado para generar el resumen consolidado del pueblo/nación. Puedes usar variables como {{pueblo.name}}, {{edificios_count}}, etc..."
                    rows={4}
                    className="text-sm bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Soporta variables primarias y plantillas de Grimorio. Si se deja vacío, se usará el system prompt por defecto.
                  </p>
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
                      onClick={async () => {
                        try {
                          // Guardar string vacío en la API
                          const response = await fetch('/api/resumen-pueblo-trigger-config', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              systemPrompt: ''
                            })
                          });

                          const result = await response.json();

                          if (result.success) {
                            setResumenPuebloForm(prev => ({ ...prev, systemPrompt: '' }));
                            setResumenPuebloTemplateSaved(false);
                            toast({
                              title: 'Template Eliminado',
                              description: 'El system prompt de resumen de pueblo ha sido eliminado'
                            });
                          } else {
                            toast({
                              title: 'Error al Eliminar',
                              description: result.error || 'No se pudo eliminar el system prompt',
                              variant: 'destructive'
                            });
                          }
                        } catch (error) {
                          console.error('[Eliminar Template Pueblo] Error:', error);
                          toast({
                            title: 'Error al Eliminar',
                            description: 'No se pudo eliminar el system prompt',
                            variant: 'destructive'
                          });
                        }
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Template
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
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.descripcion{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblo.estado{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}pueblo.rumores{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables de Edificios:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificios_count{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}edificios_names{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables de Ubicación:</p>
                      <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo.name{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}mundo.rumores{KEY_EXAMPLE_2}</span>
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
                  {previewLoading ? (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Cargando...
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {countTokens(resumenPuebloPrompt)} tokens / {countWords(resumenPuebloPrompt)} palabras
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {previewLoading ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">Cargando preview...</p>
                        </div>
                      ) : resumenPuebloSections.length === 0 ? (
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
                    placeholder="Escribe aquí el system prompt personalizado para generar el resumen consolidado del mundo. Puedes usar variables como {{mundo.name}}, {{pueblos_count}}, etc..."
                    rows={4}
                    className="text-sm bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Soporta variables primarias y plantillas de Grimorio. Si se deja vacío, se usará el system prompt por defecto.
                  </p>
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
                      onClick={async () => {
                        try {
                          // Guardar string vacío en la API
                          const response = await fetch('/api/resumen-mundo-trigger-config', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              systemPrompt: ''
                            })
                          });

                          const result = await response.json();

                          if (result.success) {
                            setResumenMundoForm(prev => ({ ...prev, systemPrompt: '' }));
                            setResumenMundoTemplateSaved(false);
                            toast({
                              title: 'Template Eliminado',
                              description: 'El system prompt de resumen de mundo ha sido eliminado'
                            });
                          } else {
                            toast({
                              title: 'Error al Eliminar',
                              description: result.error || 'No se pudo eliminar el system prompt',
                              variant: 'destructive'
                            });
                          }
                        } catch (error) {
                          console.error('[Eliminar Template Mundo] Error:', error);
                          toast({
                            title: 'Error al Eliminar',
                            description: 'No se pudo eliminar el system prompt',
                            variant: 'destructive'
                          });
                        }
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Template
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
                    placeholder="Pega aquí los resúmenes de todos los pueblos/naciones en este mundo..."
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
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}mundo.estado{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded text-blue-600 dark:text-blue-400">{KEY_EXAMPLE_1}mundo.rumores{KEY_EXAMPLE_2}</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Variables de Pueblos/Naciones:</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblos_count{KEY_EXAMPLE_2}</span>
                        <span className="font-mono bg-background px-2 py-1 rounded">{KEY_EXAMPLE_1}pueblos_names{KEY_EXAMPLE_2}</span>
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
                  {previewLoading ? (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Cargando...
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {countTokens(resumenMundoPrompt)} tokens / {countWords(resumenMundoPrompt)} palabras
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {previewLoading ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">Cargando preview...</p>
                        </div>
                      ) : resumenMundoSections.length === 0 ? (
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
                disabled={!resumenMundoForm.mundoid || !resumenMundoForm.allSummaries}
              >
                <Send className="h-5 w-5 mr-2" />
                Generar Resumen de Mundo
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Nuevo Lore Trigger */}
        <TabsContent value="nuevo_lore" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Nuevo Lore</CardTitle>
                <CardDescription>Genera nuevo lore (rumores, eventos, cambios de estado) para el mundo, pueblo o edificio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Alcance</Label>
                    <Select
                      value={nuevoLoreForm.scope}
                      onValueChange={(v: 'mundo' | 'pueblo' | 'edificio') => setNuevoLoreForm({ ...nuevoLoreForm, scope: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mundo">Mundo</SelectItem>
                        <SelectItem value="pueblo">Pueblo/Nación</SelectItem>
                        <SelectItem value="edificio">Edificio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {nuevoLoreForm.scope === 'mundo' && (
                    <div className="col-span-2">
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
                    <div className="col-span-2">
                      <Label>Pueblo/Nación</Label>
                      <Select
                        value={nuevoLoreForm.pueblid}
                        onValueChange={(v) => setNuevoLoreForm({ ...nuevoLoreForm, pueblid: v })}
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
                  )}

                  {nuevoLoreForm.scope === 'edificio' && (
                    <div className="col-span-2">
                      <Label>Edificio</Label>
                      <Select
                        value={nuevoLoreForm.edificioid}
                        onValueChange={(v) => setNuevoLoreForm({ ...nuevoLoreForm, edificioid: v })}
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
                </div>

                <div>
                  <Label>Tipo de Lore</Label>
                  <Select
                    value={nuevoLoreForm.loreType}
                    onValueChange={(v) => setNuevoLoreForm({ ...nuevoLoreForm, loreType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo de lore" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rumores">Rumores</SelectItem>
                      <SelectItem value="estado">Estado</SelectItem>
                      <SelectItem value="evento">Evento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Contexto</Label>
                  <Textarea
                    value={nuevoLoreForm.context}
                    onChange={(e) => setNuevoLoreForm({ ...nuevoLoreForm, context: e.target.value })}
                    placeholder="Describe el contexto para generar el nuevo lore..."
                    rows={6}
                  />
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
                  {previewLoading ? (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Cargando...
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {countTokens(nuevoLorePrompt)} tokens / {countWords(nuevoLorePrompt)} palabras
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {previewLoading ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">Cargando preview...</p>
                        </div>
                      ) : nuevoLoreSections.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          Selecciona el alcance, el objetivo y completa los campos para ver el prompt
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
                  {nuevoLoreSections.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(nuevoLorePrompt, 'Prompt copiado')}
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
                    {countTokens(JSON.stringify(nuevoLorePayload || {}, null, 2))} tokens
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                      {JSON.stringify(nuevoLorePayload || {}, null, 2) || '{}'}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={() => nuevoLorePayload && sendRequest('nuevo_lore', nuevoLorePayload)}
                disabled={!nuevoLoreForm.scope || !nuevoLoreForm.context}
              >
                <Send className="h-5 w-5 mr-2" />
                Generar Nuevo Lore
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Resumen General */}
        <TabsContent value="resumen_general" className="space-y-4">
          <ResumenGeneral />
        </TabsContent>
      </Tabs>
    </div>
  );
}
