'use client';

import { useState, useEffect } from 'react';
import { Save, Clock, MessageSquare, List, Timer, Info, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'bridge_sessions_config';

interface SessionConfig {
  autoSave: boolean;
  autoSaveInterval: number;
  maxMessageHistory: number;
  sessionsPerPage: number;
  inactivityTimeout: number;
  minMessagesToSummarize: number;
  keepMessagesAfterSummary: number;
  autoSummarize: boolean;
}

const DEFAULT_CONFIG: SessionConfig = {
  autoSave: true,
  autoSaveInterval: 30,
  maxMessageHistory: 100,
  sessionsPerPage: 12,
  inactivityTimeout: 300,
  minMessagesToSummarize: 10,
  keepMessagesAfterSummary: 4,
  autoSummarize: true,
};

interface SessionConfigProps {
  onConfigSaved?: () => void;
}

const AUTOSAVE_INTERVALS = [
  { value: 15, label: '15 segundos' },
  { value: 30, label: '30 segundos (recomendado)' },
  { value: 60, label: '1 minuto' },
  { value: 120, label: '2 minutos' },
  { value: 300, label: '5 minutos' },
];

const MESSAGE_HISTORY_OPTIONS = [
  { value: 50, label: '50 mensajes' },
  { value: 100, label: '100 mensajes (recomendado)' },
  { value: 200, label: '200 mensajes' },
  { value: 500, label: '500 mensajes' },
  { value: 1000, label: '1000 mensajes' },
];

const SESSIONS_PER_PAGE_OPTIONS = [
  { value: 6, label: '6 por página' },
  { value: 9, label: '9 por página' },
  { value: 12, label: '12 por página (recomendado)' },
  { value: 16, label: '16 por página' },
  { value: 24, label: '24 por página' },
];

const INACTIVITY_TIMEOUTS = [
  { value: 60, label: '1 minuto' },
  { value: 120, label: '2 minutos' },
  { value: 300, label: '5 minutos (recomendado)' },
  { value: 600, label: '10 minutos' },
  { value: 1800, label: '30 minutos' },
  { value: 3600, label: '1 hora' },
];

export default function SessionConfig({ onConfigSaved }: SessionConfigProps) {
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para limpieza de sesiones inactivas
  const [inactiveSessions, setInactiveSessions] = useState<any[]>([]);
  const [loadingInactive, setLoadingInactive] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  // Cargar configuración desde el servidor (fuente de verdad) y localStorage (cache UI)
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      // Intentar cargar desde el servidor primero
      try {
        const response = await fetch('/api/settings/sessions');
        const data = await response.json();
        if (data.success && data.data) {
          setConfig({ ...DEFAULT_CONFIG, ...data.data });
        } else {
          // Fallback a localStorage
          const savedConfig = localStorage.getItem(STORAGE_KEY);
          if (savedConfig) {
            setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
          }
        }
      } catch {
        // Si el servidor no responde, usar localStorage
        const savedConfig = localStorage.getItem(STORAGE_KEY);
        if (savedConfig) {
          setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
        }
      }
    } catch (err) {
      console.error('Error cargando configuración de sesiones:', err);
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // Validar campos
      if (config.autoSave && (config.autoSaveInterval < 10 || config.autoSaveInterval > 600)) {
        throw new Error('El intervalo de auto-guardado debe estar entre 10 y 600 segundos');
      }

      if (config.maxMessageHistory < 10 || config.maxMessageHistory > 10000) {
        throw new Error('El historial máximo debe estar entre 10 y 10000 mensajes');
      }

      if (config.sessionsPerPage < 3 || config.sessionsPerPage > 50) {
        throw new Error('Las sesiones por página deben estar entre 3 y 50');
      }

      if (config.inactivityTimeout < 30 || config.inactivityTimeout > 7200) {
        throw new Error('El timeout de inactividad debe estar entre 30 y 7200 segundos');
      }

      if (config.minMessagesToSummarize < 1 || config.minMessagesToSummarize > 1000) {
        throw new Error('El mínimo de mensajes para resumir debe estar entre 1 y 1000');
      }

      if (config.keepMessagesAfterSummary < 0 || config.keepMessagesAfterSummary > 1000) {
        throw new Error('Los mensajes a conservar debe estar entre 0 y 1000');
      }

      if (config.keepMessagesAfterSummary >= config.minMessagesToSummarize) {
        throw new Error(
          `Los mensajes a conservar (${config.keepMessagesAfterSummary}) deben ser menores ` +
          `que el mínimo para resumir (${config.minMessagesToSummarize}). Si conserva todos ` +
          `los mensajes necesarios para resumir, el sistema entraría en un bucle.`
        );
      }

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      // Aplicar configuración al servidor
      const response = await fetch('/api/settings/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Error al aplicar configuración en el servidor');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      if (onConfigSaved) {
        onConfigSaved();
      }
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de que deseas restablecer la configuración por defecto?')) {
      setConfig(DEFAULT_CONFIG);
    }
  };

  // ============================================
  // Limpieza de sesiones inactivas
  // ============================================

  const loadInactiveSessions = async () => {
    setLoadingInactive(true);
    try {
      const response = await fetch(
        `/api/sessions/cleanup?timeoutSeconds=${config.inactivityTimeout}`
      );
      const data = await response.json();
      if (data.success) {
        setInactiveSessions(data.data.sessions || []);
      } else {
        throw new Error(data.error || 'Error al cargar sesiones inactivas');
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'No se pudieron cargar las sesiones inactivas',
        variant: 'destructive',
      });
      setInactiveSessions([]);
    } finally {
      setLoadingInactive(false);
    }
  };

  const handleCleanInactive = async () => {
    if (inactiveSessions.length === 0) return;
    if (
      !confirm(
        `¿Estás seguro de que deseas eliminar ${inactiveSessions.length} sesión(es) inactiva(s)? ` +
        `Estas sesiones no han tenido actividad en los últimos ${config.inactivityTimeout} segundos. ` +
        `Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setCleaning(true);
    try {
      const response = await fetch('/api/sessions/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeoutSeconds: config.inactivityTimeout }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: '✅ Limpieza completada',
          description: data.data.message,
        });
        setInactiveSessions([]);
        onConfigSaved?.();
      } else {
        throw new Error(data.error || 'Error al limpiar sesiones');
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'No se pudieron limpiar las sesiones',
        variant: 'destructive',
      });
    } finally {
      setCleaning(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Sesiones</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const formatSeconds = (seconds: number) => {
    if (seconds < 60) return `${seconds} segundos`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutos`;
    return `${Math.floor(seconds / 3600)} horas`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <CardTitle>Configuración de Sesiones</CardTitle>
        </div>
        <CardDescription>
          Configura el comportamiento de las sesiones de chat y el historial de mensajes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mensaje de éxito */}
        {saved && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <Info className="h-4 w-4 text-green-600 dark:text-green-500" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Configuración guardada correctamente
            </AlertDescription>
          </Alert>
        )}

        {/* Mensaje de error */}
        {error && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Auto-guardado */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Auto-guardado</Label>
              <p className="text-sm text-muted-foreground">
                Guarda automáticamente las sesiones en intervals regulares
              </p>
            </div>
            <Switch
              checked={config.autoSave}
              onCheckedChange={(checked) => setConfig({ ...config, autoSave: checked })}
            />
          </div>

          {config.autoSave && (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Intervalo de Auto-guardado</Label>
              </div>
              <div className="space-y-3">
                <Select
                  value={config.autoSaveInterval.toString()}
                  onValueChange={(value) =>
                    setConfig({ ...config, autoSaveInterval: parseInt(value) })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar intervalo" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOSAVE_INTERVALS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10 seg</span>
                    <span>300 seg (5 min)</span>
                    <span>600 seg (10 min)</span>
                  </div>
                  <Slider
                    value={[config.autoSaveInterval]}
                    onValueChange={(value) =>
                      setConfig({ ...config, autoSaveInterval: value[0] })
                    }
                    min={10}
                    max={600}
                    step={5}
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Configura con qué frecuencia se guardan automáticamente las sesiones activas.
                  Intervalos más cortos aseguran que no pierdas datos pero pueden afectar el rendimiento.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Historial máximo de mensajes */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Historial Máximo de Mensajes</Label>
          </div>
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {config.maxMessageHistory} mensajes por sesión
              </span>
              <Select
                value={config.maxMessageHistory.toString()}
                onValueChange={(value) =>
                  setConfig({ ...config, maxMessageHistory: parseInt(value) })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_HISTORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10</span>
                <span>500</span>
                <span>1000</span>
                <span>10000</span>
              </div>
              <Slider
                value={[config.maxMessageHistory]}
                onValueChange={(value) =>
                  setConfig({ ...config, maxMessageHistory: value[0] })
                }
                min={10}
                max={10000}
                step={10}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Define cuántos mensajes se conservan en el historial de cada sesión. Mensajes más
              antiguos por encima de este límite se eliminan automáticamente.
            </p>
          </div>
        </div>

        {/* Sesiones por página */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Sesiones por Página</Label>
          </div>
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {config.sessionsPerPage} sesiones
              </span>
              <Select
                value={config.sessionsPerPage.toString()}
                onValueChange={(value) =>
                  setConfig({ ...config, sessionsPerPage: parseInt(value) })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSIONS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>3</span>
                <span>25</span>
                <span>50</span>
              </div>
              <Slider
                value={[config.sessionsPerPage]}
                onValueChange={(value) =>
                  setConfig({ ...config, sessionsPerPage: value[0] })
                }
                min={3}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Define cuántas sesiones se muestran por página en la lista de sesiones.
              Valores más altos muestran más contenido pero pueden afectar el rendimiento.
            </p>
          </div>
        </div>

        {/* Timeout de inactividad */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Timeout de Inactividad</Label>
          </div>
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {formatSeconds(config.inactivityTimeout)}
              </span>
              <Select
                value={config.inactivityTimeout.toString()}
                onValueChange={(value) =>
                  setConfig({ ...config, inactivityTimeout: parseInt(value) })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INACTIVITY_TIMEOUTS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>30 seg</span>
                <span>30 min</span>
                <span>1 hora</span>
                <span>2 horas</span>
              </div>
              <Slider
                value={[config.inactivityTimeout]}
                onValueChange={(value) =>
                  setConfig({ ...config, inactivityTimeout: value[0] })
                }
                min={30}
                max={7200}
                step={30}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tiempo máximo de inactividad antes de que una sesión se marque como inactiva.
              Sesiones inactivas pueden ser archivadas automáticamente o cerradas.
            </p>
          </div>
        </div>

        {/* ============================================ */}
        {/* Resumen de sesión: mínimo y conservación    */}
        {/* ============================================ */}
        <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">Resumen de sesión automático</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="toggle-auto-summarize" className="text-xs text-muted-foreground cursor-pointer">
                Auto-resumen al agregar mensajes
              </Label>
              <Switch
                id="toggle-auto-summarize"
                checked={config.autoSummarize}
                onCheckedChange={(checked) => setConfig({ ...config, autoSummarize: checked })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {config.autoSummarize ? (
              <>
                <strong className="text-green-600">Activado:</strong> cuando se agrega un mensaje a una sesión,
                el sistema verifica (con debounce de 3s) si la sesión tiene ≥ <strong>minMessagesToSummarize</strong> mensajes.
                Si los tiene, dispara automáticamente el resumen: guarda el resumen anterior como embedding en
                <code className="px-1 py-0.5 bg-muted rounded">sesion:{'{id}'}</code>, genera el nuevo resumen,
                y conserva solo los últimos <strong>keepMessagesAfterSummary</strong> mensajes.
              </>
            ) : (
              <>
                <strong className="text-muted-foreground">Desactivado:</strong> el resumen solo se genera
                cuando se dispara manualmente (vía HTTP request con <code className="px-1 py-0.5 bg-muted rounded">mode: 'resumen_sesion'</code> o desde el Router).
              </>
            )}
          </p>

          <div className="grid gap-4 md:grid-cols-2 mt-3">
            {/* Mínimo de mensajes para resumir */}
            <div className="space-y-2">
              <Label htmlFor="minMessages" className="flex items-center gap-1.5">
                <List className="h-3.5 w-3.5" />
                Mínimo de mensajes para resumir
              </Label>
              <Input
                id="minMessages"
                type="number"
                min="1"
                max="1000"
                value={config.minMessagesToSummarize}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    minMessagesToSummarize: parseInt(e.target.value) || 1,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Si la sesión tiene menos mensajes, no se genera resumen. Valor por defecto: 10.
              </p>
            </div>

            {/* Mensajes a conservar */}
            <div className="space-y-2">
              <Label htmlFor="keepMessages" className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Mensajes a conservar tras el resumen
              </Label>
              <Input
                id="keepMessages"
                type="number"
                min="0"
                max="1000"
                value={config.keepMessagesAfterSummary}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    keepMessagesAfterSummary: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Se conservan los últimos N mensajes (los más recientes). Los viejos se eliminan.
                Debe ser menor que el mínimo para resumir. Valor por defecto: 4.
              </p>
            </div>
          </div>

          {config.keepMessagesAfterSummary >= config.minMessagesToSummarize && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Configuración inválida:</strong> los mensajes a conservar ({config.keepMessagesAfterSummary})
                deben ser menores que el mínimo para resumir ({config.minMessagesToSummarize}). Si conserva
                todos los mensajes necesarios para resumir, el sistema entraría en un bucle infinito de resúmenes.
              </AlertDescription>
            </Alert>
          )}

          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
            <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Flujo del resumen:</strong>
              <ol className="list-decimal list-inside mt-1 space-y-0.5">
                <li>Se recibe HTTP request con <code>mode: 'resumen_sesion'</code></li>
                <li>Se verifica que la sesión tenga ≥ <code>minMessagesToSummarize</code> mensajes</li>
                <li>Se guarda el resumen anterior como embedding en <code>sesion:{'{sessionId}'}</code></li>
                <li>Se genera el nuevo resumen con el LLM</li>
                <li>Se reemplaza el resumen anterior por el nuevo</li>
                <li>Se conservan los últimos <code>keepMessagesAfterSummary</code> mensajes</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>

        {/* Información adicional */}
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Recomendaciones:</strong> Para un uso balanceado, configura auto-guardado
            cada 30 segundos, historial de 100 mensajes, 12 sesiones por página y timeout
            de 5 minutos. Ajusta estos valores según tus necesidades específicas.
          </AlertDescription>
        </Alert>

        {/* Limpieza de sesiones inactivas */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Limpieza de sesiones inactivas
              </Label>
              <p className="text-sm text-muted-foreground">
                Sesiones sin actividad por más de <strong>{formatSeconds(config.inactivityTimeout)}</strong> se consideran inactivas.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadInactiveSessions}
              disabled={loadingInactive}
            >
              {loadingInactive ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Buscar inactivas
            </Button>
          </div>

          {inactiveSessions.length > 0 && (
            <div className="space-y-2">
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                  Se encontraron <strong>{inactiveSessions.length}</strong> sesión(es) inactiva(s). Puedes eliminarlas para liberar espacio.
                </AlertDescription>
              </Alert>

              <ScrollArea className="max-h-40 rounded-md border p-2">
                <div className="space-y-1">
                  {inactiveSessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs py-1 border-b last:border-b-0">
                      <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">
                        {s.id.length > 20 ? s.id.substring(0, 20) + '...' : s.id}
                      </Badge>
                      <span className="text-muted-foreground">NPC: {s.npcId}</span>
                      <span className="text-muted-foreground ml-auto">
                        Última actividad: {new Date(s.lastActivity).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">({s.messagesCount} msgs)</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleCleanInactive}
                disabled={cleaning}
                className="w-full"
              >
                {cleaning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar {inactiveSessions.length} sesión(es) inactiva(s)
                  </>
                )}
              </Button>
            </div>
          )}

          {inactiveSessions.length === 0 && !loadingInactive && (
            <p className="text-xs text-muted-foreground">
              Haz clic en "Buscar inactivas" para verificar si hay sesiones que cumplan el criterio de inactividad.
            </p>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin">⟳</span>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            Restablecer por Defecto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
