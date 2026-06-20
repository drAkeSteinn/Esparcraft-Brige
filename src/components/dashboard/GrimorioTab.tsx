'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, User, Bot, MapPin, Globe, Plus, Edit2, Trash2, Copy, Eye, Search, X, Book, Info, Database, GitBranch, ChevronDown, AlertTriangle, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import {
  GrimorioCard,
  GrimorioCardType,
  GrimorioCardCategory,
  GrimorioTemplateSubtype,
  ConditionalConfig,
  ConditionalBranch,
  Condition,
  ConditionOperator,
  ConditionCombinator,
  NPC,
  NPCAttribute
} from '@/lib/types';
import { isValidPrimaryVariableKey, isValidTemplateKey, extractTemplateVariables } from '@/lib/grimorioUtils';
import VariablesReference from './VariablesReference';
import VariableTag from './VariableTag';

// Tipos de cards
const TIPOS_CARD = [
  { value: 'variable', label: 'Variable Primaria', icon: Database, color: 'bg-rose-100 text-rose-700', description: 'Solo informativa - documentación de variables del sistema' },
  { value: 'plantilla', label: 'Plantilla', icon: FileText, color: 'bg-fantasy-aged-gold text-fantasy-deep-black', description: 'Reutilizable - puede contener variables primarias y plantillas anidadas' }
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

// Operadores disponibles según el tipo de atributo
// Numéricos: etiquetas descriptivas + símbolo entre paréntesis para claridad
const OPERATORS_NUMERIC: { value: ConditionOperator; label: string }[] = [
  { value: 'gt', label: 'mayor que (>)' },
  { value: 'lt', label: 'menor que (<)' },
  { value: 'gte', label: 'mayor o igual que (≥)' },
  { value: 'lte', label: 'menor o igual que (≤)' },
  { value: 'eq', label: 'igual a (=)' },
  { value: 'neq', label: 'distinto de (≠)' }
];

const OPERATORS_TEXT: { value: ConditionOperator; label: string }[] = [
  { value: 'eq', label: 'es igual a' },
  { value: 'neq', label: 'es distinto de' },
  { value: 'contains', label: 'contiene' },
  { value: 'not_contains', label: 'no contiene' },
  { value: 'starts_with', label: 'empieza con' },
  { value: 'ends_with', label: 'termina con' }
];

// Operadores para atributos tipo 'list'
const OPERATORS_LIST: { value: ConditionOperator; label: string }[] = [
  { value: 'in_list', label: 'es uno de' },
  { value: 'not_in_list', label: 'no es uno de' },
  { value: 'contains', label: 'algún elemento contiene' },
  { value: 'not_contains', label: 'ningún elemento contiene' }
];

// Genera un ID único con fallback
function makeId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Obtiene el nombre de un NPC de forma segura
function getNpcName(npc: NPC): string {
  return npc?.card?.data?.name || npc?.card?.name || npc.id || 'NPC sin nombre';
}

interface GrimorioFormData {
  key: string;
  nombre: string;
  plantilla: string;
  categoria: GrimorioCardCategory;
  tipo: GrimorioCardType;
  descripcion: string;
  templateType: GrimorioTemplateSubtype;
  conditionalConfig: ConditionalConfig | null;
}

export default function GrimorioTab() {
  const [cards, setCards] = useState<GrimorioCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<GrimorioCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingView, setEditingView] = useState(false);
  const [editingCard, setEditingCard] = useState<GrimorioCard | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewCard, setPreviewCard] = useState<GrimorioCard | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [variablesRefOpen, setVariablesRefOpen] = useState(false);
  const [tipoFilter, setTipoFilter] = useState<GrimorioCardType | 'todos'>('todos');

  // Estado para plantillas condicionales
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [npcsLoading, setNpcsLoading] = useState(false);
  const [attributes, setAttributes] = useState<NPCAttribute[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<GrimorioFormData>({
    key: '',
    nombre: '',
    plantilla: '',
    categoria: 'general' as GrimorioCardCategory,
    tipo: 'plantilla' as GrimorioCardType,
    descripcion: '',
    templateType: 'normal',
    conditionalConfig: null
  });

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    filterCards();
  }, [searchQuery, activeTab, cards, tipoFilter]);

  // Cargar NPCs bajo demanda (cuando se abre el modo condicional)
  const fetchNpcs = useCallback(async () => {
    if (npcs.length > 0 || npcsLoading) return;
    setNpcsLoading(true);
    try {
      const response = await fetch('/api/npcs');
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setNpcs(result.data as NPC[]);
      }
    } catch (error) {
      console.error('Error fetching NPCs:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los NPCs',
        variant: 'destructive'
      });
    } finally {
      setNpcsLoading(false);
    }
  }, [npcs.length, npcsLoading]);

  // Cargar atributos del NPC seleccionado
  const fetchAttributes = useCallback(async (npcId: string) => {
    if (!npcId) {
      setAttributes([]);
      return;
    }
    setAttributesLoading(true);
    try {
      const response = await fetch(`/api/npcs/${npcId}/attributes`);
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setAttributes(result.data as NPCAttribute[]);
      } else {
        setAttributes([]);
      }
    } catch (error) {
      console.error('Error fetching NPC attributes:', error);
      setAttributes([]);
    } finally {
      setAttributesLoading(false);
    }
  }, []);

  // Cuando cambia el npcId de la config condicional, recargar atributos
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const npcId = formData.conditionalConfig?.npcId;
    if (formData.templateType === 'condicional' && npcId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAttributes(npcId);
    } else if (!npcId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAttributes([]);
    }
  }, [formData.conditionalConfig?.npcId, formData.templateType]);

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
      descripcion: '',
      templateType: 'normal',
      conditionalConfig: null
    });
    setAttributes([]);
    setEditingView(true);
  };

  const handleEdit = (card: GrimorioCard) => {
    setEditingCard(card);
    setFormData({
      key: card.key,
      nombre: card.nombre,
      plantilla: card.plantilla,
      categoria: card.categoria,
      tipo: card.tipo,
      descripcion: card.descripcion || '',
      templateType: card.templateType || 'normal',
      conditionalConfig: card.conditionalConfig ?? null
    });
    setEditingView(true);
    // Si ya tiene config condicional, pre-cargar NPCs
    if (card.templateType === 'condicional') {
      fetchNpcs();
    }
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
      // Plantillas: key, nombre, plantilla (solo si es normal) y categoria son obligatorios
      const base = ['key', 'nombre', 'categoria', 'tipo'];
      // En modo condicional, la plantilla "normal" no se usa
      if (formData.templateType !== 'condicional') {
        base.push('plantilla');
      }
      return base;
    } else {
      return ['key', 'nombre', 'plantilla', 'categoria', 'tipo'];
    }
  };

  const getMissingFields = () => {
    const requiredFields = getRequiredFields();
    return requiredFields.filter(field => {
      const value = formData[field as keyof GrimorioFormData];
      // Para conditionalConfig, no lo tratamos como string
      if (field === 'conditionalConfig' || field === 'templateType') return false;
      return !value?.toString().trim();
    });
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

      // Validación específica de plantillas condicionales
      const isCondicionalEnabled =
        formData.tipo === 'plantilla' &&
        formData.categoria === 'npc' &&
        formData.templateType === 'condicional';

      let finalConditionalConfig: ConditionalConfig | null = null;
      let finalTemplateType: GrimorioTemplateSubtype = 'normal';

      if (isCondicionalEnabled) {
        const cfg = formData.conditionalConfig;
        if (!cfg || !cfg.npcId) {
          toast({
            title: 'Configuración incompleta',
            description: 'Debes seleccionar un NPC de referencia para la plantilla condicional.',
            variant: 'destructive'
          });
          return;
        }

        // Avisar (sin bloquear) si no hay branches
        if (!cfg.branches || cfg.branches.length === 0) {
          toast({
            title: 'Sin branches',
            description: 'No has añadido ningún branch. Solo se usará la plantilla por defecto.',
            variant: 'default'
          });
        }

        finalConditionalConfig = cfg;
        finalTemplateType = 'condicional';
      } else {
        // ✅ Plantillas anidadas PERMITIDAS: solo informamos al usuario
        const nestedTemplates = extractTemplateVariables(formData.plantilla);
        if (nestedTemplates.length > 0) {
          toast({
            title: 'Plantillas anidadas detectadas',
            description: `Se resolverán en cascada (máx 10 niveles): ${nestedTemplates.map(t => `"${t}"`).join(', ')}`,
          });
        }
        finalConditionalConfig = null;
        finalTemplateType = 'normal';
      }

      const url = editingCard ? `/api/grimorio/${editingCard.id}` : '/api/grimorio';
      const method = editingCard ? 'PUT' : 'POST';

      // Construir body: el backend guarda plantilla='' para condicionales
      // (la configuración se persiste en conditionalConfig). Enviamos igualmente
      // el JSON en plantilla por compatibilidad hacia atrás / debugging.
      const body: Record<string, unknown> = {
        key: formData.key,
        nombre: formData.nombre,
        plantilla: isCondicionalEnabled
          ? (formData.conditionalConfig ? JSON.stringify(formData.conditionalConfig) : '')
          : formData.plantilla,
        categoria: formData.categoria,
        tipo: formData.tipo,
        templateType: finalTemplateType,
        conditionalConfig: finalConditionalConfig,
        descripcion: formData.descripcion
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: editingCard ? 'Plantilla actualizada' : 'Plantilla creada'
        });

        // Mostrar advertencias si las hay
        if (result.validations?.warnings && result.validations.warnings.length > 0) {
          result.validations.warnings.forEach((warning: string) => {
            toast({
              title: 'Advertencia',
              description: warning,
              variant: 'default'
            });
          });
        }

        setEditingView(false);
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
      const context: Record<string, unknown> = {
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

      // Si la card es condicional, pasar el npc.npcid para que se resuelva
      if (card.templateType === 'condicional' && card.conditionalConfig?.npcId) {
        context.npc = { npcid: card.conditionalConfig.npcId };
      }

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
          description: result.error || 'No se pudo generar el preview',
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

  // ============================================
  // HELPERS PARA PLANTILLAS CONDICIONALES
  // ============================================

  const isCondicionalAvailable = () => {
    return formData.categoria === 'npc' && formData.tipo === 'plantilla';
  };

  const switchTemplateType = (type: GrimorioTemplateSubtype) => {
    if (type === 'condicional') {
      // Inicializar config si es null
      fetchNpcs();
      const newConfig: ConditionalConfig = formData.conditionalConfig ?? {
        npcId: '',
        branches: [],
        defaultTemplate: ''
      };
      setFormData(prev => ({ ...prev, templateType: 'condicional', conditionalConfig: newConfig }));
    } else {
      setFormData(prev => ({ ...prev, templateType: 'normal' }));
    }
  };

  const updateConditionalConfig = (patch: Partial<ConditionalConfig>) => {
    setFormData(prev => ({
      ...prev,
      conditionalConfig: prev.conditionalConfig
        ? { ...prev.conditionalConfig, ...patch }
        : { npcId: '', branches: [], defaultTemplate: '', ...patch }
    }));
  };

  const addBranch = () => {
    const newBranch: ConditionalBranch = {
      id: makeId(),
      name: '',
      combinator: 'AND',
      conditions: [],
      template: ''
    };
    updateConditionalConfig({
      branches: [...(formData.conditionalConfig?.branches ?? []), newBranch]
    });
  };

  const updateBranch = (branchId: string, patch: Partial<ConditionalBranch>) => {
    const branches = (formData.conditionalConfig?.branches ?? []).map(b =>
      b.id === branchId ? { ...b, ...patch } : b
    );
    updateConditionalConfig({ branches });
  };

  const removeBranch = (branchId: string) => {
    const branches = (formData.conditionalConfig?.branches ?? []).filter(b => b.id !== branchId);
    updateConditionalConfig({ branches });
  };

  const addCondition = (branchId: string) => {
    const branches = (formData.conditionalConfig?.branches ?? []).map(b => {
      if (b.id !== branchId) return b;
      const firstAttr = attributes[0];
      const newCond: Condition = {
        id: makeId(),
        attributeKey: firstAttr?.key ?? '',
        // Operador default según tipo: numeric→gt, list→in_list, text→eq
        operator: firstAttr?.type === 'numeric' ? 'gt' : firstAttr?.type === 'list' ? 'in_list' : 'eq',
        value: ''
      };
      return { ...b, conditions: [...b.conditions, newCond] };
    });
    updateConditionalConfig({ branches });
  };

  const updateCondition = (branchId: string, condId: string, patch: Partial<Condition>) => {
    const branches = (formData.conditionalConfig?.branches ?? []).map(b => {
      if (b.id !== branchId) return b;
      return {
        ...b,
        conditions: b.conditions.map(c => (c.id === condId ? { ...c, ...patch } : c))
      };
    });
    updateConditionalConfig({ branches });
  };

  const removeCondition = (branchId: string, condId: string) => {
    const branches = (formData.conditionalConfig?.branches ?? []).map(b => {
      if (b.id !== branchId) return b;
      return { ...b, conditions: b.conditions.filter(c => c.id !== condId) };
    });
    updateConditionalConfig({ branches });
  };

  const getAttrByKey = (key: string): NPCAttribute | undefined => {
    return attributes.find(a => a.key === key);
  };

  const getOperatorsForAttr = (attr: NPCAttribute | undefined) => {
    if (!attr) return OPERATORS_TEXT;
    if (attr.type === 'numeric') return OPERATORS_NUMERIC;
    if (attr.type === 'list') return OPERATORS_LIST;
    return OPERATORS_TEXT;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando plantillas del grimorio...</p>
      </div>
    );
  }

  // ✅ VISTA DE EDICIÓN (inline, no dialog) — sigue el patrón del NpcsTab
  // Header sticky + sidebar de tabs verticales + contenido scrolleable
  if (editingView) {
    const isCondicional = formData.templateType === 'condicional';
    const isVariable = formData.tipo === 'variable';
    const editorTitle = editingCard
      ? (isVariable ? 'Editar Variable Primaria' : `Editar ${isCondicional ? 'Plantilla Condicional' : 'Plantilla'}`)
      : (isVariable ? 'Crear Nueva Variable Primaria' : 'Crear Nueva Plantilla');
    const editorSubtitle = editingCard
      ? 'Actualiza la información de la plantilla'
      : (isVariable ? 'Documentación de variables del sistema' : 'Completa los campos para crear una plantilla reutilizable');

    return (
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Header sticky con Volver + título + Cancelar/Guardar */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setEditingView(false)}>
              ← Volver
            </Button>
            <div>
              <h2 className="text-xl font-bold">{editorTitle}</h2>
              <p className="text-sm text-muted-foreground">{editorSubtitle}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingView(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>
              {editingCard ? 'Actualizar' : 'Crear'} {isVariable ? 'Variable' : 'Plantilla'}
            </Button>
          </div>
        </div>

        {/* Body: sidebar de tabs verticales + contenido scrolleable */}
        <Tabs defaultValue="basic" className="flex flex-row gap-4 flex-1 min-h-0 w-full">
          <div className="w-52 flex-shrink-0 border-r pr-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-2">Secciones</p>
            <TabsList className="flex flex-col h-auto gap-1 bg-transparent p-2 w-full">
              <TabsTrigger value="basic" className="justify-start w-full data-[state=active]:bg-accent">Básico</TabsTrigger>
              {isCondicionalAvailable() && (
                <TabsTrigger value="tipo" className="justify-start w-full data-[state=active]:bg-accent">
                  <GitBranch className="h-3 w-3 mr-1.5" /> Tipo
                </TabsTrigger>
              )}
              {isCondicional && (
                <TabsTrigger value="condicional" className="justify-start w-full data-[state=active]:bg-accent">
                  <GitBranch className="h-3 w-3 mr-1.5" /> Condicional
                </TabsTrigger>
              )}
              <TabsTrigger value="descripcion" className="justify-start w-full data-[state=active]:bg-accent">Descripción</TabsTrigger>
              <TabsTrigger value="info" className="justify-start w-full data-[state=active]:bg-accent">
                <Info className="h-3 w-3 mr-1.5" /> Info
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-2">
            {/* TAB: BÁSICO — Categoría + Key + Nombre + Plantilla normal */}
            <TabsContent value="basic" className="mt-0 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value: GrimorioCardCategory) => {
                      if (value !== 'npc' && formData.templateType === 'condicional') {
                        setFormData(prev => ({ ...prev, categoria: value, templateType: 'normal' }));
                      } else {
                        setFormData({ ...formData, categoria: value });
                      }
                    }}
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
                <div className="space-y-2">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="key">Key (identificador único) *</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="ej: user_data, quest_info"
                  disabled={formData.tipo === 'variable' && !!editingCard}
                  className="font-mono"
                />
                {formData.tipo === 'plantilla' && (
                  <p className="text-xs text-fantasy-aged-gold mt-1">
                    El nombre simple sin puntos para usar en plantillas. Se usará como <code className="font-mono">{`{{${formData.key || 'key'}}}`}</code>
                  </p>
                )}
              </div>

              {/* Plantilla normal (textarea) — solo si NO es condicional */}
              {formData.tipo === 'plantilla' && !isCondicional && (
                <div className="space-y-2">
                  <Label htmlFor="plantilla">Plantilla *</Label>
                  <Textarea
                    id="plantilla"
                    value={formData.plantilla}
                    onChange={(e) => setFormData({ ...formData, plantilla: e.target.value })}
                    placeholder="DATOS DEL AVENTURERO&#10;Nombre: {{jugador.nombre}}..."
                    className="min-h-64 font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa <code className="font-mono">{`{{variable}}`}</code> para variables primarias (jugador.*, npc.*, etc.) o plantillas anidadas.
                  </p>
                </div>
              )}

              {/* Si es condicional, mostrar hint en lugar del textarea */}
              {formData.tipo === 'plantilla' && isCondicional && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-800 text-sm">
                  <div className="flex items-start gap-2">
                    <GitBranch className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Plantilla Condicional activa</p>
                      <p className="text-xs mt-1">
                        La configuración de branches y condiciones se edita en la pestaña <strong>Condicional</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB: TIPO — Toggle Normal vs Condicional */}
            {isCondicionalAvailable() && (
              <TabsContent value="tipo" className="mt-0 p-6 space-y-4">
                <div className="bg-fantasy-deep-black/40 rounded-lg p-6 border border-fantasy-textured space-y-4 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-amber-400" />
                    <Label className="text-base font-semibold cursor-default">Tipo de Plantilla</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Las plantillas <strong>condicionales</strong> resuelven distinto texto según los atributos
                    actuales del NPC (ej: vida baja, raza, alineamiento). El primer branch que coincida se inyecta;
                    si ninguno coincide, se usa la plantilla por defecto.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant={formData.templateType === 'normal' ? 'default' : 'outline'}
                      onClick={() => switchTemplateType('normal')}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Normal
                    </Button>
                    <Button
                      type="button"
                      variant={formData.templateType === 'condicional' ? 'default' : 'outline'}
                      onClick={() => switchTemplateType('condicional')}
                      className="flex-1"
                    >
                      <GitBranch className="h-4 w-4 mr-2" />
                      Condicional
                    </Button>
                  </div>
                  {isCondicional && (
                    <div className="pt-4 border-t border-fantasy-textured">
                      <p className="text-xs text-fantasy-aged-gold">
                        ✅ Plantilla condicional activa. Configura los branches en la pestaña <strong>Condicional</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {/* TAB: CONDICIONAL — Builder de branches */}
            {isCondicional && (
              <TabsContent value="condicional" className="mt-0 p-6 space-y-4">
                <ConditionalBuilder
                  formData={formData}
                  npcs={npcs}
                  npcsLoading={npcsLoading}
                  attributes={attributes}
                  attributesLoading={attributesLoading}
                  onUpdateConfig={updateConditionalConfig}
                  onAddBranch={addBranch}
                  onUpdateBranch={updateBranch}
                  onRemoveBranch={removeBranch}
                  onAddCondition={addCondition}
                  onUpdateCondition={updateCondition}
                  onRemoveCondition={removeCondition}
                  getAttrByKey={getAttrByKey}
                  getOperatorsForAttr={getOperatorsForAttr}
                />
              </TabsContent>
            )}

            {/* TAB: DESCRIPCIÓN */}
            <TabsContent value="descripcion" className="mt-0 p-6 space-y-4">
              <div className="space-y-2 max-w-3xl">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder={isVariable ? 'Describe para qué sirve esta variable del sistema...' : 'Describe para qué sirve esta plantilla...'}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Descripción opcional para documentar el propósito de la plantilla.
                </p>
              </div>
            </TabsContent>

            {/* TAB: INFO — Mensajes informativos y ayuda */}
            <TabsContent value="info" className="mt-0 p-6 space-y-4">
              {isVariable && editingCard && (
                <div className="bg-fantasy-deep-black rounded-lg p-4 border border-fantasy-textured max-w-3xl">
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

              <div className="bg-fantasy-deep-black rounded-lg p-4 border border-fantasy-textured max-w-3xl">
                <div className="flex items-center gap-2 mb-3">
                  <Book className="h-4 w-4 text-fantasy-aged-gold" />
                  <h3 className="text-sm font-semibold text-fantasy-aged-gold">Variables Disponibles</h3>
                </div>
                <div className="text-xs text-foreground space-y-3">
                  <div>
                    <p className="font-medium text-fantasy-aged-gold mb-1">Variables primarias:</p>
                    <ul className="space-y-1 pl-4">
                      <li><code className="font-mono">{`{{jugador.nombre}}`}</code>, <code className="font-mono">{`{{jugador.nivel}}`}</code>, <code className="font-mono">{`{{jugador.raza}}`}</code>...</li>
                      <li><code className="font-mono">{`{{npc.description}}`}</code>, <code className="font-mono">{`{{npc.personality}}`}</code>...</li>
                      <li><code className="font-mono">{`{{mundo.name}}`}</code>, <code className="font-mono">{`{{pueblo.name}}`}</code>, <code className="font-mono">{`{{edificio.name}}`}</code></li>
                      <li><code className="font-mono">{`{{char}}`}</code>, <code className="font-mono">{`{{mensaje}}`}</code>, <code className="font-mono">{`{{lastSummary}}`}</code></li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-fantasy-aged-gold mb-1">Plantillas anidadas:</p>
                    <p>Puedes incluir <code className="font-mono">{`{{otra_plantilla}}`}</code> dentro de una plantilla. Se resolverán en cascada (máx 10 niveles).</p>
                  </div>
                  <div>
                    <p className="font-medium text-fantasy-aged-gold mb-1">Atributos de NPC:</p>
                    <p>Los atributos definidos en el NPC (fuerza, vida, etc.) se resuelven con <code className="font-mono">{`{{key_del_atributo}}`}</code>.</p>
                  </div>
                </div>
              </div>

              {isCondicional && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-800 max-w-3xl">
                  <div className="flex items-start gap-2">
                    <GitBranch className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <h4 className="font-semibold">Plantilla Condicional</h4>
                      <p className="text-sm">
                        Esta plantilla resuelve distinto texto según los atributos del NPC. Configura los branches en la pestaña <strong>Condicional</strong>.
                        Cuando se inyecte <code className="font-mono">{`{{${formData.key || 'key'}}}`}</code> en el prompt, se evaluarán las condiciones en orden y se usará el primer branch que coincida.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
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
                            {tipoInfo.value === 'plantilla' && card.templateType === 'condicional' && (
                              <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 text-xs" title="Plantilla condicional">
                                <GitBranch className="h-3 w-3 mr-1" />
                                Condicional
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
                            {card.templateType === 'condicional' ? (
                              <div className="bg-fantasy-deep-black rounded-lg p-4 mb-3 border-2 border-fantasy-textured">
                                <div className="flex items-center gap-2 mb-2">
                                  <GitBranch className="h-4 w-4 text-amber-400" />
                                  <span className="text-xs font-semibold text-amber-400">
                                    {card.conditionalConfig?.branches.length ?? 0} branch(es) · Default activo
                                  </span>
                                </div>
                                <pre className="text-xs whitespace-pre-wrap break-words max-h-32 overflow-y-auto text-foreground">
                                  {card.conditionalConfig?.defaultTemplate || '(vacío)'}
                                </pre>
                              </div>
                            ) : (
                              <div className="bg-fantasy-deep-black rounded-lg p-4 mb-3 border-2 border-fantasy-textured">
                                <pre className="text-xs whitespace-pre-wrap break-words max-h-32 overflow-y-auto text-foreground">
                                  {card.plantilla}
                                </pre>
                              </div>
                            )}
                            <div className="mt-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleCopyTemplate(
                                    card.templateType === 'condicional'
                                      ? (card.conditionalConfig?.defaultTemplate || '')
                                      : card.plantilla,
                                    card.nombre
                                  )
                                }
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

// ============================================
// COMPONENTE: BUILDER DE PLANTILLA CONDICIONAL
// ============================================

interface ConditionalBuilderProps {
  formData: GrimorioFormData;
  npcs: NPC[];
  npcsLoading: boolean;
  attributes: NPCAttribute[];
  attributesLoading: boolean;
  onUpdateConfig: (patch: Partial<ConditionalConfig>) => void;
  onAddBranch: () => void;
  onUpdateBranch: (branchId: string, patch: Partial<ConditionalBranch>) => void;
  onRemoveBranch: (branchId: string) => void;
  onAddCondition: (branchId: string) => void;
  onUpdateCondition: (branchId: string, condId: string, patch: Partial<Condition>) => void;
  onRemoveCondition: (branchId: string, condId: string) => void;
  getAttrByKey: (key: string) => NPCAttribute | undefined;
  getOperatorsForAttr: (attr: NPCAttribute | undefined) => { value: ConditionOperator; label: string }[];
}

function ConditionalBuilder({
  formData,
  npcs,
  npcsLoading,
  attributes,
  attributesLoading,
  onUpdateConfig,
  onAddBranch,
  onUpdateBranch,
  onRemoveBranch,
  onAddCondition,
  onUpdateCondition,
  onRemoveCondition,
  getAttrByKey,
  getOperatorsForAttr
}: ConditionalBuilderProps) {
  const cfg = formData.conditionalConfig;

  if (!cfg) {
    return (
      <div className="rounded-lg p-4 border border-amber-400 bg-amber-50 text-amber-900 text-sm">
        Configuración condicional no inicializada.
      </div>
    );
  }

  const selectedNpc = npcs.find(n => n.id === cfg.npcId);

  return (
    <div className="space-y-4 rounded-lg border border-fantasy-textured bg-fantasy-deep-black/30 p-4">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-400">Constructor de Plantilla Condicional</h3>
      </div>

      {/* Selector de NPC de referencia */}
      <div className="space-y-2">
        <Label htmlFor="npc-ref" className="text-xs">
          NPC de referencia *
        </Label>
        <Select
          value={cfg.npcId}
          onValueChange={(value) => onUpdateConfig({ npcId: value })}
        >
          <SelectTrigger id="npc-ref" className="w-full">
            <SelectValue placeholder={npcsLoading ? 'Cargando NPCs...' : 'Selecciona un NPC'} />
          </SelectTrigger>
          <SelectContent>
            {npcs.length === 0 && !npcsLoading && (
              <SelectItem value="_empty" disabled>
                No hay NPCs disponibles
              </SelectItem>
            )}
            {npcs.map((npc) => (
              <SelectItem key={npc.id} value={npc.id}>
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <span>{getNpcName(npc)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Los atributos de este NPC estarán disponibles para las condiciones.
        </p>
      </div>

      <Separator className="bg-fantasy-textured" />

      {/* Lista de branches */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-foreground">
              Branches ({cfg.branches.length})
            </h4>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onAddBranch} disabled={!cfg.npcId}>
            <Plus className="h-3 w-3 mr-1" />
            Añadir branch
          </Button>
        </div>

        {!cfg.npcId && (
          <p className="text-xs text-amber-500 italic">
            Selecciona un NPC de referencia para empezar a añadir branches.
          </p>
        )}

        {cfg.branches.length === 0 && cfg.npcId && (
          <div className="text-center py-6 border border-dashed border-fantasy-textured rounded-lg">
            <p className="text-sm text-muted-foreground">No hay branches configurados.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Si no añades branches, solo se usará la plantilla por defecto.
            </p>
          </div>
        )}

        {cfg.branches.map((branch, idx) => (
          <BranchEditor
            key={branch.id}
            branch={branch}
            index={idx}
            attributes={attributes}
            attributesLoading={attributesLoading}
            selectedNpcName={selectedNpc ? getNpcName(selectedNpc) : undefined}
            onUpdate={(patch) => onUpdateBranch(branch.id, patch)}
            onRemove={() => onRemoveBranch(branch.id)}
            onAddCondition={() => onAddCondition(branch.id)}
            onUpdateCondition={(condId, patch) => onUpdateCondition(branch.id, condId, patch)}
            onRemoveCondition={(condId) => onRemoveCondition(branch.id, condId)}
            getAttrByKey={getAttrByKey}
            getOperatorsForAttr={getOperatorsForAttr}
          />
        ))}
      </div>

      <Separator className="bg-fantasy-textured" />

      {/* Plantilla por defecto */}
      <div className="space-y-2">
        <Label htmlFor="default-template" className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-400" />
          Plantilla por defecto (si ninguna condición aplica)
        </Label>
        <Textarea
          id="default-template"
          value={cfg.defaultTemplate}
          onChange={(e) => onUpdateConfig({ defaultTemplate: e.target.value })}
          placeholder="Texto que se inyectará si ningún branch coincide..."
          className="min-h-24 font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Esta plantilla admite variables primarias (jugador.*, npc.*, etc.) y plantillas anidadas.
        </p>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: EDITOR DE UN BRANCH
// ============================================

interface BranchEditorProps {
  branch: ConditionalBranch;
  index: number;
  attributes: NPCAttribute[];
  attributesLoading: boolean;
  selectedNpcName?: string;
  onUpdate: (patch: Partial<ConditionalBranch>) => void;
  onRemove: () => void;
  onAddCondition: () => void;
  onUpdateCondition: (condId: string, patch: Partial<Condition>) => void;
  onRemoveCondition: (condId: string) => void;
  getAttrByKey: (key: string) => NPCAttribute | undefined;
  getOperatorsForAttr: (attr: NPCAttribute | undefined) => { value: ConditionOperator; label: string }[];
}

function BranchEditor({
  branch,
  index,
  attributes,
  attributesLoading,
  selectedNpcName,
  onUpdate,
  onRemove,
  onAddCondition,
  onUpdateCondition,
  onRemoveCondition,
  getAttrByKey,
  getOperatorsForAttr
}: BranchEditorProps) {
  return (
    <Card className="border border-fantasy-textured bg-fantasy-deep-black/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">
                Branch {index + 1}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Orden de evaluación: {index + 1}
              </span>
            </div>
            <Input
              value={branch.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Nombre del branch (ej: Vida baja, Aliado herido)"
              className="text-sm h-8"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="text-destructive hover:text-destructive h-8 w-8 p-0"
            title="Eliminar branch"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Combinador */}
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs">Combinar condiciones con:</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={branch.combinator === 'AND' ? 'default' : 'outline'}
              onClick={() => onUpdate({ combinator: 'AND' })}
              className="h-7 px-3 text-xs"
            >
              AND (todas)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={branch.combinator === 'OR' ? 'default' : 'outline'}
              onClick={() => onUpdate({ combinator: 'OR' })}
              className="h-7 px-3 text-xs"
            >
              OR (alguna)
            </Button>
          </div>
        </div>

        {/* Lista de condiciones */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Condiciones ({branch.conditions.length})</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAddCondition}
              disabled={attributes.length === 0}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Añadir condición
            </Button>
          </div>

          {attributesLoading && (
            <p className="text-xs text-muted-foreground italic">Cargando atributos del NPC...</p>
          )}

          {!attributesLoading && attributes.length === 0 && (
            <p className="text-xs text-amber-500 italic">
              {selectedNpcName
                ? `"${selectedNpcName}" no tiene atributos configurados. Añade atributos al NPC antes.`
                : 'Selecciona un NPC con atributos.'}
            </p>
          )}

          {branch.conditions.map((cond) => {
            const attr = getAttrByKey(cond.attributeKey);
            const operators = getOperatorsForAttr(attr);
            const attrMissing = !!cond.attributeKey && !attr;
            // Para atributos tipo 'list', parsear las opciones del valueText
            const listOptions: string[] = attr?.type === 'list'
              ? (attr.valueText ?? '').split(',').map(s => s.trim()).filter(s => s.length > 0)
              : [];
            return (
              <div
                key={cond.id}
                className="flex flex-wrap items-end gap-2 rounded-md border border-fantasy-textured bg-fantasy-deep-black/50 p-2"
              >
                {/* Attribute select */}
                <div className="flex-1 min-w-[160px] space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Atributo</Label>
                  <Select
                    value={cond.attributeKey}
                    onValueChange={(value) => {
                      const newAttr = attributes.find(a => a.key === value);
                      // Si cambia a un atributo de tipo distinto, resetear operador y value
                      const currentAttr = getAttrByKey(cond.attributeKey);
                      const needsReset =
                        !currentAttr ||
                        !newAttr ||
                        currentAttr.type !== newAttr.type;
                      onUpdateCondition(cond.id, {
                        attributeKey: value,
                        operator: needsReset
                          ? (newAttr?.type === 'numeric' ? 'gt' : newAttr?.type === 'list' ? 'in_list' : 'eq')
                          : cond.operator,
                        // Reset value si cambia de tipo (el valor anterior puede no aplicar)
                        value: needsReset ? '' : cond.value
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Atributo" />
                    </SelectTrigger>
                    <SelectContent>
                      {attributes.map((a) => (
                        <SelectItem key={a.id} value={a.key}>
                          <div className="flex items-center gap-2 text-xs">
                            <span>{a.name}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                a.type === 'numeric'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : a.type === 'list'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              {a.key} · {a.type === 'numeric' ? 'numérico' : a.type === 'list' ? 'lista' : 'texto'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Operator select */}
                <div className="min-w-[140px] space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Operador</Label>
                  <Select
                    value={cond.operator}
                    onValueChange={(value) => onUpdateCondition(cond.id, { operator: value as ConditionOperator })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Op" />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          <span className="text-xs">{op.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value input / select */}
                <div className="flex-1 min-w-[120px] space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">
                    {attr?.type === 'numeric' ? 'Valor numérico' : attr?.type === 'list' ? 'Valor de la lista' : 'Valor de texto'}
                  </Label>
                  {attr?.type === 'list' ? (
                    listOptions.length > 0 ? (
                      <Select
                        value={cond.value}
                        onValueChange={(value) => onUpdateCondition(cond.id, { value })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                        <SelectContent>
                          {listOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              <span className="text-xs">{opt}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={cond.value}
                        disabled
                        placeholder="La lista está vacía"
                        className="h-8 text-xs"
                      />
                    )
                  ) : (
                    <Input
                      value={cond.value}
                      onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                      placeholder={attr?.type === 'numeric' ? 'ej: 50' : 'ej: Humano'}
                      className="h-8 text-xs"
                      type={attr?.type === 'numeric' ? 'number' : 'text'}
                    />
                  )}
                </div>

                {/* Delete condition */}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveCondition(cond.id)}
                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  title="Eliminar condición"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>

                {/* Warning: attribute no longer exists */}
                {attrMissing && (
                  <div className="w-full flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-300 rounded px-2 py-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>
                      El atributo <code className="font-mono">{cond.attributeKey}</code> ya no existe
                      en el NPC. Esta condición será ignorada al resolver.
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {branch.conditions.length === 0 && attributes.length > 0 && !attributesLoading && (
            <p className="text-xs text-muted-foreground italic px-2">
              Sin condiciones. Un branch sin condiciones NUNCA coincide (requiere al menos una condición verdadera).
            </p>
          )}
        </div>

        <Separator className="bg-fantasy-textured my-1" />

        {/* Template del branch */}
        <div className="space-y-1">
          <Label htmlFor={`branch-template-${branch.id}`} className="text-xs font-semibold">
            Plantilla (si este branch coincide)
          </Label>
          <Textarea
            id={`branch-template-${branch.id}`}
            value={branch.template}
            onChange={(e) => onUpdate({ template: e.target.value })}
            placeholder="Texto a inyectar cuando este branch coincida..."
            className="min-h-20 text-xs font-mono"
          />
        </div>
      </CardContent>
    </Card>
  );
}
