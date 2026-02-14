'use client';

import { useState, useEffect } from 'react';
import { Brain, Save, TestTube, RefreshCw, Database, Cpu, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface OllamaModel {
  name: string;
  size: number;
  sizeFormatted: string;
  modified_at: string;
  modifiedAtFormatted: string;
  isEmbeddingModel: boolean;
  knownDimension: number | null;
  details: any;
  category: 'embedding' | 'chat';
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
  
  // Todos los modelos
  const [allModels, setAllModels] = useState<OllamaModel[]>([]);
  // Solo modelos de embeddings
  const [embeddingModels, setEmbeddingModels] = useState<OllamaModel[]>([]);
  // Solo modelos de chat
  const [chatModels, setChatModels] = useState<OllamaModel[]>([]);
  
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'unknown' | 'connected' | 'disconnected';
    message?: string;
  }>({ status: 'unknown' });
  
  // Estado para validación del modelo seleccionado
  const [modelValidation, setModelValidation] = useState<{
    isValid: boolean | null;
    message: string;
    isEmbeddingModel: boolean;
  }>({ isValid: null, message: '', isEmbeddingModel: false });

  // Cargar modelos automáticamente cuando se configura Ollama
  useEffect(() => {
    if (config.ollamaUrl && allModels.length === 0) {
      console.log('🔄 Cargando modelos de Ollama automáticamente...');
      loadOllamaModels();
    }
  }, [config.ollamaUrl]);

  // Cargar configuración guardada
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...OLLAMA_DEFAULT_CONFIG, ...parsed });
      }
    } catch (error) {
      console.error('Error loading saved config:', error);
    }
  }, []);

  const loadOllamaModels = async () => {
    console.log('=== Iniciando carga de modelos de Ollama ===');
    setIsLoadingModels(true);
    setConnectionStatus({ status: 'unknown' });

    try {
      const response = await fetch('/api/settings/ollama-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ollamaUrl: config.ollamaUrl })
      });

      const data = await response.json();

      if (data.success && data.data.connected) {
        setConnectionStatus({ status: 'connected', message: data.data.message });
        
        const all = data.data.allModels || [];
        const embeddings = data.data.embeddingModels || [];
        const chat = data.data.chatModels || [];
        
        setAllModels(all);
        setEmbeddingModels(embeddings);
        setChatModels(chat);
        
        console.log(`✅ ${all.length} modelos cargados (${embeddings.length} embeddings, ${chat.length} chat)`);

        // Validar modelo actual
        if (config.ollamaModel) {
          validateModel(config.ollamaModel, all);
        }

        toast({
          title: 'Modelos de Ollama',
          description: `Se detectaron ${all.length} modelo(s): ${embeddings.length} de embeddings, ${chat.length} de chat`,
          variant: 'default'
        });
      } else {
        setConnectionStatus({ status: 'disconnected', message: data.data?.message || 'No se pudo conectar' });
        setAllModels([]);
        setEmbeddingModels([]);
        setChatModels([]);

        toast({
          title: 'Sin conexión a Ollama',
          description: 'Verifica que Ollama esté ejecutándose en ' + config.ollamaUrl,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('❌ Error loading Ollama models:', error);
      setConnectionStatus({ status: 'disconnected', message: 'Error de conexión' });
      setAllModels([]);
      setEmbeddingModels([]);
      setChatModels([]);

      toast({
        title: 'Error al cargar modelos',
        description: 'No se pudo conectar a Ollama. Verifica la URL.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingModels(false);
      console.log('=== Finalizando carga de modelos de Ollama ===');
    }
  };

  /**
   * Valida si un modelo es adecuado para embeddings
   */
  const validateModel = (modelName: string, models: OllamaModel[]) => {
    const model = models.find(m => m.name === modelName);
    
    if (!model) {
      setModelValidation({
        isValid: null,
        message: 'Modelo no encontrado en Ollama',
        isEmbeddingModel: false
      });
      return;
    }
    
    if (model.isEmbeddingModel) {
      setModelValidation({
        isValid: true,
        message: model.knownDimension 
          ? `Modelo de embeddings válido. Dimensión conocida: ${model.knownDimension}`
          : 'Modelo de embeddings válido. Dimensión desconocida - deberá especificarla.',
        isEmbeddingModel: true
      });
      
      // Auto-completar dimensión si es conocida
      if (model.knownDimension) {
        setConfig(prev => ({ ...prev, embeddingDimension: model.knownDimension!.toString() }));
      }
    } else {
      setModelValidation({
        isValid: false,
        message: 'Este modelo NO es de embeddings. Puede no funcionar correctamente para generar vectores.',
        isEmbeddingModel: false
      });
    }
  };

  const testConnection = async (showToastMsg: boolean = true) => {
    setTesting(true);

    try {
      const response = await fetch('/api/settings/test-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ollamaUrl: config.ollamaUrl,
          model: config.ollamaModel,
          testText: 'This is a test embedding.'
        })
      });

      const data = await response.json();

      if (data.success && data.data.success) {
        if (showToastMsg) {
          toast({
            title: '✅ Prueba Exitosa',
            description: `Embedding generado correctamente. Dimensión: ${data.data.dimension || 'N/A'}`
          });
        }
        setModelValidation(prev => ({ ...prev, isValid: true }));
      } else {
        if (showToastMsg) {
          toast({
            title: '❌ Error en la Prueba',
            description: data.error || data.data?.error || 'No se pudo generar embedding',
            variant: 'destructive'
          });
        }
        setModelValidation(prev => ({ ...prev, isValid: false }));
      }
    } catch (error: any) {
      if (showToastMsg) {
        toast({
          title: 'Error',
          description: error.message || 'No se pudo probar la conexión',
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
      
      // También guardar en variables de entorno del servidor
      fetch('/api/settings/embeddings-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ollamaUrl: config.ollamaUrl,
          embeddingModel: config.ollamaModel,
          embeddingDimension: parseInt(config.embeddingDimension),
          defaultSimilarityThreshold: 0.7
        })
      }).catch(err => console.error('Error saving to server:', err));

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

  const handleModelChange = (modelName: string) => {
    setConfig(prev => ({ ...prev, ollamaModel: modelName }));
    validateModel(modelName, allModels);
  };

  const handleReset = () => {
    setConfig({ ...OLLAMA_DEFAULT_CONFIG });
    setConnectionStatus({ status: 'unknown' });
    setModelValidation({ isValid: null, message: '', isEmbeddingModel: false });
    localStorage.removeItem(STORAGE_KEY);

    toast({
      title: 'Configuración Restablecida',
      description: 'Se han restablecido los valores por defecto'
    });
  };

  const renderModelItem = (model: OllamaModel) => (
    <SelectItem key={model.name} value={model.name}>
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-2">
          <span className="font-medium">{model.name}</span>
          {model.knownDimension && (
            <Badge variant="outline" className="text-xs">
              {model.knownDimension}D
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{model.sizeFormatted}</span>
        </div>
      </div>
    </SelectItem>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            <span>Ollama Embeddings</span>
          </div>
          <Badge variant={connectionStatus.status === 'connected' ? 'default' : connectionStatus.status === 'disconnected' ? 'destructive' : 'outline'}>
            {connectionStatus.status === 'connected' ? 'Conectado' : connectionStatus.status === 'disconnected' ? 'Desconectado' : 'Sin verificar'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Configura la API de embeddings de Ollama para búsqueda semántica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL de Ollama */}
        <div className="space-y-2">
          <Label htmlFor="ollama-url">URL de Ollama</Label>
          <div className="flex gap-2">
            <Input
              id="ollama-url"
              placeholder="http://localhost:11434"
              value={config.ollamaUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, ollamaUrl: e.target.value }))}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={loadOllamaModels}
              disabled={isLoadingModels}
              title="Recargar modelos"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingModels ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            URL del servidor de Ollama (generalmente http://localhost:11434)
          </p>
        </div>

        {/* Selector de Modelo */}
        <div className="space-y-2">
          <Label htmlFor="ollama-model">Modelo</Label>
          <Select
            value={config.ollamaModel}
            onValueChange={handleModelChange}
            disabled={allModels.length === 0}
          >
            <SelectTrigger id="ollama-model">
              <SelectValue placeholder={allModels.length === 0 ? "Carga modelos primero" : "Selecciona un modelo"} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {/* Modelos de Embeddings */}
              {embeddingModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Modelos de Embeddings ({embeddingModels.length})
                  </SelectLabel>
                  {embeddingModels.map(renderModelItem)}
                </SelectGroup>
              )}
              
              {/* Separador */}
              {embeddingModels.length > 0 && chatModels.length > 0 && (
                <SelectSeparator />
              )}
              
              {/* Otros Modelos */}
              {chatModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Otros Modelos ({chatModels.length})
                  </SelectLabel>
                  {chatModels.map(renderModelItem)}
                </SelectGroup>
              )}
              
              {/* Modelo por defecto si no hay modelos cargados */}
              {allModels.length === 0 && (
                <SelectItem value={DEFAULT_OLLAMA_MODEL}>
                  {DEFAULT_OLLAMA_MODEL} (por defecto)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          
          {/* Validación del modelo */}
          {modelValidation.isValid !== null && (
            <Alert variant={modelValidation.isValid ? 'default' : 'destructive'} className="py-2">
              <div className="flex items-center gap-2">
                {modelValidation.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription className="text-xs">
                  {modelValidation.message}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </div>

        {/* Dimensión del Embedding */}
        <div className="space-y-2">
          <Label htmlFor="embedding-dimension">Dimensión del Vector</Label>
          <Input
            id="embedding-dimension"
            type="number"
            placeholder="768"
            value={config.embeddingDimension}
            onChange={(e) => setConfig(prev => ({ ...prev, embeddingDimension: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            Dimensión del vector de embeddings (ej: 768 para nomic-embed-text, 1024 para bge-m3)
          </p>
        </div>

        {/* Timeout */}
        <div className="space-y-2">
          <Label htmlFor="timeout">Timeout: {config.timeout} segundos</Label>
          <Slider
            id="timeout"
            min={5}
            max={120}
            step={5}
            value={[parseInt(config.timeout)]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, timeout: value.toString() }))}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground">
            Tiempo máximo de espera para generar embeddings
          </p>
        </div>

        {/* Estadísticas de modelos */}
        {allModels.length > 0 && (
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4" />
              Modelos Detectados
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <div className="font-bold text-lg">{allModels.length}</div>
                <div className="text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="font-bold text-lg text-green-500">{embeddingModels.length}</div>
                <div className="text-muted-foreground">Embeddings</div>
              </div>
              <div>
                <div className="font-bold text-lg text-blue-500">{chatModels.length}</div>
                <div className="text-muted-foreground">Chat</div>
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => testConnection(true)}
            disabled={testing || !config.ollamaModel}
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
                Probar
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
                Guardar
              </>
            )}
          </Button>

          <Button
            onClick={handleReset}
            variant="ghost"
            size="icon"
            title="Restablecer"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Instrucciones */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">Instrucciones:</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Asegúrate de que Ollama esté corriendo: <code className="bg-background px-1 py-0.5 rounded text-xs">ollama serve</code></li>
            <li>Descarga un modelo de embeddings: <code className="bg-background px-1 py-0.5 rounded text-xs">ollama pull nomic-embed-text</code></li>
            <li>Modelos recomendados: <strong>nomic-embed-text</strong> (768D), <strong>bge-m3</strong> (1024D), <strong>mxbai-embed-large</strong> (1024D)</li>
            <li>Puedes seleccionar cualquier modelo, pero los de embeddings funcionan mejor</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
