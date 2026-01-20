'use client';

import { useState, useEffect } from 'react';
import { Brain, Save, TestTube, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';

interface EmbeddingsConfig {
  textGenWebUIUrl: string;
  embeddingModel: string;
  embeddingDimension: string;
  batchSize: string;
  timeout: string;
}

interface EmbeddingsConfigProps {
  onConfigSaved?: () => void;
}

const STORAGE_KEY = 'bridge_embeddings_config';

const PREDEFINED_MODELS = [
  { name: 'all-MiniLM-L6-v2', dimension: '384' },
  { name: 'all-mpnet-base-v2', dimension: '768' },
  { name: 'text-embedding-ada-002', dimension: '1536' },
  { name: 'text-embedding-3-small', dimension: '1536' },
  { name: 'text-embedding-3-large', dimension: '3072' },
];

export default function EmbeddingsConfig({ onConfigSaved }: EmbeddingsConfigProps) {
  const [config, setConfig] = useState<EmbeddingsConfig>({
    textGenWebUIUrl: 'http://localhost:5000',
    embeddingModel: 'all-MiniLM-L6-v2',
    embeddingDimension: '384',
    batchSize: '10',
    timeout: '30'
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'unknown' | 'connected' | 'disconnected';
    message?: string;
  }>({ status: 'unknown' });

  useEffect(() => {
    // Cargar configuración guardada
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }

    // Verificar conexión inicial
    testConnection(false);
  }, []);

  const testConnection = async (showToastMsg: boolean = true) => {
    setTesting(true);
    setConnectionStatus({ status: 'unknown' });

    try {
      const response = await fetch('/api/settings/test-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (data.success && data.data.connected) {
        setConnectionStatus({ status: 'connected', message: data.data.message });
        if (showToastMsg) {
          toast({
            title: 'Conexión Exitosa',
            description: 'La conexión a Text Generation WebUI funciona correctamente'
          });
        }
      } else {
        setConnectionStatus({ status: 'disconnected', message: data.data?.message || 'No se pudo conectar' });
        if (showToastMsg) {
          toast({
            title: 'Error de Conexión',
            description: data.data?.message || 'No se pudo conectar a Text Generation WebUI',
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

  const handleModelChange = (modelName: string) => {
    const selected = PREDEFINED_MODELS.find(m => m.name === modelName);
    if (selected) {
      setConfig({
        ...config,
        embeddingModel: selected.name,
        embeddingDimension: selected.dimension.toString()
      });
    }
  };

  const handleReset = () => {
    const defaultConfig: EmbeddingsConfig = {
      textGenWebUIUrl: 'http://localhost:5000',
      embeddingModel: 'all-MiniLM-L6-v2',
      embeddingDimension: '384',
      batchSize: '10',
      timeout: '30'
    };

    setConfig(defaultConfig);
    setConnectionStatus({ status: 'unknown' });
    toast({
      title: 'Configuración Restablecida',
      description: 'Se han restablecido los valores por defecto'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <span>Text Generation WebUI</span>
          </div>
          <Badge variant={connectionStatus.status === 'connected' ? 'default' : connectionStatus.status === 'disconnected' ? 'destructive' : 'outline'}>
            {connectionStatus.status === 'connected' ? 'Conectado' : connectionStatus.status === 'disconnected' ? 'Desconectado' : 'Sin verificar'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Configura la API de embeddings de Text Generation WebUI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="embeddings-url">URL de Text Generation WebUI</Label>
          <Input
            id="embeddings-url"
            placeholder="http://localhost:5000"
            value={config.textGenWebUIUrl}
            onChange={(e) => setConfig({ ...config, textGenWebUIUrl: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Asegúrate de que la API esté activada en Text Generation WebUI
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="embedding-model">Modelo de Embeddings</Label>
            <Select
              value={config.embeddingModel}
              onValueChange={handleModelChange}
            >
              <SelectTrigger id="embedding-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_MODELS.map((model) => (
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
              value={config.embeddingDimension}
              onChange={(e) => setConfig({ ...config, embeddingDimension: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="batch-size">Tamaño de Batch: {config.batchSize} documentos</Label>
          <Slider
            id="batch-size"
            min={1}
            max={50}
            step={1}
            value={[parseInt(config.batchSize)]}
            onValueChange={([value]) => setConfig({ ...config, batchSize: value.toString() })}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground">
            Cantidad de embeddings a procesar en cada lote
          </p>
        </div>

        <div className="space-y-2">
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
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">Instrucciones:</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Asegúrate de que Text Generation WebUI esté ejecutándose</li>
            <li>Activa la API de embeddings en la configuración</li>
            <li>El modelo debe estar cargado en Text Generation WebUI</li>
            <li>Usa "localhost" si Text Gen WebUI está en la misma máquina</li>
            <li>Las dimensiones deben coincidir con las del modelo seleccionado</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
