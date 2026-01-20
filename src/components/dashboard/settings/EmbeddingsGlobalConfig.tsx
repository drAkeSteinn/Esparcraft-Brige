'use client';

import { useState, useEffect } from 'react';
import { Save, Brain, Sliders, FolderTree, Info, Search, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const STORAGE_KEY = 'bridge_embeddings_global_config';

interface EmbeddingsGlobalConfig {
  similarityThreshold: number;
  maxResults: number;
  defaultNamespace: string;
}

const DEFAULT_CONFIG: EmbeddingsGlobalConfig = {
  similarityThreshold: 0.7,
  maxResults: 5,
  defaultNamespace: 'default',
};

interface EmbeddingsGlobalConfigProps {
  onConfigSaved?: () => void;
}

const THRESHOLD_PRESETS = [
  { value: 0.5, label: '0.5 - Muy Permisivo', description: 'Incluye resultados menos relevantes' },
  { value: 0.6, label: '0.6 - Permisivo', description: 'Balance entre cantidad y calidad' },
  { value: 0.7, label: '0.7 - Equilibrado (Recomendado)', description: 'Mejor calidad de resultados' },
  { value: 0.8, label: '0.8 - Estricto', description: 'Solo resultados muy similares' },
  { value: 0.9, label: '0.9 - Muy Estricto', description: 'Solo coincidencias casi exactas' },
];

const MAX_RESULTS_OPTIONS = [
  { value: 3, label: '3 resultados' },
  { value: 5, label: '5 resultados (recomendado)' },
  { value: 7, label: '7 resultados' },
  { value: 10, label: '10 resultados' },
  { value: 15, label: '15 resultados' },
  { value: 20, label: '20 resultados' },
];

const COMMON_NAMESPACES = [
  { value: 'default', label: 'Default (general)', description: 'Namespace principal para todo el contenido' },
  { value: 'worlds', label: 'Worlds (mundos)', description: 'Documentos sobre mundos y universos' },
  { value: 'npcs', label: 'NPCs', description: 'Personajes y NPCs' },
  { value: 'pueblos', label: 'Pueblos (poblaciones)', description: 'Información de pueblos y ciudades' },
  { value: 'edificios', label: 'Edificios', description: 'Lugares y estructuras' },
  { value: 'sessions', label: 'Sessions (sesiones)', description: 'Historial de sesiones' },
  { value: 'custom', label: 'Personalizado', description: 'Especificar nombre personalizado' },
];

export default function EmbeddingsGlobalConfig({ onConfigSaved }: EmbeddingsGlobalConfigProps) {
  const [config, setConfig] = useState<EmbeddingsGlobalConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'presets' | 'manual'>('presets');

  // Cargar configuración desde localStorage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch (err) {
      console.error('Error cargando configuración de embeddings globales:', err);
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
      if (config.similarityThreshold < 0 || config.similarityThreshold > 1) {
        throw new Error('El umbral de similitud debe estar entre 0 y 1');
      }

      if (config.maxResults < 1 || config.maxResults > 50) {
        throw new Error('Los resultados máximos deben estar entre 1 y 50');
      }

      if (!config.defaultNamespace.trim()) {
        throw new Error('El namespace por defecto es requerido');
      }

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      // Aplicar configuración al servidor
      const response = await fetch('/api/settings/embeddings-global', {
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
      setActiveTab('presets');
    }
  };

  const handlePresetSelect = (threshold: number) => {
    setConfig({ ...config, similarityThreshold: threshold });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Embeddings Globales</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          <CardTitle>Configuración de Embeddings Globales</CardTitle>
        </div>
        <CardDescription>
          Configura los parámetros globales de búsqueda y recuperación de embeddings
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

        {/* Umbral de similitud */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Umbral de Similitud</Label>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'presets' | 'manual')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="presets">Presets Rápidos</TabsTrigger>
              <TabsTrigger value="manual">Ajuste Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="space-y-3">
              <div className="grid gap-3">
                {THRESHOLD_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetSelect(preset.value)}
                    className={`flex items-start gap-3 p-4 border rounded-lg text-left transition-colors ${
                      config.similarityThreshold === preset.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{preset.label}</div>
                      <div className={`text-sm ${config.similarityThreshold === preset.value ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {preset.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {config.similarityThreshold.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {config.similarityThreshold >= 0.8 ? 'Muy estricto' :
                     config.similarityThreshold >= 0.7 ? 'Equilibrado' :
                     config.similarityThreshold >= 0.6 ? 'Permisivo' : 'Muy permisivo'}
                  </span>
                </div>
                <Slider
                  value={[config.similarityThreshold]}
                  onValueChange={(value) =>
                    setConfig({ ...config, similarityThreshold: value[0] })
                  }
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>0.0 (todos)</span>
                  <span>0.5</span>
                  <span>1.0 (exactos)</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Ajusta manualmente el umbral de similitud para la búsqueda vectorial.
                Valores más altos devuelven resultados más específicos.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Resultados máximos */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Resultados Máximos por Búsqueda</Label>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">
                {config.maxResults} resultados
              </span>
              <Select
                value={config.maxResults.toString()}
                onValueChange={(value) =>
                  setConfig({ ...config, maxResults: parseInt(value) })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAX_RESULTS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>25</span>
                <span>50</span>
              </div>
              <Slider
                value={[config.maxResults]}
                onValueChange={(value) =>
                  setConfig({ ...config, maxResults: value[0] })
                }
                min={1}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Define cuántos resultados devolver por búsqueda vectorial. Valores más altos
              proporcionan más contexto pero pueden afectar la velocidad y la calidad.
            </p>
          </div>
        </div>

        {/* Namespace por defecto */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Namespace por Defecto</Label>
          </div>
          <div className="space-y-3">
            <Select
              value={config.defaultNamespace}
              onValueChange={(value) => setConfig({ ...config, defaultNamespace: value })}
            >
              <SelectTrigger id="default-namespace">
                <SelectValue placeholder="Seleccionar namespace" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_NAMESPACES.map((ns) => (
                  <SelectItem key={ns.value} value={ns.value}>
                    {ns.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {config.defaultNamespace === 'custom' && (
              <Input
                value={config.defaultNamespace === 'custom' ? '' : config.defaultNamespace}
                onChange={(e) => setConfig({ ...config, defaultNamespace: e.target.value })}
                placeholder="Ej: my-custom-namespace"
                className="max-w-2xl"
              />
            )}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">
                {COMMON_NAMESPACES.find(ns => ns.value === config.defaultNamespace)?.description}
              </p>
              <p className="text-xs text-muted-foreground">
                Namespace usado cuando no se especifica uno explícitamente en las búsquedas.
              </p>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <Database className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Cómo funciona:</strong> El sistema busca en la base de datos de embeddings
            usando similitud coseno. El umbral determina qué tan similares deben ser los vectores,
            y los resultados máximos limita cuántos documentos se devuelven. El namespace
            permite organizar y buscar en diferentes colecciones de documentos.
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
