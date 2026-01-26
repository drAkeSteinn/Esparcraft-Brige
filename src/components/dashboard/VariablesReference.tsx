'use client';

import { useState } from 'react';
import { FileText, User, Bot, MapPin, Globe, Copy, Check, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';

interface VariableItem {
  key: string;
  description: string;
  example?: string;
}

interface VariableCategory {
  id: string;
  label: string;
  icon: any;
  color: string;
  variables: VariableItem[];
}

// Definición completa de variables disponibles
const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    id: 'jugador',
    label: 'Jugador',
    icon: User,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    variables: [
      { key: '{{jugador.nombre}}', description: 'Nombre del jugador', example: 'drAke' },
      { key: '{{jugador.raza}}', description: 'Raza del jugador', example: 'Humano' },
      { key: '{{jugador.nivel}}', description: 'Nivel del jugador', example: '10' },
      { key: '{{jugador.salud_actual}}', description: 'Estado de salud actual', example: '100%' },
      { key: '{{jugador.reputacion}}', description: 'Puntuación de reputación', example: '6' },
      { key: '{{jugador.almakos}}', description: 'Cantidad de Almakos', example: '1000' },
      { key: '{{jugador.deuda}}', description: 'Deuda actual', example: '100' },
      { key: '{{jugador.piedras_del_alma}}', description: 'Piedras del Alma', example: '5' },
      { key: '{{jugador.hora}}', description: 'Hora actual', example: '10:30pm' },
      { key: '{{jugador.clima}}', description: 'Clima actual', example: 'soleado' },
      { key: '{{jugador.mensaje}}', description: 'Mensaje del jugador', example: 'Hola' }
    ]
  },
  {
    id: 'npc',
    label: 'NPC',
    icon: Bot,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    variables: [
      { key: '{{npc.name}}', description: 'Nombre del NPC', example: 'Guardo' },
      { key: '{{npc.description}}', description: 'Descripción del NPC', example: 'Un guardia amigable' },
      { key: '{{npc.personality}}', description: 'Personalidad del NPC', example: 'Amable y servicial' },
      { key: '{{npc.scenario}}', description: 'Escenario del NPC', example: 'Entrada del pueblo' },
      { key: '{{npc.historial}}', description: 'Historial del NPC', example: 'Historia previa' }
    ]
  },
  {
    id: 'ubicacion',
    label: 'Ubicación',
    icon: MapPin,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    variables: [
      { key: '{{mundo}}', description: 'Nombre del mundo', example: 'Esparcraft' },
      { key: '{{pueblo}}', description: 'Nombre del pueblo', example: 'Esparcraft Village' },
      { key: '{{edificio}}', description: 'Nombre del edificio', example: 'Granja de la Comarca' }
    ]
  },
  {
    id: 'mundo',
    label: 'Mundo',
    icon: Globe,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    variables: [
      { key: '{{mundo.estado}}', description: 'Estado actual del mundo', example: 'Paz y prosperidad' },
      { key: '{{mundo.rumores}}', description: 'Rumores del mundo', example: 'Nuevas aventuras...' }
    ]
  },
  {
    id: 'pueblo',
    label: 'Pueblo',
    icon: FileText,
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    variables: [
      { key: '{{pueblo.name}}', description: 'Nombre del pueblo', example: 'Esparcraft Village' },
      { key: '{{pueblo.tipo}}', description: 'Tipo de pueblo', example: 'Village' },
      { key: '{{pueblo.descripcion}}', description: 'Descripción del pueblo', example: 'Un pueblo tranquilo' },
      { key: '{{pueblo.estado}}', description: 'Estado del pueblo', example: 'Activo' },
      { key: '{{pueblo.rumores}}', description: 'Rumores del pueblo', example: 'Eventos locales...' }
    ]
  },
  {
    id: 'edificio',
    label: 'Edificio',
    icon: FileText,
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
    variables: [
      { key: '{{edificio.name}}', description: 'Nombre del edificio', example: 'Granja de la Comarca' },
      { key: '{{edificio.descripcion}}', description: 'Descripción del edificio', example: 'Tienda de comercio' },
      { key: '{{edificio.eventos}}', description: 'Eventos del edificio', example: 'Venta especial' },
      { key: '{{edificio.poislist}}', description: 'Lista de POIs', example: 'Puntos de interés...' }
    ]
  },
  {
    id: 'abreviadas',
    label: 'Abreviadas',
    icon: FileText,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    variables: [
      { key: '{{nombre}}', description: 'Alias corto para jugador.nombre', example: 'drAke' },
      { key: '{{raza}}', description: 'Alias corto para jugador.raza', example: 'Humano' },
      { key: '{{nivel}}', description: 'Alias corto para jugador.nivel', example: '10' },
      { key: '{{salud}}', description: 'Alias corto para jugador.salud_actual', example: '100%' },
      { key: '{{npc}}', description: 'Alias corto para npc.name', example: 'Guardo' },
      { key: '{{playername}}', description: 'Alias corto para jugador.nombre', example: 'drAke' }
    ]
  }
];

interface VariablesReferenceProps {
  open?: boolean;
  onClose?: () => void;
  defaultTab?: string;
}

export default function VariablesReference({ open, onClose, defaultTab = 'jugador' }: VariablesReferenceProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  const handleCopy = async (variable: string) => {
    try {
      await navigator.clipboard.writeText(variable);
      setCopiedVariable(variable);
      toast({
        title: 'Copiado',
        description: `Variable "${variable}" copiada al portapapeles`
      });

      setTimeout(() => {
        setCopiedVariable(null);
      }, 2000);
    } catch (error) {
      console.error('Error copying variable:', error);
    }
  };

  const VariableItem = ({ item }: { item: VariableItem }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isCopied = copiedVariable === item.key;

    return (
      <Card className="border">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 break-all">
              {item.key}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(item.key)}
              className="shrink-0"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 justify-between h-8 text-xs"
              >
                <div className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {item.description}
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-2 rounded">
                {item.description && (
                  <p>
                    <strong>Descripción:</strong> {item.description}
                  </p>
                )}
                {item.example && (
                  <p>
                    <strong>Ejemplo:</strong> {item.example}
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Referencia de Variables</h2>
          <p className="text-sm text-muted-foreground">
            Variables disponibles para usar en plantillas del Grimorio
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {VARIABLE_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-1 text-xs">
              <cat.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {VARIABLE_CATEGORIES.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <category.icon className={`h-5 w-5 ${category.color.split(' ')[1]}`} />
                  <CardTitle>Variables de {category.label}</CardTitle>
                </div>
                <CardDescription>
                  {category.variables.length} variables disponibles en esta categoría
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.variables.map((item) => (
                    <VariableItem key={item.key} item={item} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Cómo usar las variables
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Usa las variables en tus plantillas del Grimorio envolviéndolas en llaves dobles. Las variables serán reemplazadas automáticamente por los valores reales al generar el contenido.
              </p>
              <div className="bg-blue-100 dark:bg-blue-900 rounded p-3 mt-2">
                <p className="text-xs font-mono text-blue-900 dark:text-blue-100">
                  Ejemplo: {"{{jugador.nombre}}"} está en {"{{pueblo}}"}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Resultado: drAke está en Esparcraft Village
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (open !== undefined && onClose) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Referencia de Variables</DialogTitle>
            <DialogDescription>
              Consulta todas las variables disponibles para tus plantillas
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="p-4">
      {content}
    </div>
  );
}

// Exportar las categorías de variables para uso externo
export { VARIABLE_CATEGORIES, VariableCategory, VariableItem };
