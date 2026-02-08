'use client';

import { useState, useEffect } from 'react';
import { Brain, Save, TestTube, RefreshCw, Cpu, Server, Clock, Loader2 } from 'lucide-react';
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
  { name: 'all-MiniLM-L6-v2', dimension: '768' },
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
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }

    // Cargar configuración del proveedor desde el servidor
    const loadProviderConfig = async () => {
      try {
        const response = await fetch('/api/settings/embeddings-provider');
        const data = await response.json();

        if (data.success && data.data) {
          console.log('Configuración del proveedor desde el servidor:', data.data);
          setConfig(prev => ({
            ...prev,
            provider: data.data.provider || prev.provider,
            ...(data.data.textGenUrl ? {
              textGen: {
                ...prev.textGen,
                textGenWebUIUrl: data.data.textGenUrl,
                embeddingModel: data.data.textGenModel || prev.textGen?.embeddingModel,
                embeddingDimension: data.data.textGenDimension || prev.textGen?.embeddingDimension
              }
            } : {}),
            ...(data.data.ollamaUrl ? {
              ollama: {
                ...prev.ollama,
                ollamaUrl: data.data.ollamaUrl,
                ollamaModel: data.data.ollamaModel || prev.ollama?.ollamaModel,
                embeddingDimension: data.data.ollamaDimension || prev.ollama?.embeddingDimension
              }
            } : {})
          }));
        }
      } catch (error) {
        console.error('Error cargando configuración del proveedor desde servidor:', error);
      }
    };

    loadProviderConfig();
  }, []);

  // Cargar modelos automáticamente cuando se cambia a Ollama
  useEffect(() => {
    console.log('useEffect: isOllama=', isOllama, 'isLoadingModels=', isLoadingModels);

    // Solo cargar cuando:
    // 1. El proveedor es Ollama
    // 2. Ya no está cargando actualmente
    // 3. Hay una URL configurada
    // 4. Aún no hemos cargado modelos (availableOllamaModels está vacío)
    const needsLoad = isOllama && !isLoadingModels && config.ollama?.ollamaUrl && availableOllamaModels.length === 0;

    if (needsLoad) {
      console.log('useEffect: Iniciando carga automática de modelos');
      loadOllamaModels();
    }
  }, [isOllama, config.ollama?.ollamaUrl]);

  // Guardar proveedor en el servidor cuando cambie el proveedor (solo el provider, no la config completa)
  useEffect(() => {
    const saveProvider = async () => {
      try {
        await fetch('/api/settings/embeddings-provider', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ provider: config.provider })
        });

        console.log('✅ Proveedor actualizado en el servidor:', config.provider);
      } catch (error) {
        console.error('❌ Error actualizando proveedor:', error);
      }
    };

    saveProvider();
  }, [config.provider]);

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
        headers: {
          'Content-Type': 'application/json'
        },
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
            ollamaModel: config.ollama!.ollamaModel,
            embeddingDimension: config.ollama!.embeddingDimension
          }
        : {
            textGenWebUIUrl: config.textGen!.textGenWebUIUrl,
            embeddingModel: config.textGen!.embeddingModel,
            embeddingDimension: config.textGen!.embeddingDimension
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success && data.data.connected) {
        setConnectionStatus({ status: 'connected', message: data.data.message });
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
    } catch (error) {
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

  const saveConfig = async () => {
    setSaving(true);

    try {
      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      // Guardar configuración del proveedor en el servidor
      const providerConfig = {
        provider: config.provider,
        ...(config.provider === 'textgen' ? {
          textGenUrl: config.textGen?.textGenWebUIUrl,
          textGenModel: config.textGen?.embeddingModel,
          textGenDimension: config.textGen?.embeddingDimension,
        } : {
          ollamaUrl: config.ollama?.ollamaUrl,
          ollamaModel: config.ollama?.ollamaModel,
          ollamaDimension: config.ollama?.embeddingDimension,
        })
      };

      await fetch('/api/settings/embeddings-provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(providerConfig)
      });

      console.log('✅ Configuración del proveedor guardada en el servidor:', providerConfig);

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
    let dimension = '768';
    if (modelName.includes('mxbai-embed-large')) {
      dimension = '1024';
    }
    setConfig({
      ...config,
      ollama: {
        ...config.ollama,
        ollamaModel: modelName,
        embeddingDimension: dimension
      }
    });
  };

  const updateTextGenConfig = (updates: Partial<TextGenConfig>) => {
    setConfig({
      ...config,
      textGen: {
        ...config.textGen!,
        ...updates
      }
    });
  };

  const updateOllamaConfig = (updates: Partial<OllamaConfig>) => {
    setConfig({
      ...config,
      ollama: {
        ...config.ollama!,
        ...updates
      }
    });
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
      title: 'Configuración Restaurada',
      description: 'Se han restablecido los valores por defecto'
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
            {connectionStatus.status === 'connected' ? 'Conectado' : 'Desconectado'}
          </Badge>
        </CardTitle>
        <CardDescription>
          {isOllama
            ? 'Configura la API de embeddings de Ollama'
            : 'Configura la API de embeddings de Text Generation WebUI'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
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

        {isOllama && (
          <div className="space-y-4">
            <div className="space-y-4">
              <Label htmlFor="ollama-url">URL de Ollama</Label>
              <Input
                id="ollama-url"
                placeholder="http://localhost:11434"
                value={config.ollama!.ollamaUrl}
                onChange={(e) => updateOllamaConfig({ ollamaUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Asegúrate de que Ollama esté corriendo en el puerto 11434
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="ollama-model">Modelo de Embeddings</Label>
              <Select
                value={config.ollama!.ollamaModel}
                onValueChange={handleOllamaModelChange}
              >
                <SelectTrigger id="ollama-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableOllamaModels.length > 0 ? (
                    availableOllamaModels.map((model: any) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                        <span className="text-muted-foreground ml-2">
                          ({model.dimension} dims)
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No se cargaron modelos
                    </div>
                  )}
                </SelectContent>
              </Select>
              {!loadingModels && (
                <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" onClick={loadOllamaModels} />
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={testConnection}
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Probando conexión...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar
                </>
              )}
            </Button>
          </div>
        )}

        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Configuración de Text Generation WebUI</h3>
          {!isOllama && (
            <div className="space-y-4">
              <div className="space-y-4">
                <Label htmlFor="embeddings-url">URL de Text Generation WebUI</Label>
                <Input
                  id="embeddings-url"
                  placeholder="http://localhost:5000"
                  value={config.textGen!.textGenWebUIUrl}
                  onChange={(e) => updateTextGenConfig({ textGenWebUIUrl: e.target.value })}
                />
                </div>

                <div className="space-y-4">
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

                <div className="grid grid-cols-3 gap-4">
                  <Label htmlFor="embedding-dimension">Dimensiones</Label>
                  <Input
                    id="embedding-dimension"
                    type="number"
                    min={128}
                    max={1536}
                    value={parseInt(config.textGen!.embeddingDimension)}
                    onChange={(e) => updateTextGenConfig({ embeddingDimension: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cantidad de dimensiones del modelo de embeddings
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                  <div className="mt-1 text-xs text-muted-foreground">
                    Cantidad de embeddings a procesar en cada lote
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                  <div className="mt-1 text-xs text-muted-foreground">
                    Tiempo de espera de la petición
                  </div>
              </div>
            </div>
          )}

          {/* Ollama config hidden - managed by connection test */}
          <input type="hidden" value={isOllama ? 'true' : 'false'} />
        </div>

      <div className="mt-6 pt-6 border-t">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={saving}
            >
              Restablecer Valores por Defecto
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={saveConfig}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {connectionStatus.status === 'connected'
              ? 'Configuración guardada'
              : 'Hay cambios sin guardar'
            }
          </div>
        </div>
      </div>
      </CardContent>
    </Card>
  );
}
