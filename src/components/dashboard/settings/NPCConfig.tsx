'use client';

import { useState, useEffect } from 'react';
import { Save, Users, FileText, Image, LayoutGrid, Info, Folder } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';

const STORAGE_KEY = 'bridge_npc_config';

interface NPCConfig {
  exportFormat: 'sillytavern' | 'json' | 'txt';
  imagesDirectory: string;
  defaultAvatar: string;
  npcsPerPage: number;
}

const DEFAULT_CONFIG: NPCConfig = {
  exportFormat: 'sillytavern',
  imagesDirectory: '/data/npcs/avatars',
  defaultAvatar: '/data/npcs/avatars/default.png',
  npcsPerPage: 12,
};

interface NPCConfigProps {
  onConfigSaved?: () => void;
}

const EXPORT_FORMATS = [
  {
    value: 'sillytavern',
    label: 'SillyTavern JSON',
    description: 'Formato compatible con SillyTavern para tarjetas de personajes',
  },
  {
    value: 'json',
    label: 'JSON Estándar',
    description: 'Formato JSON estándar para intercambio de datos',
  },
  {
    value: 'txt',
    label: 'Texto Plano',
    description: 'Formato de texto plano simple para documentación',
  },
];

const NPCS_PER_PAGE_OPTIONS = [
  { value: 6, label: '6 por página' },
  { value: 9, label: '9 por página' },
  { value: 12, label: '12 por página (recomendado)' },
  { value: 16, label: '16 por página' },
  { value: 24, label: '24 por página' },
  { value: 36, label: '36 por página' },
];

export default function NPCConfig({ onConfigSaved }: NPCConfigProps) {
  const [config, setConfig] = useState<NPCConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directoryExists, setDirectoryExists] = useState<boolean | null>(null);

  // Cargar configuración desde localStorage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch (err) {
      console.error('Error cargando configuración de NPCs:', err);
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
      if (!config.imagesDirectory.trim()) {
        throw new Error('El directorio de imágenes es requerido');
      }

      if (!config.defaultAvatar.trim()) {
        throw new Error('El avatar por defecto es requerido');
      }

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      // Aplicar configuración al servidor
      const response = await fetch('/api/settings/npc', {
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

  const handleCheckDirectory = async () => {
    try {
      const response = await fetch('/api/settings/npc/check-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ directory: config.imagesDirectory }),
      });

      if (response.ok) {
        const result = await response.json();
        setDirectoryExists(result.data.exists);
        if (!result.data.exists) {
          setError('El directorio especificado no existe');
        } else {
          setError(null);
        }
      } else {
        throw new Error('Error al verificar directorio');
      }
    } catch (err) {
      console.error('Error verificando directorio:', err);
      setError('Error al verificar el directorio');
      setDirectoryExists(null);
    }
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de que deseas restablecer la configuración por defecto?')) {
      setConfig(DEFAULT_CONFIG);
      setDirectoryExists(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración de NPCs</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <CardTitle>Configuración de NPCs</CardTitle>
        </div>
        <CardDescription>
          Configura cómo se gestionan y muestran los NPCs en el sistema
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

        {/* Formato de exportación */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Formato de Exportación</Label>
          </div>
          <RadioGroup
            value={config.exportFormat}
            onValueChange={(value) =>
              setConfig({ ...config, exportFormat: value as 'sillytavern' | 'json' | 'txt' })
            }
          >
            <div className="flex flex-col space-y-3">
              {EXPORT_FORMATS.map((format) => (
                <div key={format.value} className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-accent transition-colors">
                  <RadioGroupItem value={format.value} id={`format-${format.value}`} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={`format-${format.value}`} className="cursor-pointer font-medium">
                      {format.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Directorio de imágenes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="images-directory">Directorio de Imágenes</Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckDirectory}
              disabled={!config.imagesDirectory}
            >
              <Info className="h-4 w-4 mr-2" />
              Verificar
            </Button>
          </div>
          <Input
            id="images-directory"
            value={config.imagesDirectory}
            onChange={(e) => {
              setConfig({ ...config, imagesDirectory: e.target.value });
              setDirectoryExists(null);
            }}
            placeholder="Ej: /data/npcs/avatars"
            className="max-w-2xl"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {directoryExists === true && (
              <span className="text-green-600 dark:text-green-500">✓ Directorio existe</span>
            )}
            {directoryExists === false && (
              <span className="text-red-600 dark:text-red-500">✗ Directorio no existe</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Ruta donde se almacenan las imágenes de avatares de los NPCs
          </p>
        </div>

        {/* Avatar por defecto */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="default-avatar">Avatar por Defecto</Label>
          </div>
          <Input
            id="default-avatar"
            value={config.defaultAvatar}
            onChange={(e) => setConfig({ ...config, defaultAvatar: e.target.value })}
            placeholder="Ej: /data/npcs/avatars/default.png"
            className="max-w-2xl"
          />
          <p className="text-xs text-muted-foreground">
            Imagen que se usará para NPCs sin avatar asignado
          </p>
        </div>

        {/* NPCs por página */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">NPCs por Página</Label>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">
                {config.npcsPerPage} NPCs por página
              </span>
              <Select
                value={config.npcsPerPage.toString()}
                onValueChange={(value) =>
                  setConfig({ ...config, npcsPerPage: parseInt(value) })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NPCS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>6</span>
                <span>36</span>
              </div>
              <Slider
                value={[config.npcsPerPage]}
                onValueChange={(value) =>
                  setConfig({ ...config, npcsPerPage: value[0] })
                }
                min={6}
                max={36}
                step={3}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Define cuántos NPCs se muestran por página en la lista. Valores más altos muestran
              más contenido pero pueden afectar el rendimiento.
            </p>
          </div>
        </div>

        {/* Información adicional */}
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Formato SillyTavern:</strong> Este formato es compatible con SillyTavern y
            otros frontends de chat basados en tarjetas de caracteres. Incluye nombre, descripción,
            personalidad, escenarios y ejemplo de diálogo del NPC.
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
