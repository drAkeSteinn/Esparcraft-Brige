'use client';

import { useState, useEffect } from 'react';
import { Brain, Save, TestTube, RefreshCw, Cpu, Server } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';

type EmbeddingProvider = 'textgen' | 'ollama';

interface TextGenConfig {
  textGenWebUIUrl: string;
  embeddingModel: string;
  embeddingDimension: string;
  batchSize: string;
  timeout: string;
}

interface OllamaConfig {
  ollamaUrl: string;
  ollamaModel: string;
  embeddingDimension: string;
  timeout: string;
}

interface EmbeddingsConfig {
  provider: EmbeddingProvider;
  textGen?: TextGenConfig;
  ollama?: OllamaConfig;
}

interface EmbeddingsConfigProps {
  onConfigSaved?: () => void;
}

const STORAGE_KEY = 'bridge_embeddings_config';

const TEXTGEN_MODELS = [
  { name: 'all-MiniLM-L6-v2', dimension: '384' },
  { name: 'all-mpnet-base-v2', dimension: '768' },
  { name: 'text-embedding-ada-002', dimension: '1536' },
  { name: 'text-embedding-3-small', dimension: '1536' },
  { name: 'text-embedding-3-large', dimension: '3072' },
];

const OLLAMA_MODELS = [
  { name: 'nomic-embed-text', dimension: '768' },
  { name: 'mxbai-embed-large', dimension: '1024' },
  { name: 'llama2', dimension: '768' },
  { name: 'llama3', dimension: '768' },
];

