'use client';

import { useState, useEffect } from 'react';
import { Brain, Save, TestTube, RefreshCw, Database, Cpu, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

interface OllamaConfig {
  ollamaUrl: string;
  ollamaModel: string;
  embeddingDimension: string;
  timeout: string;
}

interface EmbeddingsConfigProps {
  onConfigSaved?: () => void;
}

const STORAGE_KEY = 'bridge_embeddings_config';

const DEFAULT_OLLAMA_MODEL = 'nomic-embed-text';
const OLLAMA_DEFAULT_CONFIG: OllamaConfig = {
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: DEFAULT_OLLAMA_MODEL,
  embeddingDimension: '768',
  timeout: '30'
};

export default function EmbeddingsConfig({ onConfigSaved }: EmbeddingsConfigProps) {
  const [config, setConfig] = useState<OllamaConfig>({ ...OLLAMA_DEFAULT_CONFIG });
  
  const [availableOllamaModels, setAvailableOllamaModels] = useState<OllamaModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'unknown' | 'connected' | 'disconnected';
    message?: string;
  }>({ status: 'unknown' });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Cargar modelos automáticamente cuando se configura Ollama
  useEffect(() => {
    if (config.ollamaUrl && availableOllamaModels.length === 0) {
      console.log('🔄 Cargando modelos de Ollama automáticamente...');
      loadOllamaModels();
    }
  }, [config.ollamaUrl]);

  const loadOllamaModels = async () => {
    console.log('=== Iniciando carga de modelos de Ollama ===');
    setIsLoadingModels(true);

    try {
      const response = await fetch('/api/settings/ollama-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ollamaUrl: config.ollamaUrl })
      });

      const data = await response.json();

      if (data.success && data.data.embeddingModels && data.data.embeddingModels.length > 0) {
        const models = data.data.embeddingModels;
        console.log(`✅ Modelos cargados exitosamente: ${models.length}`);
        console.log('Lista de modelos:', models.map((m: any) => m.name));
        setAvailableOllamaModels(models);

        toast({
          title: 'Modelos de Ollama',
          description: `Se detectaron ${models.length} modelo(s) disponible(s)`,
          variant: models.length > 0 ? 'default' : 'destructive'
        });
      } else {
        console.log('❌ No se encontraron modelos de embeddings');
        setAvailableOllamaModels([]);

        toast({
          title: 'No se detectaron modelos',
          description: 'Descarga un modelo con: ollama pull nomic-embed-text',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('❌ Error loading Ollama models:', error);
      setAvailableOllamaModels([]);

      toast({
        title: 'Error al cargar modelos',
        description: 'Verifica que Ollama esté corriendo en el puerto 11434',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingModels(false);
      console.log('=== Finalizando carga de modelos de Ollama ===');
    }
  };

  const testConnection = async (showToastMsg: boolean = true) => {
    setTesting(true);
    setConnectionStatus({ status: 'unknown' });

    try {
      const response = await fetch('/api/settings/test-ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ollamaUrl: config.ollamaUrl,
          ollamaModel: config.ollamaModel
        })
      });

      const data = await response.json();

      if (data.success && data.data.connected) {
        setConnectionStatus({ status: 'connected', message: data.data.message });
        if (showToastMsg) {
          toast({
            title: 'Conexión Exitosa',
            description: 'La conexión a Ollama funciona correctamente'
          });
        }

        if (data.data.availableModels) {
          setAvailableOllamaModels(data.data.availableModels);
        }
      } else {
        setConnectionStatus({ status: 'disconnected', message: data.data?.message || 'No se pudo conectar' });
        if (showToastMsg) {
          toast({
            title: 'Error de Conexión',
            description: data.data?.message || 'No se pudo conectar',
            variant: 'destructive'
          });
        }
      }
    } catch (error: any) {
      setConnectionStatus({ status: 'disconnected', message: error.message });
      if (showToastMsg) {
        toast({
          title: 'Error',
          description: 'No se pudo verificar la conexión',
          variant: 'destructive'
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = () => {
    setSaving(true);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      toast({
        title: 'Configuración Guardada',
        description: 'La configuración de embeddings se ha guardado correctamente'
      });

      if (onConfigSaved) {
        onConfigSaved();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOllamaModelChange = (modelName: string) => {
    let dimension = '768';
    const selectedModel = availableOllamaModels.find(m => m.name === modelName);

    if (selectedModel && selectedModel.size && selectedModel.size !== 0) {
      dimension = Math.round(selectedModel.size / 1024 / 1024 * 1024).toString();
    }

    setConfig(prev => ({ ...prev, ollamaModel: modelName, embeddingDimension: dimension }));
  };

  const handleReset = () => {
    const defaultConfig: OllamaConfig = {
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: DEFAULT_OLLAMA_MODEL,
      embeddingDimension: '768',
      timeout: '30'
    };

    setConfig(defaultConfig);
    setConnectionStatus({ status: 'unknown' });
    setAvailableOllamaModels([]);

    toast({
      title: 'Configuración Restablecida',
      description: 'Se han restablecido los valores por defecto'
    });
  };

  const updateOllamaUrl = (url: string) => {
    setConfig(prev => ({ ...prev, ollamaUrl: url }));
  };



  // Helper function to format time ago
  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays > 0) {
      return `${diffDays} día(s) atrás`;
    } else if (diffHours > 0) {
      return `${diffHours} hora(s) atrás`;
    } else if (diffMins > 0) {
      return `${diffMins} minuto(s) atrás`;
    } else {
      return 'ahora mismo';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            <span>Ollama</span>
          </div>
          <Badge variant={connectionStatus.status === 'connected' ? 'default' : connectionStatus.status === 'disconnected' ? 'destructive' : 'outline'}>
            {connectionStatus.status === 'connected' ? 'Conectado' : connectionStatus.status === 'disconnected' ? 'Desconectado' : 'Sin verificar'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Configura la API de embeddings de Ollama
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="ollama-url">URL de Ollama</Label>
          <Input
            id="ollama-url"
            placeholder="http://localhost:11434"
            value={config.ollamaUrl}
            onChange={(e) => updateOllamaUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            URL del servidor de Ollama (generalmente http://localhost:11434)
          </p>
        </div>

        <div className="space-y-4">
          <Label htmlFor="ollama-model">Modelo de Embeddings</Label>
          <div className="relative">
            <Select
              value={config.ollamaModel}
              onValueChange={handleOllamaModelChange}
              onOpenChange={(open) => {
                if (open && availableOllamaModels.length === 0) {
                  console.log('Dropdown abierto, pero no modelos cargados aún');
                }
                setIsDropdownOpen(open);
              }}
            >
              <SelectTrigger id="ollama-model-trigger">
                <SelectValue placeholder="Selecciona un modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nomic-embed-text">
                  <div className="flex items-center gap-2">
                    <span>nomic-embed-text</span>
                    <span className="text-xs text-muted-foreground">({DEFAULT_OLLAMA_MODEL} por defecto)</span>
                  </div>
                </SelectItem>
                {availableOllamaModels.length > 0 && (
                  <SelectItem value={availableOllamaModels[0].name}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{availableOllamaModels[0].name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(availableOllamaModels[0].size && availableOllamaModels[0].size !== 0) &&
                            `${(availableOllamaModels[0].size / 1024 / 1024).toFixed(2)} GB`
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {availableOllamaModels[0].modified_at && (
                          <span className="text-xs text-muted-foreground">
                            {getTimeAgo(availableOllamaModels[0].modified_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                )}
                {availableOllamaModels.slice(1).map((model) => (
                  <SelectItem key={model.name} value={model.name}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(model.size && model.size !== 0) &&
                            `${(model.size / 1024 / 1024).toFixed(2)} GB`
                          }
                        </span>
                      </div>
                      {model.modified_at && (
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(model.modified_at)}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botón para cargar modelos manualmente */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={loadOllamaModels}
          disabled={isLoadingModels}
        >
          {isLoadingModels ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Cargando modelos...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Cargar Modelos
            </>
          )}
        </Button>

        {/* Lista de modelos disponibles */}
        {availableOllamaModels.length > 0 && (
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span>Modelos disponibles en Ollama ({availableOllamaModels.length})</span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {availableOllamaModels.map((model, index) => (
                <div key={model.name} className="text-sm space-y-1 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.size && model.size !== 0 && `${(model.size / 1024 / 1024).toFixed(2)} GB`}
                      </span>
                    </div>
                    {model.modified_at && (
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(model.modified_at)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Label htmlFor="embedding-dimension">Dimensiones del Embedding</Label>
          <Input
            id="embedding-dimension"
            type="number"
            placeholder="768"
            value={config.embeddingDimension}
            onChange={(e) => setConfig({ ...config, embeddingDimension: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Dimensión del vector de embeddings (ej. 768 para nomic-embed-text)
          </p>
        </div>

        <div className="space-y-4">
          <Label htmlFor="timeout">Timeout: {config.timeout} segundos</Label>
          <Slider
            id="timeout"
            min={5}
            max={120}
            step={5}
            value={[parseInt(config.timeout)]}
            onValueChange={([value]) => setConfig({ ...config, timeout: value.toString() })}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground">
            Tiempo máximo de espera para generar embeddings (ej. 30 segundos)
          </p>
        </div>

        {connectionStatus.message && (
          <div className={`p-3 rounded-lg ${
            connectionStatus.status === 'connected'
              ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
          }`}>
            <p className="text-sm">{connectionStatus.message}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={testConnection}
            disabled={testing}
            variant="outline"
            className="flex-1"
          >
            {testing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Probando...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Probar Conexión
              </>
            )}
          </Button>

          <Button
            onClick={saveConfig}
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
            onClick={handleReset}
            variant="ghost"
            size="icon"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">Instrucciones:</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Asegúrate de que Ollama esté corriendo: <code className="bg-background px-1 py-0.5 rounded text-xs">ollama serve</code></li>
            <li>Descarga un modelo de embeddings si es necesario: <code className="bg-background px-1 py-0.5 rounded text-xs">ollama pull nomic-embed-text</code></li>
            <li>Ollama corre por defecto en el puerto 11434</li>
            <li>Usa el modelo <strong>nomic-embed-text</strong> para embeddings (768 dimensiones)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
