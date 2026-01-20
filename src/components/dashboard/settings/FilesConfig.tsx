'use client';

import { useState, useEffect } from 'react';
import { Save, Folder, FileText, HardDrive, Check, Info, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

const STORAGE_KEY = 'bridge_files_config';

interface FilesConfig {
  basePath: string;
  maxFileSize: number;
  allowedFormats: {
    images: boolean;
    documents: boolean;
    json: boolean;
    text: boolean;
    markdown: boolean;
  };
}

const DEFAULT_CONFIG: FilesConfig = {
  basePath: '/data',
  maxFileSize: 10,
  allowedFormats: {
    images: true,
    documents: true,
    json: true,
    text: false,
    markdown: false,
  },
};

interface FilesConfigProps {
  onConfigSaved?: () => void;
}

const FILE_SIZE_OPTIONS = [
  { value: 5, label: '5 MB' },
  { value: 10, label: '10 MB (recomendado)' },
  { value: 25, label: '25 MB' },
  { value: 50, label: '50 MB' },
  { value: 100, label: '100 MB' },
];

const FORMAT_DEFINITIONS = [
  { key: 'images' as keyof FilesConfig['allowedFormats'], label: 'Imágenes', description: 'PNG, JPG, GIF, WebP', icon: FileText },
  { key: 'documents' as keyof FilesConfig['allowedFormats'], label: 'Documentos', description: 'PDF, DOC, DOCX', icon: Folder },
  { key: 'json' as keyof FilesConfig['allowedFormats'], label: 'JSON', description: 'Archivos de configuración y datos', icon: HardDrive },
  { key: 'text' as keyof FilesConfig['allowedFormats'], label: 'Texto plano', description: 'TXT, CSV', icon: FileText },
  { key: 'markdown' as keyof FilesConfig['allowedFormats'], label: 'Markdown', description: 'MD, MD', icon: FileText },
];

export default function FilesConfig({ onConfigSaved }: FilesConfigProps) {
  const [config, setConfig] = useState<FilesConfig>(DEFAULT_CONFIG);
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
      console.error('Error cargando configuración de archivos:', err);
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
      if (!config.basePath.trim()) {
        throw new Error('La ruta base es requerida');
      }

      if (config.maxFileSize < 1 || config.maxFileSize > 500) {
        throw new Error('El límite de tamaño debe estar entre 1 y 500 MB');
      }

      // Verificar que al menos un formato esté habilitado
      const anyEnabled = Object.values(config.allowedFormats).some(v => v);
      if (!anyEnabled) {
        throw new Error('Debe seleccionar al menos un formato de archivo');
      }

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      // Aplicar configuración al servidor
      const response = await fetch('/api/settings/files', {
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
      const response = await fetch('/api/settings/files/check-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ directory: config.basePath }),
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

  const handleFormatToggle = (key: keyof FilesConfig['allowedFormats'], checked: boolean) => {
    setConfig({
      ...config,
      allowedFormats: {
        ...config.allowedFormats,
        [key]: checked,
      },
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Archivos</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const enabledFormatsCount = Object.values(config.allowedFormats).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          <CardTitle>Configuración de Archivos</CardTitle>
        </div>
        <CardDescription>
          Configura rutas, límites y formatos de archivos permitidos
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

        {/* Ruta base */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="base-path">Ruta Base</Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckDirectory}
              disabled={!config.basePath}
            >
              <Info className="h-4 w-4 mr-2" />
              Verificar
            </Button>
          </div>
          <Input
            id="base-path"
            value={config.basePath}
            onChange={(e) => {
              setConfig({ ...config, basePath: e.target.value });
              setDirectoryExists(null);
            }}
            placeholder="Ej: /data"
            className="max-w-2xl"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {directoryExists === true && (
              <span className="text-green-600 dark:text-green-500 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Directorio existe
              </span>
            )}
            {directoryExists === false && (
              <span className="text-red-600 dark:text-red-500">✗ Directorio no existe</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Ruta principal donde se almacenan todos los archivos del sistema
          </p>
        </div>

        {/* Límite de tamaño de archivo */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Límite de Tamaño de Archivo</Label>
          </div>
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {config.maxFileSize} MB máximo
              </span>
              <select
                value={config.maxFileSize.toString()}
                onChange={(e) =>
                  setConfig({ ...config, maxFileSize: parseInt(e.target.value) })
                }
                className="w-[200px] h-10 px-3 border rounded-md bg-background"
              >
                {FILE_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value.toString()}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 MB</span>
                <span>100 MB</span>
                <span>500 MB</span>
              </div>
              <Slider
                value={[config.maxFileSize]}
                onValueChange={(value) =>
                  setConfig({ ...config, maxFileSize: value[0] })
                }
                min={1}
                max={500}
                step={1}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tamaño máximo permitido para archivos subidos. Los archivos más grandes
              serán rechazados automáticamente.
            </p>
          </div>
        </div>

        {/* Formatos permitidos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">Formatos Permitidos</Label>
            </div>
            <span className="text-sm text-muted-foreground">
              {enabledFormatsCount} de {FORMAT_DEFINITIONS.length} habilitados
            </span>
          </div>
          <div className="grid gap-3">
            {FORMAT_DEFINITIONS.map((format) => {
              const FormatIcon = format.icon;
              const isChecked = config.allowedFormats[format.key];
              return (
                <div
                  key={format.key}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => handleFormatToggle(format.key, !isChecked)}
                >
                  <Checkbox
                    id={`format-${format.key}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleFormatToggle(format.key, checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FormatIcon className="h-4 w-4" />
                      <Label
                        htmlFor={`format-${format.key}`}
                        className="cursor-pointer font-medium"
                      >
                        {format.label}
                      </Label>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Selecciona qué tipos de archivos pueden ser subidos al sistema. Debe haber
            al menos un formato habilitado.
          </p>
        </div>

        {/* Información adicional */}
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Información importante:</strong> Los cambios en la configuración de archivos
            afectan inmediatamente todos los procesos de carga de archivos. Asegúrate de configurar
            correctamente la ruta base y los formatos permitidos antes de permitir cargas masivas.
          </AlertDescription>
        </Alert>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving || enabledFormatsCount === 0}>
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