export default function EmbeddingsConfig({ onConfigSaved }: EmbeddingsConfigProps) {
  const [config, setConfig] = useState<EmbeddingsConfig>({
    provider: 'textgen',
    textGen: {
      textGenWebUIUrl: 'http://localhost:5000',
      embeddingModel: 'all-MiniLM-L6-v2',
      embeddingDimension: '384',
      batchSize: '10',
      timeout: '30'
    },
    ollama: {
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'nomic-embed-text',
      embeddingDimension: '768',
      timeout: '30'
    }
  });

  const [availableOllamaModels, setAvailableOllamaModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'unknown' | 'connected' | 'disconnected';
    message?: string;
  }>({ status: 'unknown' });

  const isOllama = config.provider === 'ollama';

  // Cargar configuración guardada
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log('Cargando configuración desde localStorage:', saved ? 'Encontrada' : 'No encontrada');

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('Configuración parseada:', parsed);

        setConfig(prev => ({
          ...prev,
          ...parsed,
          textGen: parsed.textGen || prev.textGen,
          ollama: parsed.ollama || prev.ollama
        }));

        // Si el proveedor guardado es Ollama, cargar los modelos automáticamente
        if (parsed.provider === 'ollama') {
          console.log('Proveedor guardado es Ollama, se cargarán modelos después de actualizar estado');
        }
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }

    testConnection(false);
  }, []);

  // Cargar modelos automáticamente cuando se cambia a Ollama
  useEffect(() => {
    console.log('useEffect: isOllama=', isOllama, 'isLoadingModels=', isLoadingModels);

    // Solo cargar cuando:
    // 1. El proveedor es Ollama
    // 2. Ya no está cargando actualmente
    // 3. Hay una URL configurada
    // 4. Aún no hemos cargado modelos (availableOllamaModels está vacío)
    if (isOllama && !isLoadingModels && config.ollama?.ollamaUrl && availableOllamaModels.length === 0) {
      console.log('useEffect: Iniciando carga automática de modelos');
      loadOllamaModels();
    }
  }, [isOllama, config.ollama?.ollamaUrl]);

  const loadOllamaModels = async () => {
    console.log('=== Iniciando carga de modelos de Ollama ===');
    console.log('isOllama:', isOllama);
    console.log('isLoadingModels:', isLoadingModels);
    console.log('Ollama URL:', config.ollama?.ollamaUrl);

    if (!isOllama) {
      console.log('loadOllamaModels: No es Ollama, ignorando');
      return;
    }

    if (isLoadingModels) {
      console.log('loadOllamaModels: Ya está cargando, ignorando');
      return;
    }

    setIsLoadingModels(true);
    setLoadingModels(true);

    try {
      console.log('Haciendo petición a /api/settings/ollama-models con:', {
        ollamaUrl: config.ollama!.ollamaUrl
      });

      const response = await fetch('/api/settings/ollama-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ollamaUrl: config.ollama!.ollamaUrl })
      });

      console.log('Respuesta recibida, status:', response.status);
      const data = await response.json();
      console.log('Datos:', JSON.stringify(data, null, 2));

      if (data.success && data.data.embeddingModels) {
        const models = data.data.embeddingModels;
        console.log(`✅ Modelos cargados exitosamente: ${models.length} modelos`);
        console.log('Lista de modelos:', models.map((m: any) => m.name));
        setAvailableOllamaModels(models);

        toast({
          title: 'Modelos de Ollama',
          description: `Se detectaron ${models.length} modelo(s) disponible(s)`,
          variant: 'default'
        });
      } else {
        console.log('❌ No se encontraron modelos de embeddings');
        console.log('Todos los modelos disponibles:', data.data?.allModels || []);
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
      console.log('=== Finalizando carga de modelos de Ollama ===');
      setIsLoadingModels(false);
      setLoadingModels(false);
    }
  };

  const testConnection = async (showToastMsg: boolean = true) => {
    setTesting(true);
    setConnectionStatus({ status: 'unknown' });

    try {
      const endpoint = isOllama ? '/api/settings/test-ollama' : '/api/settings/test-embeddings';
      const payload = isOllama
        ? {
            ollamaUrl: config.ollama!.ollamaUrl,
            ollamaModel: config.ollama!.ollamaModel
          }
        : {
            textGenWebUIUrl: config.textGen!.textGenWebUIUrl,
            embeddingModel: config.textGen!.embeddingModel
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success && data.data.connected) {
        setConnectionStatus({ status: 'connected', message: data.data.message });
        if (showToastMsg) {
          const providerName = isOllama ? 'Ollama' : 'Text Generation WebUI';
          toast({
            title: 'Conexión Exitosa',
            description: `La conexión a ${providerName} funciona correctamente`
          });
        }

        if (isOllama && data.data.availableModels) {
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

  const handleTextGenModelChange = (modelName: string) => {
    const selected = TEXTGEN_MODELS.find(m => m.name === modelName);
    if (selected && config.textGen) {
      setConfig({
        ...config,
        textGen: {
          ...config.textGen,
          embeddingModel: selected.name,
          embeddingDimension: selected.dimension.toString()
        }
      });
    }
  };

  const handleOllamaModelChange = (modelName: string) => {
    if (config.ollama) {
      let dimension = '768';
      if (modelName.includes('mxbai-embed-large')) {
        dimension = '1024';
      } else if (modelName.includes('nomic')) {
        dimension = '768';
      }

      setConfig({
        ...config,
        ollama: {
          ...config.ollama,
          ollamaModel: modelName,
          embeddingDimension: dimension
        }
      });
    }
  };

  const handleReset = () => {
    const defaultConfig: EmbeddingsConfig = {
      provider: 'textgen',
      textGen: {
        textGenWebUIUrl: 'http://localhost:5000',
        embeddingModel: 'all-MiniLM-L6-v2',
        embeddingDimension: '384',
        batchSize: '10',
        timeout: '30'
      },
      ollama: {
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: 'nomic-embed-text',
        embeddingDimension: '768',
        timeout: '30'
      }
    };

    setConfig(defaultConfig);
    setConnectionStatus({ status: 'unknown' });
    toast({
      title: 'Configuración Restablecida',
      description: 'Se han restablecido los valores por defecto'
    });
  };

  const updateTextGenConfig = (updates: Partial<TextGenConfig>) => {
    setConfig({
      ...config,
      textGen: { ...config.textGen!, ...updates }
    });
  };

  const updateOllamaConfig = (updates: Partial<OllamaConfig>) => {
    setConfig({
      ...config,
      ollama: { ...config.ollama!, ...updates }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <span>{isOllama ? 'Ollama' : 'Text Generation WebUI'}</span>
          </div>
          <Badge variant={connectionStatus.status === 'connected' ? 'default' : connectionStatus.status === 'disconnected' ? 'destructive' : 'outline'}>
            {connectionStatus.status === 'connected' ? 'Conectado' : connectionStatus.status === 'disconnected' ? 'Desconectado' : 'Sin verificar'}
          </Badge>
        </CardTitle>
        <CardDescription>
          {isOllama
            ? 'Configura la API de embeddings de Ollama'
            : 'Configura la API de embeddings de Text Generation WebUI'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Proveedor de Embeddings</Label>
          <Select
            value={config.provider}
            onValueChange={(value) => setConfig({ ...config, provider: value as EmbeddingProvider })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="textgen">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <span>Text Generation WebUI</span>
                </div>
              </SelectItem>
              <SelectItem value="ollama">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span>Ollama</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isOllama && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="embeddings-url">URL de Text Generation WebUI</Label>
              <Input
                id="embeddings-url"
                placeholder="http://localhost:5000"
                value={config.textGen!.textGenWebUIUrl}
                onChange={(e) => updateTextGenConfig({ textGenWebUIUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Asegúrate de que la API esté activada en Text Generation WebUI
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="embedding-model">Modelo de Embeddings</Label>
                <Select
                  value={config.textGen!.embeddingModel}
                  onValueChange={handleTextGenModelChange}
                >
                  <SelectTrigger id="embedding-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEXTGEN_MODELS.map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                        <span className="text-muted-foreground ml-2">
                          ({model.dimension} dims)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="embedding-dimension">Dimensiones</Label>
                <Input
                  id="embedding-dimension"
                  type="number"
                  value={config.textGen!.embeddingDimension}
                  onChange={(e) => updateTextGenConfig({ embeddingDimension: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-size">Tamaño de Batch: {config.textGen!.batchSize} documentos</Label>
              <Slider
                id="batch-size"
                min={1}
                max={50}
                step={1}
                value={[parseInt(config.textGen!.batchSize)]}
                onValueChange={([value]) => updateTextGenConfig({ batchSize: value.toString() })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground">
                Cantidad de embeddings a procesar en cada lote
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout: {config.textGen!.timeout} segundos</Label>
              <Slider
                id="timeout"
                min={5}
                max={120}
                step={5}
                value={[parseInt(config.textGen!.timeout)]}
                onValueChange={([value]) => updateTextGenConfig({ timeout: value.toString() })}
                className="mt-2"
              />
            </div>
          </div>
        )}

        {isOllama && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ollama-url">URL de Ollama</Label>
              <Input
                id="ollama-url"
                placeholder="http://localhost:11434"
                value={config.ollama!.ollamaUrl}
                onChange={(e) => updateOllamaConfig({ ollamaUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Puerto predeterminado de Ollama: 11434
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ollama-model">Modelo de Embeddings</Label>
                  {!loadingModels && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={loadOllamaModels}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Recargar
                    </Button>
                  )}
                </div>
                <Select
                  value={config.ollama!.ollamaModel}
                  onValueChange={handleOllamaModelChange}
                >
                  <SelectTrigger id="ollama-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingModels ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                        Cargando modelos de Ollama...
                      </div>
                    ) : availableOllamaModels.length > 0 ? (
                      <>
                        <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">
                          Modelos Disponibles ({availableOllamaModels.length})
                        </div>
                        {availableOllamaModels.map((model) => (
                          <SelectItem key={model.name} value={model.name}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </>
                    ) : (
                      <>
                        <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold border-b">
                          Modelos Sugeridos
                        </div>
                        {OLLAMA_MODELS.map((model) => (
                          <SelectItem key={model.name} value={model.name}>
                            {model.name}
                            <span className="text-muted-foreground ml-2">
                              ({model.dimension} dims)
                            </span>
                          </SelectItem>
                        ))}
                        <div className="px-3 py-2 text-sm text-destructive text-center border-t mt-1">
                          No se detectaron modelos en Ollama
                        </div>
                        <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                          Verifica que Ollama esté corriendo en <code className="bg-background px-1 rounded">{config.ollama!.ollamaUrl}</code>
                          <br />
                          Descarga modelos con: <code className="bg-background px-1 rounded">ollama pull nomic-embed-text</code>
                        </div>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ollama-dimension">Dimensiones</Label>
                <Input
                  id="ollama-dimension"
                  type="number"
                  value={config.ollama!.embeddingDimension}
                  onChange={(e) => updateOllamaConfig({ embeddingDimension: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ollama-timeout">Timeout: {config.ollama!.timeout} segundos</Label>
              <Slider
                id="ollama-timeout"
                min={5}
                max={120}
                step={5}
                value={[parseInt(config.ollama!.timeout)]}
                onValueChange={([value]) => updateOllamaConfig({ timeout: value.toString() })}
                className="mt-2"
              />
            </div>

            {isOllama && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Modelos Recomendados para Embeddings:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>nomic-embed-text</strong> - 768 dimensiones (Recomendado)</li>
                  <li><strong>mxbai-embed-large</strong> - 1024 dimensiones (Mayor precisión)</li>
                  <li>Asegúrate de que el modelo esté descargado en Ollama antes de usarlo</li>
                </ul>
              </div>
            )}
          </div>
        )}

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
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">Instrucciones:</p>
          {isOllama ? (
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Asegúrate de que Ollama esté ejecutándose (puerto 11434)</li>
              <li>Descarga el modelo de embeddings: <code className="bg-background px-1 rounded">ollama pull nomic-embed-text</code></li>
              <li>Usa "localhost" si Ollama está en la misma máquina</li>
              <li>Las dimensiones deben coincidir con las del modelo seleccionado</li>
              <li>Ollama procesa embeddings uno por uno (no tiene soporte de batch nativo)</li>
            </ul>
          ) : (
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Asegúrate de que Text Generation WebUI esté ejecutándose</li>
              <li>Activa la API de embeddings en la configuración</li>
              <li>El modelo debe estar cargado en Text Generation WebUI</li>
              <li>Usa "localhost" si Text Gen WebUI está en la misma máquina</li>
              <li>Las dimensiones deben coincidir con las del modelo seleccionado</li>
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
