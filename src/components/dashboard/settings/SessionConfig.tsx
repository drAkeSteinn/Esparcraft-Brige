'use client';

import { useState, useEffect } from 'react';
import { Save, Clock, MessageSquare, List, Timer, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const STORAGE_KEY = 'bridge_sessions_config';

interface SessionConfig {
  autoSave: boolean;
  autoSaveInterval: number;
  maxMessageHistory: number;
  sessionsPerPage: number;
  inactivityTimeout: number;
}

const DEFAULT_CONFIG: SessionConfig = {
  autoSave: true,
  autoSaveInterval: 30,
  maxMessageHistory: 100,
  sessionsPerPage: 12,
  inactivityTimeout: 300,
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

  // Cargar configuración desde localStorage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch (err) {
      console.error('Error cargando configuración de sesiones:', err);
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  }, []);

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

        {/* Información adicional */}
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Recomendaciones:</strong> Para un uso balanceado, configura auto-guardado
            cada 30 segundos, historial de 100 mensajes, 12 sesiones por página y timeout
            de 5 minutos. Ajusta estos valores según tus necesidades específicas.
          </AlertDescription>
        </Alert>

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
