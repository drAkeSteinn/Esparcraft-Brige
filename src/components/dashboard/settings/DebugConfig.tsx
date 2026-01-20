'use client';

import { useState, useEffect } from 'react';
import { Save, Bug, AlertCircle, Download, Terminal, FileText, Info, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

const STORAGE_KEY = 'bridge_debug_config';

interface DebugConfig {
  debugMode: boolean;
  logLevel: 'error' | 'warning' | 'info' | 'debug';
  consoleInInterface: boolean;
  autoSaveLogs: boolean;
}

const DEFAULT_CONFIG: DebugConfig = {
  debugMode: false,
  logLevel: 'error',
  consoleInInterface: false,
  autoSaveLogs: false,
};

interface DebugConfigProps {
  onConfigSaved?: () => void;
}

const LOG_LEVELS = [
  {
    value: 'error',
    label: 'Error',
    description: 'Solo errores críticos del sistema',
    icon: AlertCircle,
    color: 'text-red-500',
  },
  {
    value: 'warning',
    label: 'Warning',
    description: 'Errores y advertencias importantes',
    icon: AlertCircle,
    color: 'text-orange-500',
  },
  {
    value: 'info',
    label: 'Info',
    description: 'Información general del sistema',
    icon: Info,
    color: 'text-blue-500',
  },
  {
    value: 'debug',
    label: 'Debug',
    description: 'Toda la información incluyendo depuración detallada',
    icon: Bug,
    color: 'text-purple-500',
  },
];

export default function DebugConfig({ onConfigSaved }: DebugConfigProps) {
  const [config, setConfig] = useState<DebugConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Cargar configuración desde localStorage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch (err) {
      console.error('Error cargando configuración de depuración:', err);
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar logs del localStorage
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem('bridge_system_logs');
      if (savedLogs) {
        const parsed = JSON.parse(savedLogs);
        setLogs(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err) {
      console.error('Error cargando logs:', err);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      // Aplicar configuración al servidor
      const response = await fetch('/api/settings/debug', {
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

  const handleExportLogs = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/settings/debug/export-logs', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Error al exportar logs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bridge-logs-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando logs:', err);
      setError(err instanceof Error ? err.message : 'Error al exportar logs');
    } finally {
      setExporting(false);
    }
  };

  const handleCopyLogs = () => {
    const logsText = logs.join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const handleClearLogs = async () => {
    if (confirm('¿Estás seguro de que deseas borrar todos los logs? Esta acción no se puede deshacer.')) {
      setClearing(true);
      try {
        localStorage.removeItem('bridge_system_logs');
        setLogs([]);
      } catch (err) {
        console.error('Error borrando logs:', err);
        setError('Error al borrar logs');
      } finally {
        setClearing(false);
      }
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
          <CardTitle>Configuración de Depuración</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const selectedLogLevel = LOG_LEVELS.find(level => level.value === config.logLevel);
  const LogLevelIcon = selectedLogLevel?.icon || AlertCircle;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          <CardTitle>Configuración de Depuración</CardTitle>
        </div>
        <CardDescription>
          Configura opciones avanzadas de depuración y registro del sistema
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
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Modo Debug */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Modo Depuración</Label>
            <p className="text-sm text-muted-foreground">
              Activa funcionalidades avanzadas de desarrollo y diagnóstico
            </p>
          </div>
          <Switch
            checked={config.debugMode}
            onCheckedChange={(checked) => setConfig({ ...config, debugMode: checked })}
          />
        </div>

        {/* Nivel de Log */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Nivel de Log</Label>
          </div>
          <RadioGroup
            value={config.logLevel}
            onValueChange={(value) =>
              setConfig({ ...config, logLevel: value as 'error' | 'warning' | 'info' | 'debug' })
            }
          >
            <div className="grid gap-3">
              {LOG_LEVELS.map((level) => {
                const LevelIcon = level.icon;
                return (
                  <div
                    key={level.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      config.logLevel === level.value
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => setConfig({ ...config, logLevel: level.value as any })}
                  >
                    <LevelIcon className={`h-5 w-5 ${level.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <div className="font-medium">{level.label}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {level.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        </div>

        {/* Consola en Interfaz */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Consola en Interfaz</Label>
            <p className="text-sm text-muted-foreground">
              Muestra una consola de logs en tiempo real en la interfaz
            </p>
          </div>
          <Switch
            checked={config.consoleInInterface}
            onCheckedChange={(checked) => setConfig({ ...config, consoleInInterface: checked })}
          />
        </div>

        {/* Auto-guardado de Logs */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Auto-guardar Logs</Label>
            <p className="text-sm text-muted-foreground">
              Guarda automáticamente los logs en localStorage
            </p>
          </div>
          <Switch
            checked={config.autoSaveLogs}
            onCheckedChange={(checked) => setConfig({ ...config, autoSaveLogs: checked })}
          />
        </div>

        {/* Información del estado actual */}
        <Alert className={`border-2 ${
          config.debugMode ? 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800' :
          'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800'
        }`}>
          <Terminal className={`h-4 w-4 ${config.debugMode ? 'text-purple-600 dark:text-purple-500' : 'text-gray-600 dark:text-gray-500'}`} />
          <AlertDescription className={`text-sm ${
            config.debugMode ? 'text-purple-800 dark:text-purple-200' : 'text-gray-800 dark:text-gray-200'
          }`}>
            <strong>Estado actual:</strong>{' '}
            {config.debugMode ? 'Modo DEBUG ACTIVO' : 'Modo de producción'}
            <br />
            <strong>Nivel:</strong> {selectedLogLevel?.label} ({logs.length} logs guardados)
          </AlertDescription>
        </Alert>

        {/* Gestión de Logs */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Gestión de Logs</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleExportLogs}
              disabled={exporting || logs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exportando...' : 'Exportar Logs'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyLogs}
              disabled={logs.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Copiar al Portapapeles
            </Button>
            <Button
              variant="outline"
              onClick={handleClearLogs}
              disabled={clearing || logs.length === 0}
              className="md:col-span-2"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {clearing ? 'Borrando...' : 'Borrar Todos los Logs'}
            </Button>
          </div>
          {logs.length > 0 && (
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium mb-2">
                Últimos 10 logs ({logs.length} total):
              </div>
              <Textarea
                readOnly
                value={logs.slice(-10).reverse().join('\n')}
                rows={10}
                className="font-mono text-xs"
              />
            </div>
          )}
        </div>

        {/* Advertencia de rendimiento */}
        {config.debugMode && config.logLevel === 'debug' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Advertencia:</strong> El modo DEBUG con nivel de log completo
              puede afectar significativamente el rendimiento del sistema. Utiliza solo para
              diagnóstico de problemas.
            </AlertDescription>
          </Alert>
        )}

        {/* Información adicional */}
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Sobre los logs:</strong> Los logs se almacenan en localStorage
            del navegador. El nivel seleccionado determina qué eventos se registran.
            El modo debug activa funcionalidades adicionales de diagnóstico.
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
