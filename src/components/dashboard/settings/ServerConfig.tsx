'use client';

import { useState, useEffect } from 'react';
import { Save, Server, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const STORAGE_KEY = 'bridge_server_config';

interface ServerConfig {
  name: string;
  description: string;
  version: string;
  maintenanceMode: boolean;
}

const DEFAULT_CONFIG: ServerConfig = {
  name: 'Esparcraft',
  description: 'Bridge IA - Gestor Narrativo del Servidor Esparcraft',
  version: '1.0.0',
  maintenanceMode: false,
};

interface ServerConfigProps {
  onConfigSaved?: () => void;
}

export default function ServerConfig({ onConfigSaved }: ServerConfigProps) {
  const [config, setConfig] = useState<ServerConfig>(DEFAULT_CONFIG);
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
      console.error('Error cargando configuración del servidor:', err);
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
      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      // Aplicar configuración al servidor (si es necesario)
      const response = await fetch('/api/settings/server', {
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
          <CardTitle>Configuración del Servidor</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          <CardTitle>Configuración del Servidor</CardTitle>
        </div>
        <CardDescription>
          Configura el nombre, descripción y estado del servidor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Modo mantenimiento */}
        {config.maintenanceMode && (
          <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Modo mantenimiento activo:</strong> El servidor está en modo mantenimiento.
              Algunas funciones pueden estar limitadas.
            </AlertDescription>
          </Alert>
        )}

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
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Nombre del servidor */}
        <div className="space-y-2">
          <Label htmlFor="server-name">Nombre del Servidor</Label>
          <Input
            id="server-name"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            placeholder="Ej: Esparcraft"
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground">
            Nombre que se mostrará en toda la aplicación
          </p>
        </div>

        {/* Descripción del mundo */}
        <div className="space-y-2">
          <Label htmlFor="server-description">Descripción del Mundo</Label>
          <Textarea
            id="server-description"
            value={config.description}
            onChange={(e) => setConfig({ ...config, description: e.target.value })}
            placeholder="Describe tu mundo y sus características principales..."
            rows={4}
            className="max-w-2xl"
          />
          <p className="text-xs text-muted-foreground">
            Descripción general que se usará como contexto en las respuestas de la IA
          </p>
        </div>

        {/* Versión del sistema */}
        <div className="space-y-2">
          <Label htmlFor="server-version">Versión del Sistema</Label>
          <Input
            id="server-version"
            value={config.version}
            onChange={(e) => setConfig({ ...config, version: e.target.value })}
            placeholder="Ej: 1.0.0"
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            Versión actual del sistema (formato semver: MAJOR.MINOR.PATCH)
          </p>
        </div>

        {/* Modo mantenimiento */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">Modo Mantenimiento</Label>
            <p className="text-sm text-muted-foreground">
              Cuando está activo, el sistema muestra un mensaje de mantenimiento
            </p>
          </div>
          <Switch
            checked={config.maintenanceMode}
            onCheckedChange={(checked) => setConfig({ ...config, maintenanceMode: checked })}
          />
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
